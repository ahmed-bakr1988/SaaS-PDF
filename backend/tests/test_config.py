"""Tests for GET /api/config — dynamic upload limits."""
import importlib
import os

import pytest


class TestConfigEndpoint:
    """Tests for the public config endpoint."""

    def test_anonymous_gets_free_limits(self, client):
        """Anonymous users receive free-plan file limits."""
        resp = client.get("/api/config")
        assert resp.status_code == 200
        data = resp.get_json()

        assert "file_limits_mb" in data
        assert "max_upload_mb" in data
        limits = data["file_limits_mb"]
        assert limits["pdf"] == 20
        assert limits["word"] == 15
        assert limits["image"] == 10
        assert limits["video"] == 50
        assert limits["homepageSmartUpload"] == 50
        # No usage section for anon
        assert "usage" not in data

    def test_authenticated_free_user_gets_usage(self, client, app):
        """Logged-in free user receives limits + usage summary."""
        # Register + login
        client.post("/api/auth/register", json={
            "email": "config_test@example.com",
            "password": "TestPassword123!",
        })
        client.post("/api/auth/login", json={
            "email": "config_test@example.com",
            "password": "TestPassword123!",
        })

        resp = client.get("/api/config")
        assert resp.status_code == 200
        data = resp.get_json()

        assert data["file_limits_mb"]["pdf"] == 20
        assert "usage" in data
        usage = data["usage"]
        assert usage["plan"] == "free"
        assert "web_quota" in usage
        assert "api_quota" in usage

    def test_max_upload_mb_is_correct(self, client):
        """max_upload_mb should equal the largest single-type limit."""
        resp = client.get("/api/config")
        data = resp.get_json()
        limits = data["file_limits_mb"]
        assert data["max_upload_mb"] == max(limits.values())


class TestConfigEnvironmentFallbacks:
    """Tests for environment values that should not accept blank strings."""

    def test_blank_database_path_falls_back_to_default(self, monkeypatch):
        """A blank DATABASE_PATH must not create a temporary per-connection SQLite DB."""
        monkeypatch.setenv("DATABASE_PATH", "")

        import config as config_module

        reloaded = importlib.reload(config_module)
        try:
            expected = os.path.join(reloaded.BASE_DIR, "data", "dociva.db")
            assert reloaded.BaseConfig.DATABASE_PATH == expected
            assert reloaded.ProductionConfig.DATABASE_PATH == expected
        finally:
            monkeypatch.delenv("DATABASE_PATH", raising=False)
            importlib.reload(config_module)
