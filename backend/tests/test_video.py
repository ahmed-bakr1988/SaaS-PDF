"""Tests for video processing routes — Video to GIF."""
import io
from unittest.mock import MagicMock


class TestVideoToGif:
    def test_to_gif_no_file(self, client):
        """POST /api/video/to-gif without file should return 400."""
        response = client.post('/api/video/to-gif')
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'No file provided.'

    def test_to_gif_invalid_params(self, client, monkeypatch):
        """Should return 400 for non-numeric parameters."""
        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: (r'test.mp4', r'mp4'),
        )
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'test.mp4'),
            'start_time': 'abc',
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert 'numeric' in response.get_json()['error'].lower()

    def test_to_gif_negative_start(self, client, monkeypatch):
        """Should reject negative start time."""
        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: (r'test.mp4', r'mp4'),
        )
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'test.mp4'),
            'start_time': '-5',
            'duration': '5',
            'fps': '10',
            'width': '480',
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_to_gif_duration_too_long(self, client, monkeypatch):
        """Should reject duration > 15 seconds."""
        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: (r'test.mp4', r'mp4'),
        )
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'test.mp4'),
            'start_time': '0',
            'duration': '20',
            'fps': '10',
            'width': '480',
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert '15' in response.get_json()['error']

    def test_to_gif_fps_out_of_range(self, client, monkeypatch):
        """Should reject FPS > 20."""
        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: (r'test.mp4', r'mp4'),
        )
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'test.mp4'),
            'start_time': '0',
            'duration': '5',
            'fps': '30',
            'width': '480',
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_to_gif_width_out_of_range(self, client, monkeypatch):
        """Should reject width > 640."""
        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: (r'test.mp4', r'mp4'),
        )
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'test.mp4'),
            'start_time': '0',
            'duration': '5',
            'fps': '10',
            'width': '1000',
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_to_gif_success(self, client, monkeypatch):
        """Should return 202 with valid parameters."""
        mock_task = MagicMock()
        mock_task.id = 'gif-task-id'

        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: (r'test.mp4', r'mp4'),
        )
        monkeypatch.setattr(
            'app.routes.video.generate_safe_path',
            lambda ext, folder_type: ('gif-task-id', '/tmp/test_uploads/gif-task-id/test.mp4'),
        )
        monkeypatch.setattr(
            'app.routes.video.create_gif_task.delay',
            MagicMock(return_value=mock_task),
        )
        # Mock FileStorage.save so nothing touches disk
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'test.mp4'),
            'start_time': '0',
            'duration': '5',
            'fps': '10',
            'width': '480',
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body['task_id'] == 'gif-task-id'
        assert 'message' in body