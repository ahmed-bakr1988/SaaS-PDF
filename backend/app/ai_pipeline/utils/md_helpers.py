"""Shared Markdown table helpers used by multiple analyzers.

Consolidates ``rows_to_md`` and ``escape_cell`` which were previously
duplicated across office_analyzer, text_analyzer, and zip_analyzer.
"""

from __future__ import annotations


def rows_to_md(rows: list[list[str]]) -> str:
    """Convert a list of rows into a Markdown table string.

    The first row is treated as the header.  All rows are padded to
    equal width and pipe characters inside cells are escaped.
    """
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    norm = [[escape_cell(c) for c in r + [""] * (width - len(r))] for r in rows]
    header = norm[0]
    body = norm[1:] or [[""] * width]
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join("---" for _ in header) + " |",
    ]
    lines.extend("| " + " | ".join(r) + " |" for r in body)
    return "\n".join(lines)


def escape_cell(v: object) -> str:
    """Escape a table cell value for Markdown (pipes and newlines)."""
    return str(v).replace("|", "\\|").replace("\n", " ").strip()
