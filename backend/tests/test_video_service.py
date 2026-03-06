"""Tests for video processing service."""
import os
from unittest.mock import patch, MagicMock
import pytest

from app.services.video_service import video_to_gif, VideoProcessingError


class TestVideoService:
    def test_sanitizes_parameters(self, app):
        """Should clamp parameters to safe ranges."""
        with app.app_context():
            with patch('app.services.video_service.subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=1, stderr='test error')
                # Even with crazy params, it should clamp them
                with pytest.raises(VideoProcessingError):
                    video_to_gif(
                        '/tmp/test.mp4', '/tmp/out.gif',
                        start_time=-10, duration=100,
                        fps=50, width=2000,
                    )

    def test_ffmpeg_palette_failure_raises(self, app):
        """Should raise when ffmpeg palette generation fails."""
        with app.app_context():
            input_path = '/tmp/test_vid_fail.mp4'
            with open(input_path, 'wb') as f:
                f.write(b'\x00\x00\x00\x1cftyp')

            with patch('app.services.video_service.subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(
                    returncode=1, stderr='Invalid video'
                )
                with pytest.raises(VideoProcessingError):
                    video_to_gif(input_path, '/tmp/fail_out.gif')

            os.unlink(input_path)