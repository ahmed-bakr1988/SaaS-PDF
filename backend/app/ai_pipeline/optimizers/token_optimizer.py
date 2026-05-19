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
