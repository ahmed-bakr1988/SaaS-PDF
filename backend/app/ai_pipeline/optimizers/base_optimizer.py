"""BaseOptimizer — the protocol every optimizer must satisfy.

Optimizers are pure functions: str in → str out, no side effects.
"""

from __future__ import annotations

from typing import Protocol


class BaseOptimizer(Protocol):
    """An optimizer reduces noise from extracted text while preserving semantics."""

    def __call__(self, text: str) -> tuple[str, list[str]]:
        """Optimize *text* and return (optimized_text, noise_removed_labels)."""
        ...
