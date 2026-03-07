"""Tests for OCR routes — /api/ocr/image, /api/ocr/pdf, /api/ocr/languages."""
import io
import json
import os
import tempfile
from unittest.mock import MagicMock

from tests.conftest import make_png_bytes, make_pdf_bytes


# =========================================================================
# Feature flag enforcement
# =========================================================================
class TestOcrFeatureFlag:
    def test_ocr_image_disabled_by_default(self, client):
        """OCR image should return 403 when FEATURE_EDITOR is off."""
        data = {"file": (io.BytesIO(make_png_bytes()), "test.png")}
        response = client.post(
            "/api/ocr/image",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 403
        assert "not enabled" in response.get_json()["error"]

    def test_ocr_pdf_disabled_by_default(self, client):
        """OCR PDF should return 403 when FEATURE_EDITOR is off."""
        data = {"file": (io.BytesIO(make_pdf_bytes()), "scan.pdf")}
        response = client.post(
            "/api/ocr/pdf",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 403

    def test_languages_always_available(self, client):
        """GET /api/ocr/languages should work even when feature is disabled."""
        response = client.get("/api/ocr/languages")
        assert response.status_code == 200
        data = response.get_json()
        langs = data["languages"]
        assert "eng" in langs
        assert "ara" in langs
        assert "fra" in langs


# =========================================================================
# Validation
# =========================================================================
class TestOcrValidation:
    def test_ocr_image_no_file(self, client, app):
        """Should return 400 when no file provided."""
        app.config["FEATURE_EDITOR"] = True
        response = client.post("/api/ocr/image")
        assert response.status_code == 400
        assert "No file" in response.get_json()["error"]

    def test_ocr_pdf_no_file(self, client, app):
        """Should return 400 when no file provided."""
        app.config["FEATURE_EDITOR"] = True
        response = client.post("/api/ocr/pdf")
        assert response.status_code == 400
        assert "No file" in response.get_json()["error"]


# =========================================================================
# Success paths
# =========================================================================
class TestOcrSuccess:
    def test_ocr_image_success(self, client, app, monkeypatch):
        """Should return 202 with task_id when valid image provided."""
        app.config["FEATURE_EDITOR"] = True
        mock_task = MagicMock()
        mock_task.id = "ocr-img-task-1"

        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, "mock.png")

        monkeypatch.setattr(
            "app.routes.ocr.validate_actor_file",
            lambda f, allowed_types, actor: ("test.png", "png"),
        )
        monkeypatch.setattr(
            "app.routes.ocr.generate_safe_path",
            lambda ext, folder_type: ("mock-id", save_path),
        )
        monkeypatch.setattr(
            "app.routes.ocr.ocr_image_task.delay",
            MagicMock(return_value=mock_task),
        )

        data = {"file": (io.BytesIO(make_png_bytes()), "test.png"), "lang": "eng"}
        response = client.post(
            "/api/ocr/image",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body["task_id"] == "ocr-img-task-1"

    def test_ocr_pdf_success(self, client, app, monkeypatch):
        """Should return 202 with task_id when valid PDF provided."""
        app.config["FEATURE_EDITOR"] = True
        mock_task = MagicMock()
        mock_task.id = "ocr-pdf-task-1"

        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, "mock.pdf")

        monkeypatch.setattr(
            "app.routes.ocr.validate_actor_file",
            lambda f, allowed_types, actor: ("scan.pdf", "pdf"),
        )
        monkeypatch.setattr(
            "app.routes.ocr.generate_safe_path",
            lambda ext, folder_type: ("mock-id", save_path),
        )
        monkeypatch.setattr(
            "app.routes.ocr.ocr_pdf_task.delay",
            MagicMock(return_value=mock_task),
        )

        data = {"file": (io.BytesIO(make_pdf_bytes()), "scan.pdf"), "lang": "ara"}
        response = client.post(
            "/api/ocr/pdf",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body["task_id"] == "ocr-pdf-task-1"

    def test_ocr_image_invalid_lang_falls_back(self, client, app, monkeypatch):
        """Invalid lang should fall back to 'eng' without error."""
        app.config["FEATURE_EDITOR"] = True
        mock_task = MagicMock()
        mock_task.id = "ocr-lang-task"

        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, "mock.png")

        monkeypatch.setattr(
            "app.routes.ocr.validate_actor_file",
            lambda f, allowed_types, actor: ("test.png", "png"),
        )
        monkeypatch.setattr(
            "app.routes.ocr.generate_safe_path",
            lambda ext, folder_type: ("mock-id", save_path),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr("app.routes.ocr.ocr_image_task.delay", mock_delay)

        data = {"file": (io.BytesIO(make_png_bytes()), "test.png"), "lang": "invalid"}
        response = client.post(
            "/api/ocr/image",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 202
        # Verify 'eng' was passed to the task
        call_args = mock_delay.call_args
        assert call_args[0][3] == "eng"  # 4th positional arg is lang
