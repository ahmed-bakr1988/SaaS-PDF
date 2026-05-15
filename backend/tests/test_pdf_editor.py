"""Tests for PDF editor route — /api/pdf-editor/edit."""
import io
import json
import os
import tempfile
from unittest.mock import MagicMock

from tests.conftest import make_pdf_bytes


# =========================================================================
# Feature flag enforcement
# =========================================================================
class TestPdfEditorFeatureFlag:
    def test_pdf_editor_disabled_by_default(self, client):
        """Should return 403 when FEATURE_EDITOR is off."""
        data = {
            "file": (io.BytesIO(make_pdf_bytes()), "doc.pdf"),
            "edits": json.dumps([{"type": "text", "page": 1, "x": 100, "y": 200, "content": "Hello"}]),
        }
        response = client.post(
            "/api/pdf-editor/edit",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 403
        assert "not enabled" in response.get_json()["error"]


# =========================================================================
# Validation
# =========================================================================
class TestPdfEditorValidation:
    def test_pdf_editor_no_file(self, client, app):
        """Should return 400 when no file provided."""
        app.config["FEATURE_EDITOR"] = True
        response = client.post("/api/pdf-editor/edit")
        assert response.status_code == 400
        assert "No file" in response.get_json()["error"]

    def test_pdf_editor_invalid_json(self, client, app):
        """Should return 400 when edits is invalid JSON."""
        app.config["FEATURE_EDITOR"] = True
        data = {
            "file": (io.BytesIO(make_pdf_bytes()), "doc.pdf"),
            "edits": "not valid json{",
        }
        response = client.post(
            "/api/pdf-editor/edit",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400
        assert "Invalid JSON" in response.get_json()["error"]

    def test_pdf_editor_edits_not_array(self, client, app):
        """Should return 400 when edits is not an array."""
        app.config["FEATURE_EDITOR"] = True
        data = {
            "file": (io.BytesIO(make_pdf_bytes()), "doc.pdf"),
            "edits": json.dumps({"type": "text"}),
        }
        response = client.post(
            "/api/pdf-editor/edit",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400
        assert "JSON array" in response.get_json()["error"]

    def test_pdf_editor_empty_edits_allowed(self, client, app, monkeypatch):
        """Empty edits should still dispatch a save task."""
        app.config["FEATURE_EDITOR"] = True
        mock_task = MagicMock()
        mock_task.id = "edit-task-empty"

        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, "mock.pdf")

        monkeypatch.setattr(
            "app.routes.pdf_editor.validate_actor_file",
            lambda f, allowed_types, actor: ("doc.pdf", "pdf"),
        )
        monkeypatch.setattr(
            "app.routes.pdf_editor.generate_safe_path",
            lambda ext, folder_type: ("mock-id", save_path),
        )
        monkeypatch.setattr(
            "app.routes.pdf_editor.enqueue_task",
            MagicMock(return_value=mock_task),
        )

        data = {
            "file": (io.BytesIO(make_pdf_bytes()), "doc.pdf"),
            "edits": json.dumps([]),
        }
        response = client.post(
            "/api/pdf-editor/edit",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 202
        assert response.get_json()["task_id"] == "edit-task-empty"

    def test_pdf_editor_too_many_edits(self, client, app):
        """Should return 400 when more than 500 edits."""
        app.config["FEATURE_EDITOR"] = True
        edits = [{"type": "text", "page": 1, "x": 10, "y": 10, "content": "x"}] * 501
        data = {
            "file": (io.BytesIO(make_pdf_bytes()), "doc.pdf"),
            "edits": json.dumps(edits),
        }
        response = client.post(
            "/api/pdf-editor/edit",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 400
        assert "500" in response.get_json()["error"]


# =========================================================================
# Success paths
# =========================================================================
class TestPdfEditorSuccess:
    def test_pdf_editor_success(self, client, app, monkeypatch):
        """Should return 202 with task_id when valid request provided."""
        app.config["FEATURE_EDITOR"] = True
        mock_task = MagicMock()
        mock_task.id = "edit-task-1"

        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, "mock.pdf")

        monkeypatch.setattr(
            "app.routes.pdf_editor.validate_actor_file",
            lambda f, allowed_types, actor: ("doc.pdf", "pdf"),
        )
        monkeypatch.setattr(
            "app.routes.pdf_editor.generate_safe_path",
            lambda ext, folder_type: ("mock-id", save_path),
        )
        monkeypatch.setattr(
            "app.routes.pdf_editor.enqueue_task",
            MagicMock(return_value=mock_task),
        )

        edits = [
            {"type": "text", "page": 1, "x": 100, "y": 200, "content": "Hello World", "fontSize": 14},
        ]
        data = {
            "file": (io.BytesIO(make_pdf_bytes()), "doc.pdf"),
            "edits": json.dumps(edits),
        }
        response = client.post(
            "/api/pdf-editor/edit",
            data=data,
            content_type="multipart/form-data",
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body["task_id"] == "edit-task-1"
        assert "PDF editing started" in body["message"]
