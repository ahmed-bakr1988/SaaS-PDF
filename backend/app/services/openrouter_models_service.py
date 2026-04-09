"""OpenRouter model registry service.

Fetches available models from the OpenRouter /v1/models endpoint,
caches them in Redis for 24 hours, and exposes helpers used by the
ai_models route and the translate task for per-model cost logging.
"""

import json
import logging
import os
from dataclasses import dataclass, field

import requests


def _get_redis():
    """Get a Redis client from REDIS_URL env var (same pattern as other services)."""
    try:
        import redis

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return redis.Redis.from_url(redis_url, decode_responses=True)
    except Exception as exc:
        logger.debug("Redis not available for model cache: %s", exc)
        return None

logger = logging.getLogger(__name__)

MODELS_CACHE_KEY = "openrouter:models:v2"
MODELS_CACHE_TTL = 86400  # 24 h
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
MODELS_FETCH_TIMEOUT = 15  # seconds

# Credit multiplier: server overhead applied on top of model cost for free models
# Each page of a typical PDF ≈ 800 tokens in + 800 tokens out
TOKENS_PER_PAGE_IN = 800
TOKENS_PER_PAGE_OUT = 800
# Baseline credit cost for translate-pdf (from credit_config)
TRANSLATE_PDF_BASE_CREDITS = 6


@dataclass
class ModelInfo:
    id: str
    name: str
    is_free: bool
    prompt_price_per_token: float  # USD per input token
    completion_price_per_token: float  # USD per output token
    context_length: int = 4096
    description: str = ""
    top_provider: dict = field(default_factory=dict)


def _parse_model(raw: dict) -> ModelInfo | None:
    """Parse a raw OpenRouter model entry into a ModelInfo object."""
    model_id = str(raw.get("id", "")).strip()
    if not model_id:
        return None

    pricing = raw.get("pricing") or {}
    prompt_str = str(pricing.get("prompt", "0")).strip()
    completion_str = str(pricing.get("completion", "0")).strip()

    try:
        prompt_price = float(prompt_str)
    except ValueError:
        prompt_price = 0.0
    try:
        completion_price = float(completion_str)
    except ValueError:
        completion_price = 0.0

    # A model is "free" when both prompt and completion pricing are zero or "0"
    is_free = prompt_price == 0.0 and completion_price == 0.0

    name = str(raw.get("name", model_id)).strip() or model_id
    context_length = int(raw.get("context_length", 4096) or 4096)
    description = str(raw.get("description", "")).strip()
    top_provider = raw.get("top_provider") or {}

    return ModelInfo(
        id=model_id,
        name=name,
        is_free=is_free,
        prompt_price_per_token=prompt_price,
        completion_price_per_token=completion_price,
        context_length=context_length,
        description=description,
        top_provider=top_provider if isinstance(top_provider, dict) else {},
    )


def _fetch_models_from_api(api_key: str) -> list[ModelInfo]:
    """Fetch model list from OpenRouter API."""
    try:
        resp = requests.get(
            OPENROUTER_MODELS_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=MODELS_FETCH_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("Failed to fetch OpenRouter model list: %s", exc)
        return []

    raw_models = data.get("data") or []
    models: list[ModelInfo] = []
    for raw in raw_models:
        m = _parse_model(raw)
        if m:
            models.append(m)

    logger.info("Fetched %d models from OpenRouter.", len(models))
    return models


def _models_to_json(models: list[ModelInfo]) -> str:
    return json.dumps(
        [
            {
                "id": m.id,
                "name": m.name,
                "is_free": m.is_free,
                "prompt_price_per_token": m.prompt_price_per_token,
                "completion_price_per_token": m.completion_price_per_token,
                "context_length": m.context_length,
                "description": m.description,
            }
            for m in models
        ]
    )


def _models_from_json(data: str) -> list[ModelInfo]:
    try:
        items = json.loads(data)
        return [
            ModelInfo(
                id=item["id"],
                name=item["name"],
                is_free=item["is_free"],
                prompt_price_per_token=item["prompt_price_per_token"],
                completion_price_per_token=item["completion_price_per_token"],
                context_length=item.get("context_length", 4096),
                description=item.get("description", ""),
            )
            for item in items
        ]
    except Exception:
        return []


def get_cached_models() -> list[ModelInfo]:
    """Return models from Redis cache, fetching from API if cache is cold."""
    from app.services.openrouter_config_service import get_openrouter_settings

    settings = get_openrouter_settings()
    if not settings.api_key:
        return []

    try:
        r = _get_redis()
        if r:
            cached = r.get(MODELS_CACHE_KEY)
            if cached:
                models = _models_from_json(cached)
                if models:
                    return models
    except Exception as exc:
        logger.warning("Redis cache read failed: %s", exc)

    # Cache miss — fetch fresh
    models = _fetch_models_from_api(settings.api_key)
    if models:
        try:
            r = _get_redis()
            if r:
                r.setex(MODELS_CACHE_KEY, MODELS_CACHE_TTL, _models_to_json(models))
        except Exception:
            pass

    return models


def get_model_info(model_id: str) -> ModelInfo | None:
    """Return ModelInfo for a specific model ID, or None if not found."""
    for m in get_cached_models():
        if m.id == model_id:
            return m
    return None


def get_model_pricing(model_id: str) -> dict:
    """Return per-token pricing dict for a model.

    Returns:
        {"prompt": float, "completion": float}  # USD per token
    """
    info = get_model_info(model_id)
    if info:
        return {
            "prompt": info.prompt_price_per_token,
            "completion": info.completion_price_per_token,
        }
    return {"prompt": 0.0, "completion": 0.0}


def estimate_credits_for_translate(model_id: str, pages: int = 1) -> int:
    """Estimate platform credit cost for a translate-pdf job.

    For free models: base credits only.
    For paid models: base credits + surcharge based on token pricing.
    """
    info = get_model_info(model_id)
    base = TRANSLATE_PDF_BASE_CREDITS * pages

    if not info or info.is_free:
        return base

    # Paid model: add credit surcharge (1 credit ≈ $0.001 for simple pricing)
    CREDIT_USD_VALUE = 0.001
    cost_usd = (
        info.prompt_price_per_token * TOKENS_PER_PAGE_IN
        + info.completion_price_per_token * TOKENS_PER_PAGE_OUT
    ) * pages
    surcharge = round(cost_usd / CREDIT_USD_VALUE)
    return base + surcharge
