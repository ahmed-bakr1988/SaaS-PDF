"""PromptEngine — generates suggested AI prompts based on FileClass and content."""

from __future__ import annotations

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
    """Return a suggested AI prompt for the given file class.

    *markdown* is accepted for future context-aware prompt generation (v2).
    """
    return _PROMPT_TEMPLATES.get(file_class, _PROMPT_TEMPLATES[FileClass.UNKNOWN])
