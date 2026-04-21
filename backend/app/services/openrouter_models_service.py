"""AI model registry service — curated Gemini model catalog.

Provides a static catalog of Gemini models available through Google AI
Studio, plus helpers for admin model switching, credit estimation, and
the public ``/api/ai-models`` endpoint.

The old OpenRouter API fetch has been replaced with a curated list
because the Google AI Studio API does not expose a public model-list
endpoint with pricing metadata.
"""

import json
import logging
import os
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Credit estimation constants (unchanged from OpenRouter era)
TOKENS_PER_PAGE_IN = 800
TOKENS_PER_PAGE_OUT = 800
TRANSLATE_PDF_BASE_CREDITS = 6


@dataclass
class ModelInfo:
    id: str
    name: str
    is_free: bool
    prompt_price_per_token: float   # USD per input token
    completion_price_per_token: float  # USD per output token
    context_length: int = 4096
    description: str = ""
    top_provider: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Curated Gemini model catalog
# ---------------------------------------------------------------------------
# Prices sourced from https://ai.google.dev/pricing (as of 2026-04)
# Free tier prices are $0 for <=15 RPM; listed prices are pay-as-you-go.
_GEMINI_MODELS: list[ModelInfo] = [
    ModelInfo(
        id="gemini-2.0-flash",
        name="Gemini 2.0 Flash",
        is_free=True,
        prompt_price_per_token=0.0,
        completion_price_per_token=0.0,
        context_length=1_048_576,
        description="Fast, versatile model with free tier — ideal for most tasks.",
    ),
    ModelInfo(
        id="gemini-2.0-flash-lite",
        name="Gemini 2.0 Flash Lite",
        is_free=True,
        prompt_price_per_token=0.0,
        completion_price_per_token=0.0,
        context_length=1_048_576,
        description="Lightweight and fastest model with free tier.",
    ),
    ModelInfo(
        id="gemini-2.5-flash-preview-04-17",
        name="Gemini 2.5 Flash Preview",
        is_free=True,
        prompt_price_per_token=0.0,
        completion_price_per_token=0.0,
        context_length=1_048_576,
        description="Latest preview of Gemini 2.5 Flash with improved reasoning.",
    ),
    ModelInfo(
        id="gemini-2.5-pro-preview-03-25",
        name="Gemini 2.5 Pro Preview",
        is_free=False,
        prompt_price_per_token=1.25e-6,
        completion_price_per_token=10.0e-6,
        context_length=1_048_576,
        description="Most capable model — best for complex reasoning and code.",
    ),
    ModelInfo(
        id="gemini-1.5-pro",
        name="Gemini 1.5 Pro",
        is_free=False,
        prompt_price_per_token=1.25e-6,
        completion_price_per_token=5.0e-6,
        context_length=2_097_152,
        description="Previous-gen high-quality model with 2M token context.",
    ),
    ModelInfo(
        id="gemini-1.5-flash",
        name="Gemini 1.5 Flash",
        is_free=True,
        prompt_price_per_token=0.0,
        completion_price_per_token=0.0,
        context_length=1_048_576,
        description="Previous-gen fast model — good balance of speed and quality.",
    ),
]

# Quick lookup by model ID
_MODEL_MAP: dict[str, ModelInfo] = {m.id: m for m in _GEMINI_MODELS}


# ---------------------------------------------------------------------------
# Public API  (matches the signatures callers already import)
# ---------------------------------------------------------------------------
def get_cached_models() -> list[ModelInfo]:
    """Return the curated Gemini model list.

    No API key or network call is needed — the catalog is static.
    """
    return list(_GEMINI_MODELS)


def get_model_info(model_id: str) -> ModelInfo | None:
    """Return ModelInfo for a specific model ID, or None if not found."""
    return _MODEL_MAP.get(model_id)


def get_model_pricing(model_id: str) -> dict:
    """Return per-token pricing dict for a model."""
    info = get_model_info(model_id)
    if info:
        return {
            "prompt": info.prompt_price_per_token,
            "completion": info.completion_price_per_token,
        }
    return {"prompt": 0.0, "completion": 0.0}


def estimate_credits_for_translate(model_id: str, pages: int = 1) -> int:
    """Estimate platform credit cost for a translate-pdf job."""
    info = get_model_info(model_id)
    base = TRANSLATE_PDF_BASE_CREDITS * pages

    if not info or info.is_free:
        return base

    CREDIT_USD_VALUE = 0.001
    cost_usd = (
        info.prompt_price_per_token * TOKENS_PER_PAGE_IN
        + info.completion_price_per_token * TOKENS_PER_PAGE_OUT
    ) * pages
    surcharge = round(cost_usd / CREDIT_USD_VALUE)
    return base + surcharge
