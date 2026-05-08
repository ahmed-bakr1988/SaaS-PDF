"""Authentication routes backed by Flask sessions."""
import hmac
import re
from urllib.parse import urlencode

from flask import Blueprint, current_app, jsonify, redirect, request, session

from app.extensions import limiter
from app.services.account_service import (
    authenticate_user,
    create_user,
    get_user_by_id,
    get_user_by_email,
    create_password_reset_token,
    resolve_user_for_oauth_login,
    verify_and_consume_reset_token,
    update_user_password,
)
from app.services.credit_service import get_credit_summary
from app.services.email_service import send_password_reset_email
from app.services.social_auth_service import (
    SocialAuthError,
    build_authorization_url,
    build_pkce_challenge,
    exchange_code_for_profile,
    generate_pkce_verifier,
    generate_social_state,
    get_social_provider_payload,
)
from app.utils.auth import (
    get_current_user_id,
    login_user_session,
    logout_user_session,
    pop_new_account_flag,
)
from app.utils.csrf import get_or_create_csrf_token

auth_bp = Blueprint("auth", __name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
SOCIAL_AUTH_SESSION_KEY = "social_auth_flow"
SUPPORTED_SOCIAL_PROVIDERS = {"google", "facebook", "x"}


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


def _normalize_social_provider(provider: str) -> str:
    normalized = str(provider).strip().lower()
    if normalized not in SUPPORTED_SOCIAL_PROVIDERS:
        raise SocialAuthError("Unsupported social provider.")
    return normalized


def _provider_label(provider: str) -> str:
    return {
        "google": "Google",
        "facebook": "Facebook",
        "x": "X",
    }[_normalize_social_provider(provider)]


def _frontend_account_redirect(error_message: str | None = None) -> str:
    base_url = current_app.config["FRONTEND_URL"].rstrip("/")
    account_url = f"{base_url}/account"
    if not error_message:
        return account_url
    return f"{account_url}?{urlencode({'auth_error': error_message})}"


def _social_redirect_uri(provider: str) -> str:
    public_api_base = current_app.config["BACKEND_PUBLIC_URL"].rstrip("/")
    normalized_provider = _normalize_social_provider(provider)
    return f"{public_api_base}/api/auth/social/{normalized_provider}/callback"


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10/hour")
def register_route():
    try:
        email, password = _parse_credentials()
        validation_error = _validate_credentials(email, password)
        if validation_error:
            return jsonify({"error": validation_error}), 400

        try:
            user = create_user(email, password)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 409

        login_user_session(user["id"])
        credits = get_credit_summary(user["id"], user.get("plan", "free"))
        return (
            jsonify(
                {
                    "message": "Account created successfully.",
                    "user": user,
                    "credits": credits,
                    "is_new_account": True,
                }
            ),
            201,
        )
    except Exception as exc:
        import traceback
        return jsonify({"error": f"Server Error: {str(exc)}\n{traceback.format_exc()}"}), 500


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20/hour")
def login_route():
    try:
        email, password = _parse_credentials()
        validation_error = _validate_credentials(email, password)
        if validation_error:
            return jsonify({"error": validation_error}), 400

        user = authenticate_user(email, password)
        if user is None:
            return jsonify({"error": "Invalid email or password."}), 401

        login_user_session(user["id"])
        credits = get_credit_summary(user["id"], user.get("plan", "free"))
        return (
            jsonify(
                {
                    "message": "Signed in successfully.",
                    "user": user,
                    "credits": credits,
                }
            ),
            200,
        )
    except Exception as exc:
        import traceback
        return jsonify({"error": f"Server Error: {str(exc)}\n{traceback.format_exc()}"}), 500


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

    credits = get_credit_summary(user_id, user.get("plan", "free"))
    return jsonify({
        "authenticated": True,
        "user": user,
        "credits": credits,
        "is_new_account": pop_new_account_flag(),
    }), 200


@auth_bp.route("/providers", methods=["GET"])
@limiter.limit("240/hour")
def providers_route():
    """Return social providers and whether each one is currently configured."""
    return jsonify({"providers": get_social_provider_payload()}), 200


@auth_bp.route("/social/<provider>/start", methods=["GET"])
@limiter.limit("60/hour")
def social_start_route(provider: str):
    """Begin a provider OAuth redirect from the account page."""
    try:
        normalized_provider = _normalize_social_provider(provider)
        state = generate_social_state()
        code_verifier = generate_pkce_verifier() if normalized_provider == "x" else None
        redirect_uri = _social_redirect_uri(normalized_provider)
        authorization_url = build_authorization_url(
            normalized_provider,
            state=state,
            redirect_uri=redirect_uri,
            code_challenge=build_pkce_challenge(code_verifier) if code_verifier else None,
        )
    except SocialAuthError as exc:
        return redirect(_frontend_account_redirect(str(exc)))

    session[SOCIAL_AUTH_SESSION_KEY] = {
        "provider": normalized_provider,
        "state": state,
        "code_verifier": code_verifier,
    }
    return redirect(authorization_url)


@auth_bp.route("/social/<provider>/callback", methods=["GET"])
@limiter.limit("120/hour")
def social_callback_route(provider: str):
    """Complete a provider OAuth callback and start the app session."""
    try:
        normalized_provider = _normalize_social_provider(provider)
    except SocialAuthError as exc:
        return redirect(_frontend_account_redirect(str(exc)))

    provider_error = str(
        request.args.get("error_description")
        or request.args.get("error")
        or request.args.get("error_reason")
        or ""
    ).strip()
    if provider_error:
        return redirect(
            _frontend_account_redirect(
                f"{_provider_label(normalized_provider)} sign-in was not completed."
            )
        )

    code = str(request.args.get("code", "")).strip()
    state = str(request.args.get("state", "")).strip()
    stored_flow = session.pop(SOCIAL_AUTH_SESSION_KEY, None)
    if not code or not state:
        return redirect(_frontend_account_redirect("Social sign-in could not be completed."))

    if (
        not isinstance(stored_flow, dict)
        or stored_flow.get("provider") != normalized_provider
        or not hmac.compare_digest(stored_flow.get("state", ""), state)
    ):
        return redirect(
            _frontend_account_redirect("Your social sign-in session expired. Please try again.")
        )

    try:
        profile = exchange_code_for_profile(
            normalized_provider,
            code=code,
            redirect_uri=_social_redirect_uri(normalized_provider),
            code_verifier=stored_flow.get("code_verifier"),
        )
        user, is_new_account = resolve_user_for_oauth_login(
            normalized_provider,
            profile.provider_user_id,
            profile.email,
            profile.email_is_verified,
            provider_username=profile.username,
        )
    except (SocialAuthError, ValueError) as exc:
        return redirect(_frontend_account_redirect(str(exc)))

    login_user_session(int(user["id"]), mark_new_account=is_new_account)
    return redirect(_frontend_account_redirect())


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
