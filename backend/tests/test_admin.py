"""Tests for internal admin dashboard endpoints."""

from dataclasses import dataclass, field
from unittest.mock import patch

from app.services.account_service import create_user, record_file_history, set_user_role, update_user_plan
from app.services.contact_service import save_message
from app.services.rating_service import submit_rating


@dataclass
class FakeModelInfo:
    id: str
    name: str
    is_free: bool
    context_length: int = 4096
    description: str = ""
    prompt_price_per_token: float = 0.0
    completion_price_per_token: float = 0.0
    top_provider: dict = field(default_factory=dict)


class TestInternalAdminRoutes:
    def test_overview_requires_authenticated_admin(self, client):
        response = client.get("/api/internal/admin/overview")

        assert response.status_code == 401

    def test_overview_rejects_non_admin_user(self, app, client):
        with app.app_context():
            create_user("member@example.com", "testpass123")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "member@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        response = client.get("/api/internal/admin/overview")
        assert response.status_code == 403

    def test_overview_returns_operational_summary(self, app, client):
        with app.app_context():
            first_user = create_user("admin-a@example.com", "testpass123")
            second_user = create_user("admin-b@example.com", "testpass123")
            set_user_role(first_user["id"], "admin")
            update_user_plan(second_user["id"], "pro")

            record_file_history(
                user_id=first_user["id"],
                tool="compress-pdf",
                original_filename="one.pdf",
                output_filename="one-small.pdf",
                status="completed",
                download_url="https://example.com/one-small.pdf",
            )
            record_file_history(
                user_id=second_user["id"],
                tool="repair-pdf",
                original_filename="broken.pdf",
                output_filename=None,
                status="failed",
                download_url=None,
                metadata={"error": "Repair failed."},
            )

            submit_rating("compress-pdf", 5, fingerprint="admin-rating")
            message = save_message("Admin User", "ops@example.com", "bug", "Need help", "Broken upload")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-a@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        response = client.get("/api/internal/admin/overview")

        assert response.status_code == 200
        data = response.get_json()
        assert data["users"]["total"] == 2
        assert data["users"]["pro"] == 1
        assert data["processing"]["total_files_processed"] == 2
        assert data["processing"]["failed_files"] == 1
        assert data["ratings"]["rating_count"] == 1
        assert data["contacts"]["unread_messages"] == 1
        assert data["contacts"]["recent"][0]["id"] == message["id"]
        assert data["recent_failures"][0]["tool"] == "repair-pdf"

    def test_contacts_can_be_marked_read(self, app, client):
        with app.app_context():
            admin_user = create_user("admin-reader@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")
            message = save_message("Reader", "reader@example.com", "general", "Hello", "Please review")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-reader@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        mark_response = client.post(f"/api/internal/admin/contacts/{message['id']}/read")
        assert mark_response.status_code == 200

        contacts_response = client.get("/api/internal/admin/contacts")
        assert contacts_response.status_code == 200
        contacts_data = contacts_response.get_json()
        assert contacts_data["unread"] == 0
        assert contacts_data["items"][0]["is_read"] is True

    def test_user_plan_can_be_updated(self, app, client):
        with app.app_context():
            admin_user = create_user("admin-plan@example.com", "testpass123")
            user = create_user("plan-change@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-plan@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        response = client.post(
            f"/api/internal/admin/users/{user['id']}/plan",
            json={"plan": "pro"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["user"]["plan"] == "pro"

    def test_user_role_can_be_updated(self, app, client):
        with app.app_context():
            admin_user = create_user("admin-role@example.com", "testpass123")
            user = create_user("member-role@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "admin-role@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        response = client.post(
            f"/api/internal/admin/users/{user['id']}/role",
            json={"role": "admin"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["user"]["role"] == "admin"

    def test_allowlisted_admin_role_cannot_be_changed(self, app, client):
        app.config["INTERNAL_ADMIN_EMAILS"] = ("bootstrap-admin@example.com",)
        with app.app_context():
            actor = create_user("actor-admin@example.com", "testpass123")
            bootstrap = create_user("bootstrap-admin@example.com", "testpass123")
            set_user_role(actor["id"], "admin")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "actor-admin@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        response = client.post(
            f"/api/internal/admin/users/{bootstrap['id']}/role",
            json={"role": "user"},
        )

        assert response.status_code == 400
        assert "INTERNAL_ADMIN_EMAILS" in response.get_json()["error"]

    def test_admin_cannot_remove_own_role(self, app, client):
        with app.app_context():
            admin_user = create_user("self-admin@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")

        login_response = client.post(
            "/api/auth/login",
            json={"email": "self-admin@example.com", "password": "testpass123"},
        )
        assert login_response.status_code == 200

        response = client.post(
            f"/api/internal/admin/users/{admin_user['id']}/role",
            json={"role": "user"},
        )

        assert response.status_code == 400
        assert "cannot remove your own admin role" in response.get_json()["error"].lower()

    # ---- AI model switcher endpoints ----

    def test_ai_models_requires_admin(self, client):
        response = client.get("/api/internal/admin/ai-models")
        assert response.status_code == 401

    def test_ai_models_returns_list(self, app, client):
        with app.app_context():
            admin_user = create_user("ai-admin@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")

        client.post("/api/auth/login", json={"email": "ai-admin@example.com", "password": "testpass123"})

        fake_models = [
            FakeModelInfo(id="test/model-free", name="Test Free", is_free=True, context_length=4096, description="A free model"),
            FakeModelInfo(id="test/model-paid", name="Test Paid", is_free=False, context_length=8192, description="A paid model"),
        ]

        with patch("app.services.openrouter_models_service.get_cached_models", return_value=fake_models):
            response = client.get("/api/internal/admin/ai-models")

        assert response.status_code == 200
        data = response.get_json()
        assert "models" in data
        assert "current_model" in data
        assert len(data["models"]) == 2
        assert data["models"][0]["is_free"] is True

    def test_update_ai_model_requires_admin(self, client):
        response = client.put("/api/internal/admin/ai-model", json={"model": "test/model"})
        assert response.status_code == 401

    def test_update_ai_model_rejects_empty(self, app, client):
        with app.app_context():
            admin_user = create_user("ai-empty@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")

        client.post("/api/auth/login", json={"email": "ai-empty@example.com", "password": "testpass123"})
        response = client.put("/api/internal/admin/ai-model", json={"model": ""})

        assert response.status_code == 400

    def test_update_ai_model_switches_model(self, app, client):
        with app.app_context():
            admin_user = create_user("ai-switch@example.com", "testpass123")
            set_user_role(admin_user["id"], "admin")

        client.post("/api/auth/login", json={"email": "ai-switch@example.com", "password": "testpass123"})

        fake_models = [FakeModelInfo(id="test/new-model", name="New Model", is_free=True)]
        with patch("app.services.openrouter_models_service.get_cached_models", return_value=fake_models):
            response = client.put("/api/internal/admin/ai-model", json={"model": "test/new-model"})

        assert response.status_code == 200
        data = response.get_json()
        assert data["model"] == "test/new-model"

        with app.app_context():
            assert app.config["OPENROUTER_MODEL"] == "test/new-model"