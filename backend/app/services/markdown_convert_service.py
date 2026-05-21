"""Convert supported file formats into AI-optimized context Markdown.

This module is now a thin adapter over the ai_pipeline package.
All conversion logic lives in backend/app/ai_pipeline/.

Public surface preserved for backward compatibility:
  - MarkdownConversionError  (imported by tasks)
  - MarkdownConversionResult (imported by tasks)
  - SUPPORTED_MARKDOWN_TYPES (imported by route)
  - IMAGE_EXTENSIONS         (imported by route)
  - VIDEO_EXTENSIONS         (imported by route)
  - convert_file_to_markdown (called by tasks)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING


# ── Public error ──────────────────────────────────────────────────────────────

class MarkdownConversionError(Exception):
    """Raised when a file cannot produce useful Markdown."""


# ── Extension constants (consumed by route for validation + task routing) ────

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "tiff", "bmp"}
VIDEO_EXTENSIONS = {"mp4", "webm"}
OFFICE_TO_PDF_EXTENSIONS = {"doc", "docx", "xls", "xlsx", "ppt", "pptx"}

SUPPORTED_MARKDOWN_TYPES = sorted({
    "pdf", "doc", "docx", "html", "htm", "zip",
    "png", "jpg", "jpeg", "webp", "tiff", "bmp",
    "mp4", "webm", "pptx", "ppt", "xlsx", "xls",
    "txt", "md", "markdown", "csv", "json", "xml", "log",
})


# ── Result dataclass (backward-compatible with existing task code) ────────────

@dataclass(frozen=True)
class MarkdownConversionResult:
    """Returned by convert_file_to_markdown — wraps the full AIContextResult."""

    markdown: str
    method: str
    char_count: int
    # Phase 2 fields — populated by the pipeline
    chunks: list = None          # type: ignore[assignment]
    prompt: str = ""
    metrics: object = None


# ── Public entry point ────────────────────────────────────────────────────────

def convert_file_to_markdown(
    input_path: str,
    output_path: str,
    *,
    original_filename: str,
    ext: str,
    work_dir: str,
) -> MarkdownConversionResult:
    """Convert one uploaded file to AI-optimized Markdown.

    Delegates entirely to :mod:`app.ai_pipeline.pipelines.base_pipeline`.
    Raises :class:`MarkdownConversionError` if all attempts fail.
    """
    from app.ai_pipeline.pipelines import base_pipeline

    try:
        result = base_pipeline.run(
            input_path,
            output_path,
            original_filename=original_filename,
            ext=ext,
        )
    except MarkdownConversionError:
        raise
    except Exception as exc:
        raise MarkdownConversionError(str(exc)) from exc

    return MarkdownConversionResult(
        markdown=result.markdown,
        method=result.method,
        char_count=result.char_count,
        chunks=result.chunks,
        prompt=result.prompt,
        metrics=result.metrics,
    )


# ── Private helper — kept so existing monkeypatches in tests still resolve ────
# test_markdown_convert_service.py monkeypatches this path:
#   app.services.markdown_convert_service._convert_with_markitdown

def _convert_with_markitdown(input_path: str) -> str:
    """Thin shim so existing test monkeypatches continue to work."""
    from app.ai_pipeline.analyzers import markitdown_analyzer
    return markitdown_analyzer.analyze(input_path, Path(input_path).name)
