"""Pre-translation analysis — detects PDF type and estimates credit cost per mode."""

import logging
import os

from app.services.credit_config import calculate_dynamic_cost
from app.services.pdf_ai_service import PdfAiError

logger = logging.getLogger(__name__)

# Word-density thresholds (words per page) for document classification
SCANNED_THRESHOLD = 20
SPARSE_THRESHOLD = 60


def _get_page_count(input_path: str) -> int:
    """Return PDF page count via PyPDF2."""
    from PyPDF2 import PdfReader

    reader = PdfReader(input_path)
    return len(reader.pages)


def _extract_light_text(input_path: str, max_pages: int = 5) -> str:
    """Fast text extraction for classification (no OCR fallback)."""
    from PyPDF2 import PdfReader

    reader = PdfReader(input_path)
    if reader.is_encrypted and reader.decrypt("") == 0:
        raise PdfAiError(
            "This PDF is password-protected.",
            error_code="PDF_ENCRYPTED",
        )
    texts = []
    for page in reader.pages[:max_pages]:
        texts.append(page.extract_text() or "")
    return "\n".join(texts)


def detect_pdf_type(input_path: str) -> dict:
    """Classify a PDF and return analysis metadata.

    Returns:
        {
            "pdf_type": "text_rich" | "sparse" | "scanned",
            "pages": int,
            "file_size_kb": float,
            "words_per_page": float,
            "recommendation": "text" | "layout" | "vision",
        }
    """
    pages = _get_page_count(input_path)
    file_size_kb = os.path.getsize(input_path) / 1024

    text = _extract_light_text(input_path, max_pages=min(pages, 5))
    word_count = len(text.split())
    sampled_pages = min(pages, 5)
    words_per_page = word_count / max(1, sampled_pages)

    if words_per_page < SCANNED_THRESHOLD:
        pdf_type = "scanned"
        recommendation = "vision"
    elif words_per_page < SPARSE_THRESHOLD:
        pdf_type = "sparse"
        recommendation = "layout"
    else:
        pdf_type = "text_rich"
        recommendation = "layout"

    return {
        "pdf_type": pdf_type,
        "pages": pages,
        "file_size_kb": round(file_size_kb, 1),
        "words_per_page": round(words_per_page, 1),
        "recommendation": recommendation,
    }


def estimate_translate_costs(
    input_path: str,
    analysis: dict | None = None,
) -> dict:
    """Compute per-mode credit estimates with model pricing info.

    Returns:
        {
            "analysis": { ... },    # from detect_pdf_type
            "active_model": { "id": str, "name": str, "is_free": bool } | None,
            "modes": {
                "text":   { "credits": int, "available": True, "estimated_usd": float },
                "layout": { "credits": int, "available": bool, "estimated_usd": float },
                "vision": { "credits": int, "available": bool, "estimated_usd": float },
            },
        }
    """
    if analysis is None:
        analysis = detect_pdf_type(input_path)

    pages = analysis["pages"]
    file_size_kb = analysis["file_size_kb"]
    estimated_tokens = pages * 800  # ~800 tokens per page

    text_credits = calculate_dynamic_cost(
        "translate-pdf",
        file_size_kb=file_size_kb,
        estimated_tokens=estimated_tokens,
    )
    layout_credits = calculate_dynamic_cost(
        "translate-pdf-layout",
        file_size_kb=file_size_kb,
        estimated_tokens=estimated_tokens,
    )
    vision_credits = calculate_dynamic_cost(
        "translate-pdf-vision",
        file_size_kb=file_size_kb,
        estimated_tokens=estimated_tokens,
    )

    # Layout mode may not work well for scanned PDFs
    layout_available = analysis["pdf_type"] != "scanned"

    # Fetch active model info for USD cost estimation
    active_model_info = None
    estimated_usd_text = 0.0
    estimated_usd_layout = 0.0
    estimated_usd_vision = 0.0
    try:
        from app.services.gemini_client import get_gemini_settings
        from app.services.openrouter_models_service import get_model_info

        settings = get_gemini_settings()
        model_info = get_model_info(settings.text_model)
        if model_info:
            active_model_info = {
                "id": model_info.id,
                "name": model_info.name,
                "is_free": model_info.is_free,
            }
            # Text/layout modes: input + output tokens
            tokens_in = estimated_tokens
            tokens_out = estimated_tokens
            cost_per_page = (
                model_info.prompt_price_per_token * tokens_in
                + model_info.completion_price_per_token * tokens_out
            ) / max(pages, 1)
            estimated_usd_text = round(cost_per_page * pages, 6)
            estimated_usd_layout = round(cost_per_page * pages, 6)
            # Vision mode: ~4x tokens due to image encoding
            vision_tokens_in = pages * 3000
            vision_tokens_out = estimated_tokens
            estimated_usd_vision = round(
                model_info.prompt_price_per_token * vision_tokens_in
                + model_info.completion_price_per_token * vision_tokens_out,
                6,
            )
    except Exception as exc:
        logger.debug("Could not fetch model pricing for estimate: %s", exc)

    return {
        "analysis": analysis,
        "active_model": active_model_info,
        "modes": {
            "text": {
                "credits": text_credits,
                "available": True,
                "label": "Basic",
                "estimated_usd": estimated_usd_text,
            },
            "layout": {
                "credits": layout_credits,
                "available": layout_available,
                "label": "Layout-preserving",
                "estimated_usd": estimated_usd_layout,
                "warning": (
                    "This PDF appears to be scanned. Layout mode may not work well."
                    if not layout_available
                    else None
                ),
            },
            "vision": {
                "credits": vision_credits,
                "available": True,
                "label": "Vision (best quality)",
                "estimated_usd": estimated_usd_vision,
            },
        },
    }
