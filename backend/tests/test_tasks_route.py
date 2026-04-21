"""Tests for task status polling route."""
from unittest.mock import patch, MagicMock

from app.services.account_service import create_user, has_task_access
from app.utils.auth import TASK_ACCESS_SESSION_KEY


class TestTaskStatus:
    def test_pending_task(self, client, monkeypatch):
        """Should return PENDING state for a queued task."""
        mock_result = MagicMock()
        mock_result.state = 'PENDING'
        mock_result.info = None

        with client.session_transaction() as session:
            session[TASK_ACCESS_SESSION_KEY] = ['test-task-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/test-task-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['task_id'] == 'test-task-id'
        assert data['state'] == 'PENDING'
        assert 'progress' in data

    def test_processing_task(self, client, monkeypatch):
        """Should return PROCESSING state with step info."""
        mock_result = MagicMock()
        mock_result.state = 'PROCESSING'
        mock_result.info = {'step': 'Converting page 3 of 10...'}

        with client.session_transaction() as session:
            session[TASK_ACCESS_SESSION_KEY] = ['processing-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/processing-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['state'] == 'PROCESSING'
        assert data['progress'] == 'Converting page 3 of 10...'

    def test_success_task(self, client, monkeypatch):
        """Should return SUCCESS state with result data."""
        mock_result = MagicMock()
        mock_result.state = 'SUCCESS'
        mock_result.result = {
            'status': 'completed',
            'download_url': '/api/download/task-id/output.pdf',
            'filename': 'output.pdf',
        }

        with client.session_transaction() as session:
            session[TASK_ACCESS_SESSION_KEY] = ['success-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/success-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['state'] == 'SUCCESS'
        assert data['result']['status'] == 'completed'
        assert 'download_url' in data['result']

        with client.session_transaction() as session:
            assert 'task-id' in session[TASK_ACCESS_SESSION_KEY]

    def test_success_task_persists_download_alias_for_authenticated_user(self, client):
        """Should persist download aliases for logged-in users as authorized task ids."""
        user = create_user('tasks-route@example.com', 'secretpass123')
        mock_result = MagicMock()
        mock_result.state = 'SUCCESS'
        mock_result.result = {
            'status': 'completed',
            'download_url': '/api/download/local-download-id/output.pdf',
            'filename': 'output.pdf',
        }

        with client.session_transaction() as session:
            session['user_id'] = user['id']
            session[TASK_ACCESS_SESSION_KEY] = ['success-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/success-id/status')

        assert response.status_code == 200
        assert has_task_access(user['id'], 'web', 'local-download-id') is True

    def test_failure_task(self, client, monkeypatch):
        """Should return FAILURE state with normalized error payload."""
        mock_result = MagicMock()
        mock_result.state = 'FAILURE'
        mock_result.info = Exception('Conversion failed due to corrupt PDF.')

        with client.session_transaction() as session:
            session[TASK_ACCESS_SESSION_KEY] = ['failed-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/failed-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['state'] == 'FAILURE'
        assert data['error']['error_code'] == 'TASK_FAILURE'
        assert 'user_message' in data['error']
        assert data['error']['task_id'] == 'failed-id'

    def test_failure_task_unregistered_maps_to_specific_code(self, client):
        """Should classify unregistered celery task errors."""
        mock_result = MagicMock()
        mock_result.state = 'FAILURE'
        mock_result.info = Exception("Received unregistered task of type 'app.tasks.missing_task'.")

        with client.session_transaction() as session:
            session[TASK_ACCESS_SESSION_KEY] = ['missing-task-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/missing-task-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['error']['error_code'] == 'CELERY_NOT_REGISTERED'

    def test_success_failed_result_returns_normalized_error(self, client):
        """Should normalize task-level failure payload returned inside SUCCESS state."""
        mock_result = MagicMock()
        mock_result.state = 'SUCCESS'
        mock_result.result = {
            'status': 'failed',
            'error_code': 'AI_RATE_LIMIT',
            'user_message': 'AI service is experiencing high demand.',
        }

        with client.session_transaction() as session:
            session[TASK_ACCESS_SESSION_KEY] = ['ai-failed-id']

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/ai-failed-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['state'] == 'SUCCESS'
        assert data['error']['error_code'] == 'AI_RATE_LIMIT'
        assert data['error']['task_id'] == 'ai-failed-id'

    def test_unknown_task_without_access_returns_404(self, client):
        """Should not expose task state without session or API ownership."""
        response = client.get('/api/tasks/unknown-task/status')

        assert response.status_code == 404
