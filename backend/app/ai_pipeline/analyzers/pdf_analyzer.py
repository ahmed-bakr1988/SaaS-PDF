"""PDFAnalyzer — structured extraction from PDF files.

Uses pdfplumber for rich extraction (tables, headings via font size,
hyperlinks) with a pypdf text-only fallback.  Processes pages in a
streaming fashion to minimise RAM usage on the constrained VPS.
"""

from __future__ import annotations

import logging
import re

from app.ai_pipeline.utils.md_helpers import rows_to_md
from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_PAGES = 500
_HEADING_MIN_SIZE = 14.0   # font size >= this is treated as a heading
_HEADING_LARGE_SIZE = 18.0 # font size >= this is treated as H2, otherwise H3


def analyze(input_path: str, original_filename: str) -> str:
    """Extract structured content from a PDF file page-by-page.

    Strategy:
    1. Try pdfplumber (tables + heading detection + links).
    2. Fall back to pypdf plain-text extraction.
    """
    logger.debug("PDFAnalyzer: processing %s", original_filename)

    # --- Attempt 1: pdfplumber (rich extraction) ---
    try:
        return _analyze_with_pdfplumber(input_path)
    except ImportError:
        logger.debug("PDFAnalyzer: pdfplumber not available, falling back to pypdf")
    except Exception as exc:
        logger.debug("PDFAnalyzer: pdfplumber failed (%s), falling back to pypdf", exc)

    # --- Attempt 2: pypdf plain text ---
    return _analyze_with_pypdf(input_path)


# ── pdfplumber path (preferred) ────────────────────────────────────────────


def _analyze_with_pdfplumber(input_path: str) -> str:
    """Rich PDF extraction with table detection and heading analysis."""
    import pdfplumber

    parts: list[str] = []

    with pdfplumber.open(input_path) as pdf:
        for index, page in enumerate(pdf.pages[:_MAX_PAGES], start=1):
            page_parts: list[str] = []

            # 1. Extract tables first (they will be excluded from text)
            tables = _extract_tables(page)

            # 2. Extract structured text (with headings)
            text = _extract_structured_text(page)
            if text:
                page_parts.append(text)

            # 3. Append tables as Markdown tables
            page_parts.extend(tables)

            # 4. Extract hyperlinks
            links = _extract_links(page)
            if links:
                page_parts.append("### Links\n\n" + "\n".join(links))

            if page_parts:
                parts.append(f"## Page {index}\n\n" + "\n\n".join(page_parts))

    if not parts:
        raise MarkdownConversionError("PDF contains no extractable text.")
    return "\n\n".join(parts)


def _extract_tables(page) -> list[str]:
    """Extract tables from a pdfplumber page and convert to Markdown."""
    md_tables: list[str] = []
    try:
        tables = page.extract_tables()
        if not tables:
            return md_tables

        for table in tables:
            if not table or len(table) < 2:
                continue
            # Filter out completely empty rows
            filtered = [
                [str(cell or "").strip() for cell in row]
                for row in table
                if any(str(cell or "").strip() for cell in row)
            ]
            if len(filtered) >= 2:
                md_tables.append(rows_to_md(filtered))
    except Exception:
        # Table extraction is best-effort
        pass
    return md_tables


def _extract_structured_text(page) -> str:
    """Extract text with heading detection based on font size."""
    try:
        chars = page.chars
    except Exception:
        # Fall back to plain text if char-level data unavailable
        raw = page.extract_text() or ""
        return _normalize(raw)

    if not chars:
        raw = page.extract_text() or ""
        return _normalize(raw)

    # Group chars into lines by approximate y-position
    lines: list[tuple[float, str]] = []
    current_line_chars: list[dict] = []
    current_top: float = -1

    for char in sorted(chars, key=lambda c: (round(c.get("top", 0), 1), c.get("x0", 0))):
        char_top = round(char.get("top", 0), 1)
        if current_top < 0:
            current_top = char_top

        # New line if vertical position changes significantly
        if abs(char_top - current_top) > 3:
            if current_line_chars:
                avg_size = sum(c.get("size", 12) for c in current_line_chars) / len(current_line_chars)
                text = "".join(c.get("text", "") for c in current_line_chars).strip()
                if text:
                    lines.append((avg_size, text))
            current_line_chars = []
            current_top = char_top

        current_line_chars.append(char)

    # Flush last line
    if current_line_chars:
        avg_size = sum(c.get("size", 12) for c in current_line_chars) / len(current_line_chars)
        text = "".join(c.get("text", "") for c in current_line_chars).strip()
        if text:
            lines.append((avg_size, text))

    if not lines:
        return ""

    # Compute median font size to determine what is "normal" text
    sizes = sorted(s for s, _ in lines)
    median_size = sizes[len(sizes) // 2] if sizes else 12

    # Build markdown with heading detection
    md_lines: list[str] = []
    for size, text in lines:
        if size >= max(_HEADING_LARGE_SIZE, median_size * 1.4):
            md_lines.append(f"### {text}")
        elif size >= max(_HEADING_MIN_SIZE, median_size * 1.2):
            md_lines.append(f"#### {text}")
        else:
            md_lines.append(text)

    return _normalize("\n".join(md_lines))


def _extract_links(page) -> list[str]:
    """Extract hyperlinks from a pdfplumber page."""
    links: list[str] = []
    try:
        annots = page.annots or []
        seen: set[str] = set()
        for annot in annots:
            uri = annot.get("uri", "")
            if uri and uri not in seen:
                seen.add(uri)
                links.append(f"- [{uri}]({uri})")
    except Exception:
        pass
    return links


# ── pypdf fallback path ────────────────────────────────────────────────────


def _analyze_with_pypdf(input_path: str) -> str:
    """Plain-text fallback using pypdf / PyPDF2."""
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


# ── Helpers ────────────────────────────────────────────────────────────────


def _normalize(value: str) -> str:
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()
