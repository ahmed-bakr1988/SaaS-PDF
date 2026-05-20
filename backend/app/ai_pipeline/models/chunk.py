"""Chunk dataclass — one semantic unit for RAG/embedding pipelines."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Chunk:
    """A semantically coherent section of the converted output."""

    section: str            # heading / title of the section
    summary: str            # 1-sentence description (empty until Phase 4 LLM pass)
    markdown: str           # full markdown content of this section
    token_estimate: int     # estimated token count (len(markdown) // 4)
    chunk_index: int = 0    # position in the chunk sequence
    total_chunks: int = 0   # total number of chunks in the document
    has_table: bool = False # whether chunk contains markdown tables
    has_code: bool = False  # whether chunk contains code blocks

    @classmethod
    def from_markdown(cls, section: str, markdown: str) -> "Chunk":
        return cls(
            section=section,
            summary="",
            markdown=markdown,
            token_estimate=max(1, len(markdown) // 4),
            has_table="| --- |" in markdown or "|---|" in markdown,
            has_code="```" in markdown,
        )

    def to_dict(self) -> dict:
        return {
            "section": self.section,
            "summary": self.summary,
            "markdown": self.markdown,
            "token_estimate": self.token_estimate,
            "chunk_index": self.chunk_index,
            "total_chunks": self.total_chunks,
            "has_table": self.has_table,
            "has_code": self.has_code,
        }
