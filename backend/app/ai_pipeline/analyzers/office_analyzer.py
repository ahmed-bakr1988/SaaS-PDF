"""OfficeAnalyzer — native extraction from DOCX, XLSX, PPTX.

For legacy DOC/XLS/PPT (binary) formats, raises MarkdownConversionError so
the fallback pipeline routes them through MarkItDown or an intermediate
Office→PDF→extract path.
"""

from __future__ import annotations

import logging
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_XLSX_ROWS = 200
_MAX_PPTX_SLIDES = 100


def analyze(input_path: str, original_filename: str) -> str:
    """Dispatch to the correct Office analyzer based on extension."""
    ext = Path(original_filename).suffix.lower().lstrip(".")
    logger.debug("OfficeAnalyzer: processing .%s", ext)

    if ext == "docx":
        return _docx(input_path)
    if ext == "xlsx":
        return _xlsx(input_path)
    if ext == "pptx":
        return _pptx(input_path)
    # Legacy binary formats: no native path → let fallback handle them
    raise MarkdownConversionError(
        f"No native analyzer for .{ext}; routing to fallback pipeline."
    )


def _docx(input_path: str) -> str:
    try:
        with zipfile.ZipFile(input_path) as archive:
            xml = archive.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise MarkdownConversionError("DOCX content could not be read.") from exc

    root = ElementTree.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", ns):
        text = "".join(n.text or "" for n in para.findall(".//w:t", ns))
        if text.strip():
            paragraphs.append(text.strip())

    return _require("\n\n".join(paragraphs), "DOCX contains no readable text.")


def _xlsx(input_path: str) -> str:
    from openpyxl import load_workbook

    workbook = load_workbook(input_path, read_only=True, data_only=True)
    parts: list[str] = []
    for sheet in workbook.worksheets:
        rows: list[list[str]] = []
        for row in sheet.iter_rows(max_row=_MAX_XLSX_ROWS, values_only=True):
            values = ["" if v is None else str(v) for v in row]
            if any(v.strip() for v in values):
                rows.append(values)
        if rows:
            parts.append(f"## {sheet.title}\n\n{_rows_to_md(rows)}")
    workbook.close()
    return _require("\n\n".join(parts), "Spreadsheet contains no readable rows.")


def _pptx(input_path: str) -> str:
    from pptx import Presentation

    presentation = Presentation(input_path)
    parts: list[str] = []
    for index, slide in enumerate(
        list(presentation.slides)[:_MAX_PPTX_SLIDES], start=1
    ):
        texts: list[str] = []
        for shape in slide.shapes:
            if getattr(shape, "has_text_frame", False):
                text = _norm(shape.text)
                if text:
                    texts.append(text)
        if texts:
            parts.append(f"## Slide {index}\n\n" + "\n\n".join(texts))
    return _require("\n\n".join(parts), "Presentation contains no readable text.")


# --- Helpers ---

def _rows_to_md(rows: list[list[str]]) -> str:
    width = max(len(r) for r in rows)
    norm = [[_esc(c) for c in r + [""] * (width - len(r))] for r in rows]
    header = norm[0]
    body = norm[1:] or [[""] * width]
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join("---" for _ in header) + " |",
    ]
    lines.extend("| " + " | ".join(r) + " |" for r in body)
    return "\n".join(lines)


def _esc(v: object) -> str:
    return str(v).replace("|", "\\|").replace("\n", " ").strip()


def _norm(value: str) -> str:
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def _require(text: str, message: str) -> str:
    if not text.strip():
        raise MarkdownConversionError(message)
    return text
