"""MarkItDownAnalyzer — MarkItDown library fallback for unsupported types."""

from __future__ import annotations

import logging

from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)


def analyze(input_path: str, original_filename: str) -> str:
    """Convert *input_path* via the MarkItDown library."""
    logger.debug("MarkItDownAnalyzer: processing %s", original_filename)

    try:
        from markitdown import MarkItDown
    except ImportError as exc:
        raise MarkdownConversionError("MarkItDown is not installed.") from exc

    result = MarkItDown().convert(input_path)
    markdown = getattr(result, "text_content", None)
    if not markdown:
        markdown = str(result) if result else ""
    markdown = markdown.strip()
    if not markdown:
        raise MarkdownConversionError("MarkItDown returned no content.")
    return markdown
