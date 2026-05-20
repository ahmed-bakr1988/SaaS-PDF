"""JSONExporter — exports the AI context result as a structured JSON file.

Produces a JSON document optimised for RAG pipelines (LangChain,
LlamaIndex) with metadata, chunks, and a suggested prompt.
"""

from __future__ import annotations

import json
import os


_MAX_CHARS = 1_000_000


def export(
    markdown: str,
    output_path: str,
    source_title: str,
    method: str,
    *,
    chunks: list | None = None,
    prompt: str = "",
    metrics: object | None = None,
) -> str:
    """Write a structured JSON file to *output_path*.

    Returns the JSON string that was written.
    """
    markdown = markdown.strip()
    if len(markdown) > _MAX_CHARS:
        markdown = markdown[:_MAX_CHARS]

    document: dict = {
        "metadata": {
            "title": source_title,
            "conversion_method": method,
            "generator": "Dociva AI Context Engine",
        },
        "content": markdown,
    }

    if chunks:
        document["chunks"] = [
            {
                "id": f"chunk_{i}",
                "section": getattr(c, "section", ""),
                "content": getattr(c, "markdown", ""),
                "token_estimate": getattr(c, "token_estimate", 0),
                "has_table": getattr(c, "has_table", False),
                "has_code": getattr(c, "has_code", False),
            }
            for i, c in enumerate(chunks)
        ]

    if prompt:
        document["suggested_prompt"] = prompt

    if metrics is not None:
        if hasattr(metrics, "to_dict"):
            document["metrics"] = metrics.to_dict()
        elif isinstance(metrics, dict):
            document["metrics"] = metrics

    json_str = json.dumps(document, ensure_ascii=False, indent=2)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json_str)

    return json_str
