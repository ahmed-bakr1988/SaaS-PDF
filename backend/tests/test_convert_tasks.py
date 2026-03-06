"""Tests for file conversion Celery task routes."""
import io
from unittest.mock import MagicMock


class TestConvertTaskRoutes:
    def test_pdf_to_word_success(self, client, monkeypatch):
        """Should return 202 with task_id for valid PDF upload."""
        mock_task = MagicMock()
        mock_task.id = 'convert-pdf-word-id'

        monkeypatch.setattr(
            'app.routes.convert.validate_file',
            lambda f, allowed_types: ('document.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.convert.generate_safe_path',
            lambda ext, folder_type: ('convert-pdf-word-id', '/tmp/test.pdf'),
        )
        monkeypatch.setattr(
            'app.routes.convert.convert_pdf_to_word.delay',
            MagicMock(return_value=mock_task),
        )

        data = {'file': (io.BytesIO(b'%PDF-1.4'), 'document.pdf')}
        response = client.post(
            '/api/convert/pdf-to-word',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body['task_id'] == 'convert-pdf-word-id'
        assert 'message' in body

    def test_word_to_pdf_success(self, client, monkeypatch):
        """Should return 202 with task_id for valid Word upload."""
        mock_task = MagicMock()
        mock_task.id = 'convert-word-pdf-id'

        monkeypatch.setattr(
            'app.routes.convert.validate_file',
            lambda f, allowed_types: ('report.docx', 'docx'),
        )
        monkeypatch.setattr(
            'app.routes.convert.generate_safe_path',
            lambda ext, folder_type: ('convert-word-pdf-id', '/tmp/test.docx'),
        )
        monkeypatch.setattr(
            'app.routes.convert.convert_word_to_pdf.delay',
            MagicMock(return_value=mock_task),
        )

        data = {'file': (io.BytesIO(b'PK\x03\x04'), 'report.docx')}
        response = client.post(
            '/api/convert/word-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body['task_id'] == 'convert-word-pdf-id'

    def test_pdf_to_word_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/convert/pdf-to-word')
        assert response.status_code == 400

    def test_word_to_pdf_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/convert/word-to-pdf')
        assert response.status_code == 400