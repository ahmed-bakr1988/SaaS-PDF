"""Stripe payment routes — checkout, portal, and webhooks."""
import logging

from flask import Blueprint, current_app, jsonify, request, session

from app.extensions import limiter
from app.services.stripe_service import (
    create_checkout_session,
    create_portal_session,
    handle_webhook_event,
)

logger = logging.getLogger(__name__)

stripe_bp = Blueprint("stripe", __name__)


def _get_authenticated_user_id() -> int | None:
    """Return the logged-in user's ID or None."""
    return session.get("user_id")


@stripe_bp.route("/create-checkout-session", methods=["POST"])
@limiter.limit("10/hour", override_defaults=True)
def checkout():
    """Create a Stripe Checkout Session for Pro subscription."""
    user_id = _get_authenticated_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    data = request.get_json(silent=True) or {}
    billing = data.get("billing", "monthly")

    monthly_price = current_app.config.get("STRIPE_PRICE_ID_PRO_MONTHLY", "")
    yearly_price = current_app.config.get("STRIPE_PRICE_ID_PRO_YEARLY", "")
    price_id = yearly_price if billing == "yearly" and yearly_price else monthly_price

    if not price_id:
        return jsonify({"error": "Payment is not configured yet."}), 503

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    success_url = f"{frontend_url}/account?payment=success"
    cancel_url = f"{frontend_url}/pricing?payment=cancelled"

    try:
        url = create_checkout_session(user_id, price_id, success_url, cancel_url)
    except Exception as e:
        logger.exception("Stripe checkout session creation failed")
        return jsonify({"error": "Failed to create payment session."}), 500

    return jsonify({"url": url})


@stripe_bp.route("/create-portal-session", methods=["POST"])
@limiter.limit("10/hour", override_defaults=True)
def portal():
    """Create a Stripe Customer Portal session."""
    user_id = _get_authenticated_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    return_url = f"{frontend_url}/account"

    try:
        url = create_portal_session(user_id, return_url)
    except Exception as e:
        logger.exception("Stripe portal session creation failed")
        return jsonify({"error": "Failed to create portal session."}), 500

    return jsonify({"url": url})


@stripe_bp.route("/webhook", methods=["POST"])
def webhook():
    """Handle Stripe webhook events. No rate limit — Stripe signs each call."""
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature", "")

    result = handle_webhook_event(payload, sig_header)

    if result["status"] == "error":
        return jsonify(result), 400

    return jsonify(result), 200
