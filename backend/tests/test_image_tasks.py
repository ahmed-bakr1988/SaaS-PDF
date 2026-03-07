"""Tests for image processing Celery task routes."""
import io
from unittest.mock import MagicMock


class TestImageTaskRoutes:
    def test_convert_image_success(self, client, monkeypatch):
        """Should return 202 with task_id for valid image conversion request."""
        mock_task = MagicMock()
        mock_task.id = 'img-convert-id'

        monkeypatch.setattr(
            'app.routes.image.validate_actor_file',
            lambda f, allowed_types, actor: ('photo.png', 'png'),
        )
        monkeypatch.setattr(
            'app.routes.image.generate_safe_path',
            lambda ext, folder_type: ('img-convert-id', '/tmp/test.png'),
        )
        monkeypatch.setattr(
            'app.routes.image.convert_image_task.delay',
            MagicMock(return_value=mock_task),
        )

        data = {
            'file': (io.BytesIO(b'\x89PNG\r\n'), 'photo.png'),
            'format': 'jpg',
            'quality': '85',
        }
        response = client.post(
            '/api/image/convert',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert response.get_json()['task_id'] == 'img-convert-id'

    def test_convert_image_invalid_format(self, client):
        """Should return 400 for unsupported output format."""
        data = {
            'file': (io.BytesIO(b'\x89PNG\r\n'), 'photo.png'),
            'format': 'bmp',
        }
        response = client.post(
            '/api/image/convert',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert 'format' in response.get_json()['error'].lower()

    def test_resize_image_success(self, client, monkeypatch):
        """Should return 202 with task_id for valid resize request."""
        mock_task = MagicMock()
        mock_task.id = 'img-resize-id'

        monkeypatch.setattr(
            'app.routes.image.validate_actor_file',
            lambda f, allowed_types, actor: ('photo.jpg', 'jpg'),
        )
        monkeypatch.setattr(
            'app.routes.image.generate_safe_path',
            lambda ext, folder_type: ('img-resize-id', '/tmp/test.jpg'),
        )
        monkeypatch.setattr(
            'app.routes.image.resize_image_task.delay',
            MagicMock(return_value=mock_task),
        )

        data = {
            'file': (io.BytesIO(b'\xff\xd8\xff'), 'photo.jpg'),
            'width': '800',
            'height': '600',
        }
        response = client.post(
            '/api/image/resize',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert response.get_json()['task_id'] == 'img-resize-id'

    def test_resize_image_no_dimensions(self, client, monkeypatch):
        """Should return 400 when both width and height are missing."""
        monkeypatch.setattr(
            'app.routes.image.validate_actor_file',
            lambda f, allowed_types, actor: ('photo.jpg', 'jpg'),
        )
        data = {
            'file': (io.BytesIO(b'\xff\xd8\xff'), 'photo.jpg'),
        }
        response = client.post(
            '/api/image/resize',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert 'width' in response.get_json()['error'].lower() or 'height' in response.get_json()['error'].lower()

    def test_resize_image_invalid_width(self, client, monkeypatch):
        """Should return 400 for width out of range."""
        monkeypatch.setattr(
            'app.routes.image.validate_actor_file',
            lambda f, allowed_types, actor: ('photo.jpg', 'jpg'),
        )
        data = {
            'file': (io.BytesIO(b'\xff\xd8\xff'), 'photo.jpg'),
            'width': '20000',
        }
        response = client.post(
            '/api/image/resize',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400