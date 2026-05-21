"""Tests for file-to-Markdown route."""

import io
from unittest.mock import MagicMock, patch


def test_file_to_markdown_no_file(client):
    response = client.post("/api/convert/to-markdown")

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_file_to_markdown_rejects_unsupported_extension(client):
    response = client.post(
        "/api/convert/to-markdown",
        data={"file": (io.BytesIO(b"hello"), "payload.exe")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400


def test_file_to_markdown_enqueues_task(client, monkeypatch):
    task = MagicMock()
    task.id = "markdown-task-id"
    monkeypatch.setattr(
        "app.routes.markdown_convert.enqueue_task",
        lambda *args, **kwargs: task,
    )
    monkeypatch.setattr(
        "app.routes.markdown_convert.create_quote",
        lambda *args, **kwargs: MagicMock(to_dict=lambda: {"tool": "file-to-markdown"}),
    )
    monkeypatch.setattr(
        "app.routes.markdown_convert.record_accepted_usage",
        lambda *args, **kwargs: None,
    )

    with patch("app.utils.file_validator._detect_mime", lambda _header: "text/plain"):
        response = client.post(
            "/api/convert/to-markdown",
            data={"file": (io.BytesIO(b"hello markdown"), "notes.txt")},
            content_type="multipart/form-data",
        )

    assert response.status_code == 202
    payload = response.get_json()
    assert payload["task_id"] == "markdown-task-id"
    assert payload["quote"]["tool"] == "file-to-markdown"
