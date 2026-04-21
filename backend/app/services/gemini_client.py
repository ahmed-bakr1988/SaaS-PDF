"""Gemini AI client — primary AI provider for all AI-enabled services.

Uses the Google AI Studio REST API (generativelanguage.googleapis.com)
via the google-generativeai SDK. Supports text generation, vision
(multimodal), and streaming output for the site assistant.

All services should call through this module instead of making direct
HTTP requests to any AI provider.
"""

import json
import logging
import os
from dataclasses import dataclass
from typing import Generator

import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-feature default models — configurable via env vars
# ---------------------------------------------------------------------------
DEFAULT_TEXT_MODEL = "gemini-2.0-flash"
DEFAULT_TRANSLATE_MODEL = "gemini-2.0-flash"
DEFAULT_VISION_MODEL = "gemini-2.0-flash"

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_REQUEST_TIMEOUT = 90  # seconds
GEMINI_STREAM_TIMEOUT = 120  # seconds


@dataclass(frozen=True)
class GeminiSettings:
    """Resolved Gemini configuration for the current execution context."""
    api_key: str
    text_model: str
    translate_model: str
    vision_model: str


# ---------------------------------------------------------------------------
# Settings resolution  (mirrors the old multi-tier pattern)
# ---------------------------------------------------------------------------
def _load_dotenv_settings() -> dict[str, str]:
    """Read .env values directly so Celery workers see the same config."""
    try:
        from dotenv import dotenv_values
    except ImportError:
        return {}

    service_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.abspath(os.path.join(service_dir, "..", ".."))
    repo_root = os.path.abspath(os.path.join(backend_dir, ".."))

    settings: dict[str, str] = {}
    for env_path in (
        os.path.join(repo_root, ".env"),
        os.path.join(backend_dir, ".env"),
    ):
        if not os.path.exists(env_path):
            continue
        for key, value in dotenv_values(env_path).items():
            if value is not None:
                settings[key] = value.strip()
    return settings


def _first_non_empty(*values: str, default: str = "") -> str:
    for value in values:
        normalized = str(value or "").strip()
        if normalized:
            return normalized
    return default


def _normalize_api_key(value: str) -> str:
    normalized = str(value or "").strip()
    if not normalized or normalized.startswith("replace-with-"):
        return ""
    return normalized


def get_gemini_settings() -> GeminiSettings:
    """Return effective Gemini settings.

    Priority for API key: GEMINI_API_KEY env → GOOGLE_API_KEY env → dotenv.
    Priority for models:  Redis (admin override, text only) → env → dotenv → defaults.
    """
    from flask import current_app, has_app_context

    dotenv = _load_dotenv_settings()

    # API key — accept both GEMINI_API_KEY and legacy GOOGLE_API_KEY
    if has_app_context():
        api_key = _first_non_empty(
            current_app.config.get("GEMINI_API_KEY", ""),
            current_app.config.get("GOOGLE_API_KEY", ""),
            os.getenv("GEMINI_API_KEY", ""),
            os.getenv("GOOGLE_API_KEY", ""),
            dotenv.get("GEMINI_API_KEY", ""),
            dotenv.get("GOOGLE_API_KEY", ""),
        )
    else:
        api_key = _first_non_empty(
            os.getenv("GEMINI_API_KEY", ""),
            os.getenv("GOOGLE_API_KEY", ""),
            dotenv.get("GEMINI_API_KEY", ""),
            dotenv.get("GOOGLE_API_KEY", ""),
        )

    # Text model: Redis admin override → Flask config → env → dotenv → default
    redis_model = _get_redis_active_model()
    if has_app_context():
        text_model = _first_non_empty(
            redis_model,
            current_app.config.get("GEMINI_TEXT_MODEL", ""),
            os.getenv("GEMINI_TEXT_MODEL", ""),
            dotenv.get("GEMINI_TEXT_MODEL", ""),
            default=DEFAULT_TEXT_MODEL,
        )
        translate_model = _first_non_empty(
            current_app.config.get("GEMINI_TRANSLATE_MODEL", ""),
            os.getenv("GEMINI_TRANSLATE_MODEL", ""),
            dotenv.get("GEMINI_TRANSLATE_MODEL", ""),
            default=DEFAULT_TRANSLATE_MODEL,
        )
        vision_model = _first_non_empty(
            current_app.config.get("GEMINI_VISION_MODEL", ""),
            os.getenv("GEMINI_VISION_MODEL", ""),
            dotenv.get("GEMINI_VISION_MODEL", ""),
            default=DEFAULT_VISION_MODEL,
        )
    else:
        text_model = _first_non_empty(
            redis_model,
            os.getenv("GEMINI_TEXT_MODEL", ""),
            dotenv.get("GEMINI_TEXT_MODEL", ""),
            default=DEFAULT_TEXT_MODEL,
        )
        translate_model = _first_non_empty(
            os.getenv("GEMINI_TRANSLATE_MODEL", ""),
            dotenv.get("GEMINI_TRANSLATE_MODEL", ""),
            default=DEFAULT_TRANSLATE_MODEL,
        )
        vision_model = _first_non_empty(
            os.getenv("GEMINI_VISION_MODEL", ""),
            dotenv.get("GEMINI_VISION_MODEL", ""),
            default=DEFAULT_VISION_MODEL,
        )

    return GeminiSettings(
        api_key=_normalize_api_key(api_key),
        text_model=text_model,
        translate_model=translate_model,
        vision_model=vision_model,
    )


# ---------------------------------------------------------------------------
# Redis admin model override (text model only for first migration)
# ---------------------------------------------------------------------------
ACTIVE_MODEL_REDIS_KEY = "gemini:active_model"
# Keep reading the legacy key so an in-flight admin switch still works
_LEGACY_REDIS_KEY = "openrouter:active_model"


def _get_redis():
    try:
        import redis as _redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return _redis.Redis.from_url(redis_url, decode_responses=True)
    except Exception:
        return None


def _get_redis_active_model() -> str:
    try:
        r = _get_redis()
        if r:
            # Prefer new key, fall back to legacy
            for key in (ACTIVE_MODEL_REDIS_KEY, _LEGACY_REDIS_KEY):
                value = r.get(key)
                if value and str(value).strip():
                    return str(value).strip()
    except Exception as exc:
        logger.debug("Redis read for active model failed: %s", exc)
    return ""


def set_redis_active_model(model_id: str) -> bool:
    try:
        r = _get_redis()
        if r:
            r.set(ACTIVE_MODEL_REDIS_KEY, model_id.strip())
            # Also write to legacy key so old workers still see the switch
            r.set(_LEGACY_REDIS_KEY, model_id.strip())
            return True
    except Exception as exc:
        logger.warning("Redis write for active model failed: %s", exc)
    return False


def delete_redis_active_model() -> bool:
    try:
        r = _get_redis()
        if r:
            r.delete(ACTIVE_MODEL_REDIS_KEY)
            r.delete(_LEGACY_REDIS_KEY)
            return True
    except Exception as exc:
        logger.warning("Redis delete for active model failed: %s", exc)
    return False


# ---------------------------------------------------------------------------
# Response extraction helpers
# ---------------------------------------------------------------------------
def extract_gemini_text(response_data: dict) -> str:
    """Extract text from a Gemini REST API response.

    Gemini generateContent response shape:
    {
      "candidates": [{
        "content": {
          "parts": [{"text": "..."}],
          "role": "model"
        }
      }]
    }
    """
    candidates = response_data.get("candidates") or []
    if not candidates:
        return ""

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []

    text_parts: list[str] = []
    for part in parts:
        if isinstance(part, dict):
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                text_parts.append(text.strip())
    return "\n".join(text_parts).strip()


def extract_text_from_openai_compatible(payload: dict) -> str:
    """Extract text from OpenAI-compatible (OpenRouter) response payloads.

    Kept for the temporary OpenRouter fallback path.
    """
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
            nested = item.get("content")
            if item.get("type") == "text" and isinstance(nested, str) and nested.strip():
                text_parts.append(nested.strip())
        return "\n".join(text_parts).strip()
    return ""


# ---------------------------------------------------------------------------
# Core Gemini API calls
# ---------------------------------------------------------------------------
def _build_gemini_url(model: str, method: str = "generateContent", stream: bool = False) -> str:
    action = f"stream{method[0].upper()}{method[1:]}" if stream else method
    return f"{GEMINI_API_BASE}/models/{model}:{action}"


def call_gemini_text(
    system_prompt: str,
    user_message: str,
    *,
    max_tokens: int = 1000,
    temperature: float = 0.5,
    tool_name: str = "gemini_text",
    model: str | None = None,
) -> str:
    """Send a text-only request to Gemini and return the reply string.

    Raises PdfAiError-compatible exceptions on failure.
    """
    settings = get_gemini_settings()
    effective_model = model or settings.text_model

    if not settings.api_key:
        logger.error("GEMINI_API_KEY is not configured.")
        raise GeminiError(
            "AI features are temporarily unavailable. Our team has been notified.",
            error_code="AI_MISSING_API_KEY",
        )

    url = _build_gemini_url(effective_model, "generateContent")

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_message}"}]},
        ],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
    }

    return _send_gemini_request(url, payload, settings.api_key, effective_model, tool_name)


def call_gemini_vision(
    system_prompt: str,
    user_text: str,
    image_base64: str,
    mime_type: str = "image/png",
    *,
    max_tokens: int = 4000,
    temperature: float = 0.3,
    tool_name: str = "gemini_vision",
    model: str | None = None,
) -> str:
    """Send a multimodal (text + image) request to Gemini and return the reply."""
    settings = get_gemini_settings()
    effective_model = model or settings.vision_model

    if not settings.api_key:
        raise GeminiError(
            "AI features are temporarily unavailable.",
            error_code="AI_MISSING_API_KEY",
        )

    url = _build_gemini_url(effective_model, "generateContent")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": user_text},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": image_base64,
                        }
                    },
                ],
            },
        ],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
    }

    return _send_gemini_request(url, payload, settings.api_key, effective_model, tool_name)


def stream_gemini_text(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 400,
    temperature: float = 0.3,
    model: str | None = None,
) -> Generator[str, None, None]:
    """Stream a text reply from Gemini, yielding content chunks.

    ``messages`` uses the OpenAI-style [{role, content}] format which is
    converted to Gemini's contents structure internally.
    """
    settings = get_gemini_settings()
    effective_model = model or settings.text_model

    if not settings.api_key:
        raise GeminiError(
            "AI features are temporarily unavailable.",
            error_code="AI_MISSING_API_KEY",
        )

    url = _build_gemini_url(effective_model, "generateContent", stream=True)

    # Convert messages to Gemini format
    system_parts: list[str] = []
    contents: list[dict] = []
    for msg in messages:
        role = msg.get("role", "user")
        text = msg.get("content", "")
        if role == "system":
            system_parts.append(text)
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})
        else:
            contents.append({"role": "user", "parts": [{"text": text}]})

    payload: dict = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }
    if system_parts:
        payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}

    try:
        response = requests.post(
            url,
            params={"key": settings.api_key, "alt": "sse"},
            json=payload,
            timeout=GEMINI_STREAM_TIMEOUT,
            stream=True,
        )

        if response.status_code != 200:
            _handle_gemini_http_error(response.status_code, effective_model)

        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue
            line = raw_line.strip()
            if not line.startswith("data:"):
                continue
            data_str = line[5:].strip()
            if not data_str or data_str == "[DONE]":
                continue
            try:
                data = json.loads(data_str)
            except json.JSONDecodeError:
                continue

            text = extract_gemini_text(data)
            if text:
                yield text
    except GeminiError:
        raise
    except requests.exceptions.Timeout:
        raise RetryableGeminiError(
            "AI service timed out. Please try again.",
            error_code="AI_TIMEOUT",
        )
    except requests.exceptions.ConnectionError:
        raise RetryableGeminiError(
            "AI service is unreachable. Please try again shortly.",
            error_code="AI_CONNECTION_ERROR",
        )
    except requests.exceptions.RequestException as e:
        raise GeminiError(
            "AI service is temporarily unavailable.",
            error_code="AI_REQUEST_ERROR",
            detail=str(e),
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _send_gemini_request(
    url: str,
    payload: dict,
    api_key: str,
    model: str,
    tool_name: str,
) -> str:
    """POST to Gemini, handle errors, extract text, log usage."""
    # Budget guard
    try:
        from app.services.ai_cost_service import check_ai_budget, AiBudgetExceededError
        check_ai_budget()
    except ImportError:
        pass
    except Exception as error:
        if error.__class__.__name__ == "AiBudgetExceededError":
            raise GeminiError(
                "Monthly AI processing budget has been reached. Please try again next month.",
                error_code="AI_BUDGET_EXCEEDED",
            )

    try:
        response = requests.post(
            url,
            params={"key": api_key},
            json=payload,
            timeout=GEMINI_REQUEST_TIMEOUT,
        )

        status_code = response.status_code
        if status_code != 200:
            _handle_gemini_http_error(status_code, model)

        data = response.json()

        # Check for error payload inside 200
        if data.get("error"):
            error_msg = (
                data["error"].get("message", "")
                if isinstance(data["error"], dict)
                else str(data["error"])
            )
            logger.error("Gemini returned an error payload: %s", error_msg)
            raise GeminiError(
                "AI service encountered an issue. Please try again.",
                error_code="AI_ERROR_PAYLOAD",
                detail=error_msg,
            )

        reply = extract_gemini_text(data)
        if not reply:
            raise GeminiError(
                "AI returned an empty response. Please try again.",
                error_code="AI_EMPTY_RESPONSE",
            )

        # Log usage
        try:
            from app.services.ai_cost_service import log_ai_usage
            usage = data.get("usageMetadata", {})
            log_ai_usage(
                tool=tool_name,
                model=model,
                input_tokens=usage.get("promptTokenCount", _estimate_tokens(str(payload))),
                output_tokens=usage.get("candidatesTokenCount", _estimate_tokens(reply)),
            )
        except Exception:
            pass

        return reply

    except GeminiError:
        raise
    except requests.exceptions.Timeout:
        raise RetryableGeminiError(
            "AI service timed out. Please try again.",
            error_code="AI_TIMEOUT",
        )
    except requests.exceptions.ConnectionError:
        logger.error("Cannot connect to Gemini API at %s", url)
        raise RetryableGeminiError(
            "AI service is unreachable. Please try again shortly.",
            error_code="AI_CONNECTION_ERROR",
        )
    except requests.exceptions.RequestException as e:
        logger.error("Gemini API error: %s", e)
        raise GeminiError(
            "AI service is temporarily unavailable.",
            error_code="AI_REQUEST_ERROR",
            detail=str(e),
        )


def _handle_gemini_http_error(status_code: int, model: str) -> None:
    """Raise the appropriate GeminiError for an HTTP status code."""
    if status_code == 400:
        raise GeminiError(
            "AI request was malformed. Please try again.",
            error_code="AI_BAD_REQUEST",
        )
    if status_code == 401:
        logger.error("Gemini API key is invalid or expired (401).")
        raise GeminiError(
            "AI features are temporarily unavailable due to a configuration issue.",
            error_code="AI_UNAUTHORIZED",
        )
    if status_code == 403:
        logger.error("Gemini API key lacks permissions (403) for model %s.", model)
        raise GeminiError(
            "AI features are temporarily unavailable due to a configuration issue.",
            error_code="AI_UNAUTHORIZED",
        )
    if status_code == 429:
        logger.warning("Gemini rate limit reached (429).")
        raise RetryableGeminiError(
            "AI service is experiencing high demand. Please wait a moment and try again.",
            error_code="AI_RATE_LIMIT",
        )
    if status_code >= 500:
        logger.error("Gemini server error (%s).", status_code)
        raise RetryableGeminiError(
            "AI service provider is experiencing issues. Please try again shortly.",
            error_code="AI_SERVER_ERROR",
        )
    # Catch-all
    raise GeminiError(
        "AI service returned an unexpected status.",
        error_code="AI_SERVER_ERROR",
    )


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# Exception hierarchy (compatible with PdfAiError contract)
# ---------------------------------------------------------------------------
class GeminiError(Exception):
    """Base exception for Gemini AI failures."""

    def __init__(
        self,
        user_message: str,
        error_code: str = "AI_ERROR",
        detail: str | None = None,
    ):
        super().__init__(user_message)
        self.user_message = user_message
        self.error_code = error_code
        self.detail = detail


class RetryableGeminiError(GeminiError):
    """Transient failure that should be retried."""


# ---------------------------------------------------------------------------
# Temporary OpenRouter fallback  (remove after migration stabilises)
# ---------------------------------------------------------------------------
def call_openrouter_fallback(
    system_prompt: str,
    user_message: str,
    *,
    max_tokens: int = 1000,
    temperature: float = 0.5,
    tool_name: str = "openrouter_fallback",
    model: str | None = None,
) -> str:
    """Call OpenRouter as a last-resort fallback using legacy env vars.

    Returns the reply string or raises GeminiError on failure.
    """
    from dotenv import dotenv_values

    api_key = _first_non_empty(
        os.getenv("OPENROUTER_API_KEY", ""),
    )
    base_url = _first_non_empty(
        os.getenv("OPENROUTER_BASE_URL", ""),
        default="https://openrouter.ai/api/v1/chat/completions",
    )
    fallback_model = model or _first_non_empty(
        os.getenv("OPENROUTER_MODEL", ""),
        default="nvidia/nemotron-3-super-120b-a12b:free",
    )

    if not api_key:
        raise GeminiError(
            "No fallback AI provider configured.",
            error_code="AI_MISSING_API_KEY",
        )

    try:
        response = requests.post(
            base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": fallback_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            timeout=60,
        )

        if response.status_code != 200:
            _handle_gemini_http_error(response.status_code, fallback_model)

        data = response.json()
        reply = extract_text_from_openai_compatible(data)
        if not reply:
            raise GeminiError("Fallback AI returned an empty response.", error_code="AI_EMPTY_RESPONSE")
        return reply

    except GeminiError:
        raise
    except requests.exceptions.RequestException as e:
        raise GeminiError(
            "Fallback AI service is temporarily unavailable.",
            error_code="AI_REQUEST_ERROR",
            detail=str(e),
        )
