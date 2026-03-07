"""Tests for forgot-password and reset-password endpoints."""
import pytest
from unittest.mock import patch


class TestForgotPassword:
    """Tests for POST /api/auth/forgot-password."""

    def test_forgot_password_returns_200_for_unknown_email(self, client):
        """Should always return 200 to avoid leaking registration info."""
        resp = client.post("/api/auth/forgot-password", json={
            "email": "doesnotexist@example.com",
        })
        assert resp.status_code == 200
        assert "message" in resp.get_json()

    def test_forgot_password_returns_200_for_registered_email(self, client):
        """Should return 200 and trigger email sending."""
        client.post("/api/auth/register", json={
            "email": "reset_user@example.com",
            "password": "TestPassword123!",
        })
        client.post("/api/auth/logout")

        with patch("app.routes.auth.send_password_reset_email") as mock_send:
            mock_send.return_value = True
            resp = client.post("/api/auth/forgot-password", json={
                "email": "reset_user@example.com",
            })
            assert resp.status_code == 200
            mock_send.assert_called_once()

    def test_forgot_password_bad_email_format(self, client):
        """Still returns 200 even for bad email format (no info leak)."""
        resp = client.post("/api/auth/forgot-password", json={
            "email": "not-an-email",
        })
        assert resp.status_code == 200


class TestResetPassword:
    """Tests for POST /api/auth/reset-password."""

    def test_reset_password_missing_token(self, client):
        """Should reject when token is empty."""
        resp = client.post("/api/auth/reset-password", json={
            "token": "",
            "password": "NewPassword123!",
        })
        assert resp.status_code == 400

    def test_reset_password_invalid_token(self, client):
        """Should reject unknown token."""
        resp = client.post("/api/auth/reset-password", json={
            "token": "totally-invalid-token",
            "password": "NewPassword123!",
        })
        assert resp.status_code == 400

    def test_reset_password_short_password(self, client):
        """Should reject short passwords."""
        resp = client.post("/api/auth/reset-password", json={
            "token": "some-token",
            "password": "short",
        })
        assert resp.status_code == 400

    def test_reset_password_full_flow(self, client, app):
        """Register → forgot → get token → reset → login with new password."""
        # Register
        client.post("/api/auth/register", json={
            "email": "fullreset@example.com",
            "password": "OldPassword123!",
        })
        client.post("/api/auth/logout")

        # Create reset token directly
        from app.services.account_service import get_user_by_email, create_password_reset_token

        with app.app_context():
            user = get_user_by_email("fullreset@example.com")
            token = create_password_reset_token(user["id"])

        # Reset
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "password": "NewPassword123!",
        })
        assert resp.status_code == 200

        # Login with new password
        resp = client.post("/api/auth/login", json={
            "email": "fullreset@example.com",
            "password": "NewPassword123!",
        })
        assert resp.status_code == 200

        # Old password should fail
        client.post("/api/auth/logout")
        resp = client.post("/api/auth/login", json={
            "email": "fullreset@example.com",
            "password": "OldPassword123!",
        })
        assert resp.status_code == 401

    def test_reset_token_cannot_be_reused(self, client, app):
        """A reset token should be consumed on use and fail on second use."""
        client.post("/api/auth/register", json={
            "email": "reuse@example.com",
            "password": "OldPassword123!",
        })
        client.post("/api/auth/logout")

        from app.services.account_service import get_user_by_email, create_password_reset_token

        with app.app_context():
            user = get_user_by_email("reuse@example.com")
            token = create_password_reset_token(user["id"])

        # First use — should succeed
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "password": "NewPassword123!",
        })
        assert resp.status_code == 200

        # Second use — should fail
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "password": "AnotherPassword123!",
        })
        assert resp.status_code == 400
