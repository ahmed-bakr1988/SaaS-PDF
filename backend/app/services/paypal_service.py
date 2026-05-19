"""PayPal Subscriptions payment service.

Handles subscription approval URL creation, webhook verification,
and subscription lifecycle events (activation, cancellation, payment failure).

Plans supported:
  - starter  ($4.99 / month)
  - pro      ($9.99 / month)   ← default / existing subscribers
  - business ($29.99 / month)

Legacy alias:
  - micro    → treated identically to starter (backwards compat for existing PayPal subscriptions)

Docs: https://developer.paypal.com/docs/subscriptions/
"""

import json
import logging

import requests
from flask import current_app

from app.services.account_service import update_user_plan, _utc_now
from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict
from app.utils.config_placeholders import normalize_optional_config

logger = logging.getLogger(__name__)

# PayPal REST API base URLs
_PAYPAL_BASE = {
    "sandbox": "https://api-m.sandbox.paypal.com",
    "live": "https://api-m.paypal.com",
}

# Subscription statuses that indicate an active paid plan
_ACTIVE_STATUSES = {"ACTIVE", "APPROVED"}


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_env() -> str:
    return str(current_app.config.get("PAYPAL_ENVIRONMENT", "sandbox")).lower()


def _get_base_url() -> str:
    return _PAYPAL_BASE.get(_get_env(), _PAYPAL_BASE["sandbox"])


def get_paypal_client_id() -> str:
    val = current_app.config.get("PAYPAL_CLIENT_ID", "")
    return normalize_optional_config(val, ("replace-with",))


def get_paypal_client_secret() -> str:
    val = current_app.config.get("PAYPAL_CLIENT_SECRET", "")
    return normalize_optional_config(val, ("replace-with",))


def get_paypal_plan_id(
    billing: str = "monthly",
    trial: bool = False,
    is_micro: bool = False,
    plan: str = "pro",
) -> str:
    """Return the configured PayPal plan ID for the requested billing cycle and plan tier.

    Args:
        billing:  'monthly' | 'yearly'
        trial:    Use dedicated trial plan ID if configured (pro only)
        is_micro: Legacy alias — treated as 'starter'
        plan:     'starter' | 'pro' | 'business'  (default 'pro' for backwards compat)
    """
    # Normalise legacy micro → starter
    if is_micro:
        plan = "starter"

    # ── Starter plan ($4.99) ─────────────────────────────────────────────────
    if plan == "starter":
        monthly_val = current_app.config.get("PAYPAL_PLAN_ID_STARTER_MONTHLY", "")
        yearly_val  = current_app.config.get("PAYPAL_PLAN_ID_STARTER_YEARLY", "")
        monthly = normalize_optional_config(monthly_val, ("replace-with",))
        yearly  = normalize_optional_config(yearly_val,  ("replace-with",))
        # Fallback: try legacy MICRO env var if new starter vars are absent
        if not monthly:
            micro_val = current_app.config.get("PAYPAL_PLAN_ID_MICRO", "")
            monthly = normalize_optional_config(micro_val, ("replace-with",))
        return yearly if (billing == "yearly" and yearly) else monthly

    # ── Business plan ($29.99) ───────────────────────────────────────────────
    if plan == "business":
        monthly_val = current_app.config.get("PAYPAL_PLAN_ID_BUSINESS_MONTHLY", "")
        yearly_val  = current_app.config.get("PAYPAL_PLAN_ID_BUSINESS_YEARLY", "")
        monthly = normalize_optional_config(monthly_val, ("replace-with",))
        yearly  = normalize_optional_config(yearly_val,  ("replace-with",))
        return yearly if (billing == "yearly" and yearly) else monthly

    # ── Pro plan ($9.99) — default ───────────────────────────────────────────
    monthly_val       = current_app.config.get("PAYPAL_PLAN_ID_PRO_MONTHLY", "")
    yearly_val        = current_app.config.get("PAYPAL_PLAN_ID_PRO_YEARLY", "")
    monthly_trial_val = current_app.config.get("PAYPAL_PLAN_ID_PRO_MONTHLY_TRIAL", "")
    yearly_trial_val  = current_app.config.get("PAYPAL_PLAN_ID_PRO_YEARLY_TRIAL", "")

    monthly       = normalize_optional_config(monthly_val,       ("replace-with",))
    yearly        = normalize_optional_config(yearly_val,        ("replace-with",))
    monthly_trial = normalize_optional_config(monthly_trial_val, ("replace-with",))
    yearly_trial  = normalize_optional_config(yearly_trial_val,  ("replace-with",))

    if billing == "yearly" and trial and yearly_trial:
        return yearly_trial
    if billing == "yearly" and yearly:
        return yearly
    if trial and monthly_trial:
        return monthly_trial
    return monthly


def is_paypal_configured() -> bool:
    """Return True when all required PayPal credentials are present."""
    return bool(
        get_paypal_client_id()
        and get_paypal_client_secret()
        and (get_paypal_plan_id("monthly") or get_paypal_plan_id("yearly"))
    )


# ---------------------------------------------------------------------------
# OAuth access token (short-lived, cached per request is fine for now)
# ---------------------------------------------------------------------------

def _get_access_token() -> str:
    """Obtain a short-lived OAuth 2.0 access token from PayPal."""
    client_id = get_paypal_client_id()
    client_secret = get_paypal_client_secret()

    resp = requests.post(
        f"{_get_base_url()}/v1/oauth2/token",
        auth=(client_id, client_secret),
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


# ---------------------------------------------------------------------------
# Database — PayPal columns migration
# ---------------------------------------------------------------------------

def _ensure_paypal_columns() -> None:
    """Add paypal_subscription_id and billing_provider columns if missing."""
    with db_connection() as conn:
        if is_postgres():
            cursor = conn.cursor()
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
            )
            row = cursor.fetchone()
            if not row or not row.get("exists"):
                return
            cursor.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            )
            cols = [r["column_name"] for r in cursor.fetchall()]
        else:
            table_exists = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            ).fetchone()
            if table_exists is None:
                return
            cols = [r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()]

        if "paypal_subscription_id" not in cols:
            execute_query(conn, "ALTER TABLE users ADD COLUMN paypal_subscription_id TEXT")
        if "billing_provider" not in cols:
            execute_query(conn, "ALTER TABLE users ADD COLUMN billing_provider TEXT")


def init_paypal_db() -> None:
    """Initialize PayPal-related DB columns."""
    _ensure_paypal_columns()


# ---------------------------------------------------------------------------
# Subscription creation
# ---------------------------------------------------------------------------

def create_subscription(
    user_id: int,
    plan_id: str,
    return_url: str,
    cancel_url: str,
) -> str:
    """Create a PayPal subscription and return the approval URL.

    The user must be redirected to this URL to approve the subscription in
    their PayPal account. After approval PayPal redirects to ``return_url``.

    A free trial period is automatically added for first-time Pro subscribers
    when ``PAYPAL_TRIAL_DAYS`` is set (default: 7). Starter and Business plans
    do not get a trial unless a dedicated trial plan ID is configured.
    """
    token = _get_access_token()

    # Check if user already had a subscription (no trial for returning users)
    is_first_time = True
    try:
        with db_connection() as conn:
            row = execute_query(
                conn,
                "SELECT paypal_subscription_id FROM users WHERE id = ?"
                if not is_postgres()
                else "SELECT paypal_subscription_id FROM users WHERE id = %s",
                (user_id,),
            )
            if row and row.fetchone() and row.fetchone().get("paypal_subscription_id"):
                is_first_time = False
    except Exception:
        pass  # Non-critical — still allow subscription

    trial_days = int(current_app.config.get("PAYPAL_TRIAL_DAYS", "7"))

    payload = {
        "plan_id": plan_id,
        "custom_id": str(user_id),
        "application_context": {
            "return_url": return_url,
            "cancel_url": cancel_url,
            "brand_name": "Dociva",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
        },
    }

    # Only offer trial on Pro plans (starter/business have fixed pricing)
    is_starter  = plan_id == get_paypal_plan_id(plan="starter", billing="monthly") or \
                  plan_id == get_paypal_plan_id(plan="starter", billing="yearly")
    is_business = plan_id == get_paypal_plan_id(plan="business", billing="monthly") or \
                  plan_id == get_paypal_plan_id(plan="business", billing="yearly")

    if is_first_time and trial_days > 0 and not is_starter and not is_business:
        trial_plan_id = get_paypal_plan_id(
            "yearly" if plan_id == get_paypal_plan_id("yearly") else "monthly",
            trial=True,
        )
        if trial_plan_id and trial_plan_id != plan_id:
            payload["plan_id"] = trial_plan_id

    resp = requests.post(
        f"{_get_base_url()}/v1/billing/subscriptions",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    # Extract the approval link from HATEOAS links
    for link in data.get("links", []):
        if link.get("rel") == "approve":
            return link["href"]

    raise ValueError("PayPal subscription created but approval URL not found in response.")


# ---------------------------------------------------------------------------
# Subscription details
# ---------------------------------------------------------------------------

def get_subscription(subscription_id: str) -> dict:
    """Fetch subscription details from PayPal."""
    token = _get_access_token()
    resp = requests.get(
        f"{_get_base_url()}/v1/billing/subscriptions/{subscription_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def cancel_paypal_subscription(user_id: int) -> bool:
    """Cancel a user's active PayPal subscription."""
    with db_connection() as conn:
        sql = (
            "SELECT paypal_subscription_id FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT paypal_subscription_id FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (user_id,))
        row = cursor.fetchone()
        sub_id = row["paypal_subscription_id"] if row else None

    if not sub_id:
        return False

    token = _get_access_token()
    resp = requests.post(
        f"{_get_base_url()}/v1/billing/subscriptions/{sub_id}/cancel",
        json={"reason": "Automatic cancellation after plan limits reached."},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=10,
    )
    if resp.status_code == 204:
        logger.info("Cancelled PayPal subscription %s for user %s", sub_id, user_id)
        return True
    else:
        logger.warning(
            "Failed to cancel PayPal subscription %s for user %s: %s",
            sub_id, user_id, resp.text,
        )
        return False


# ---------------------------------------------------------------------------
# Webhook verification
# ---------------------------------------------------------------------------

def verify_webhook_signature(
    transmission_id: str,
    transmission_time: str,
    cert_url: str,
    auth_algo: str,
    transmission_sig: str,
    webhook_body: bytes,
) -> bool:
    """Verify an incoming PayPal webhook notification via the verification API.

    Uses PayPal's server-side verification endpoint — more reliable than
    local signature verification because it does not require certificate pinning.
    """
    webhook_val = current_app.config.get("PAYPAL_WEBHOOK_ID", "")
    webhook_id = normalize_optional_config(webhook_val, ("replace-with",))
    if not webhook_id:
        logger.warning("PAYPAL_WEBHOOK_ID not configured — cannot verify webhook.")
        return False

    token = _get_access_token()
    payload = {
        "auth_algo": auth_algo,
        "cert_url": cert_url,
        "transmission_id": transmission_id,
        "transmission_sig": transmission_sig,
        "transmission_time": transmission_time,
        "webhook_id": webhook_id,
        "webhook_event": json.loads(webhook_body),
    }
    try:
        resp = requests.post(
            f"{_get_base_url()}/v1/notifications/verify-webhook-signature",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        result = resp.json()
        return result.get("verification_status") == "SUCCESS"
    except Exception as exc:
        logger.error("PayPal webhook verification request failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Webhook event processing
# ---------------------------------------------------------------------------

def handle_webhook_event(event: dict) -> dict:
    """Process a verified PayPal webhook event. Returns a status dict."""
    event_type = event.get("event_type", "")
    resource = event.get("resource", {})

    handlers = {
        "BILLING.SUBSCRIPTION.ACTIVATED": _handle_subscription_activated,
        "BILLING.SUBSCRIPTION.UPDATED":   _handle_subscription_updated,
        "BILLING.SUBSCRIPTION.CANCELLED": _handle_subscription_cancelled,
        "BILLING.SUBSCRIPTION.SUSPENDED": _handle_subscription_suspended,
        "BILLING.SUBSCRIPTION.EXPIRED":   _handle_subscription_expired,
        "PAYMENT.SALE.COMPLETED":         _handle_payment_completed,
        "PAYMENT.SALE.DENIED":            _handle_payment_denied,
    }

    handler = handlers.get(event_type)
    if handler:
        handler(resource)

    return {"status": "ok", "event_type": event_type}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _find_user_by_paypal_subscription(subscription_id: str) -> dict | None:
    with db_connection() as conn:
        sql = (
            "SELECT id, email, plan FROM users WHERE paypal_subscription_id = %s"
            if is_postgres()
            else "SELECT id, email, plan FROM users WHERE paypal_subscription_id = ?"
        )
        cursor = execute_query(conn, sql, (subscription_id,))
        return row_to_dict(cursor.fetchone())


def _activate_user_plan(user_id: int, subscription_id: str, plan_type: str = "pro") -> None:
    update_user_plan(user_id, plan_type)
    with db_connection() as conn:
        sql = (
            "UPDATE users SET paypal_subscription_id = %s, billing_provider = 'paypal', updated_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE users SET paypal_subscription_id = ?, billing_provider = 'paypal', updated_at = ? WHERE id = ?"
        )
        execute_query(conn, sql, (subscription_id, _utc_now(), user_id))
    logger.info("User %s activated %s via PayPal subscription %s.", user_id, plan_type, subscription_id)


def _deactivate_user_plan(user_id: int, reason: str) -> None:
    update_user_plan(user_id, "free")
    with db_connection() as conn:
        sql = (
            "UPDATE users SET paypal_subscription_id = NULL, updated_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE users SET paypal_subscription_id = NULL, updated_at = ? WHERE id = ?"
        )
        execute_query(conn, sql, (_utc_now(), user_id))
    logger.info("User %s downgraded to Free — reason: %s.", user_id, reason)


def _resolve_plan_type_from_plan_id(plan_id: str | None) -> str:
    """Map a PayPal plan_id to our internal plan name (starter / pro / business)."""
    if not plan_id:
        return "pro"  # safe default
    try:
        if plan_id in (
            get_paypal_plan_id(plan="starter", billing="monthly"),
            get_paypal_plan_id(plan="starter", billing="yearly"),
            get_paypal_plan_id(is_micro=True),   # legacy micro → starter
        ):
            return "starter"
        if plan_id in (
            get_paypal_plan_id(plan="business", billing="monthly"),
            get_paypal_plan_id(plan="business", billing="yearly"),
        ):
            return "business"
    except Exception:
        pass
    return "pro"  # covers all pro monthly / yearly / trial plan IDs


# ---------------------------------------------------------------------------
# Webhook event handlers
# ---------------------------------------------------------------------------

def _handle_subscription_activated(resource: dict) -> None:
    subscription_id = resource.get("id")
    custom_id = resource.get("custom_id")  # set to user_id on creation
    plan_id = resource.get("plan_id")
    plan_type = _resolve_plan_type_from_plan_id(plan_id)

    if custom_id:
        _activate_user_plan(int(custom_id), subscription_id, plan_type=plan_type)
    else:
        # Fallback: look up by existing paypal_subscription_id
        user = _find_user_by_paypal_subscription(subscription_id)
        if user:
            _activate_user_plan(user["id"], subscription_id, plan_type=plan_type)


def _handle_subscription_updated(resource: dict) -> None:
    subscription_id = resource.get("id")
    status = resource.get("status", "")
    plan_id = resource.get("plan_id")
    user = _find_user_by_paypal_subscription(subscription_id)
    if not user:
        return

    if status in _ACTIVE_STATUSES:
        plan_type = _resolve_plan_type_from_plan_id(plan_id)
        update_user_plan(user["id"], plan_type)
        logger.info("User %s PayPal subscription updated — %s plan.", user["id"], plan_type)
    elif status in ("CANCELLED", "SUSPENDED", "EXPIRED"):
        _deactivate_user_plan(user["id"], f"subscription status: {status}")


def _handle_subscription_cancelled(resource: dict) -> None:
    subscription_id = resource.get("id")
    user = _find_user_by_paypal_subscription(subscription_id)
    if user:
        _deactivate_user_plan(user["id"], "subscription cancelled")


def _handle_subscription_suspended(resource: dict) -> None:
    subscription_id = resource.get("id")
    user = _find_user_by_paypal_subscription(subscription_id)
    if user:
        logger.warning("User %s PayPal subscription suspended.", user["id"])
        # Keep plan active — PayPal may reactivate on the next payment retry.
        # Downgrade only on CANCELLED or EXPIRED.


def _handle_subscription_expired(resource: dict) -> None:
    subscription_id = resource.get("id")
    user = _find_user_by_paypal_subscription(subscription_id)
    if user:
        _deactivate_user_plan(user["id"], "subscription expired")


def _handle_payment_completed(resource: dict) -> None:
    # PAYMENT.SALE.COMPLETED fires on successful recurring charge — plan stays active
    billing_agreement_id = resource.get("billing_agreement_id")
    if billing_agreement_id:
        user = _find_user_by_paypal_subscription(billing_agreement_id)
        if user:
            logger.info("PayPal recurring payment completed for user %s.", user["id"])


def _handle_payment_denied(resource: dict) -> None:
    billing_agreement_id = resource.get("billing_agreement_id")
    if billing_agreement_id:
        user = _find_user_by_paypal_subscription(billing_agreement_id)
        if user:
            logger.warning("PayPal payment denied for user %s.", user["id"])
