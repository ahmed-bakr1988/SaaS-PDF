"""BaseAnalyzer — the protocol every analyzer must satisfy."""

from __future__ import annotations

from typing import Protocol


class BaseAnalyzer(Protocol):
    """An analyzer extracts raw text/markdown from a file.

    Every analyzer must be independently callable and return a ``str``.
    Raise ``MarkdownConversionError`` (from ``markdown_convert_service``) on failure.
    """

    def __call__(self, input_path: str, original_filename: str) -> str:
        """Extract text from *input_path* and return raw markdown string."""
        ...
