"""PromptEngine — generates context-aware AI prompts based on FileClass and content."""

from __future__ import annotations

import re

from app.ai_pipeline.models.file_class import FileClass

_PROMPT_TEMPLATES: dict[FileClass, str] = {
    FileClass.PDF: (
        "Analyze this document. Summarize the key points, identify the main topics, "
        "and highlight any action items or conclusions."
    ),
    FileClass.OFFICE: (
        "Review this document and extract the key information. "
        "Identify the main sections, data points, and any recommendations."
    ),
    FileClass.TEXT: (
        "Read this text content and provide a concise summary. "
        "Identify the main themes and any important details."
    ),
    FileClass.DATA: (
        "Analyze this structured data. Identify patterns, anomalies, and key statistics. "
        "Summarize the most important findings."
    ),
    FileClass.CONFIG: (
        "Review this configuration file. Identify the key settings, "
        "any potential security risks, and suggest optimizations."
    ),
    FileClass.IMAGE: (
        "Based on the extracted text and metadata from this image, "
        "describe what the image likely contains and summarize the visible information."
    ),
    FileClass.VIDEO: (
        "Based on this video metadata, describe the content type and "
        "suggest what analysis could be performed on the full video."
    ),
    FileClass.ZIP: (
        "Review this archive index. Identify the structure and purpose of its contents. "
        "Summarize what this archive likely contains."
    ),
    FileClass.CODE: (
        "Analyze this code project structure. Identify the framework, architecture patterns, "
        "main modules, and potential scalability or security risks."
    ),
    FileClass.UNKNOWN: (
        "Analyze the extracted content from this file and provide a concise summary "
        "of the key information it contains."
    ),
}


def generate(file_class: FileClass, markdown: str = "") -> str:
    """Return a context-aware AI prompt for the given file class.

    Performs lightweight content analysis to generate specific hints
    about tables, code, financial data, lists, and document length.
    """
    base_prompt = _PROMPT_TEMPLATES.get(file_class, _PROMPT_TEMPLATES[FileClass.UNKNOWN])

    if not markdown:
        return base_prompt

    # Analyse first 8k chars — fast and sufficient for heuristics
    context_hints = _analyze_content(markdown[:8000])

    if context_hints:
        hints = "\n".join(f"- {h}" for h in context_hints)
        return f"{base_prompt}\n\nContent analysis hints:\n{hints}"

    return base_prompt


def _analyze_content(text: str) -> list[str]:
    """Lightweight content analysis for dynamic prompt hints."""
    hints: list[str] = []

    # Tables detected
    table_count = text.count("| --- |") + text.count("|---|")
    if table_count > 0:
        hints.append(
            f"Document contains {table_count} table(s) — analyze the tabular data carefully."
        )

    # Code blocks detected
    code_blocks = text.count("```") // 2
    if code_blocks > 0:
        hints.append(
            f"Document contains {code_blocks} code block(s) — review the code logic and syntax."
        )

    # Financial data heuristic
    numbers = re.findall(r"\$[\d,]+\.?\d*|\d{1,3}(?:,\d{3})+", text)
    if len(numbers) > 10:
        hints.append(
            "Document appears to contain financial or numerical data — identify key figures and trends."
        )

    # List-heavy document
    list_items = text.count("\n- ") + text.count("\n* ") + text.count("\n1. ")
    if list_items > 15:
        hints.append(
            f"Document contains {list_items}+ listed items — organize and categorize them."
        )

    # Document length
    word_count = len(text.split())
    if word_count > 3000:
        hints.append(
            f"This is a long document (~{word_count:,} words) — prioritize key points and conclusions."
        )

    return hints
