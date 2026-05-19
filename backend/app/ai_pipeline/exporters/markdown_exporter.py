"""MarkdownExporter — assembles the final AI-ready .md file and writes it to disk."""

from __future__ import annotations

import os

_MAX_CHARS = 1_000_000


def export(
    markdown: str,
    output_path: str,
    source_title: str,
    method: str,
) -> str:
    """Finalize and write *markdown* to *output_path*.

    Adds a title heading if absent, applies char cap, appends attribution comment.
    Returns the finalized markdown string.
    """
    markdown = markdown.strip()

    if len(markdown) > _MAX_CHARS:
        markdown = markdown[:_MAX_CHARS] + "\n\n<!-- Output truncated by safety limit. -->"

    if not markdown.lstrip().startswith("#"):
        markdown = f"# {source_title}\n\n{markdown}"

    markdown = f"{markdown}\n\n<!-- Converted by Dociva · method: {method} -->\n"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(markdown)

    return markdown
