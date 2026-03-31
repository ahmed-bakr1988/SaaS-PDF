"""Stripe payment service — checkout sessions, webhooks, and subscription management."""

import logging

import stripe
from flask import current_app

from app.services.account_service import update_user_plan, _utc_now
from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict
from app.utils.config_placeholders import normalize_optional_config

logger = logging.getLogger(__name__)


def get_stripe_secret_key() -> str:
    """Return the configured Stripe secret key, ignoring copied sample values."""
    return normalize_optional_config(
        current_app.config.get("STRIPE_SECRET_KEY", ""),
        ("replace-with",),
    )


def get_stripe_price_id(billing: str = "monthly") -> str:
    """Return the configured Stripe price id for the requested billing cycle."""
    monthly = normalize_optional_config(
        current_app.config.get("STRIPE_PRICE_ID_PRO_MONTHLY", ""),
        ("replace-with",),
    )
    yearly = normalize_optional_config(
        current_app.config.get("STRIPE_PRICE_ID_PRO_YEARLY", ""),
        ("replace-with",),
    )

    if billing == "yearly" and yearly:
        return yearly
    return monthly


def is_stripe_configured() -> bool:
    """Return True when billing has a usable secret key and at least one price id."""
    return bool(
        get_stripe_secret_key()
        and (get_stripe_price_id("monthly") or get_stripe_price_id("yearly"))
    )


def _init_stripe():
    """Configure stripe with the app's secret key."""
    stripe.api_key = get_stripe_secret_key()


def _ensure_stripe_columns():
    """Add stripe_customer_id and stripe_subscription_id columns if missing."""
    with db_connection() as conn:
        if is_postgres():
            cursor = conn.cursor()
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
            )
            if not cursor.fetchone()[0]:
                return
            cursor.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            )
            cols = [row[0] for row in cursor.fetchall()]
        else:
            table_exists = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            ).fetchone()
            if table_exists is None:
                return
            cols = [
                row["name"]
                for row in conn.execute("PRAGMA table_info(users)").fetchall()
            ]

        if "stripe_customer_id" not in cols:
            sql = "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT"
            execute_query(conn, sql)
        if "stripe_subscription_id" not in cols:
            sql = "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT"
            execute_query(conn, sql)


def init_stripe_db():
    """Initialize stripe-related DB columns."""
    _ensure_stripe_columns()


def _get_or_create_customer(user_id: int) -> str:
    """Get existing Stripe customer or create one."""
    _init_stripe()
    with db_connection() as conn:
        sql = (
            "SELECT email, stripe_customer_id FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT email, stripe_customer_id FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (user_id,))
        row = row_to_dict(cursor.fetchone())

    if row is None:
        raise ValueError("User not found.")

    if row.get("stripe_customer_id"):
        return row["stripe_customer_id"]

    customer = stripe.Customer.create(
        email=row["email"],
        metadata={"user_id": str(user_id)},
    )

    with db_connection() as conn:
        sql = (
            "UPDATE users SET stripe_customer_id = %s, updated_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?"
        )
        execute_query(conn, sql, (customer.id, _utc_now(), user_id))

    return customer.id


def create_checkout_session(
    user_id: int, price_id: str, success_url: str, cancel_url: str
) -> str:
    """Create a Stripe Checkout Session and return the URL."""
    _init_stripe()
    customer_id = _get_or_create_customer(user_id)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(user_id)},
    )
    return session.url


def create_portal_session(user_id: int, return_url: str) -> str:
    """Create a Stripe Customer Portal session for managing subscriptions."""
    _init_stripe()
    customer_id = _get_or_create_customer(user_id)

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


def handle_webhook_event(payload: bytes, sig_header: str) -> dict:
    """Process a Stripe webhook event. Returns a status dict."""
    webhook_secret = normalize_optional_config(
        current_app.config.get("STRIPE_WEBHOOK_SECRET", ""),
        ("replace-with",),
    )
    if not webhook_secret:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured — ignoring webhook.")
        return {"status": "ignored", "reason": "no webhook secret"}

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed.")
        return {"status": "error", "reason": "signature_failed"}
    except ValueError:
        logger.warning("Invalid Stripe webhook payload.")
        return {"status": "error", "reason": "invalid_payload"}

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data_object)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data_object)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_object)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data_object)

    return {"status": "ok", "event_type": event_type}


def _find_user_by_customer_id(customer_id: str) -> dict | None:
    """Find user by Stripe customer ID."""
    with db_connection() as conn:
        sql = (
            "SELECT id, email, plan, created_at FROM users WHERE stripe_customer_id = %s"
            if is_postgres()
            else "SELECT id, email, plan, created_at FROM users WHERE stripe_customer_id = ?"
        )
        cursor = execute_query(conn, sql, (customer_id,))
        row = row_to_dict(cursor.fetchone())
    return row


def _handle_checkout_completed(session: dict):
    """Handle successful checkout — activate Pro plan."""
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    user_id = session.get("metadata", {}).get("user_id")

    if user_id:
        with db_connection() as conn:
            sql = (
                "UPDATE users SET plan = 'pro', stripe_subscription_id = %s, updated_at = %s WHERE id = %s"
                if is_postgres()
                else "UPDATE users SET plan = 'pro', stripe_subscription_id = ?, updated_at = ? WHERE id = ?"
            )
            execute_query(conn, sql, (subscription_id, _utc_now(), int(user_id)))
        logger.info("User %s upgraded to Pro via checkout.", user_id)
    elif customer_id:
        user = _find_user_by_customer_id(customer_id)
        if user:
            with db_connection() as conn:
                sql = (
                    "UPDATE users SET plan = 'pro', stripe_subscription_id = %s, updated_at = %s WHERE id = %s"
                    if is_postgres()
                    else "UPDATE users SET plan = 'pro', stripe_subscription_id = ?, updated_at = ? WHERE id = ?"
                )
                execute_query(conn, sql, (subscription_id, _utc_now(), user["id"]))
            logger.info(
                "User %s upgraded to Pro via checkout (customer match).", user["id"]
            )


def _handle_subscription_updated(subscription: dict):
    """Handle subscription changes (upgrade/downgrade)."""
    customer_id = subscription.get("customer")
    status = subscription.get("status")
    user = _find_user_by_customer_id(customer_id)
    if not user:
        return

    if status in ("active", "trialing"):
        update_user_plan(user["id"], "pro")
        logger.info("User %s subscription active — Pro plan.", user["id"])
    elif status in ("past_due", "unpaid"):
        logger.warning("User %s subscription %s.", user["id"], status)
    elif status in ("canceled", "incomplete_expired"):
        update_user_plan(user["id"], "free")
        logger.info("User %s subscription ended — Free plan.", user["id"])


def _handle_subscription_deleted(subscription: dict):
    """Handle subscription cancellation."""
    customer_id = subscription.get("customer")
    user = _find_user_by_customer_id(customer_id)
    if user:
        update_user_plan(user["id"], "free")
        with db_connection() as conn:
            sql = (
                "UPDATE users SET stripe_subscription_id = NULL, updated_at = %s WHERE id = %s"
                if is_postgres()
                else "UPDATE users SET stripe_subscription_id = NULL, updated_at = ? WHERE id = ?"
            )
            execute_query(conn, sql, (_utc_now(), user["id"]))
        logger.info("User %s subscription deleted — downgraded to Free.", user["id"])


def _handle_payment_failed(invoice: dict):
    """Log payment failures."""
    customer_id = invoice.get("customer")
    user = _find_user_by_customer_id(customer_id)
    if user:
        logger.warning(
            "Payment failed for user %s (customer %s).", user["id"], customer_id
        )
