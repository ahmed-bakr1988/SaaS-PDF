"""Tests for task status polling route."""
from unittest.mock import patch, MagicMock


class TestTaskStatus:
    def test_pending_task(self, client, monkeypatch):
        """Should return PENDING state for a queued task."""
        mock_result = MagicMock()
        mock_result.state = 'PENDING'
        mock_result.info = None

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

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/success-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['state'] == 'SUCCESS'
        assert data['result']['status'] == 'completed'
        assert 'download_url' in data['result']

    def test_failure_task(self, client, monkeypatch):
        """Should return FAILURE state with error message."""
        mock_result = MagicMock()
        mock_result.state = 'FAILURE'
        mock_result.info = Exception('Conversion failed due to corrupt PDF.')

        with patch('app.routes.tasks.AsyncResult', return_value=mock_result):
            response = client.get('/api/tasks/failed-id/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['state'] == 'FAILURE'
        assert 'error' in data