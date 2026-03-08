"""Tests for PDF to Excel endpoint — POST /api/convert/pdf-to-excel."""
import io
from unittest.mock import MagicMock


class TestPdfToExcel:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/convert/pdf-to-excel')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid PDF upload."""
        mock_task = MagicMock()
        mock_task.id = 'pdf-excel-task-id'
        monkeypatch.setattr(
            'app.routes.pdf_to_excel.validate_actor_file',
            lambda f, allowed_types, actor: ('test.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_to_excel.generate_safe_path',
            lambda ext, folder_type: ('pdf-excel-task-id', '/tmp/mock.pdf'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_to_excel.pdf_to_excel_task.delay',
            MagicMock(return_value=mock_task),
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        from tests.conftest import make_pdf_bytes
        data = {'file': (io.BytesIO(make_pdf_bytes()), 'test.pdf')}
        response = client.post(
            '/api/convert/pdf-to-excel',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        json_data = response.get_json()
        assert 'task_id' in json_data
