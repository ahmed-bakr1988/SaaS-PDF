"""Google Generative AI integration wrapper.

This module provides a thin wrapper that attempts to use the installed
`google-generativeai` package if available and falls back to a best-effort
REST call to the Generative Language endpoints. The wrapper keeps a simple
`call_google_text` interface that returns a generated string or raises an
exception on failure.
"""
from dataclasses import dataclass
import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GoogleSettings:
    api_key: str
    model: str


def get_google_settings() -> GoogleSettings:
    api_key = str(os.getenv("GOOGLE_API_KEY", "")).strip()
    model = str(os.getenv("GOOGLE_MODEL", "chat-bison-001")).strip() or "chat-bison-001"
    return GoogleSettings(api_key=api_key, model=model)


def _extract_text_from_google_response(resp: Any) -> str:
    try:
        if resp is None:
            return ""

        # dict-style responses
        if isinstance(resp, dict):
            # common shape: {"candidates": [{"output": "..."}]}
            candidates = resp.get("candidates") or resp.get("choices")
            if isinstance(candidates, list) and candidates:
                first = candidates[0]
                if isinstance(first, dict):
                    for key in ("output", "text", "message", "content"):
                        val = first.get(key)
                        if isinstance(val, str) and val.strip():
                            return val.strip()
                    # nested content
                    content = first.get("content")
                    if isinstance(content, dict):
                        for k in ("text", "parts", "output"):
                            v = content.get(k)
                            if isinstance(v, str) and v.strip():
                                return v.strip()

            # look for top-level text-like fields
            for key in ("output", "text", "response", "message"):
                val = resp.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()

            return str(resp)

        # object-like responses (SDK objects)
        if hasattr(resp, "candidates"):
            try:
                c0 = resp.candidates[0]
                if hasattr(c0, "output"):
                    return getattr(c0, "output", "") or ""
                if hasattr(c0, "content"):
                    return getattr(c0, "content", "") or ""
            except Exception:
                pass

        if hasattr(resp, "output"):
            return getattr(resp, "output", "") or ""

        return str(resp)
    except Exception:
        return ""


def _call_google_via_rest(settings: GoogleSettings, system_prompt: str, user_message: str, max_tokens: int) -> str:
    # Try a few likely endpoint patterns for the Google Generative Language API.
    candidate_urls = [
        f"https://generativelanguage.googleapis.com/v1/models/{settings.model}:generateText",
        f"https://generativelanguage.googleapis.com/v1beta2/models/{settings.model}:generateText",
        f"https://generativelanguage.googleapis.com/v1/models/{settings.model}:generateMessage",
        f"https://generativelanguage.googleapis.com/v1beta2/models/{settings.model}:generateMessage",
    ]

    payload_variants = [
        {
            "prompt": {"messages": [{"author": "system", "content": system_prompt}, {"author": "user", "content": user_message}]},
            "temperature": 0.5,
            "maxOutputTokens": max_tokens,
        },
        {
            "input": f"{system_prompt}\n\n{user_message}",
            "temperature": 0.5,
            "maxOutputTokens": max_tokens,
        },
        {"prompt": f"{system_prompt}\n\n{user_message}", "temperature": 0.5, "maxOutputTokens": max_tokens},
    ]

    headers = {"Content-Type": "application/json"}

    for url in candidate_urls:
        for payload in payload_variants:
            try:
                resp = requests.post(url, params={"key": settings.api_key}, json=payload, headers=headers, timeout=60)
            except requests.exceptions.RequestException as e:
                logger.debug("Google REST call to %s failed: %s", url, e)
                continue

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    text = _extract_text_from_google_response(data)
                    if text:
                        return text
                except Exception:
                    continue

            if resp.status_code == 401:
                raise RuntimeError("GOOGLE_UNAUTHORIZED")

            if resp.status_code in (429, 502, 503, 504):
                # transient problem
                raise RuntimeError("GOOGLE_RATE_LIMIT_OR_SERVER_ERROR")

    raise RuntimeError("GOOGLE_REQUEST_FAILED")


def call_google_text(system_prompt: str, user_message: str, max_tokens: int = 1000, tool_name: str = "pdf_ai") -> str:
    settings = get_google_settings()
    if not settings.api_key:
        raise RuntimeError("GOOGLE_MISSING_API_KEY")

    try:
        import google.generativeai as genai

        # configure SDK if it exposes configure
        try:
            if hasattr(genai, "configure"):
                genai.configure(api_key=settings.api_key)
        except Exception:
            logger.debug("google.generativeai.configure failed or not available")

        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}]

        # Try chat-style API if available
        if hasattr(genai, "chat") and hasattr(genai.chat, "create"):
            resp = genai.chat.create(model=settings.model, messages=messages, temperature=0.5, max_output_tokens=max_tokens)
            text = _extract_text_from_google_response(resp)
            if not text:
                raise RuntimeError("GOOGLE_EMPTY_RESPONSE")
            return text

        # Try generate_text if present
        if hasattr(genai, "generate_text"):
            prompt = f"{system_prompt}\n\n{user_message}"
            resp = genai.generate_text(model=settings.model, prompt=prompt, max_output_tokens=max_tokens, temperature=0.5)
            text = _extract_text_from_google_response(resp)
            if not text:
                raise RuntimeError("GOOGLE_EMPTY_RESPONSE")
            return text

    except Exception as e:  # fall back to REST approach if SDK call fails
        logger.debug("google.generativeai SDK not usable or raised: %s", e)

    # Last-resort: try REST endpoints
    return _call_google_via_rest(settings, system_prompt, user_message, max_tokens)
