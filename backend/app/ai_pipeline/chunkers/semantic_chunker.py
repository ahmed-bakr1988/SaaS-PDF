"""SemanticChunker — splits markdown into structured chunks for RAG pipelines."""

from __future__ import annotations

import re

from app.ai_pipeline.models.chunk import Chunk

_MAX_TOKENS_PER_CHUNK = 2000
_MIN_TOKENS_PER_CHUNK = 50
_TOKENS_PER_CHARS = 4  # approximation


def chunk(markdown: str) -> list[Chunk]:
    """Split *markdown* into semantic chunks.

    Rules (from architecture plan):
    - Split on `## ` headings (H2)
    - If section > 2000 tokens: sub-split on `### ` (H3)
    - If no headings: chunk every 1000 tokens
    - Minimum chunk size: 50 tokens (merge tiny orphans into previous)
    """
    # Try H2 splitting first
    sections = re.split(r"(?=^## )", markdown, flags=re.MULTILINE)
    sections = [s.strip() for s in sections if s.strip()]

    if not sections:
        return []

    # If only one section with no heading, fall back to token-based chunking
    if len(sections) == 1 and not sections[0].startswith("## "):
        return _token_chunks(sections[0], "Content")

    chunks: list[Chunk] = []
    for section in sections:
        heading = _extract_heading(section) or "Section"
        token_count = len(section) // _TOKENS_PER_CHARS

        if token_count > _MAX_TOKENS_PER_CHUNK:
            chunks.extend(_subsplit(section, heading))
        else:
            chunks.append(Chunk.from_markdown(heading, section))

    return _merge_orphans(chunks)


def _extract_heading(section: str) -> str:
    match = re.match(r"^#{1,3} (.+)", section.lstrip())
    return match.group(1).strip() if match else ""


def _subsplit(section: str, parent_heading: str) -> list[Chunk]:
    """Sub-split on H3 headings, or fall back to token chunking."""
    subsections = re.split(r"(?=^### )", section, flags=re.MULTILINE)
    subsections = [s.strip() for s in subsections if s.strip()]

    if len(subsections) > 1:
        return [
            Chunk.from_markdown(
                _extract_heading(sub) or f"{parent_heading} (cont.)",
                sub,
            )
            for sub in subsections
        ]
    # No H3 headings — fall back to token-based chunking
    return _token_chunks(section, parent_heading)


def _token_chunks(text: str, heading: str) -> list[Chunk]:
    """Split *text* into fixed-size token chunks."""
    step = _MAX_TOKENS_PER_CHUNK * _TOKENS_PER_CHARS
    parts = [text[i : i + step] for i in range(0, len(text), step)]
    return [
        Chunk.from_markdown(f"{heading} (part {idx})", part)
        for idx, part in enumerate(parts, start=1)
        if part.strip()
    ]


def _merge_orphans(chunks: list[Chunk]) -> list[Chunk]:
    """Merge chunks that are too small (< MIN_TOKENS) into the previous chunk."""
    if not chunks:
        return chunks
    merged: list[Chunk] = [chunks[0]]
    for chunk_item in chunks[1:]:
        if chunk_item.token_estimate < _MIN_TOKENS_PER_CHUNK:
            prev = merged[-1]
            merged[-1] = Chunk(
                section=prev.section,
                summary=prev.summary,
                markdown=prev.markdown + "\n\n" + chunk_item.markdown,
                token_estimate=prev.token_estimate + chunk_item.token_estimate,
            )
        else:
            merged.append(chunk_item)
    return merged
