"""Social authentication helpers for Google, Facebook, and X."""

from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from flask import current_app
from requests.auth import HTTPBasicAuth


REQUEST_TIMEOUT_SECONDS = 15
SOCIAL_PROVIDERS = ("google", "facebook", "x")


class SocialAuthError(ValueError):
    """Raised when an OAuth flow cannot be completed safely."""


@dataclass(frozen=True)
class SocialProfile:
    provider: str
    provider_user_id: str
    email: str | None
    email_is_verified: bool
    display_name: str | None = None
    username: str | None = None
    avatar_url: str | None = None


def generate_social_state() -> str:
    """Return a CSRF-resistant state token for OAuth redirects."""
    return secrets.token_urlsafe(32)


def generate_pkce_verifier() -> str:
    """Return a PKCE code verifier suitable for X's OAuth 2.0 flow."""
    return secrets.token_urlsafe(64)


def build_pkce_challenge(code_verifier: str) -> str:
    """Return a base64url-encoded S256 PKCE code challenge."""
    digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def get_social_provider_payload() -> list[dict]:
    """Return public provider metadata for the frontend auth screen."""
    return [
        {
            "id": provider,
            "label": _provider_label(provider),
            "available": provider_is_configured(provider),
            "start_url": f"/api/auth/social/{provider}/start",
        }
        for provider in SOCIAL_PROVIDERS
    ]


def provider_is_configured(provider: str) -> bool:
    """Return whether the provider has the required credentials configured."""
    provider = _normalize_provider(provider)
    if provider == "google":
        return bool(
            current_app.config.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
            and current_app.config.get("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
        )
    if provider == "facebook":
        return bool(
            current_app.config.get("FACEBOOK_APP_ID", "").strip()
            and current_app.config.get("FACEBOOK_APP_SECRET", "").strip()
        )
    if provider == "x":
        return bool(
            current_app.config.get("X_CLIENT_ID", "").strip()
            and current_app.config.get("X_CLIENT_SECRET", "").strip()
        )
    raise SocialAuthError("Unsupported social provider.")


def build_authorization_url(
    provider: str,
    *,
    state: str,
    redirect_uri: str,
    code_challenge: str | None = None,
) -> str:
    """Build the provider authorization URL for the browser redirect."""
    provider = _normalize_provider(provider)
    if not provider_is_configured(provider):
        raise SocialAuthError(f"{_provider_label(provider)} sign-in is not configured.")

    if provider == "google":
        return (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            + urlencode(
                {
                    "client_id": current_app.config["GOOGLE_OAUTH_CLIENT_ID"].strip(),
                    "redirect_uri": redirect_uri,
                    "response_type": "code",
                    "scope": "openid email profile",
                    "state": state,
                    "prompt": "select_account",
                }
            )
        )

    if provider == "facebook":
        version = current_app.config.get("FACEBOOK_GRAPH_API_VERSION", "v23.0").strip() or "v23.0"
        return (
            f"https://www.facebook.com/{version}/dialog/oauth?"
            + urlencode(
                {
                    "client_id": current_app.config["FACEBOOK_APP_ID"].strip(),
                    "redirect_uri": redirect_uri,
                    "state": state,
                    "scope": "email,public_profile",
                    "response_type": "code",
                }
            )
        )

    if not code_challenge:
        raise SocialAuthError("X sign-in requires a PKCE challenge.")

    return (
        "https://x.com/i/oauth2/authorize?"
        + urlencode(
            {
                "response_type": "code",
                "client_id": current_app.config["X_CLIENT_ID"].strip(),
                "redirect_uri": redirect_uri,
                "scope": "users.read",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
    )


def exchange_code_for_profile(
    provider: str,
    *,
    code: str,
    redirect_uri: str,
    code_verifier: str | None = None,
) -> SocialProfile:
    """Exchange one OAuth code for a normalized social profile."""
    provider = _normalize_provider(provider)
    if provider == "google":
        return _exchange_google_code(code=code, redirect_uri=redirect_uri)
    if provider == "facebook":
        return _exchange_facebook_code(code=code, redirect_uri=redirect_uri)
    return _exchange_x_code(code=code, redirect_uri=redirect_uri, code_verifier=code_verifier)


def _normalize_provider(provider: str) -> str:
    normalized = str(provider).strip().lower()
    if normalized not in SOCIAL_PROVIDERS:
        raise SocialAuthError("Unsupported social provider.")
    return normalized


def _provider_label(provider: str) -> str:
    return {
        "google": "Google",
        "facebook": "Facebook",
        "x": "X",
    }[_normalize_provider(provider)]


def _extract_provider_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text.strip() or f"HTTP {response.status_code}"

    for key in ("error_description", "error", "message"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    nested_error = payload.get("error")
    if isinstance(nested_error, dict):
        for key in ("message", "error_user_msg", "detail", "type"):
            value = nested_error.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    errors = payload.get("errors")
    if isinstance(errors, list):
        for item in errors:
            if isinstance(item, dict):
                for key in ("detail", "message", "title"):
                    value = item.get(key)
                    if isinstance(value, str) and value.strip():
                        return value.strip()

    return f"HTTP {response.status_code}"


def _request_json(
    method: str,
    url: str,
    *,
    provider_label: str,
    error_context: str,
    **kwargs,
) -> dict:
    try:
        response = requests.request(method, url, timeout=REQUEST_TIMEOUT_SECONDS, **kwargs)
    except requests.RequestException as exc:
        raise SocialAuthError(
            f"{provider_label} sign-in is temporarily unavailable. Please try again."
        ) from exc

    if response.status_code >= 400:
        detail = _extract_provider_error(response)
        raise SocialAuthError(f"{provider_label} {error_context}: {detail}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise SocialAuthError(
            f"{provider_label} returned an invalid response. Please try again."
        ) from exc

    if not isinstance(payload, dict):
        raise SocialAuthError(
            f"{provider_label} returned an unexpected response. Please try again."
        )

    return payload


def _exchange_google_code(*, code: str, redirect_uri: str) -> SocialProfile:
    token_payload = _request_json(
        "POST",
        "https://oauth2.googleapis.com/token",
        provider_label="Google",
        error_context="token exchange failed",
        data={
            "code": code,
            "client_id": current_app.config["GOOGLE_OAUTH_CLIENT_ID"].strip(),
            "client_secret": current_app.config["GOOGLE_OAUTH_CLIENT_SECRET"].strip(),
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
    )
    access_token = str(token_payload.get("access_token", "")).strip()
    if not access_token:
        raise SocialAuthError("Google did not return an access token.")

    profile_payload = _request_json(
        "GET",
        "https://openidconnect.googleapis.com/v1/userinfo",
        provider_label="Google",
        error_context="profile lookup failed",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    provider_user_id = str(profile_payload.get("sub", "")).strip()
    email = str(profile_payload.get("email", "")).strip() or None
    if not provider_user_id:
        raise SocialAuthError("Google did not return a valid user profile.")

    return SocialProfile(
        provider="google",
        provider_user_id=provider_user_id,
        email=email,
        email_is_verified=bool(profile_payload.get("email_verified")),
        display_name=str(profile_payload.get("name", "")).strip() or None,
        avatar_url=str(profile_payload.get("picture", "")).strip() or None,
    )


def _exchange_facebook_code(*, code: str, redirect_uri: str) -> SocialProfile:
    version = current_app.config.get("FACEBOOK_GRAPH_API_VERSION", "v23.0").strip() or "v23.0"
    token_payload = _request_json(
        "GET",
        f"https://graph.facebook.com/{version}/oauth/access_token",
        provider_label="Facebook",
        error_context="token exchange failed",
        params={
            "client_id": current_app.config["FACEBOOK_APP_ID"].strip(),
            "client_secret": current_app.config["FACEBOOK_APP_SECRET"].strip(),
            "redirect_uri": redirect_uri,
            "code": code,
        },
    )
    access_token = str(token_payload.get("access_token", "")).strip()
    if not access_token:
        raise SocialAuthError("Facebook did not return an access token.")

    profile_payload = _request_json(
        "GET",
        f"https://graph.facebook.com/{version}/me",
        provider_label="Facebook",
        error_context="profile lookup failed",
        params={
            "fields": "id,name,email,picture.type(large)",
            "access_token": access_token,
        },
    )

    picture_data = profile_payload.get("picture")
    avatar_url = None
    if isinstance(picture_data, dict):
        data = picture_data.get("data")
        if isinstance(data, dict):
            avatar_url = str(data.get("url", "")).strip() or None

    provider_user_id = str(profile_payload.get("id", "")).strip()
    email = str(profile_payload.get("email", "")).strip() or None
    if not provider_user_id:
        raise SocialAuthError("Facebook did not return a valid user profile.")

    return SocialProfile(
        provider="facebook",
        provider_user_id=provider_user_id,
        email=email,
        # Facebook Login is used as the trust boundary for the returned email.
        email_is_verified=bool(email),
        display_name=str(profile_payload.get("name", "")).strip() or None,
        avatar_url=avatar_url,
    )


def _exchange_x_code(*, code: str, redirect_uri: str, code_verifier: str | None) -> SocialProfile:
    if not code_verifier:
        raise SocialAuthError("X sign-in could not be completed securely.")

    token_payload = _request_json(
        "POST",
        "https://api.x.com/2/oauth2/token",
        provider_label="X",
        error_context="token exchange failed",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
            "code_verifier": code_verifier,
            "client_id": current_app.config["X_CLIENT_ID"].strip(),
        },
        auth=HTTPBasicAuth(
            current_app.config["X_CLIENT_ID"].strip(),
            current_app.config["X_CLIENT_SECRET"].strip(),
        ),
    )
    access_token = str(token_payload.get("access_token", "")).strip()
    if not access_token:
        raise SocialAuthError("X did not return an access token.")

    profile_payload = _request_json(
        "GET",
        "https://api.x.com/2/users/me",
        provider_label="X",
        error_context="profile lookup failed",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "user.fields": "confirmed_email,name,profile_image_url,username,verified",
        },
    )
    profile_data = profile_payload.get("data")
    if not isinstance(profile_data, dict):
        raise SocialAuthError("X did not return a valid user profile.")

    provider_user_id = str(profile_data.get("id", "")).strip()
    email = str(profile_data.get("confirmed_email", "")).strip() or None
    if not provider_user_id:
        raise SocialAuthError("X did not return a valid user profile.")

    return SocialProfile(
        provider="x",
        provider_user_id=provider_user_id,
        email=email,
        email_is_verified=bool(email),
        display_name=str(profile_data.get("name", "")).strip() or None,
        username=str(profile_data.get("username", "")).strip() or None,
        avatar_url=str(profile_data.get("profile_image_url", "")).strip() or None,
    )
