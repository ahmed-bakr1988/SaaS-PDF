"""Shared AI configuration — backward-compatible shim.

This module re-exports the canonical symbols that all existing services
import from ``openrouter_config_service``.  The real implementation now
lives in :mod:`app.services.gemini_client`.

The module will be removed once all callers are migrated to import
directly from ``gemini_client``.
"""
from dataclasses import dataclass
import logging
import os

logger = logging.getLogger(__name__)

# Re-export from gemini_client so every existing ``from
# openrouter_config_service import …`` statement keeps working.
from app.services.gemini_client import (          # noqa: F401, E402
    extract_text_from_openai_compatible as extract_openrouter_text,
    extract_gemini_text,
    get_gemini_settings,
    set_redis_active_model,
    delete_redis_active_model,
    GeminiError,
    RetryableGeminiError,
    ACTIVE_MODEL_REDIS_KEY,
    DEFAULT_TEXT_MODEL,
    DEFAULT_VISION_MODEL,
)

# Legacy constants kept for callers that reference them directly
DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
LEGACY_SAMPLE_OPENROUTER_API_KEY = (
    "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"
)


@dataclass(frozen=True)
class OpenRouterSettings:
    """Backward-compatible dataclass for callers still using this type."""
    api_key: str
    model: str
    base_url: str


def get_openrouter_settings() -> OpenRouterSettings:
    """Return settings in the old OpenRouterSettings shape.

    Delegates to ``get_gemini_settings()`` so the Gemini API key is
    used by default, with legacy OPENROUTER_* env vars as fallback.
    """
    gs = get_gemini_settings()
    # If the new Gemini key is present, use it. Otherwise fall back to
    # legacy OpenRouter env vars so existing deployments don't break.
    api_key = gs.api_key or os.getenv("OPENROUTER_API_KEY", "").strip()
    model = gs.text_model or os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)
    base_url = os.getenv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL)
    return OpenRouterSettings(api_key=api_key, model=model, base_url=base_url)


def get_redis_active_model() -> str:
    """Read the admin-selected model from Redis."""
    from app.services.gemini_client import _get_redis_active_model
    return _get_redis_active_model()


def get_vision_model(explicit_model_id: str | None = None) -> str:
    """Return the model to use for vision (image-input) requests."""
    if explicit_model_id:
        return explicit_model_id
    gs = get_gemini_settings()
    return gs.vision_model
