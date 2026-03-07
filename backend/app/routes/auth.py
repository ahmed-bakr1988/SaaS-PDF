"""Authentication routes backed by Flask sessions."""
import re

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.account_service import (
    authenticate_user,
    create_user,
    get_user_by_id,
)
from app.utils.auth import (
    get_current_user_id,
    login_user_session,
    logout_user_session,
)

auth_bp = Blueprint("auth", __name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def _parse_credentials() -> tuple[str | None, str | None]:
    """Extract normalized credential fields from a JSON request body."""
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    return email, password


def _validate_credentials(email: str, password: str) -> str | None:
    """Return an error message when credentials are invalid."""
    if not email or not EMAIL_PATTERN.match(email):
        return "A valid email address is required."
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if len(password) > MAX_PASSWORD_LENGTH:
        return f"Password must be {MAX_PASSWORD_LENGTH} characters or less."
    return None


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10/hour")
def register_route():
    """Create a new account and start an authenticated session."""
    email, password = _parse_credentials()
    validation_error = _validate_credentials(email, password)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    try:
        user = create_user(email, password)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    login_user_session(user["id"])
    return jsonify({"message": "Account created successfully.", "user": user}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20/hour")
def login_route():
    """Authenticate an existing account and start an authenticated session."""
    email, password = _parse_credentials()
    validation_error = _validate_credentials(email, password)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    user = authenticate_user(email, password)
    if user is None:
        return jsonify({"error": "Invalid email or password."}), 401

    login_user_session(user["id"])
    return jsonify({"message": "Signed in successfully.", "user": user}), 200


@auth_bp.route("/logout", methods=["POST"])
@limiter.limit("60/hour")
def logout_route():
    """End the active authenticated session."""
    logout_user_session()
    return jsonify({"message": "Signed out successfully."}), 200


@auth_bp.route("/me", methods=["GET"])
@limiter.limit("120/hour")
def me_route():
    """Return the authenticated user, if one exists in session."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"authenticated": False, "user": None}), 200

    user = get_user_by_id(user_id)
    if user is None:
        logout_user_session()
        return jsonify({"authenticated": False, "user": None}), 200

    return jsonify({"authenticated": True, "user": user}), 200
