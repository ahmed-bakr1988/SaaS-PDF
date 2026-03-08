"""Tests for HTML to PDF endpoint — POST /api/convert/html-to-pdf."""
import io
from unittest.mock import MagicMock


class TestHtmlToPdf:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/convert/html-to-pdf')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid HTML upload."""
        mock_task = MagicMock()
        mock_task.id = 'html-pdf-task-id'
        monkeypatch.setattr(
            'app.routes.html_to_pdf.validate_actor_file',
            lambda f, allowed_types, actor: ('test.html', 'html'),
        )
        monkeypatch.setattr(
            'app.routes.html_to_pdf.generate_safe_path',
            lambda ext, folder_type: ('html-pdf-task-id', '/tmp/mock.html'),
        )
        monkeypatch.setattr(
            'app.routes.html_to_pdf.html_to_pdf_task.delay',
            MagicMock(return_value=mock_task),
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        data = {
            'file': (io.BytesIO(b'<html><body>Hello</body></html>'), 'test.html'),
        }
        response = client.post(
            '/api/convert/html-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        json_data = response.get_json()
        assert 'task_id' in json_data
