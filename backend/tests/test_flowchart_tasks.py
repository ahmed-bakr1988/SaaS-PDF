"""Tests for flowchart task routes."""
import io
from unittest.mock import MagicMock


class TestFlowchartTaskRoutes:
    def test_extract_flowchart_dispatches_task(self, client, monkeypatch):
        """Should dispatch extraction task for uploaded PDF."""
        mock_task = MagicMock()
        mock_task.id = "flow-task-id"
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr(
            "app.routes.flowchart.validate_actor_file",
            lambda f, allowed_types, actor: ("manual.pdf", "pdf"),
        )
        monkeypatch.setattr(
            "app.routes.flowchart.generate_safe_path",
            lambda ext: ("flow-task-id", "/tmp/test.pdf"),
        )
        monkeypatch.setattr(
            "app.routes.flowchart.extract_flowchart_task.delay",
            mock_delay,
        )

        response = client.post(
            "/api/flowchart/extract",
            data={"file": (io.BytesIO(b"%PDF-1.4"), "manual.pdf")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 202
        body = response.get_json()
        assert body["task_id"] == "flow-task-id"

        args = mock_delay.call_args[0]
        assert args[0] == "/tmp/test.pdf"
        assert args[1] == "flow-task-id"
        assert args[2] == "manual.pdf"

    def test_extract_sample_dispatches_task(self, client, monkeypatch):
        """Should dispatch sample extraction task without file upload."""
        mock_task = MagicMock()
        mock_task.id = "sample-flow-task-id"

        monkeypatch.setattr(
            "app.routes.flowchart.extract_sample_flowchart_task.delay",
            MagicMock(return_value=mock_task),
        )

        response = client.post("/api/flowchart/extract-sample")
        assert response.status_code == 202
        body = response.get_json()
        assert body["task_id"] == "sample-flow-task-id"
