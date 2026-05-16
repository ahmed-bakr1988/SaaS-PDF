"""Authenticated account endpoints — usage summary and API key management."""

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.account_service import (
    create_api_key,
    get_user_by_id,
    has_task_access,
    list_api_keys,
    record_usage_event,
    revoke_api_key,
)
from app.services.policy_service import get_usage_summary_for_user
from app.services.credit_config import (
    get_all_tool_costs,
    get_credits_for_plan,
    get_dynamic_tools_info,
    get_tool_credit_cost,
    CREDIT_WINDOW_DAYS,
)
from app.services.credit_service import deduct_credits, get_credit_summary
from app.services.quote_service import (
    create_quote,
    estimate_quote,
    fulfill_quote,
    QuoteError,
)
from app.services.stripe_service import (
    is_stripe_configured,
    get_stripe_price_id,
)
from app.services.paypal_service import (
    is_paypal_configured,
    get_paypal_plan_id,
    get_subscription as get_paypal_subscription,
)
from app.services.paymob_service import (
    is_paymob_configured,
    get_plan_amount_cents,
)
from app.utils.auth import get_current_user_id, has_session_task_access
import stripe
import logging

logger = logging.getLogger(__name__)

account_bp = Blueprint("account", __name__)


@account_bp.route("/usage", methods=["GET"])
@limiter.limit("120/hour")
def get_usage_route():
    """Return plan, quota, and effective file-size cap summary for the current user."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    return jsonify(get_usage_summary_for_user(user_id, user["plan"])), 200


@account_bp.route("/credit-info", methods=["GET"])
@limiter.limit("60/hour")
def get_credit_info_route():
    """Return public credit/pricing info (no auth required)."""
    return jsonify({
        "plans": {
            "free": {"credits": get_credits_for_plan("free"), "window_days": CREDIT_WINDOW_DAYS},
            "pro": {"credits": get_credits_for_plan("pro"), "window_days": CREDIT_WINDOW_DAYS},
        },
        "tool_costs": get_all_tool_costs(),
        "dynamic_tools": get_dynamic_tools_info(),
    }), 200


@account_bp.route("/subscription", methods=["GET"])
@limiter.limit("60/hour")
def get_subscription_status():
    """Return subscription status for the authenticated user.

    Response shape is provider-agnostic:
        plan               current plan name
        payment_provider   "paypal" | "stripe" | null
        checkout_enabled   true when a checkout flow is available
        subscription       provider-specific subscription details (or null)
        pricing            available billing cycle options
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    paypal_ok = is_paypal_configured()
    stripe_ok = is_stripe_configured()
    paymob_ok = is_paymob_configured()

    # Determine which provider this user is currently on
    billing_provider = user.get("billing_provider")
    paypal_sub_id = user.get("paypal_subscription_id")
    stripe_sub_id = user.get("stripe_subscription_id")
    paymob_txn_id = user.get("paymob_transaction_id")

    subscription_info = None

    # --- PayPal path ---
    if billing_provider == "paypal" and paypal_sub_id and paypal_ok:
        try:
            sub = get_paypal_subscription(paypal_sub_id)
            subscription_info = {
                "id": sub.get("id"),
                "status": sub.get("status"),
                "billing_info": sub.get("billing_info", {}),
                "start_time": sub.get("start_time"),
            }
        except Exception as exc:
            logger.error("Failed to retrieve PayPal subscription %s: %s", paypal_sub_id, exc)

        return jsonify({
            "plan": user["plan"],
            "payment_provider": "paypal",
            "checkout_enabled": paypal_ok,
            "subscription": subscription_info,
            "pricing": {
                "monthly_plan_id": get_paypal_plan_id("monthly"),
                "yearly_plan_id": get_paypal_plan_id("yearly"),
            },
        }), 200

    # --- Stripe path (legacy / existing subscribers) ---
    if stripe_sub_id and stripe_ok:
        try:
            from app.services.stripe_service import get_stripe_secret_key
            stripe.api_key = get_stripe_secret_key()
            s = stripe.Subscription.retrieve(stripe_sub_id)
            subscription_info = {
                "id": s.id,
                "status": s.status,
                "current_period_start": s.current_period_start,
                "current_period_end": s.current_period_end,
                "cancel_at_period_end": s.cancel_at_period_end,
                "items": [
                    {"price": item.price.id, "quantity": item.quantity}
                    for item in s.items.data
                ],
            }
        except Exception as exc:
            logger.error("Failed to retrieve Stripe subscription %s: %s", stripe_sub_id, exc)

        return jsonify({
            "plan": user["plan"],
            "payment_provider": "stripe",
            "checkout_enabled": stripe_ok,
            "subscription": subscription_info,
            "pricing": {
                "monthly_price_id": get_stripe_price_id("monthly"),
                "yearly_price_id": get_stripe_price_id("yearly"),
            },
        }), 200

    # --- No active subscription (free plan or new user) ---
    paymob_plans = {}
    if paymob_ok:
        for p in ("starter", "pro", "business"):
            for b in ("monthly", "yearly"):
                paymob_plans[f"{p}_{b}"] = get_plan_amount_cents(p, b)

    return jsonify({
        "plan": user["plan"],
        "payment_provider": None,
        "checkout_enabled": paypal_ok or stripe_ok or paymob_ok,
        "subscription": None,
        "pricing": {
            "monthly_plan_id": get_paypal_plan_id("monthly") if paypal_ok else None,
            "yearly_plan_id": get_paypal_plan_id("yearly") if paypal_ok else None,
            "paymob_plans": paymob_plans if paymob_ok else None,
        },
    }), 200


@account_bp.route("/api-keys", methods=["GET"])
@limiter.limit("60/hour")
def list_api_keys_route():
    """Return all API keys for the authenticated pro user."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    if user["plan"] != "pro":
        return jsonify({"error": "API key management requires a Pro plan."}), 403

    return jsonify({"items": list_api_keys(user_id)}), 200


@account_bp.route("/api-keys", methods=["POST"])
@limiter.limit("20/hour")
def create_api_key_route():
    """Create a new API key for the authenticated pro user."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    if user["plan"] != "pro":
        return jsonify({"error": "API key management requires a Pro plan."}), 403

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "API key name is required."}), 400

    try:
        result = create_api_key(user_id, name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result), 201


@account_bp.route("/api-keys/<int:key_id>", methods=["DELETE"])
@limiter.limit("30/hour")
def revoke_api_key_route(key_id: int):
    """Revoke one API key owned by the authenticated user."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    if not revoke_api_key(user_id, key_id):
        return jsonify({"error": "API key not found or already revoked."}), 404

    return jsonify({"message": "API key revoked."}), 200


@account_bp.route("/claim-task", methods=["POST"])
@limiter.limit("60/hour")
def claim_task_route():
    """Adopt an anonymous task into the authenticated user's history.

    Called after a guest signs up or logs in to record the previously
    processed task in their account and deduct credits.
    Uses the quote engine, so welcome bonus is applied automatically.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    data = request.get_json(silent=True) or {}
    task_id = str(data.get("task_id", "")).strip()
    tool = str(data.get("tool", "")).strip()

    if not task_id or not tool:
        return jsonify({"error": "task_id and tool are required."}), 400

    # Verify this task belongs to the caller's session
    if not has_session_task_access(task_id):
        return jsonify({"error": "Task not found in your session."}), 403

    # Skip if already claimed (idempotent)
    if has_task_access(user_id, "web", task_id):
        summary = get_credit_summary(user_id, "free")
        return jsonify({"claimed": True, "credits": summary}), 200

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    plan = user.get("plan", "free")

    # Use the quote engine (supports welcome bonus)
    try:
        quote = create_quote(user_id, plan, tool)
        fulfill_quote(quote, user_id, plan)
    except (QuoteError, ValueError) as exc:
        return jsonify({
            "error": str(exc),
            "credits_required": get_tool_credit_cost(tool),
        }), 429

    # Record usage event so the task appears in history
    record_usage_event(
        user_id=user_id,
        source="web",
        tool=tool,
        task_id=task_id,
        event_type="accepted",
        api_key_id=None,
        cost_points=quote.charged_credits,
        quoted_credits=quote.quoted_credits,
    )

    summary = get_credit_summary(user_id, plan)
    return jsonify({
        "claimed": True,
        "credits": summary,
        "welcome_bonus_applied": quote.welcome_bonus_applied,
    }), 200


@account_bp.route("/estimate", methods=["POST"])
@limiter.limit("120/hour")
def estimate_cost_route():
    """Return a non-binding credit cost estimate for a tool invocation.

    Body: { "tool": "chat-pdf", "file_size_kb": 1024, "estimated_tokens": 5000 }
    All fields except ``tool`` are optional.
    """
    user_id = get_current_user_id()

    data = request.get_json(silent=True) or {}
    tool = str(data.get("tool", "")).strip()
    if not tool:
        return jsonify({"error": "tool is required."}), 400

    file_size_kb = float(data.get("file_size_kb", 0))
    estimated_tokens = int(data.get("estimated_tokens", 0))

    user = get_user_by_id(user_id) if user_id else None
    plan = user.get("plan", "free") if user else "free"

    result = estimate_quote(user_id, plan, tool, file_size_kb, estimated_tokens)
    return jsonify(result), 200
