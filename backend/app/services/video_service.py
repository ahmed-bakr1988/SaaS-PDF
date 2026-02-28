"""Video to GIF conversion service using ffmpeg."""
import os
import re
import subprocess
import logging

logger = logging.getLogger(__name__)


class VideoProcessingError(Exception):
    """Custom exception for video processing failures."""
    pass


# Safety constraints
MAX_DURATION = 15      # seconds
MAX_WIDTH = 640        # pixels
MAX_FPS = 20
DEFAULT_FPS = 10
DEFAULT_WIDTH = 480


def video_to_gif(
    input_path: str,
    output_path: str,
    start_time: float = 0,
    duration: float = 5,
    fps: int = DEFAULT_FPS,
    width: int = DEFAULT_WIDTH,
) -> dict:
    """
    Convert a video clip to an animated GIF using ffmpeg.

    Args:
        input_path: Path to the input video (MP4/WebM)
        output_path: Path for the output GIF
        start_time: Start time in seconds
        duration: Duration in seconds (max 15)
        fps: Frames per second (max 20)
        width: Output width in pixels (max 640)

    Returns:
        dict with output_size, duration, fps, dimensions

    Raises:
        VideoProcessingError: If conversion fails
    """
    # Sanitize numeric parameters (prevent injection)
    start_time = max(0, float(start_time))
    duration = max(0.5, min(MAX_DURATION, float(duration)))
    fps = max(1, min(MAX_FPS, int(fps)))
    width = max(100, min(MAX_WIDTH, int(width)))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Two-pass palette approach for high-quality GIF
    palette_path = output_path + ".palette.png"

    try:
        # Pass 1: Generate optimized palette
        palette_cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", input_path,
            "-vf", f"fps={fps},scale={width}:-1:flags=lanczos,palettegen=stats_mode=diff",
            palette_path,
        ]

        result = subprocess.run(
            palette_cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            logger.error(f"ffmpeg palette generation failed: {result.stderr}")
            raise VideoProcessingError("Failed to process video for GIF creation.")

        # Pass 2: Create GIF using palette
        gif_cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", input_path,
            "-i", palette_path,
            "-lavfi", f"fps={fps},scale={width}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5",
            output_path,
        ]

        result = subprocess.run(
            gif_cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            logger.error(f"ffmpeg GIF creation failed: {result.stderr}")
            raise VideoProcessingError("Failed to create GIF from video.")

        if not os.path.exists(output_path):
            raise VideoProcessingError("GIF file was not created.")

        output_size = os.path.getsize(output_path)

        # Get actual output dimensions
        actual_width, actual_height = _get_gif_dimensions(output_path)

        logger.info(
            f"Video→GIF: {input_path} → {output_path} "
            f"({output_size} bytes, {duration}s, {fps}fps, {actual_width}x{actual_height})"
        )

        return {
            "output_size": output_size,
            "duration": duration,
            "fps": fps,
            "width": actual_width,
            "height": actual_height,
        }

    except subprocess.TimeoutExpired:
        raise VideoProcessingError("GIF creation timed out. Video may be too large.")
    except FileNotFoundError:
        raise VideoProcessingError("ffmpeg is not installed on the server.")
    finally:
        # Cleanup palette file
        if os.path.exists(palette_path):
            os.remove(palette_path)


def get_video_duration(input_path: str) -> float:
    """Get the duration of a video file in seconds."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input_path,
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        )
        return float(result.stdout.strip())
    except (subprocess.TimeoutExpired, ValueError):
        return 0.0


def _get_gif_dimensions(gif_path: str) -> tuple[int, int]:
    """Get GIF dimensions using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        gif_path,
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        )
        parts = result.stdout.strip().split(",")
        if len(parts) == 2:
            return int(parts[0]), int(parts[1])
    except (subprocess.TimeoutExpired, ValueError):
        pass

    return 0, 0
