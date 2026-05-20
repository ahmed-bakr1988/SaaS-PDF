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

from app.ai_pipeline.utils.md_helpers import rows_to_md
from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_CSV_ROWS = 500
_MAX_JSON_CHARS = 200_000


class _HTMLTextExtractor(HTMLParser):
    """Rich HTML→Markdown converter supporting tables, links, code, formatting."""

    BLOCK_TAGS = {
        "p", "div", "section", "article", "br", "li", "tr",
        "h1", "h2", "h3", "h4", "h5", "h6",
    }

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self._in_pre = False
        self._in_code = False
        self._in_table = False
        self._table_rows: list[list[str]] = []
        self._current_row: list[str] = []
        self._current_cell = ""
        self._in_ol = False
        self._ol_counter = 0
        self._href = ""

    def handle_starttag(self, tag: str, attrs):
        attrs_dict = dict(attrs)
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            level = int(tag[1])
            self.parts.append("\n\n" + "#" * level + " ")
        elif tag == "li":
            if self._in_ol:
                self._ol_counter += 1
                self.parts.append(f"\n{self._ol_counter}. ")
            else:
                self.parts.append("\n- ")
        elif tag == "ol":
            self._in_ol = True
            self._ol_counter = 0
        elif tag == "ul":
            self._in_ol = False
        elif tag == "a":
            self._href = attrs_dict.get("href", "")
            self.parts.append("[")
        elif tag == "pre":
            self._in_pre = True
            self.parts.append("\n```\n")
        elif tag == "code" and not self._in_pre:
            self._in_code = True
            self.parts.append("`")
        elif tag == "blockquote":
            self.parts.append("\n> ")
        elif tag == "table":
            self._in_table = True
            self._table_rows = []
        elif tag == "tr":
            self._current_row = []
        elif tag in {"td", "th"}:
            self._current_cell = ""
        elif tag in {"strong", "b"}:
            self.parts.append("**")
        elif tag in {"em", "i"}:
            self.parts.append("*")
        elif tag == "img":
            alt = attrs_dict.get("alt", "")
            src = attrs_dict.get("src", "")
            if alt or src:
                self.parts.append(f"![{alt}]({src})")

    def handle_endtag(self, tag: str):
        if tag == "a":
            if self._href:
                self.parts.append(f"]({self._href})")
            else:
                self.parts.append("]")
            self._href = ""
        elif tag == "pre":
            self._in_pre = False
            self.parts.append("\n```\n")
        elif tag == "code" and not self._in_pre:
            self._in_code = False
            self.parts.append("`")
        elif tag in {"td", "th"}:
            self._current_row.append(self._current_cell.strip())
        elif tag == "tr":
            if self._current_row:
                self._table_rows.append(self._current_row)
        elif tag == "table":
            self._in_table = False
            if self._table_rows:
                self.parts.append("\n" + rows_to_md(self._table_rows) + "\n")
            self._table_rows = []
        elif tag in {"strong", "b"}:
            self.parts.append("**")
        elif tag in {"em", "i"}:
            self.parts.append("*")
        elif tag == "ol":
            self._in_ol = False
        elif tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str):
        text = html.unescape(data).strip()
        if not text:
            return
        if self._in_table:
            self._current_cell += text + " "
        elif self._in_pre:
            # Preserve whitespace inside <pre>
            self.parts.append(html.unescape(data))
        elif self._href:
            # Inside a link — no trailing space to avoid [text ] artifacts
            self.parts.append(text)
        else:
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
    return rows_to_md(rows[:_MAX_CSV_ROWS])


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


def _normalize(parts: list[str]) -> str:
    text = "".join(parts)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Fix inline formatting: strip spaces inside markers
    text = re.sub(r"\*\*\s+", "**", text)
    text = re.sub(r"\s+\*\*", "**", text)
    text = re.sub(r"(?<!\*)\*\s+(?!\*)", "*", text)
    text = re.sub(r"(?<!\*)\s+\*(?!\*)", "*", text)
    text = re.sub(r"`\s+", "`", text)
    text = re.sub(r"\s+`", "`", text)
    return text.strip()
