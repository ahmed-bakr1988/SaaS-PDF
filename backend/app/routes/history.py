"""Authenticated file history routes."""
from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.account_service import get_user_by_id, list_file_history
from app.services.policy_service import get_history_limit
from app.utils.auth import get_current_user_id

history_bp = Blueprint("history", __name__)


@history_bp.route("/history", methods=["GET"])
@limiter.limit("120/hour")
def list_history_route():
    """Return recent generated-file history for the authenticated user."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    plan_limit = get_history_limit(user["plan"])

    try:
        requested = int(request.args.get("limit", plan_limit))
    except ValueError:
        requested = plan_limit

    limit = max(1, min(plan_limit, requested))
    return jsonify({"items": list_file_history(user_id, limit=limit)}), 200
