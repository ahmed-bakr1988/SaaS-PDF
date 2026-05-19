"""AIContextResult — the unified output contract for the AI pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.ai_pipeline.models.chunk import Chunk


@dataclass
class AIContextMetrics:
    """Token optimization and cost metrics for the conversion result."""

    original_size_bytes: int
    output_size_bytes: int
    char_count: int
    token_estimate: int
    token_reduction_pct: int
    estimated_cost_saved_usd: float
    noise_removed: list[str]
    ai_readability_score: int
    conversion_method: str

    def to_dict(self) -> dict:
        return {
            "original_size_bytes": self.original_size_bytes,
            "output_size_bytes": self.output_size_bytes,
            "char_count": self.char_count,
            "token_estimate": self.token_estimate,
            "token_reduction_pct": self.token_reduction_pct,
            "estimated_cost_saved_usd": round(self.estimated_cost_saved_usd, 4),
            "noise_removed": self.noise_removed,
            "ai_readability_score": self.ai_readability_score,
            "conversion_method": self.conversion_method,
        }


@dataclass
class AIContextResult:
    """Complete output of the AI Context Optimization Engine."""

    markdown: str
    method: str
    char_count: int
    chunks: list[Chunk] = field(default_factory=list)
    prompt: str = ""
    metrics: AIContextMetrics | None = None

    def to_task_result(
        self,
        download_url: str,
        download_name: str,
        output_size: int,
    ) -> dict:
        """Serialize to the task result dict consumed by the frontend."""
        result: dict = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "output_size": output_size,
            "text": self.markdown[:5000],
            "char_count": self.char_count,
            "format": "md",
            "conversion_method": self.method,
            "prompt": self.prompt,
            "chunks": [c.to_dict() for c in self.chunks],
        }
        if self.metrics:
            result["metrics"] = self.metrics.to_dict()
        return result
