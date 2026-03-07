"""Tests for video task routes — Video to GIF."""
import io
from unittest.mock import MagicMock


class TestVideoTaskRoutes:
    def test_video_to_gif_dispatches_task(self, client, monkeypatch):
        """Should dispatch create_gif_task with correct parameters."""
        mock_task = MagicMock()
        mock_task.id = 'gif-task-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: ('video.mp4', 'mp4'),
        )
        monkeypatch.setattr(
            'app.routes.video.generate_safe_path',
            lambda ext, folder_type: ('gif-task-id', '/tmp/test.mp4'),
        )
        monkeypatch.setattr(
            'app.routes.video.create_gif_task.delay',
            mock_delay,
        )

        # Simulate exact frontend request format
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'video.mp4'),
            'start_time': '2.5',
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

        # Verify task arguments match what the route sends
        args = mock_delay.call_args[0]
        assert args[0] == '/tmp/test.mp4'  # input_path
        assert args[1] == 'gif-task-id'    # task_id
        assert args[2] == 'video.mp4'      # original_filename

    def test_video_to_gif_default_params(self, client, monkeypatch):
        """Should use default params when not provided."""
        mock_task = MagicMock()
        mock_task.id = 'gif-default-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr(
            'app.routes.video.validate_actor_file',
            lambda f, allowed_types, actor: ('video.mp4', 'mp4'),
        )
        monkeypatch.setattr(
            'app.routes.video.generate_safe_path',
            lambda ext, folder_type: ('gif-default-id', '/tmp/test.mp4'),
        )
        monkeypatch.setattr(
            'app.routes.video.create_gif_task.delay',
            mock_delay,
        )

        # Only send file, no extra params
        data = {
            'file': (io.BytesIO(b'\x00\x00\x00\x1cftyp'), 'video.mp4'),
        }
        response = client.post(
            '/api/video/to-gif',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        # Defaults: start_time=0, duration=5, fps=10, width=480
        args = mock_delay.call_args[0]
        assert args[3] == 0     # start_time
        assert args[4] == 5     # duration
        assert args[5] == 10    # fps
        assert args[6] == 480   # width