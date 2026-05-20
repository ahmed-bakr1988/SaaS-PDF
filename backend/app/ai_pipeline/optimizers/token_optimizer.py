"""TokenOptimizer — removes noise from extracted text to reduce AI token consumption.

Pure function: takes str, returns (str, list[str]).
"""

from __future__ import annotations

import re

_MAX_BLANK_LINES = 2
_MAX_REPEAT_LINES = 5   # collapse lines that repeat more than this many times


def optimize(text: str) -> tuple[str, list[str]]:
    """Remove token waste from extracted markdown text.

    Returns:
        (optimized_text, list_of_noise_labels_removed)
    """
    noise: list[str] = []

    # 1. Collapse excessive blank lines
    cleaned = re.sub(r"\n{3,}", "\n\n", text)
    if cleaned != text:
        noise.append("excessive_blank_lines")
    text = cleaned

    # 2. Remove duplicate consecutive lines (e.g., repeated headers/footers)
    text, dup_removed = _deduplicate_lines(text)
    if dup_removed:
        noise.append("duplicate_lines")

    # 3. Normalize excessive whitespace within lines
    lines = [re.sub(r"[ \t]{2,}", " ", line) for line in text.splitlines()]
    text = "\n".join(lines)

    # 4. Strip lines that are pure punctuation / noise separators
    text, sep_removed = _strip_separator_lines(text)
    if sep_removed:
        noise.append("separator_lines")

    # 5. Remove repeating page headers/footers (common in PDF output)
    text, hf_removed = _remove_repeating_headers_footers(text)
    if hf_removed:
        noise.append("repeating_headers_footers")

    # 6. Remove page number lines
    text, pn_removed = _remove_page_numbers(text)
    if pn_removed:
        noise.append("page_numbers")

    # 7. Normalize Unicode noise (smart quotes, BOM, zero-width chars)
    text, uni_removed = _normalize_unicode(text)
    if uni_removed:
        noise.append("unicode_noise")

    # 8. Compact table cell whitespace
    text, tc_removed = _compact_table_cells(text)
    if tc_removed:
        noise.append("table_whitespace")

    return text.strip(), noise


def _deduplicate_lines(text: str) -> tuple[str, bool]:
    """Collapse lines that repeat more than _MAX_REPEAT_LINES times consecutively."""
    lines = text.splitlines(keepends=True)
    result: list[str] = []
    i = 0
    removed = False
    while i < len(lines):
        line = lines[i]
        count = 1
        while i + count < len(lines) and lines[i + count] == line:
            count += 1
        if count > _MAX_REPEAT_LINES:
            result.append(line)
            result.append(
                f"  _(... {count - 1} identical lines omitted)_\n"
            )
            removed = True
        else:
            result.extend(lines[i : i + count])
        i += count
    return "".join(result), removed


def _strip_separator_lines(text: str) -> tuple[str, bool]:
    """Remove lines that are only dashes, equals, or underscores (noise separators)."""
    pattern = re.compile(r"^[-=_]{5,}\s*$")
    lines = text.splitlines(keepends=True)
    cleaned = [l for l in lines if not pattern.match(l)]
    removed = len(cleaned) != len(lines)
    return "".join(cleaned), removed


def _remove_repeating_headers_footers(text: str) -> tuple[str, bool]:
    """Remove header/footer lines that repeat across >=70% of PDF page sections."""
    from collections import Counter

    pages = re.split(r"(?=^## Page \d+)", text, flags=re.MULTILINE)
    if len(pages) < 4:
        return text, False

    threshold = len(pages) * 0.7
    first_lines: list[str] = []
    last_lines: list[str] = []

    for page in pages[1:]:
        lines = [l.strip() for l in page.strip().splitlines() if l.strip()]
        if len(lines) >= 3:
            first_lines.append(lines[1])  # [0] is the ## Page N heading
            last_lines.append(lines[-1])

    to_remove: set[str] = set()
    for line, count in Counter(first_lines).items():
        if count >= threshold and len(line) > 3:
            to_remove.add(line)
    for line, count in Counter(last_lines).items():
        if count >= threshold and len(line) > 3:
            to_remove.add(line)

    if not to_remove:
        return text, False

    result_lines = [l for l in text.splitlines(keepends=True) if l.strip() not in to_remove]
    return "".join(result_lines), True


_PAGE_NUMBER_PATTERNS = [
    re.compile(r"^\s*Page \d+ of \d+\s*$", re.MULTILINE),
    re.compile(r"^\s*- \d+ -\s*$", re.MULTILINE),
    re.compile(r"^\s*\d{1,4}\s*$", re.MULTILINE),
]


def _remove_page_numbers(text: str) -> tuple[str, bool]:
    """Remove standalone page number lines."""
    removed = False
    for pattern in _PAGE_NUMBER_PATTERNS:
        cleaned = pattern.sub("", text)
        if cleaned != text:
            removed = True
            text = cleaned
    return text, removed


_UNICODE_REPLACEMENTS = {
    "\u2018": "'",  "\u2019": "'",   # Smart single quotes
    "\u201c": '"',  "\u201d": '"',   # Smart double quotes
    "\u2013": "-",  "\u2014": "-",   # En/Em dash
    "\u2026": "...",                  # Ellipsis
    "\u00a0": " ",                    # Non-breaking space
    "\ufeff": "",                     # BOM
    "\u200b": "",                     # Zero-width space
    "\u200c": "",                     # Zero-width non-joiner
    "\u200d": "",                     # Zero-width joiner
    "\u2060": "",                     # Word joiner
}


def _normalize_unicode(text: str) -> tuple[str, bool]:
    """Normalize decorative Unicode to plain ASCII to save tokens."""
    original = text
    for old, new in _UNICODE_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text, text != original


def _compact_table_cells(text: str) -> tuple[str, bool]:
    """Compact excessive whitespace within markdown table cells."""
    _sep_re = re.compile(r"^-+$")
    lines = text.splitlines(keepends=True)
    changed = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = stripped.split("|")
            compacted = "|".join(
                c if _sep_re.match(c.strip()) else c.strip()
                for c in cells
            )
            if compacted != stripped:
                lines[i] = compacted + "\n"
                changed = True
    return "".join(lines), changed

