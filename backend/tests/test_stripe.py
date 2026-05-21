"""Tests for Stripe payment routes."""
import pytest
from unittest.mock import patch, MagicMock


class TestStripeRoutes:
    """Tests for /api/stripe/ endpoints."""

    def _login(self, client, email="stripe@test.com", password="testpass123"):
        """Register and login a user."""
        client.post("/api/auth/register", json={
            "email": email, "password": password,
        })
        resp = client.post("/api/auth/login", json={
            "email": email, "password": password,
        })
        return resp.get_json()

    def test_checkout_requires_auth(self, client):
        response = client.post("/api/stripe/create-checkout-session", json={
            "billing": "monthly",
        })
        assert response.status_code == 401

    def test_checkout_no_stripe_key(self, client, app):
        """When STRIPE_PRICE_ID_PRO_MONTHLY is not set, return 503."""
        self._login(client)
        app.config["STRIPE_PRICE_ID_PRO_MONTHLY"] = ""
        app.config["STRIPE_PRICE_ID_PRO_YEARLY"] = ""
        response = client.post("/api/stripe/create-checkout-session", json={
            "billing": "monthly",
        })
        assert response.status_code == 503

    def test_checkout_placeholder_config_returns_503(self, client, app):
        """Copied sample Stripe values should be treated as not configured."""
        self._login(client, email="stripe-placeholder@test.com")
        app.config.update({
            "STRIPE_SECRET_KEY": "sk_test_XXXXXXXXXXXXXXXXXXXXXXXX",
            "STRIPE_PRICE_ID_PRO_MONTHLY": "price_XXXXXXXXXXXXXXXX",
            "STRIPE_PRICE_ID_PRO_YEARLY": "price_XXXXXXXXXXXXXXXX",
        })
        response = client.post("/api/stripe/create-checkout-session", json={
            "billing": "monthly",
        })
        assert response.status_code == 503

    def test_checkout_rejects_non_pro_plan(self, client, app):
        self._login(client, email="stripe-non-pro@test.com")
        app.config.update({
            "STRIPE_SECRET_KEY": "sk_test_valid",
            "STRIPE_PRICE_ID_PRO_MONTHLY": "price_monthly_valid",
            "STRIPE_PRICE_ID_PRO_YEARLY": "price_yearly_valid",
        })
        response = client.post("/api/stripe/create-checkout-session", json={
            "billing": "monthly",
            "plan": "starter",
        })
        assert response.status_code == 400
        assert "Pro plan only" in response.get_json().get("error", "")

    def test_checkout_rejects_invalid_billing(self, client, app):
        self._login(client, email="stripe-invalid-billing@test.com")
        response = client.post("/api/stripe/create-checkout-session", json={
            "billing": "weekly",
            "plan": "pro",
        })
        assert response.status_code == 400

    def test_portal_requires_auth(self, client):
        response = client.post("/api/stripe/create-portal-session")
        assert response.status_code == 401

    def test_portal_placeholder_config_returns_503(self, client, app):
        """Portal access should not attempt Stripe calls when config is only sample data."""
        self._login(client, email="stripe-portal@test.com")
        app.config.update({
            "STRIPE_SECRET_KEY": "sk_test_XXXXXXXXXXXXXXXXXXXXXXXX",
            "STRIPE_PRICE_ID_PRO_MONTHLY": "price_XXXXXXXXXXXXXXXX",
            "STRIPE_PRICE_ID_PRO_YEARLY": "price_XXXXXXXXXXXXXXXX",
        })
        response = client.post("/api/stripe/create-portal-session")
        assert response.status_code == 503

    def test_webhook_missing_signature(self, client):
        """Webhook without config returns ignored status."""
        response = client.post(
            "/api/stripe/webhook",
            data=b'{}',
            headers={"Stripe-Signature": "test_sig"},
        )
        data = response.get_json()
        # Without webhook secret, it should be ignored
        assert data["status"] in ("ignored", "error")
