"""Tests for file download route."""
import os

from app.services.account_service import create_user
from app.utils.auth import TASK_ACCESS_SESSION_KEY


class TestDownload:
    def test_download_anonymous_returns_401(self, client):
        """Anonymous users should be blocked by the download gate."""
        response = client.get('/api/download/some-task-id/output.pdf')
        assert response.status_code == 401
        assert response.get_json()['error'] == 'signup_required'

    def test_download_nonexistent_file(self, client, app):
        """Should return 404 for missing file when authenticated."""
        with app.app_context():
            user = create_user('download-test@example.com', 'pass12345')
        with client.session_transaction() as session:
            session['user_id'] = user['id']
            session[TASK_ACCESS_SESSION_KEY] = ['some-task-id']
        response = client.get('/api/download/some-task-id/output.pdf')
        assert response.status_code == 404

    def test_download_path_traversal_task_id(self, client):
        """Should reject task_id with path traversal characters."""
        response = client.get('/api/download/../etc/output.pdf')
        # Flask will handle this — either 400 or 404
        assert response.status_code in (400, 404)

    def test_download_path_traversal_filename(self, client):
        """Should reject filename with path traversal characters."""
        response = client.get('/api/download/valid-id/../../etc/passwd')
        assert response.status_code in (400, 404)

    def test_download_valid_file(self, client, app):
        """Should serve file if it exists and user is authenticated."""
        task_id = 'test-download-id'
        filename = 'output.pdf'

        with app.app_context():
            user = create_user('download-valid@example.com', 'pass12345')

        # Create the file in the output directory
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, filename)
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.4 test content')

        with client.session_transaction() as session:
            session['user_id'] = user['id']
            session[TASK_ACCESS_SESSION_KEY] = [task_id]

        response = client.get(f'/api/download/{task_id}/{filename}')
        assert response.status_code == 200
        assert response.data == b'%PDF-1.4 test content'

    def test_download_with_custom_name(self, client, app):
        """Should use the ?name= parameter as download filename."""
        task_id = 'test-name-id'
        filename = 'output.pdf'

        with app.app_context():
            user = create_user('download-name@example.com', 'pass12345')

        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, filename), 'wb') as f:
            f.write(b'%PDF-1.4')

        with client.session_transaction() as session:
            session['user_id'] = user['id']
            session[TASK_ACCESS_SESSION_KEY] = [task_id]

        response = client.get(f'/api/download/{task_id}/{filename}?name=my-document.pdf')
        assert response.status_code == 200

    def test_download_requires_task_access(self, client, app):
        """Should not serve an existing file without task access, even if authenticated."""
        task_id = 'protected-download-id'
        filename = 'output.pdf'

        with app.app_context():
            user = create_user('download-noaccess@example.com', 'pass12345')

        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, filename), 'wb') as f:
            f.write(b'%PDF-1.4 protected')

        with client.session_transaction() as session:
            session['user_id'] = user['id']
            # No TASK_ACCESS_SESSION_KEY set — user can't access this task

        response = client.get(f'/api/download/{task_id}/{filename}')
        assert response.status_code == 404