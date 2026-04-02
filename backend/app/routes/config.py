"""Public configuration endpoint — returns dynamic upload limits."""
from flask import Blueprint, jsonify

from app.services.policy_service import (
    get_effective_file_size_limits_mb,
    get_usage_summary_for_user,
    resolve_web_actor,
    FREE_PLAN,
)
from app.services.credit_config import get_dynamic_tools_info

config_bp = Blueprint("config", __name__)


@config_bp.route("", methods=["GET"])
def get_config():
    """Return dynamic upload limits and (if logged-in) usage summary.

    Anonymous callers get free-plan limits.
    Authenticated callers get plan-aware limits + quota usage.
    """
    actor = resolve_web_actor()
    file_limits_mb = get_effective_file_size_limits_mb(actor.plan)

    payload: dict = {
        "file_limits_mb": file_limits_mb,
        "max_upload_mb": max(file_limits_mb.values()),
        "dynamic_tools": get_dynamic_tools_info(),
    }

    if actor.user_id is not None:
        payload["usage"] = get_usage_summary_for_user(actor.user_id, actor.plan)

    return jsonify(payload), 200
