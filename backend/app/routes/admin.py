"""Internal admin endpoints secured by INTERNAL_ADMIN_SECRET."""
from flask import Blueprint, current_app, jsonify, request

from app.extensions import limiter
from app.services.account_service import get_user_by_id, update_user_plan

admin_bp = Blueprint("admin", __name__)


def _check_admin_secret() -> bool:
    """Return whether the request carries the correct admin secret."""
    secret = current_app.config.get("INTERNAL_ADMIN_SECRET", "")
    if not secret:
        return False
    return request.headers.get("X-Admin-Secret", "") == secret


@admin_bp.route("/users/<int:user_id>/plan", methods=["POST"])
@limiter.limit("30/hour")
def update_plan_route(user_id: int):
    """Change the plan for one user — secured by X-Admin-Secret header."""
    if not _check_admin_secret():
        return jsonify({"error": "Unauthorized."}), 401

    data = request.get_json(silent=True) or {}
    plan = str(data.get("plan", "")).strip().lower()
    if plan not in ("free", "pro"):
        return jsonify({"error": "Plan must be 'free' or 'pro'."}), 400

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    try:
        updated = update_user_plan(user_id, plan)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"message": "Plan updated.", "user": updated}), 200
