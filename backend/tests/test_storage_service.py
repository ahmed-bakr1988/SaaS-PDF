"""Tests for storage service — local mode (S3 not configured in tests)."""
import os

from app.services.storage_service import StorageService


class TestStorageServiceLocal:
    def test_use_s3_false_in_test(self, app):
        """S3 should not be configured in test environment."""
        with app.app_context():
            svc = StorageService()
            assert svc.use_s3 is False

    def test_upload_file_local(self, app):
        """Should copy file to outputs directory in local mode."""
        with app.app_context():
            svc = StorageService()
            task_id = 'local-upload-test'

            # Create a source file
            input_path = '/tmp/test_storage_input.pdf'
            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4 test')

            key = svc.upload_file(input_path, task_id)
            assert task_id in key
            assert 'test_storage_input.pdf' in key

            os.unlink(input_path)

    def test_generate_presigned_url_local(self, app):
        """In local mode should return /api/download/... URL."""
        with app.app_context():
            svc = StorageService()
            url = svc.generate_presigned_url(
                'outputs/task-123/output.pdf',
                original_filename='my-doc.pdf',
            )
            assert '/api/download/task-123/output.pdf' in url
            assert 'name=my-doc.pdf' in url

    def test_file_exists_local(self, app):
        """Should check file existence on local filesystem."""
        with app.app_context():
            svc = StorageService()
            # Non-existent file
            assert svc.file_exists('outputs/nonexistent/file.pdf') is False

            # Create existing file
            task_id = 'exists-test'
            output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
            os.makedirs(output_dir, exist_ok=True)
            with open(os.path.join(output_dir, 'test.pdf'), 'w') as f:
                f.write('test')

            assert svc.file_exists(f'outputs/{task_id}/test.pdf') is True