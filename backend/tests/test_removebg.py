"""Tests for background removal route — /api/remove-bg."""
import io
import os
import tempfile
from unittest.mock import MagicMock

from tests.conftest import make_png_bytes, make_pdf_bytes


# =========================================================================
# Feature flag enforcement
# =========================================================================
class TestRemoveBgFeatureFlag:
    def test_removebg_disabled_by_default(self, client):
        """Should return 403 when FEATURE_REMOVEBG is off."""
        data = {"file": (io.BytesIO(make_png_bytes()), "photo.png")}
        response = client.post(
            "/api/remove-bg",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 403
        assert "not enabled" in response.get_json()["error"]


# =========================================================================
# Validation
# =========================================================================
class TestRemoveBgValidation:
    def test_removebg_no_file(self, client, app):
        """Should return 400 when no file provided."""
        app.config["FEATURE_REMOVEBG"] = True
        response = client.post("/api/remove-bg")
        assert response.status_code == 400
        assert "No file" in response.get_json()["error"]


# =========================================================================
# Success paths
# =========================================================================
class TestRemoveBgSuccess:
    def test_removebg_success(self, client, app, monkeypatch):
        """Should return 202 with task_id when valid image provided."""
        app.config["FEATURE_REMOVEBG"] = True
        mock_task = MagicMock()
        mock_task.id = "rembg-task-1"

        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, "mock.png")

        monkeypatch.setattr(
            "app.routes.removebg.validate_actor_file",
            lambda f, allowed_types, actor: ("photo.png", "png"),
        )
        monkeypatch.setattr(
            "app.routes.removebg.generate_safe_path",
            lambda ext, folder_type: ("mock-id", save_path),
        )
        monkeypatch.setattr(
            "app.routes.removebg.remove_bg_task.delay",
            MagicMock(return_value=mock_task),
        )

        data = {"file": (io.BytesIO(make_png_bytes()), "photo.png")}
        response = client.post(
            "/api/remove-bg",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body["task_id"] == "rembg-task-1"
        assert "Background removal started" in body["message"]
