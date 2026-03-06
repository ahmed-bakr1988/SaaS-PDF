"""Tests for file download route."""
import os


class TestDownload:
    def test_download_nonexistent_file(self, client):
        """Should return 404 for missing file."""
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
        """Should serve file if it exists."""
        task_id = 'test-download-id'
        filename = 'output.pdf'

        # Create the file in the output directory
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, filename)
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.4 test content')

        response = client.get(f'/api/download/{task_id}/{filename}')
        assert response.status_code == 200
        assert response.data == b'%PDF-1.4 test content'

    def test_download_with_custom_name(self, client, app):
        """Should use the ?name= parameter as download filename."""
        task_id = 'test-name-id'
        filename = 'output.pdf'

        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, filename), 'wb') as f:
            f.write(b'%PDF-1.4')

        response = client.get(f'/api/download/{task_id}/{filename}?name=my-document.pdf')
        assert response.status_code == 200