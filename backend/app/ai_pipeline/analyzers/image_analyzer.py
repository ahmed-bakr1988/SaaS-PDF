"""ImageAnalyzer — OCR + metadata extraction from image files.

Resizes images to max 1920px before OCR to prevent RAM spikes (memory strategy).
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_DIMENSION = 1920


def analyze(input_path: str, original_filename: str) -> str:
    """Extract metadata and OCR text from an image file."""
    logger.debug("ImageAnalyzer: processing %s", original_filename)

    metadata = _get_metadata(input_path)
    ocr_text = _get_ocr(input_path)

    sections = [
        f"## Image\n\n- Source: {original_filename}",
        "\n".join(metadata),
    ]
    if ocr_text.strip():
        sections.append("## Extracted Text\n\n" + _norm(ocr_text))
    else:
        sections.append(
            "## Extracted Text\n\nNo OCR text was detected. "
            "The output includes image metadata only."
        )
    return "\n\n".join(sections)


def _get_metadata(input_path: str) -> list[str]:
    lines: list[str] = []
    try:
        from PIL import Image

        with Image.open(input_path) as img:
            lines.append(f"- Dimensions: {img.width} x {img.height}")
            lines.append(f"- Mode: {img.mode}")
            lines.append(
                f"- Format: {img.format or Path(input_path).suffix.lstrip('.')}"
            )
    except Exception:
        lines.append("- Image metadata could not be read.")
    return lines


def _get_ocr(input_path: str) -> str:
    """Run OCR after resizing to prevent RAM spike."""
    try:
        from PIL import Image

        with Image.open(input_path) as img:
            if max(img.width, img.height) > _MAX_DIMENSION:
                img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
                # Save resized version to a temp path
                import tempfile, os
                suffix = Path(input_path).suffix or ".png"
                with tempfile.NamedTemporaryFile(
                    suffix=suffix, delete=False
                ) as tmp:
                    tmp_path = tmp.name
                img.save(tmp_path)
                ocr_path = tmp_path
            else:
                ocr_path = input_path
                tmp_path = None

        from app.services.ocr_service import OCRError, ocr_image

        result = (ocr_image(ocr_path, lang="eng") or {}).get("text", "")

        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

        return result or ""
    except Exception:
        return ""


def _norm(value: str) -> str:
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()
