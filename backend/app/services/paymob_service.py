"""PayMob payment service.

Handles PayMob intention creation, webhook verification,
and payment lifecycle events.

PayMob is a payment gateway popular in Egypt and the MENA region.
It supports card payments, mobile wallets, and kiosk payments.

Docs: https://docs.paymob.com/
SDK:  https://github.com/PaymobAccept/paymob-python
"""

import json
import logging
import os

import requests
from flask import current_app

from app.services.account_service import update_user_plan, _utc_now
from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict
from app.utils.config_placeholders import normalize_optional_config

logger = logging.getLogger(__name__)

# PayMob API base URLs
_PAYMOB_BASE = {
    "sandbox": "https://accept.paymob.com",
    "live": "https://accept.paymob.com",
}

# Payment intention statuses that indicate success
_PAID_STATUSES = {"SUCCESS", "PAID"}


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_env() -> str:
    return (current_app.config.get("PAYMOB_ENVIRONMENT") or os.getenv("PAYMOB_ENVIRONMENT", "sandbox")).lower()


def _get_base_url() -> str:
    return _PAYMOB_BASE.get(_get_env(), _PAYMOB_BASE["sandbox"])


def get_paymob_secret_key() -> str:
    val = current_app.config.get("PAYMOB_SECRET_KEY") or os.getenv("PAYMOB_SECRET_KEY", "")
    return normalize_optional_config(val, ("replace-with",))


def get_paymob_public_key() -> str:
    val = current_app.config.get("PAYMOB_PUBLIC_KEY") or os.getenv("PAYMOB_PUBLIC_KEY", "")
    return normalize_optional_config(val, ("replace-with",))


def get_paymob_integration_id() -> str:
    """Return the PayMob integration (payment method) ID."""
    val = current_app.config.get("PAYMOB_INTEGRATION_ID") or os.getenv("PAYMOB_INTEGRATION_ID", "")
    return normalize_optional_config(val, ("replace-with",))


def get_paymob_iframe_id() -> str:
    """Return the PayMob iframe ID for embedded checkout."""
    val = current_app.config.get("PAYMOB_IFRAME_ID") or os.getenv("PAYMOB_IFRAME_ID", "")
    return normalize_optional_config(val, ("replace-with",))


def get_paymob_hmac_secret() -> str:
    """Return the HMAC secret for webhook verification."""
    val = current_app.config.get("PAYMOB_HMAC_SECRET") or os.getenv("PAYMOB_HMAC_SECRET", "")
    return normalize_optional_config(val, ("replace-with",))


def is_paymob_configured() -> bool:
    """Return True when all required PayMob credentials are present."""
    return bool(
        get_paymob_secret_key()
        and get_paymob_public_key()
        and get_paymob_integration_id()
    )


# ---------------------------------------------------------------------------
# Database — PayMob columns migration
# ---------------------------------------------------------------------------

def _ensure_paymob_columns() -> None:
    """Add paymob_transaction_id column if missing."""
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

        if "paymob_transaction_id" not in cols:
            execute_query(conn, "ALTER TABLE users ADD COLUMN paymob_transaction_id TEXT")


def init_paymob_db() -> None:
    """Initialize PayMob-related DB columns."""
    _ensure_paymob_columns()


# ---------------------------------------------------------------------------
# Authentication — get PayMob auth token
# ---------------------------------------------------------------------------

def _get_auth_token() -> str:
    """Obtain an authentication token from PayMob."""
    secret_key = get_paymob_secret_key()
    resp = requests.post(
        f"{_get_base_url()}/api/auth/tokens",
        json={"api_key": secret_key},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["token"]


# ---------------------------------------------------------------------------
# Order & Payment Intention creation
# ---------------------------------------------------------------------------

def create_order(user_id: int, amount_cents: int, currency: str = "EGP") -> dict:
    """Create a PayMob order and return the order data.

    Args:
        user_id: The internal user ID.
        amount_cents: Amount in cents (e.g., 1000 = 10.00 EGP).
        currency: Currency code (default: EGP).

    Returns:
        dict with order id and other details.
    """
    token = _get_auth_token()

    payload = {
        "auth_token": token,
        "delivery_needed": "false",
        "amount_cents": str(amount_cents),
        "currency": currency,
        "items": [],
        "merchant_order_id": f"user_{user_id}_{_utc_now()}",
    }

    resp = requests.post(
        f"{_get_base_url()}/api/ecommerce/orders",
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def create_payment_intention(
    user_id: int,
    amount_cents: int,
    currency: str = "EGP",
    plan: str = "starter",
    billing: str = "monthly",
) -> dict:
    """Create a PayMob payment intention and return the redirect URL.

    This is the modern PayMob flow using the Intention API.

    Args:
        user_id: The internal user ID.
        amount_cents: Amount in cents.
        currency: Currency code.
        plan: Plan name (starter, pro, business).
        billing: Billing cycle (monthly, yearly).

    Returns:
        dict with 'url' (redirect URL) and 'client_secret'.
    """
    token = _get_auth_token()
    integration_id = get_paymob_integration_id()

    # Build items for the intention
    items = [
        {
            "name": f"Dociva {plan.capitalize()} Plan ({billing.capitalize()})",
            "amount_cents": str(amount_cents),
            "description": f"Dociva {plan} plan - {billing} billing",
            "quantity": "1",
        }
    ]

    payload = {
        "auth_token": token,
        "amount_cents": str(amount_cents),
        "currency": currency,
        "payment_methods": [int(integration_id)] if integration_id.isdigit() else [integration_id],
        "items": items,
        "billing_data": {
            "apartment": "NA",
            "email": f"user_{user_id}@dociva.io",
            "floor": "NA",
            "first_name": "Dociva",
            "street": "NA",
            "building": "NA",
            "phone_number": "+201000000000",
            "shipping_method": "NA",
            "postal_code": "00000",
            "city": "Cairo",
            "country": "EG",
            "last_name": "User",
            "state": "NA",
        },
        "customer": {
            "first_name": "Dociva",
            "last_name": "User",
            "email": f"user_{user_id}@dociva.io",
            "phone_number": "+201000000000",
        },
        "delivery_needed": "false",
        "special_reference": f"user_{user_id}_plan_{plan}_{billing}",
    }

    resp = requests.post(
        f"{_get_base_url()}/api/acceptance/payment_intentions",
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    # Extract the iframe URL or redirect URL
    redirect_url = data.get("redirect_url") or data.get("url")
    client_secret = data.get("client_secret")
    intention_id = data.get("id")

    return {
        "url": redirect_url,
        "client_secret": client_secret,
        "intention_id": intention_id,
        "amount_cents": amount_cents,
        "plan": plan,
        "billing": billing,
    }


def create_payment_key(
    order_id: int,
    amount_cents: int,
    currency: str = "EGP",
    integration_id: str = None,
) -> str:
    """Create a PayMob payment key for iframe checkout.

    This is the legacy flow using the payment key API.

    Args:
        order_id: PayMob order ID.
        amount_cents: Amount in cents.
        currency: Currency code.
        integration_id: Override integration ID.

    Returns:
        Payment key string.
    """
    token = _get_auth_token()
    int_id = integration_id or get_paymob_integration_id()

    payload = {
        "auth_token": token,
        "amount_cents": str(amount_cents),
        "expiration": 3600,
        "order_id": str(order_id),
        "billing_data": {
            "apartment": "NA",
            "email": "user@dociva.io",
            "floor": "NA",
            "first_name": "Dociva",
            "street": "NA",
            "building": "NA",
            "phone_number": "+201000000000",
            "shipping_method": "NA",
            "postal_code": "00000",
            "city": "Cairo",
            "country": "EG",
            "last_name": "User",
            "state": "NA",
        },
        "currency": currency,
        "integration_id": int_id,
    }

    resp = requests.post(
        f"{_get_base_url()}/api/acceptance/payment_keys",
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["token"]


# ---------------------------------------------------------------------------
# Payment key retrieval (for iframe checkout)
# ---------------------------------------------------------------------------

def get_payment_key(
    user_id: int,
    amount_cents: int,
    currency: str = "EGP",
    plan: str = "starter",
    billing: str = "monthly",
) -> dict:
    """Get a PayMob payment key for iframe-based checkout.

    Returns:
        dict with 'token' (payment key), 'iframe_id', 'order_id'.
    """
    order = create_order(user_id, amount_cents, currency)
    order_id = order["id"]

    payment_key = create_payment_key(order_id, amount_cents, currency)
    iframe_id = get_paymob_iframe_id()

    return {
        "token": payment_key,
        "iframe_id": iframe_id,
        "order_id": order_id,
        "amount_cents": amount_cents,
        "plan": plan,
        "billing": billing,
    }


# ---------------------------------------------------------------------------
# Webhook verification
# ---------------------------------------------------------------------------

def verify_webhook_signature(payload: dict) -> bool:
    """Verify an incoming PayMob webhook notification via HMAC.

    PayMob sends an HMAC signature in the webhook payload.
    We verify it using our HMAC secret.

    Args:
        payload: The webhook payload dict.

    Returns:
        True if signature is valid.
    """
    hmac_secret = get_paymob_hmac_secret()
    if not hmac_secret:
        logger.warning("PAYMOB_HMAC_SECRET not configured — cannot verify webhook.")
        return False

    import hmac
    import hashlib

    # PayMob sends the HMAC in the payload
    received_hmac = payload.get("hmac")
    if not received_hmac:
        logger.warning("PayMob webhook missing HMAC in payload.")
        return False

    # Build the message to verify (PayMob's HMAC is computed over specific fields)
    # The fields are: amount_cents, created_at, currency, error_occured, has_parent_transaction,
    #                 id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
    #                 is_standalone_payment, is_voided, order, owner, pending, source_data,
    #                 success
    fields_to_verify = [
        "amount_cents", "created_at", "currency", "error_occured",
        "has_parent_transaction", "id", "integration_id", "is_3d_secure",
        "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
        "is_voided", "order", "owner", "pending", "source_data", "success",
    ]

    message = ""
    for field in fields_to_verify:
        value = payload.get(field, "")
        if isinstance(value, dict):
            value = json.dumps(value, sort_keys=True)
        message += str(value)

    computed_hmac = hmac.new(
        hmac_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    return hmac.compare_digest(computed_hmac, received_hmac)


# ---------------------------------------------------------------------------
# Webhook event processing
# ---------------------------------------------------------------------------

def handle_webhook_event(event: dict) -> dict:
    """Process a verified PayMob webhook event. Returns a status dict."""
    success = event.get("success", False)
    obj = event.get("obj", event)  # PayMob wraps data in 'obj' sometimes

    if success:
        return _handle_payment_success(obj)
    else:
        return _handle_payment_failure(obj)


def _handle_payment_success(event: dict) -> dict:
    """Handle a successful PayMob payment."""
    transaction_id = event.get("id")
    order_data = event.get("order", {})
    merchant_order_id = order_data.get("merchant_order_id", "")
    amount_cents = event.get("amount_cents", 0)

    # Extract user_id and plan from merchant_order_id or special_reference
    # Format: user_{user_id}_plan_{plan}_{billing}
    user_id = None
    plan = "starter"
    billing = "monthly"

    # Try to extract from special_reference
    special_ref = event.get("source_data", {}).get("sub_type", "") or ""
    # Also check order metadata
    order_merchant_id = order_data.get("merchant_order_id", "")

    # Parse merchant_order_id: user_{user_id}_{timestamp}
    # Or special_reference: user_{user_id}_plan_{plan}_{billing}
    import re
    match = re.search(r"user_(\d+)", order_merchant_id or special_ref or "")
    if match:
        user_id = int(match.group(1))

    # Try to get plan from special_reference
    plan_match = re.search(r"plan_(\w+)", special_ref or "")
    if plan_match:
        plan = plan_match.group(1)

    billing_match = re.search(r"plan_\w+_(\w+)", special_ref or "")
    if billing_match:
        billing = billing_match.group(1)

    if user_id:
        _activate_user_plan(user_id, str(transaction_id), plan_type=plan)
        logger.info(
            "PayMob payment successful: user=%s, plan=%s, amount=%d cents, txn=%s",
            user_id, plan, amount_cents, transaction_id,
        )

    return {"status": "ok", "event_type": "payment_success", "transaction_id": transaction_id}


def _handle_payment_failure(event: dict) -> dict:
    """Handle a failed PayMob payment."""
    transaction_id = event.get("id")
    error_msg = event.get("error_occured", "Unknown error")

    logger.warning(
        "PayMob payment failed: txn=%s, error=%s",
        transaction_id, error_msg,
    )

    return {"status": "failed", "event_type": "payment_failure", "transaction_id": transaction_id}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _activate_user_plan(user_id: int, transaction_id: str, plan_type: str = "starter") -> None:
    """Activate a user's plan after successful PayMob payment."""
    valid_plans = {"free", "starter", "micro", "pro", "business"}
    if plan_type not in valid_plans:
        plan_type = "starter"

    update_user_plan(user_id, plan_type)
    with db_connection() as conn:
        sql = (
            "UPDATE users SET paymob_transaction_id = %s, billing_provider = 'paymob', updated_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE users SET paymob_transaction_id = ?, billing_provider = 'paymob', updated_at = ? WHERE id = ?"
        )
        execute_query(conn, sql, (transaction_id, _utc_now(), user_id))
    logger.info("User %s activated %s via PayMob transaction %s.", user_id, plan_type, transaction_id)


# ---------------------------------------------------------------------------
# Plan amount helpers
# ---------------------------------------------------------------------------

def get_plan_amount_cents(plan: str, billing: str = "monthly") -> int:
    """Return the amount in cents for a given plan and billing cycle.

    Prices are in USD. For PayMob (Egypt/MENA), we use EGP.
    Conversion rate should be configured or fetched dynamically.
    For now, we use a fixed rate (configurable via env var).
    """
    # USD prices
    prices = {
        "starter": {"monthly": 4.99, "yearly": 3.99},
        "pro": {"monthly": 9.99, "yearly": 7.99},
        "business": {"monthly": 29.99, "yearly": 24.99},
    }

    usd_price = prices.get(plan, prices["starter"]).get(billing, 4.99)

    # Get USD to EGP conversion rate from env (default: 50 EGP per USD)
    usd_to_egp = float(os.getenv("PAYMOB_USD_TO_EGP_RATE", "50"))
    egp_amount = usd_price * usd_to_egp

    # Convert to cents
    return int(egp_amount * 100)
