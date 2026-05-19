"""PDFAnalyzer — page-by-page streaming extraction from PDF files."""

from __future__ import annotations

import logging
import re

from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_PAGES = 500


def analyze(input_path: str, original_filename: str) -> str:
    """Extract text from a PDF file page-by-page (streaming, low RAM)."""
    logger.debug("PDFAnalyzer: processing %s", original_filename)

    try:
        from pypdf import PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader  # type: ignore[no-redef]
        except ImportError as exc:
            raise MarkdownConversionError("PDF reader library not installed.") from exc

    reader = PdfReader(input_path)
    parts: list[str] = []
    for index, page in enumerate(reader.pages[:_MAX_PAGES], start=1):
        raw = page.extract_text() or ""
        text = _normalize(raw)
        if text:
            parts.append(f"## Page {index}\n\n{text}")

    if not parts:
        raise MarkdownConversionError("PDF contains no extractable text.")
    return "\n\n".join(parts)


def _normalize(value: str) -> str:
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()
