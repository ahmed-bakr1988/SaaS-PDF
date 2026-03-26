"""Tests for storage service — local mode (S3 not configured in tests)."""
import os
from unittest.mock import Mock

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

    def test_placeholder_s3_credentials_disable_s3(self, app):
        """Copied sample AWS credentials should not activate S3 mode."""
        with app.app_context():
            app.config.update({
                'AWS_ACCESS_KEY_ID': 'your-access-key',
                'AWS_SECRET_ACCESS_KEY': 'your-secret-key',
                'AWS_S3_BUCKET': 'dociva-temp-files',
            })
            svc = StorageService()
            assert svc.use_s3 is False

    def test_upload_falls_back_to_local_when_s3_upload_fails(self, app, monkeypatch):
        """A broken S3 upload should still preserve a working local download."""
        with app.app_context():
            app.config.update({
                'AWS_ACCESS_KEY_ID': 'real-looking-key',
                'AWS_SECRET_ACCESS_KEY': 'real-looking-secret',
                'AWS_S3_BUCKET': 'dociva-temp-files',
                'STORAGE_ALLOW_LOCAL_FALLBACK': True,
            })
            svc = StorageService()
            task_id = 's3-fallback-test'
            input_path = '/tmp/test_storage_fallback.pdf'
            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4 fallback')

            class DummyClientError(Exception):
                pass

            failing_client = Mock()
            failing_client.upload_file.side_effect = DummyClientError('boom')
            monkeypatch.setattr('botocore.exceptions.ClientError', DummyClientError)
            monkeypatch.setattr(StorageService, 'client', property(lambda self: failing_client))

            key = svc.upload_file(input_path, task_id)
            url = svc.generate_presigned_url(key, original_filename='fallback.pdf')

            assert key == f'outputs/{task_id}/test_storage_fallback.pdf'
            assert svc.file_exists(key) is True
            assert '/api/download/s3-fallback-test/test_storage_fallback.pdf' in url

            os.unlink(input_path)
