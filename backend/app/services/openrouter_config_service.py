"""Shared OpenRouter configuration access for all AI-enabled services."""
from dataclasses import dataclass
import os

from dotenv import dotenv_values
from flask import current_app, has_app_context


DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
LEGACY_SAMPLE_OPENROUTER_API_KEY = "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"


@dataclass(frozen=True)
class OpenRouterSettings:
    api_key: str
    model: str
    base_url: str


def extract_openrouter_text(payload: dict) -> str:
    """Extract assistant text from OpenRouter/OpenAI-style payloads safely."""
    choices = payload.get("choices") or []
    if not choices:
        return ""

    message = choices[0].get("message") or {}
    content = message.get("content")

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        text_parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                if item.strip():
                    text_parts.append(item.strip())
                continue

            if not isinstance(item, dict):
                continue

            if isinstance(item.get("text"), str) and item["text"].strip():
                text_parts.append(item["text"].strip())
                continue

            nested_text = item.get("content")
            if item.get("type") == "text" and isinstance(nested_text, str) and nested_text.strip():
                text_parts.append(nested_text.strip())

        return "\n".join(text_parts).strip()

    return ""


def _load_dotenv_settings() -> dict[str, str]:
    """Read .env values directly so workers can recover from blank in-app config."""
    service_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.abspath(os.path.join(service_dir, "..", ".."))
    repo_root = os.path.abspath(os.path.join(backend_dir, ".."))

    settings: dict[str, str] = {}
    for env_path in (os.path.join(repo_root, ".env"), os.path.join(backend_dir, ".env")):
        if not os.path.exists(env_path):
            continue
        for key, value in dotenv_values(env_path).items():
            if value is not None:
                settings[key] = value.strip()
    return settings


def _first_non_empty(*values: str, default: str = "") -> str:
    """Return the first non-empty string value, or the provided default."""
    for value in values:
        normalized = str(value or "").strip()
        if normalized:
            return normalized
    return default


def _normalize_api_key(value: str) -> str:
    """Treat placeholders and legacy sample keys as missing configuration."""
    normalized = str(value or "").strip()
    if not normalized:
        return ""
    if normalized.startswith("replace-with-"):
        return ""
    if normalized == LEGACY_SAMPLE_OPENROUTER_API_KEY:
        return ""
    return normalized


def get_openrouter_settings() -> OpenRouterSettings:
    """Return the effective OpenRouter settings for the current execution context."""
    dotenv_settings = _load_dotenv_settings()
    env_api_key = os.getenv("OPENROUTER_API_KEY", "")
    env_model = os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)
    env_base_url = os.getenv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL)

    if has_app_context():
        api_key = _first_non_empty(
            current_app.config.get("OPENROUTER_API_KEY", ""),
            env_api_key,
            dotenv_settings.get("OPENROUTER_API_KEY", ""),
        )
        model = _first_non_empty(
            current_app.config.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL),
            env_model,
            dotenv_settings.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL),
            default=DEFAULT_OPENROUTER_MODEL,
        )
        base_url = _first_non_empty(
            current_app.config.get("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
            env_base_url,
            dotenv_settings.get("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
            default=DEFAULT_OPENROUTER_BASE_URL,
        )
        return OpenRouterSettings(api_key=_normalize_api_key(api_key), model=model, base_url=base_url)

    return OpenRouterSettings(
        api_key=_normalize_api_key(_first_non_empty(
            env_api_key,
            dotenv_settings.get("OPENROUTER_API_KEY", ""),
        )),
        model=_first_non_empty(
            env_model,
            dotenv_settings.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL),
            default=DEFAULT_OPENROUTER_MODEL,
        ),
        base_url=_first_non_empty(
            env_base_url,
            dotenv_settings.get("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
            default=DEFAULT_OPENROUTER_BASE_URL,
        ),
    )
