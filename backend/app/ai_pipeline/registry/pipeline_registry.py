"""PipelineRegistry — maps FileClass to the correct analyzer and optimizer.

Replaces all `if ext ==` chains with a data-driven dispatch table.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.ai_pipeline.models.file_class import FileClass

# Type alias for the functions registered per domain
AnalyzeFn = Callable[[str, str], str]           # (input_path, original_filename) -> str
OptimizeFn = Callable[[str], tuple[str, list[str]]]  # (text) -> (text, noise_labels)


@dataclass(frozen=True)
class PipelineConfig:
    """The complete processing config for a given FileClass."""

    analyzer: AnalyzeFn
    optimizer: OptimizeFn


def _build_registry() -> dict[FileClass, PipelineConfig]:
    """Build the dispatch table. Imports are deferred so workers don't crash at boot."""
    from app.ai_pipeline.analyzers import (
        image_analyzer,
        markitdown_analyzer,
        office_analyzer,
        pdf_analyzer,
        text_analyzer,
        video_analyzer,
        zip_analyzer,
    )
    from app.ai_pipeline.optimizers import (
        code_optimizer,
        log_optimizer,
        token_optimizer,
    )

    return {
        FileClass.PDF:     PipelineConfig(pdf_analyzer.analyze,        token_optimizer.optimize),
        FileClass.OFFICE:  PipelineConfig(office_analyzer.analyze,     token_optimizer.optimize),
        FileClass.TEXT:    PipelineConfig(text_analyzer.analyze,       log_optimizer.optimize),
        FileClass.DATA:    PipelineConfig(text_analyzer.analyze,       token_optimizer.optimize),
        FileClass.CONFIG:  PipelineConfig(text_analyzer.analyze,       token_optimizer.optimize),
        FileClass.IMAGE:   PipelineConfig(image_analyzer.analyze,      token_optimizer.optimize),
        FileClass.VIDEO:   PipelineConfig(video_analyzer.analyze,      token_optimizer.optimize),
        FileClass.ZIP:     PipelineConfig(zip_analyzer.analyze,        token_optimizer.optimize),
        FileClass.CODE:    PipelineConfig(zip_analyzer.analyze,        code_optimizer.optimize),
        FileClass.UNKNOWN: PipelineConfig(markitdown_analyzer.analyze, token_optimizer.optimize),
    }


# Lazily initialized — built once on first access
_registry: dict[FileClass, PipelineConfig] | None = None


def get(file_class: FileClass) -> PipelineConfig:
    """Return the :class:`PipelineConfig` for *file_class*."""
    global _registry
    if _registry is None:
        _registry = _build_registry()
    return _registry.get(file_class, _registry[FileClass.UNKNOWN])
