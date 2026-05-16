"""PayMob payment routes — intention creation, iframe checkout, and webhook handling."""

import logging

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.paymob_service import (
    create_payment_intention,
    get_payment_key,
    get_plan_amount_cents,
    handle_webhook_event,
    is_paymob_configured,
    verify_webhook_signature,
)
from app.utils.auth import get_current_user_id

logger = logging.getLogger(__name__)

paymob_bp = Blueprint("paymob", __name__)


@paymob_bp.route("/create-intention", methods=["POST"])
@limiter.limit("10/hour")
def create_intention_route():
    """Create a PayMob payment intention and return the redirect URL.

    Request body (JSON):
        plan     "starter" | "pro" | "business"  (default: "starter")
        billing  "monthly" | "yearly"             (default: "monthly")

    Returns:
        200  {"url": "<paymob_redirect_url>", "client_secret": "...", "intention_id": "..."}
        400  Invalid plan
        401  Not authenticated
        503  PayMob not configured
        500  PayMob API error
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    if not is_paymob_configured():
        return jsonify({"error": "Payment system is not configured."}), 503

    data = request.get_json(silent=True) or {}
    billing = str(data.get("billing", "monthly")).lower()
    if billing not in ("monthly", "yearly"):
        billing = "monthly"

    raw_plan = str(data.get("plan", "starter")).lower()
    if raw_plan == "micro":
        raw_plan = "starter"

    valid_plans = ("starter", "pro", "business")
    if raw_plan not in valid_plans:
        return jsonify({"error": f"Invalid plan. Must be one of: {', '.join(valid_plans)}."}), 400

    amount_cents = get_plan_amount_cents(raw_plan, billing)

    try:
        result = create_payment_intention(user_id, amount_cents, "EGP", raw_plan, billing)
        return jsonify(result), 200
    except Exception:
        logger.exception("PayMob intention creation failed (plan=%s billing=%s)", raw_plan, billing)
        return jsonify({"error": "Failed to create PayMob payment intention. Please try again."}), 500


@paymob_bp.route("/payment-key", methods=["POST"])
@limiter.limit("10/hour")
def payment_key_route():
    """Get a PayMob payment key for iframe-based checkout.

    Request body (JSON):
        plan     "starter" | "pro" | "business"  (default: "starter")
        billing  "monthly" | "yearly"             (default: "monthly")

    Returns:
        200  {"token": "<payment_key>", "iframe_id": "...", "order_id": "..."}
        400  Invalid plan
        401  Not authenticated
        503  PayMob not configured
        500  PayMob API error
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    if not is_paymob_configured():
        return jsonify({"error": "Payment system is not configured."}), 503

    data = request.get_json(silent=True) or {}
    billing = str(data.get("billing", "monthly")).lower()
    if billing not in ("monthly", "yearly"):
        billing = "monthly"

    raw_plan = str(data.get("plan", "starter")).lower()
    if raw_plan == "micro":
        raw_plan = "starter"

    valid_plans = ("starter", "pro", "business")
    if raw_plan not in valid_plans:
        return jsonify({"error": f"Invalid plan. Must be one of: {', '.join(valid_plans)}."}), 400

    amount_cents = get_plan_amount_cents(raw_plan, billing)

    try:
        result = get_payment_key(user_id, amount_cents, "EGP", raw_plan, billing)
        return jsonify(result), 200
    except Exception:
        logger.exception("PayMob payment key creation failed (plan=%s billing=%s)", raw_plan, billing)
        return jsonify({"error": "Failed to create PayMob payment key. Please try again."}), 500


@paymob_bp.route("/webhook", methods=["POST"])
def paymob_webhook():
    """Handle PayMob webhook notifications.

    Signature is verified via HMAC before any event handler is invoked.
    No rate limit — PayMob signs each call.
    """
    try:
        event = request.get_json(force=True, silent=True) or {}
    except Exception:
        logger.warning("PayMob webhook: invalid JSON payload.")
        return jsonify({"error": "Invalid JSON payload."}), 400

    if not verify_webhook_signature(event):
        logger.warning("PayMob webhook signature verification failed.")
        return jsonify({"error": "Invalid webhook signature."}), 400

    try:
        result = handle_webhook_event(event)
        return jsonify(result), 200
    except Exception:
        logger.exception("PayMob webhook processing error")
        return jsonify({"error": "Webhook processing failed."}), 500


@paymob_bp.route("/config", methods=["GET"])
@limiter.limit("60/hour")
def paymob_config_route():
    """Return PayMob public configuration for the frontend.

    Returns:
        200  {"enabled": true, "public_key": "...", "iframe_id": "..."}
        503  PayMob not configured
    """
    if not is_paymob_configured():
        return jsonify({"enabled": False}), 503

    from app.services.paymob_service import get_paymob_public_key, get_paymob_iframe_id

    return jsonify({
        "enabled": True,
        "public_key": get_paymob_public_key(),
        "iframe_id": get_paymob_iframe_id(),
    }), 200
