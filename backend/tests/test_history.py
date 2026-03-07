"""Tests for authenticated file history routes."""
from app.services.account_service import record_file_history


class TestHistoryRoutes:
    def test_history_requires_auth(self, client):
        response = client.get('/api/history')

        assert response.status_code == 401
        assert 'authentication required' in response.get_json()['error'].lower()

    def test_history_returns_items(self, client, app):
        register_response = client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )
        user_id = register_response.get_json()['user']['id']

        with app.app_context():
            record_file_history(
                user_id=user_id,
                tool='pdf-to-word',
                original_filename='report.pdf',
                output_filename='report.docx',
                status='completed',
                download_url='/api/download/123/report.docx',
                metadata={'output_size': 2048},
            )

        response = client.get('/api/history?limit=10')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['tool'] == 'pdf-to-word'
        assert data['items'][0]['output_filename'] == 'report.docx'

    def test_history_limit_is_applied(self, client, app):
        register_response = client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )
        user_id = register_response.get_json()['user']['id']

        with app.app_context():
            record_file_history(
                user_id=user_id,
                tool='pdf-to-word',
                original_filename='first.pdf',
                output_filename='first.docx',
                status='completed',
                download_url='/api/download/1/first.docx',
                metadata=None,
            )
            record_file_history(
                user_id=user_id,
                tool='word-to-pdf',
                original_filename='second.docx',
                output_filename='second.pdf',
                status='completed',
                download_url='/api/download/2/second.pdf',
                metadata=None,
            )

        response = client.get('/api/history?limit=1')

        assert response.status_code == 200
        assert len(response.get_json()['items']) == 1
