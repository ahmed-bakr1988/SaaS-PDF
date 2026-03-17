"""Authentication routes backed by Flask sessions."""
import re

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.account_service import (
    authenticate_user,
    create_user,
    get_user_by_id,
    get_user_by_email,
    create_password_reset_token,
    verify_and_consume_reset_token,
    update_user_password,
)
from app.services.email_service import send_password_reset_email
from app.utils.auth import (
    get_current_user_id,
    login_user_session,
    logout_user_session,
)
from app.utils.csrf import get_or_create_csrf_token

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


@auth_bp.route("/csrf", methods=["GET"])
@limiter.limit("240/hour")
def csrf_route():
    """Return the active CSRF token for SPA bootstrap flows."""
    return jsonify({"csrf_token": get_or_create_csrf_token()}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5/hour")
def forgot_password_route():
    """Send a password reset email if the account exists.

    Always returns 200 to avoid leaking whether an email is registered.
    """
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()

    if not email or not EMAIL_PATTERN.match(email):
        return jsonify({"message": "If that email is registered, a reset link has been sent."}), 200

    user = get_user_by_email(email)
    if user is not None:
        token = create_password_reset_token(user["id"])
        send_password_reset_email(email, token)

    return jsonify({"message": "If that email is registered, a reset link has been sent."}), 200


@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("10/hour")
def reset_password_route():
    """Consume a reset token and set a new password."""
    data = request.get_json(silent=True) or {}
    token = str(data.get("token", "")).strip()
    password = str(data.get("password", ""))

    if not token:
        return jsonify({"error": "Reset token is required."}), 400

    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}), 400
    if len(password) > MAX_PASSWORD_LENGTH:
        return jsonify({"error": f"Password must be {MAX_PASSWORD_LENGTH} characters or less."}), 400

    user_id = verify_and_consume_reset_token(token)
    if user_id is None:
        return jsonify({"error": "Invalid or expired reset token."}), 400

    update_user_password(user_id, password)
    return jsonify({"message": "Password updated successfully. You can now sign in."}), 200
