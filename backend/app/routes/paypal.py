"""PayPal payment routes — subscription creation and webhook handling."""

import logging

from flask import Blueprint, current_app, jsonify, request

from app.extensions import limiter
from app.services.paypal_service import (
    create_subscription,
    get_paypal_plan_id,
    handle_webhook_event,
    is_paypal_configured,
    verify_webhook_signature,
)
from app.utils.auth import get_current_user_id

logger = logging.getLogger(__name__)

paypal_bp = Blueprint("paypal", __name__)


@paypal_bp.route("/create-subscription", methods=["POST"])
@limiter.limit("10/hour")
def create_subscription_route():
    """Create a PayPal subscription approval URL.

    Request body (JSON):
        plan     "starter" | "pro" | "business"  (default: "pro")
        billing  "monthly" | "yearly"             (default: "monthly")

    Returns:
        200  {"url": "<paypal_approval_url>"}
        400  Invalid plan
        401  Not authenticated
        503  PayPal not configured
        500  PayPal API error
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    if not is_paypal_configured():
        return jsonify({"error": "Payment system is not configured."}), 503

    data = request.get_json(silent=True) or {}
    billing = str(data.get("billing", "monthly")).lower()
    if billing not in ("monthly", "yearly"):
        billing = "monthly"

    # Resolve plan — support legacy "micro" as alias for "starter"
    raw_plan = str(data.get("plan", "pro")).lower()
    if raw_plan == "micro":
        raw_plan = "starter"

    valid_plans = ("starter", "pro", "business")
    if raw_plan not in valid_plans:
        return jsonify({"error": f"Invalid plan. Must be one of: {', '.join(valid_plans)}."}), 400

    plan_id = get_paypal_plan_id(billing=billing, plan=raw_plan)
    if not plan_id:
        return jsonify({"error": "Selected plan / billing cycle is not yet available."}), 503

    frontend_url = current_app.config.get("FRONTEND_URL", request.host_url.rstrip("/")).rstrip("/")
    success_url = f"{frontend_url}/account?paypal=success&plan={raw_plan}"
    cancel_url  = f"{frontend_url}/pricing?paypal=cancel"

    try:
        approval_url = create_subscription(user_id, plan_id, success_url, cancel_url)
        return jsonify({"url": approval_url}), 200
    except Exception:
        logger.exception("PayPal subscription creation failed (plan=%s billing=%s)", raw_plan, billing)
        return jsonify({"error": "Failed to create PayPal subscription. Please try again."}), 500


@paypal_bp.route("/webhook", methods=["POST"])
def paypal_webhook():
    """Handle PayPal webhook notifications.

    Signature is verified against the PayPal verification API before
    any event handler is invoked. No rate limit — PayPal signs each call.
    """
    transmission_id = request.headers.get("PAYPAL-TRANSMISSION-ID", "")
    transmission_time = request.headers.get("PAYPAL-TRANSMISSION-TIME", "")
    cert_url = request.headers.get("PAYPAL-CERT-URL", "")
    auth_algo = request.headers.get("PAYPAL-AUTH-ALGO", "")
    transmission_sig = request.headers.get("PAYPAL-TRANSMISSION-SIG", "")
    webhook_body = request.get_data()

    if not verify_webhook_signature(
        transmission_id,
        transmission_time,
        cert_url,
        auth_algo,
        transmission_sig,
        webhook_body,
    ):
        logger.warning("PayPal webhook signature verification failed.")
        return jsonify({"error": "Invalid webhook signature."}), 400

    try:
        event = request.get_json(force=True, silent=True) or {}
        result = handle_webhook_event(event)
        return jsonify(result), 200
    except Exception:
        logger.exception("PayPal webhook processing error")
        return jsonify({"error": "Webhook processing failed."}), 500
