"""PayPal payment routes — subscription creation and webhook handling."""

import logging

from flask import Blueprint, jsonify, request

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
    """Create a PayPal subscription approval URL for the Pro plan.

    Request body (JSON):
        billing  "monthly" | "yearly"  (default: "monthly")

    Returns:
        200  {"url": "<paypal_approval_url>"}
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
    plan_type = str(data.get("plan", "")).lower()
    billing = str(data.get("billing", "monthly")).lower()
    if billing not in ("monthly", "yearly"):
        billing = "monthly"

    if plan_type == "micro":
        plan_id = get_paypal_plan_id(is_micro=True)
    else:
        plan_id = get_paypal_plan_id(billing)
    if not plan_id:
        return jsonify({"error": "Selected billing cycle is not available."}), 503

    base_url = request.host_url.rstrip("/")
    success_url = f"{base_url}/account?paypal=success"
    cancel_url = f"{base_url}/pricing?paypal=cancel"

    try:
        approval_url = create_subscription(user_id, plan_id, success_url, cancel_url)
        return jsonify({"url": approval_url}), 200
    except Exception:
        logger.exception("PayPal subscription creation failed")
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
