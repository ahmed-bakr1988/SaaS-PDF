"""TextAnalyzer — handles TXT, MD, LOG, HTML, CSV, JSON, XML, CONFIG files."""

from __future__ import annotations

import csv
import html
import json
import logging
import re
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_CSV_ROWS = 500
_MAX_JSON_CHARS = 200_000


class _HTMLTextExtractor(HTMLParser):
    BLOCK_TAGS = {"p", "div", "section", "article", "br", "li", "tr", "h1", "h2", "h3"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs):
        if tag in {"h1", "h2", "h3"}:
            self.parts.append("\n\n" + "#" * int(tag[1]) + " ")
        elif tag == "li":
            self.parts.append("\n- ")

    def handle_endtag(self, tag: str):
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str):
        text = html.unescape(data).strip()
        if text:
            self.parts.append(text + " ")

    def text(self) -> str:
        return _normalize(self.parts)


def analyze(input_path: str, original_filename: str) -> str:
    """Dispatch to the correct sub-handler based on file extension."""
    ext = Path(original_filename).suffix.lower().lstrip(".")
    logger.debug("TextAnalyzer: processing .%s", ext)

    if ext in {"md", "markdown"}:
        return _read_text(input_path)
    if ext in {"txt", "log"}:
        return f"```text\n{_read_text(input_path)}\n```"
    if ext == "csv":
        return _csv(input_path)
    if ext == "json":
        return _json(input_path)
    if ext == "xml":
        return f"```xml\n{_read_text(input_path)}\n```"
    if ext in {"html", "htm"}:
        return _html(input_path)
    if ext in {"env", "yaml", "yml", "toml", "ini", "cfg", "sql"}:
        return f"```text\n{_read_text(input_path)}\n```"
    # generic text fallback
    return f"```text\n{_read_text(input_path)}\n```"


# --- Helpers ---

def _read_text(input_path: str) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            with open(input_path, "r", encoding=encoding) as fh:
                content = fh.read()
            if not content.strip():
                raise MarkdownConversionError("Text file is empty.")
            return content
        except UnicodeDecodeError:
            continue
    raise MarkdownConversionError("Could not decode text file.")


def _csv(input_path: str) -> str:
    with open(input_path, "r", encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.reader(fh) if any(c.strip() for c in r)]
    if not rows:
        raise MarkdownConversionError("CSV file contains no rows.")
    return _rows_to_md(rows[:_MAX_CSV_ROWS])


def _json(input_path: str) -> str:
    raw = _read_text(input_path)
    try:
        parsed = json.loads(raw[:_MAX_JSON_CHARS])
        return f"```json\n{json.dumps(parsed, indent=2, ensure_ascii=False)}\n```"
    except json.JSONDecodeError:
        return f"```text\n{raw}\n```"


def _html(input_path: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(_read_text(input_path))
    result = parser.text()
    if not result.strip():
        raise MarkdownConversionError("HTML file contains no readable text.")
    return result


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


def _normalize(parts: list[str]) -> str:
    text = "".join(parts)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
