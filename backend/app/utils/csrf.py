"""Lightweight CSRF protection for browser-originated session requests."""
import secrets

from flask import current_app, request, session

CSRF_SESSION_KEY = "csrf_token"
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
_EXEMPT_PATHS = {
    "/api/stripe/webhook",
}


class CSRFError(Exception):
    """Raised when CSRF validation fails."""

    def __init__(self, message: str = "Invalid CSRF token.", status_code: int = 403):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_or_create_csrf_token() -> str:
    """Return the current CSRF token, creating one when missing."""
    token = session.get(CSRF_SESSION_KEY)
    if not isinstance(token, str) or not token:
        token = secrets.token_urlsafe(32)
        session[CSRF_SESSION_KEY] = token
    return token


def should_enforce_csrf() -> bool:
    """Return whether the current request should pass CSRF validation."""
    if request.method.upper() in _SAFE_METHODS:
        return False

    if not request.path.startswith("/api/"):
        return False

    if request.path in _EXEMPT_PATHS:
        return False

    if request.headers.get("X-API-Key", "").strip():
        return False

    return True


def validate_csrf_request():
    """Validate the current request against the active browser CSRF token."""
    session_token = session.get(CSRF_SESSION_KEY)
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    header_token = request.headers.get(CSRF_HEADER_NAME, "").strip()

    if not isinstance(session_token, str) or not session_token:
        raise CSRFError("CSRF session token is missing.")

    if not cookie_token or cookie_token != session_token:
        raise CSRFError("CSRF cookie token is missing or invalid.")

    if not header_token or header_token != session_token:
        raise CSRFError("CSRF header token is missing or invalid.")


def apply_csrf_cookie(response):
    """Persist the active CSRF token into a readable cookie for the SPA."""
    token = get_or_create_csrf_token()
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        secure=bool(current_app.config.get("SESSION_COOKIE_SECURE", False)),
        httponly=False,
        samesite=current_app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
        path="/",
    )
    return response
