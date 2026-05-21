"""Tests for PayPal payment routes."""

import pytest
from unittest.mock import MagicMock, patch


class TestPayPalSubscriptionRoute:
    """Tests for POST /api/paypal/create-subscription."""

    def _login(self, client, email="paypal@test.com", password="testpass123"):
        """Register and login a test user."""
        client.post("/api/auth/register", json={"email": email, "password": password})
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        return resp.get_json()

    def test_create_subscription_requires_auth(self, client):
        """Unauthenticated request must return 401."""
        response = client.post("/api/paypal/create-subscription", json={"billing": "monthly"})
        assert response.status_code == 401

    def test_create_subscription_not_configured_returns_503(self, client, app):
        """When PayPal credentials are missing, endpoint returns 503."""
        self._login(client, email="paypal-noconfig@test.com")
        app.config["PAYPAL_CLIENT_ID"] = ""
        app.config["PAYPAL_CLIENT_SECRET"] = ""
        app.config["PAYPAL_PLAN_ID_PRO_MONTHLY"] = ""
        app.config["PAYPAL_PLAN_ID_PRO_YEARLY"] = ""
        response = client.post("/api/paypal/create-subscription", json={"billing": "monthly"})
        assert response.status_code == 503

    def test_create_subscription_placeholder_returns_503(self, client, app):
        """Placeholder/sample PayPal values should be treated as not configured."""
        self._login(client, email="paypal-placeholder@test.com")
        app.config.update({
            "PAYPAL_CLIENT_ID": "replace-with-client-id",
            "PAYPAL_CLIENT_SECRET": "replace-with-client-secret",
            "PAYPAL_PLAN_ID_PRO_MONTHLY": "replace-with-plan-id",
        })
        response = client.post("/api/paypal/create-subscription", json={"billing": "monthly"})
        assert response.status_code == 503

    def test_create_subscription_returns_approval_url(self, client, app):
        """When PayPal is configured and API call succeeds, return the approval URL."""
        self._login(client, email="paypal-success@test.com")
        app.config.update({
            "PAYPAL_CLIENT_ID": "AY_test_client_id",
            "PAYPAL_CLIENT_SECRET": "AY_test_secret",
            "PAYPAL_PLAN_ID_PRO_MONTHLY": "P-1234567890",
            "PAYPAL_ENVIRONMENT": "sandbox",
        })
        with patch("app.routes.paypal.create_subscription") as mock_create, \
             patch("app.routes.paypal.is_paypal_configured", return_value=True), \
             patch("app.routes.paypal.get_paypal_plan_id", return_value="P-1234567890"):
            mock_create.return_value = "https://www.sandbox.paypal.com/checkoutnow?token=TEST"
            response = client.post("/api/paypal/create-subscription", json={"billing": "monthly"})

        assert response.status_code == 200
        data = response.get_json()
        assert "url" in data
        assert "paypal.com" in data["url"]

    def test_create_subscription_yearly_billing(self, client, app):
        """yearly billing parameter should be passed to create_subscription."""
        self._login(client, email="paypal-yearly@test.com")
        with patch("app.routes.paypal.create_subscription") as mock_create, \
             patch("app.routes.paypal.is_paypal_configured", return_value=True), \
             patch("app.routes.paypal.get_paypal_plan_id", return_value="P-9999999999"):
            mock_create.return_value = "https://www.sandbox.paypal.com/checkoutnow?token=YEARLY"
            response = client.post("/api/paypal/create-subscription", json={"billing": "yearly"})

        assert response.status_code == 200

    def test_create_subscription_uses_frontend_return_urls(self, client, app):
        """Approval return/cancel URLs should target configured frontend domain."""
        self._login(client, email="paypal-frontend-url@test.com")
        app.config["FRONTEND_URL"] = "https://app.dociva.test"
        with patch("app.routes.paypal.is_paypal_configured", return_value=True), \
             patch("app.routes.paypal.get_paypal_plan_id", return_value="P-1234567890"), \
             patch("app.routes.paypal.create_subscription") as mock_create:
            mock_create.return_value = "https://www.sandbox.paypal.com/checkoutnow?token=TEST"
            response = client.post("/api/paypal/create-subscription", json={"billing": "monthly", "plan": "pro"})

        assert response.status_code == 200
        _, _, success_url, cancel_url = mock_create.call_args.args
        assert success_url.startswith("https://app.dociva.test/account")
        assert cancel_url.startswith("https://app.dociva.test/pricing")

    def test_create_subscription_api_error_returns_500(self, client, app):
        """When PayPal API call fails, endpoint returns 500."""
        self._login(client, email="paypal-apierror@test.com")
        with patch("app.routes.paypal.is_paypal_configured", return_value=True), \
             patch("app.routes.paypal.get_paypal_plan_id", return_value="P-1234567890"), \
             patch("app.routes.paypal.create_subscription", side_effect=Exception("API error")):
            response = client.post("/api/paypal/create-subscription", json={"billing": "monthly"})

        assert response.status_code == 500


class TestPayPalWebhook:
    """Tests for POST /api/paypal/webhook."""

    def test_webhook_invalid_signature_returns_400(self, client, app):
        """Webhook with failed signature verification must return 400."""
        with patch("app.routes.paypal.verify_webhook_signature", return_value=False):
            response = client.post(
                "/api/paypal/webhook",
                data=b'{"event_type": "BILLING.SUBSCRIPTION.ACTIVATED", "resource": {}}',
                content_type="application/json",
                headers={
                    "PAYPAL-TRANSMISSION-ID": "test-id",
                    "PAYPAL-TRANSMISSION-TIME": "2026-01-01T00:00:00Z",
                    "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/test",
                    "PAYPAL-AUTH-ALGO": "SHA256withRSA",
                    "PAYPAL-TRANSMISSION-SIG": "test-sig",
                },
            )
        assert response.status_code == 400

    def test_webhook_valid_signature_processes_event(self, client, app):
        """Webhook with valid signature should process event and return 200."""
        with patch("app.routes.paypal.verify_webhook_signature", return_value=True), \
             patch("app.routes.paypal.handle_webhook_event", return_value={"status": "ok", "event_type": "BILLING.SUBSCRIPTION.ACTIVATED"}):
            response = client.post(
                "/api/paypal/webhook",
                data=b'{"event_type": "BILLING.SUBSCRIPTION.ACTIVATED", "resource": {"id": "I-SUB123", "custom_id": "1", "status": "ACTIVE"}}',
                content_type="application/json",
                headers={
                    "PAYPAL-TRANSMISSION-ID": "test-id",
                    "PAYPAL-TRANSMISSION-TIME": "2026-01-01T00:00:00Z",
                    "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/test",
                    "PAYPAL-AUTH-ALGO": "SHA256withRSA",
                    "PAYPAL-TRANSMISSION-SIG": "valid-sig",
                },
            )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"

    def test_webhook_is_csrf_exempt(self, client, app):
        """PayPal webhook endpoint must not require CSRF token."""
        with patch("app.routes.paypal.verify_webhook_signature", return_value=True), \
             patch("app.routes.paypal.handle_webhook_event", return_value={"status": "ok", "event_type": "TEST"}):
            # POST without X-CSRF-Token header — should not return 403
            response = client.post(
                "/api/paypal/webhook",
                data=b'{"event_type": "TEST", "resource": {}}',
                content_type="application/json",
            )
        # Should not be blocked by CSRF (400 from signature check is ok, not 403)
        assert response.status_code != 403


class TestAccountSubscriptionProviderAgnostic:
    """Tests for GET /api/account/subscription — provider-agnostic shape."""

    def _login(self, client, email="sub@test.com", password="testpass123"):
        client.post("/api/auth/register", json={"email": email, "password": password})
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        return resp.get_json()

    def test_subscription_requires_auth(self, client):
        response = client.get("/api/account/subscription")
        assert response.status_code == 401

    def test_subscription_free_user_no_provider(self, client, app):
        """Free user with no active subscription should get provider-agnostic free plan info."""
        self._login(client, email="sub-free@test.com")
        app.config["PAYPAL_CLIENT_ID"] = ""
        app.config["PAYPAL_CLIENT_SECRET"] = ""
        app.config["PAYPAL_PLAN_ID_PRO_MONTHLY"] = ""
        app.config["STRIPE_SECRET_KEY"] = ""
        response = client.get("/api/account/subscription")
        assert response.status_code == 200
        data = response.get_json()
        assert "plan" in data
        assert "payment_provider" in data
        assert "checkout_enabled" in data
        assert "subscription" in data
        assert data["payment_provider"] is None

    def test_subscription_response_has_required_keys(self, client):
        """Subscription response must always include the four standard keys."""
        self._login(client, email="sub-keys@test.com")
        response = client.get("/api/account/subscription")
        assert response.status_code == 200
        data = response.get_json()
        for key in ("plan", "payment_provider", "checkout_enabled", "subscription"):
            assert key in data, f"Missing key in subscription response: {key}"

    def test_subscription_includes_payment_methods_and_pricing_metadata(self, client):
        self._login(client, email="sub-methods@test.com")
        with patch("app.routes.account.is_paypal_configured", return_value=True), \
             patch("app.routes.account.is_stripe_configured", return_value=True), \
             patch("app.routes.account.is_paymob_configured", return_value=False), \
             patch("app.routes.account.get_paypal_plan_id", side_effect=lambda billing="monthly", plan="pro": f"paypal-{plan}-{billing}"), \
             patch("app.routes.account.get_stripe_price_id", side_effect=lambda billing="monthly": f"stripe-{billing}"):
            response = client.get("/api/account/subscription")

        assert response.status_code == 200
        data = response.get_json()
        assert data["pricing"]["monthly_price_id"] == "stripe-monthly"
        assert data["pricing"]["yearly_price_id"] == "stripe-yearly"
        assert isinstance(data["payment_methods"], list)
        assert {m["id"] for m in data["payment_methods"]} == {"paypal", "stripe", "paymob"}
