"""Tests for PayMob payment routes."""

import pytest
import hmac
import hashlib
import json
from unittest.mock import MagicMock, patch
from app.services.paymob_service import verify_webhook_signature


class TestPayMobIntentionRoute:
    """Tests for POST /api/paymob/create-intention."""

    def _login(self, client, email="paymob@test.com", password="testpass123"):
        """Register and login a test user."""
        client.post("/api/auth/register", json={"email": email, "password": password})
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        return resp.get_json()

    def test_create_intention_requires_auth(self, client):
        """Unauthenticated request must return 401."""
        response = client.post("/api/paymob/create-intention", json={"billing": "monthly"})
        assert response.status_code == 401

    def test_create_intention_not_configured_returns_503(self, client, app):
        """When PayMob credentials are missing, endpoint returns 503."""
        self._login(client, email="paymob-noconfig@test.com")
        app.config["PAYMOB_SECRET_KEY"] = ""
        app.config["PAYMOB_PUBLIC_KEY"] = ""
        app.config["PAYMOB_INTEGRATION_ID"] = ""
        response = client.post("/api/paymob/create-intention", json={"billing": "monthly"})
        assert response.status_code == 503

    def test_create_intention_placeholder_returns_503(self, client, app):
        """Placeholder/sample PayMob values should be treated as not configured."""
        self._login(client, email="paymob-placeholder@test.com")
        app.config.update({
            "PAYMOB_SECRET_KEY": "replace-with-secret-key",
            "PAYMOB_PUBLIC_KEY": "replace-with-public-key",
            "PAYMOB_INTEGRATION_ID": "replace-with-integration-id",
        })
        response = client.post("/api/paymob/create-intention", json={"billing": "monthly"})
        assert response.status_code == 503

    def test_create_intention_returns_url(self, client, app):
        """When PayMob is configured and API call succeeds, return the redirect URL."""
        self._login(client, email="paymob-success@test.com")
        app.config.update({
            "PAYMOB_SECRET_KEY": "sk_test_123456",
            "PAYMOB_PUBLIC_KEY": "pk_test_123456",
            "PAYMOB_INTEGRATION_ID": "123456",
            "PAYMOB_ENVIRONMENT": "sandbox",
        })
        with patch("app.routes.paymob.create_payment_intention") as mock_create, \
             patch("app.routes.paymob.is_paymob_configured", return_value=True), \
             patch("app.routes.paymob.get_plan_amount_cents", return_value=10000):
            mock_create.return_value = {
                "url": "https://accept.paymob.com/...",
                "client_secret": "cs_test_123",
                "intention_id": "int_123",
            }
            response = client.post("/api/paymob/create-intention", json={"billing": "monthly"})

        assert response.status_code == 200
        data = response.get_json()
        assert "url" in data
        assert "paymob.com" in data["url"]

    def test_create_intention_yearly_billing(self, client, app):
        """yearly billing parameter should be passed."""
        self._login(client, email="paymob-yearly@test.com")
        with patch("app.routes.paymob.is_paymob_configured", return_value=True), \
             patch("app.routes.paymob.get_plan_amount_cents", return_value=10000), \
             patch("app.routes.paymob.create_payment_intention") as mock_create:
            mock_create.return_value = {"url": "https://accept.paymob.com/..."}
            response = client.post("/api/paymob/create-intention", json={"billing": "yearly"})

        assert response.status_code == 200

    def test_create_intention_api_error_returns_500(self, client, app):
        """When PayMob API call fails, endpoint returns 500."""
        self._login(client, email="paymob-apierror@test.com")
        with patch("app.routes.paymob.is_paymob_configured", return_value=True), \
             patch("app.routes.paymob.get_plan_amount_cents", return_value=10000), \
             patch("app.routes.paymob.create_payment_intention", side_effect=Exception("API error")):
            response = client.post("/api/paymob/create-intention", json={"billing": "monthly"})

        assert response.status_code == 500


class TestPayMobPaymentKeyRoute:
    """Tests for POST /api/paymob/payment-key."""

    def _login(self, client, email="paymob-key@test.com", password="testpass123"):
        client.post("/api/auth/register", json={"email": email, "password": password})
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        return resp.get_json()

    def test_payment_key_requires_auth(self, client):
        response = client.post("/api/paymob/payment-key", json={"billing": "monthly"})
        assert response.status_code == 401

    def test_payment_key_not_configured_returns_503(self, client, app):
        self._login(client)
        app.config["PAYMOB_SECRET_KEY"] = ""
        app.config["PAYMOB_PUBLIC_KEY"] = ""
        app.config["PAYMOB_INTEGRATION_ID"] = ""
        response = client.post("/api/paymob/payment-key", json={"billing": "monthly"})
        assert response.status_code == 503

    def test_payment_key_returns_token(self, client, app):
        self._login(client, email="paymob-key-success@test.com")
        app.config.update({
            "PAYMOB_SECRET_KEY": "sk_test_123456",
            "PAYMOB_PUBLIC_KEY": "pk_test_123456",
            "PAYMOB_INTEGRATION_ID": "123456",
            "PAYMOB_IFRAME_ID": "iframe_123",
        })
        with patch("app.routes.paymob.get_payment_key") as mock_get, \
             patch("app.routes.paymob.is_paymob_configured", return_value=True), \
             patch("app.routes.paymob.get_plan_amount_cents", return_value=10000):
            mock_get.return_value = {
                "token": "pay_token_123",
                "iframe_id": "iframe_123",
                "order_id": 12345,
            }
            response = client.post("/api/paymob/payment-key", json={"billing": "monthly"})

        assert response.status_code == 200
        data = response.get_json()
        assert "token" in data


class TestPayMobWebhook:
    """Tests for POST /api/paymob/webhook."""

    def test_webhook_invalid_signature_returns_400(self, client, app):
        """Webhook with failed signature verification must return 400."""
        with patch("app.routes.paymob.verify_webhook_signature", return_value=False):
            response = client.post(
                "/api/paymob/webhook",
                data=b'{"success": true, "obj": {}}',
                content_type="application/json",
            )
        assert response.status_code == 400

    def test_webhook_valid_signature_processes_event(self, client, app):
        """Webhook with valid signature should process event and return 200."""
        with patch("app.routes.paymob.verify_webhook_signature", return_value=True), \
             patch("app.routes.paymob.handle_webhook_event", return_value={"status": "ok", "event_type": "payment_success"}):
            response = client.post(
                "/api/paymob/webhook",
                data=b'{"success": true, "obj": {"id": 12345, "amount_cents": 10000}}',
                content_type="application/json",
            )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"

    def test_webhook_is_csrf_exempt(self, client, app):
        """PayMob webhook endpoint must not require CSRF token."""
        with patch("app.routes.paymob.verify_webhook_signature", return_value=True), \
             patch("app.routes.paymob.handle_webhook_event", return_value={"status": "ok"}):
            response = client.post(
                "/api/paymob/webhook",
                data=b'{"success": true}',
                content_type="application/json",
            )
        assert response.status_code != 403


class TestPayMobConfig:
    """Tests for GET /api/paymob/config."""

    def test_config_returns_enabled_when_configured(self, client, app):
        app.config.update({
            "PAYMOB_SECRET_KEY": "sk_test_123",
            "PAYMOB_PUBLIC_KEY": "pk_test_123",
            "PAYMOB_INTEGRATION_ID": "123",
        })
        with patch("app.routes.paymob.is_paymob_configured", return_value=True), \
             patch("app.services.paymob_service.get_paymob_public_key", return_value="pk_test_123"), \
             patch("app.services.paymob_service.get_paymob_iframe_id", return_value="iframe_123"):
            response = client.get("/api/paymob/config")

        assert response.status_code == 200
        data = response.get_json()
        assert data["enabled"] is True

    def test_config_returns_disabled_when_not_configured(self, client, app):
        app.config["PAYMOB_SECRET_KEY"] = ""
        app.config["PAYMOB_PUBLIC_KEY"] = ""
        app.config["PAYMOB_INTEGRATION_ID"] = ""
        with patch("app.routes.paymob.is_paymob_configured", return_value=False):
            response = client.get("/api/paymob/config")

        assert response.status_code == 503
        data = response.get_json()
        assert data["enabled"] is False


class TestPayMobSignatureVerification:
    def test_verify_signature_supports_nested_obj_payload(self, app):
        app.config["PAYMOB_HMAC_SECRET"] = "paymob-test-secret"

        event_obj = {
            "amount_cents": 10000,
            "created_at": "2026-01-01T00:00:00Z",
            "currency": "EGP",
            "error_occured": False,
            "has_parent_transaction": False,
            "id": 12345,
            "integration_id": 4444,
            "is_3d_secure": True,
            "is_auth": False,
            "is_capture": False,
            "is_refunded": False,
            "is_standalone_payment": False,
            "is_voided": False,
            "order": {"id": 99},
            "owner": 1,
            "pending": False,
            "source_data": {"pan": "1111"},
            "success": True,
        }

        fields_to_verify = [
            "amount_cents", "created_at", "currency", "error_occured",
            "has_parent_transaction", "id", "integration_id", "is_3d_secure",
            "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
            "is_voided", "order", "owner", "pending", "source_data", "success",
        ]
        message = ""
        for field in fields_to_verify:
            value = event_obj.get(field, "")
            if isinstance(value, dict):
                value = json.dumps(value, sort_keys=True)
            message += str(value)

        signature = hmac.new(
            app.config["PAYMOB_HMAC_SECRET"].encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        payload = {"hmac": signature, "obj": event_obj}
        with app.app_context():
            assert verify_webhook_signature(payload) is True
