"""Tests for PDF AI endpoints — Chat, Summarize, Translate, Extract Tables."""
import io
from unittest.mock import MagicMock


def _mock_pdf_ai(monkeypatch, task_name):
    """Helper to mock validate, path gen, and celery task for pdf_ai routes."""
    mock_task = MagicMock()
    mock_task.id = f'{task_name}-task-id'
    monkeypatch.setattr(
        'app.routes.pdf_ai.validate_actor_file',
        lambda f, allowed_types, actor: ('test.pdf', 'pdf'),
    )
    monkeypatch.setattr(
        'app.routes.pdf_ai.generate_safe_path',
        lambda ext, folder_type: (f'{task_name}-task-id', '/tmp/mock.pdf'),
    )
    monkeypatch.setattr(
        f'app.routes.pdf_ai.{task_name}.delay',
        MagicMock(return_value=mock_task),
    )
    monkeypatch.setattr(
        'werkzeug.datastructures.file_storage.FileStorage.save',
        lambda self, dst, buffer_size=16384: None,
    )
    return mock_task


class TestChatPdf:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/pdf-ai/chat')
        assert response.status_code == 400

    def test_no_question(self, client, monkeypatch):
        """Should return 400 when no question provided."""
        monkeypatch.setattr(
            'app.routes.pdf_ai.validate_actor_file',
            lambda f, allowed_types, actor: ('test.pdf', 'pdf'),
        )
        from tests.conftest import make_pdf_bytes
        data = {'file': (io.BytesIO(make_pdf_bytes()), 'test.pdf')}
        response = client.post(
            '/api/pdf-ai/chat',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid request."""
        _mock_pdf_ai(monkeypatch, 'chat_with_pdf_task')

        from tests.conftest import make_pdf_bytes
        data = {
            'file': (io.BytesIO(make_pdf_bytes()), 'test.pdf'),
            'question': 'What is this about?',
        }
        response = client.post(
            '/api/pdf-ai/chat',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert 'task_id' in response.get_json()


class TestSummarizePdf:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/pdf-ai/summarize')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid request."""
        _mock_pdf_ai(monkeypatch, 'summarize_pdf_task')

        from tests.conftest import make_pdf_bytes
        data = {
            'file': (io.BytesIO(make_pdf_bytes()), 'test.pdf'),
            'length': 'short',
        }
        response = client.post(
            '/api/pdf-ai/summarize',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert 'task_id' in response.get_json()


class TestTranslatePdf:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/pdf-ai/translate')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid request."""
        _mock_pdf_ai(monkeypatch, 'translate_pdf_task')

        from tests.conftest import make_pdf_bytes
        data = {
            'file': (io.BytesIO(make_pdf_bytes()), 'test.pdf'),
            'target_language': 'fr',
        }
        response = client.post(
            '/api/pdf-ai/translate',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert 'task_id' in response.get_json()


class TestExtractTables:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/pdf-ai/extract-tables')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid request."""
        _mock_pdf_ai(monkeypatch, 'extract_tables_task')

        from tests.conftest import make_pdf_bytes
        data = {'file': (io.BytesIO(make_pdf_bytes()), 'test.pdf')}
        response = client.post(
            '/api/pdf-ai/extract-tables',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert 'task_id' in response.get_json()
