"""Translation guardrails — admission control, caching, and cost protection.

This module implements the guardrail model described in
docs/tool-portfolio/05-ai-cost-and-performance-plan.md.
"""

import hashlib
import logging
import os
from typing import Optional

from flask import current_app

logger = logging.getLogger(__name__)

# ── Page-count admission tiers ──────────────────────────────────────
# These limits define the maximum number of pages allowed per plan.
# Free/anonymous users get a lower cap; Pro users get a higher cap.
FREE_TRANSLATE_MAX_PAGES = int(os.getenv("FREE_TRANSLATE_MAX_PAGES", "10"))
PRO_TRANSLATE_MAX_PAGES = int(os.getenv("PRO_TRANSLATE_MAX_PAGES", "50"))


class TranslationAdmissionError(Exception):
    """Raised when a translation job is rejected at admission."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_page_limit(plan: str) -> int:
    """Return the page cap for a given plan."""
    from app.services.account_service import normalize_plan

    if normalize_plan(plan) == "pro":
        return PRO_TRANSLATE_MAX_PAGES
    return FREE_TRANSLATE_MAX_PAGES


def count_pdf_pages(file_path: str) -> int:
    """Return the number of pages in a PDF file."""
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(file_path)
        return len(reader.pages)
    except Exception as e:
        logger.warning("Failed to count PDF pages for admission: %s", e)
        # If we can't count pages, allow the job through but log it
        return 0


def check_page_admission(file_path: str, plan: str) -> int:
    """Verify a PDF is within the page limit for the given plan.

    Returns the page count on success.
    Raises TranslationAdmissionError if the file exceeds the limit.
    """
    page_count = count_pdf_pages(file_path)
    if page_count == 0:
        # Can't determine — allow through (OCR fallback scenario)
        return page_count

    limit = get_page_limit(plan)
    if page_count > limit:
        raise TranslationAdmissionError(
            f"This PDF has {page_count} pages. "
            f"Your plan allows up to {limit} pages for translation. "
            f"Please upgrade your plan or use a smaller file.",
            status_code=413,
        )
    return page_count


# ── Content-hash caching ────────────────────────────────────────────
# Redis-based cache keyed by file-content hash + target language.
# Avoids re-translating identical documents.

TRANSLATION_CACHE_TTL = int(os.getenv("TRANSLATION_CACHE_TTL", str(7 * 24 * 3600)))  # 7 days


def _get_redis():
    """Get Redis connection from Flask app config."""
    try:
        import redis

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return redis.Redis.from_url(redis_url, decode_responses=True)
    except Exception as e:
        logger.debug("Redis not available for translation cache: %s", e)
        return None


def _compute_content_hash(file_path: str) -> str:
    """Compute SHA-256 hash of file contents."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _cache_key(content_hash: str, target_language: str, source_language: str) -> str:
    """Build a Redis key for the translation cache."""
    return f"translate_cache:{content_hash}:{source_language}:{target_language}"


def get_cached_translation(
    file_path: str, target_language: str, source_language: str = "auto"
) -> Optional[dict]:
    """Look up a cached translation result. Returns None on miss."""
    r = _get_redis()
    if r is None:
        return None

    try:
        content_hash = _compute_content_hash(file_path)
        key = _cache_key(content_hash, target_language, source_language)
        import json

        cached = r.get(key)
        if cached:
            logger.info("Translation cache hit for %s", key)
            return json.loads(cached)
    except Exception as e:
        logger.debug("Translation cache lookup failed: %s", e)

    return None


def store_cached_translation(
    file_path: str,
    target_language: str,
    source_language: str,
    result: dict,
) -> None:
    """Store a successful translation result in Redis."""
    r = _get_redis()
    if r is None:
        return

    try:
        import json

        content_hash = _compute_content_hash(file_path)
        key = _cache_key(content_hash, target_language, source_language)
        r.setex(key, TRANSLATION_CACHE_TTL, json.dumps(result, ensure_ascii=False))
        logger.info("Translation cached: %s (TTL=%ds)", key, TRANSLATION_CACHE_TTL)
    except Exception as e:
        logger.debug("Translation cache store failed: %s", e)
