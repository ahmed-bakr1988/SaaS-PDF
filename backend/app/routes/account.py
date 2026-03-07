"""Authenticated account endpoints — usage summary and API key management."""
from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.account_service import (
    create_api_key,
    get_user_by_id,
    list_api_keys,
    revoke_api_key,
)
from app.services.policy_service import get_usage_summary_for_user
from app.utils.auth import get_current_user_id

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
