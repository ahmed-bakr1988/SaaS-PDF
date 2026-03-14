"""Shared OpenRouter configuration access for all AI-enabled services."""
from dataclasses import dataclass
import os

from flask import current_app, has_app_context


DEFAULT_OPENROUTER_MODEL = "stepfun/step-3.5-flash:free"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"


@dataclass(frozen=True)
class OpenRouterSettings:
    api_key: str
    model: str
    base_url: str


def get_openrouter_settings() -> OpenRouterSettings:
    """Return the effective OpenRouter settings for the current execution context."""
    if has_app_context():
        api_key = str(current_app.config.get("OPENROUTER_API_KEY", "")).strip()
        model = str(
            current_app.config.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)
        ).strip() or DEFAULT_OPENROUTER_MODEL
        base_url = str(
            current_app.config.get("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL)
        ).strip() or DEFAULT_OPENROUTER_BASE_URL
        return OpenRouterSettings(api_key=api_key, model=model, base_url=base_url)

    return OpenRouterSettings(
        api_key=os.getenv("OPENROUTER_API_KEY", "").strip(),
        model=os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL).strip()
        or DEFAULT_OPENROUTER_MODEL,
        base_url=os.getenv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL).strip()
        or DEFAULT_OPENROUTER_BASE_URL,
    )