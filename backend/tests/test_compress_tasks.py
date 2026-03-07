"""Tests for PDF compression Celery tasks."""
import io
from unittest.mock import MagicMock


class TestCompressTaskRoute:
    def test_compress_pdf_no_file(self, client):
        """POST /api/compress/pdf without file should return 400."""
        response = client.post('/api/compress/pdf')
        assert response.status_code == 400
        assert response.get_json()['error'] == 'No file provided.'

    def test_compress_pdf_with_quality(self, client, monkeypatch):
        """Should accept quality parameter (low/medium/high)."""
        mock_task = MagicMock()
        mock_task.id = 'compress-task-id'

        monkeypatch.setattr(
            'app.routes.compress.validate_actor_file',
            lambda f, allowed_types, actor: ('test.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.compress.generate_safe_path',
            lambda ext, folder_type: ('compress-task-id', '/tmp/test.pdf'),
        )
        monkeypatch.setattr(
            'app.routes.compress.compress_pdf_task.delay',
            MagicMock(return_value=mock_task),
        )

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'quality': 'high',
        }
        response = client.post(
            '/api/compress/pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert response.get_json()['task_id'] == 'compress-task-id'

    def test_compress_pdf_invalid_quality_defaults(self, client, monkeypatch):
        """Invalid quality should default to medium."""
        mock_task = MagicMock()
        mock_task.id = 'compress-default-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr(
            'app.routes.compress.validate_actor_file',
            lambda f, allowed_types, actor: ('test.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.compress.generate_safe_path',
            lambda ext, folder_type: ('id', '/tmp/test.pdf'),
        )
        monkeypatch.setattr(
            'app.routes.compress.compress_pdf_task.delay',
            mock_delay,
        )

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'quality': 'ultra',  # invalid
        }
        response = client.post(
            '/api/compress/pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        # The route defaults invalid quality to "medium"
        call_args = mock_delay.call_args[0]
        assert call_args[3] == 'medium'