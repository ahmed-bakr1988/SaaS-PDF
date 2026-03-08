"""Tests for Compress Image endpoint — POST /api/image/compress."""
import io
from unittest.mock import MagicMock


class TestCompressImage:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/image/compress')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid image upload."""
        mock_task = MagicMock()
        mock_task.id = 'compress-img-task-id'
        monkeypatch.setattr(
            'app.routes.compress_image.validate_actor_file',
            lambda f, allowed_types, actor: ('test.png', 'png'),
        )
        monkeypatch.setattr(
            'app.routes.compress_image.generate_safe_path',
            lambda ext, folder_type: ('compress-img-task-id', '/tmp/mock.png'),
        )
        monkeypatch.setattr(
            'app.routes.compress_image.compress_image_task.delay',
            MagicMock(return_value=mock_task),
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        from tests.conftest import make_png_bytes
        data = {
            'file': (io.BytesIO(make_png_bytes()), 'test.png'),
            'quality': '75',
        }
        response = client.post(
            '/api/image/compress',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        json_data = response.get_json()
        assert 'task_id' in json_data

    def test_invalid_quality(self, client, monkeypatch):
        """Should clamp quality and still work."""
        mock_task = MagicMock()
        mock_task.id = 'compress-q-task-id'
        monkeypatch.setattr(
            'app.routes.compress_image.validate_actor_file',
            lambda f, allowed_types, actor: ('test.jpg', 'jpg'),
        )
        monkeypatch.setattr(
            'app.routes.compress_image.generate_safe_path',
            lambda ext, folder_type: ('compress-q-task-id', '/tmp/mock.jpg'),
        )
        monkeypatch.setattr(
            'app.routes.compress_image.compress_image_task.delay',
            MagicMock(return_value=mock_task),
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        from tests.conftest import make_jpeg_bytes
        data = {
            'file': (io.BytesIO(make_jpeg_bytes()), 'test.jpg'),
            'quality': '200',  # should be clamped
        }
        response = client.post(
            '/api/image/compress',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
