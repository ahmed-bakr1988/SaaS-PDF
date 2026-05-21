"""VideoAnalyzer — extracts video metadata via ffprobe (v1).

v1: metadata-only (duration, codec, dimensions).
v2 (future): speech-to-text via Whisper.
"""

from __future__ import annotations

import json
import logging
import subprocess

from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_FFPROBE_TIMEOUT = 15  # seconds


def analyze(input_path: str, original_filename: str) -> str:
    """Extract video metadata via ffprobe."""
    logger.debug("VideoAnalyzer: processing %s", original_filename)

    duration = _get_duration(input_path)
    streams = _get_stream_details(input_path)

    details: list[str] = [f"- Source: {original_filename}"]
    if duration > 0:
        details.append(f"- Duration: {duration:.2f} seconds")
    details.extend(streams)

    return "\n".join(["## Video", "", *details])


def _get_duration(input_path: str) -> float:
    try:
        from app.services.video_service import get_video_duration
        return get_video_duration(input_path)
    except Exception:
        return 0.0


def _get_stream_details(input_path: str) -> list[str]:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "stream=codec_type,codec_name,width,height",
        "-of", "json",
        input_path,
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=_FFPROBE_TIMEOUT
        )
        if result.returncode != 0:
            return []
        payload = json.loads(result.stdout or "{}")
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return []

    details: list[str] = []
    for stream in payload.get("streams", []):
        codec_type = stream.get("codec_type", "stream")
        codec_name = stream.get("codec_name", "unknown")
        dimensions = ""
        if stream.get("width") and stream.get("height"):
            dimensions = f", {stream['width']} x {stream['height']}"
        details.append(f"- {codec_type.title()} stream: {codec_name}{dimensions}")
    return details
