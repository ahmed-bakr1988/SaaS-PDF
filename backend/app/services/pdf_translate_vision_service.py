"""Vision-based PDF translation — pages as images → Vision AI → weasyprint → PDF.

Pro-only mode that handles any PDF type including scanned documents.
Each page is rendered as an image, sent to a Vision-capable model for
translation with layout preservation instructions, and the resulting
HTML is assembled into a final PDF via weasyprint.
"""

import base64
import logging
import os
import tempfile

import requests

from app.services.openrouter_config_service import (
    extract_openrouter_text,
    get_openrouter_settings,
)
from app.services.pdf_ai_service import (
    PdfAiError,
    RetryableTranslationError,
    _normalize_language_code,
    _language_label,
    _estimate_tokens,
    _translate_with_retry,
)

logger = logging.getLogger(__name__)

# Vision-specific constants
VISION_DPI = 150  # Balance quality vs. token cost
VISION_TIMEOUT = 90  # seconds per page
MAX_VISION_PAGES = 30


def _pdf_to_images(input_path: str, dpi: int = VISION_DPI) -> list[str]:
    """Convert PDF pages to PNG images. Returns list of temp file paths."""
    try:
        from pdf2image import convert_from_path
    except ImportError as exc:
        raise PdfAiError(
            "Image conversion library is not installed.",
            error_code="PDF2IMAGE_NOT_INSTALLED",
            detail=str(exc),
        )

    tmpdir = tempfile.mkdtemp(prefix="vision_pages_")
    try:
        images = convert_from_path(
            input_path,
            dpi=dpi,
            fmt="png",
            output_folder=tmpdir,
            thread_count=2,
        )
    except Exception as exc:
        raise PdfAiError(
            "Failed to render PDF pages as images.",
            error_code="PDF2IMAGE_FAILED",
            detail=str(exc),
        )

    paths: list[str] = []
    for i, img in enumerate(images[:MAX_VISION_PAGES]):
        path = os.path.join(tmpdir, f"page_{i + 1}.png")
        img.save(path, "PNG")
        paths.append(path)

    return paths


def _image_to_base64(image_path: str) -> str:
    """Read image file and return base64-encoded string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _translate_page_with_vision(
    image_path: str,
    page_number: int,
    target_language: str,
    source_language: str | None = None,
    model_id: str | None = None,
) -> str:
    """Send a page image to a vision model and get translated HTML back."""
    settings = get_openrouter_settings()
    effective_model = model_id if model_id else settings.model

    if not settings.api_key:
        raise PdfAiError(
            "AI features are temporarily unavailable.",
            error_code="OPENROUTER_MISSING_API_KEY",
        )

    target_label = _language_label(target_language)
    source_hint = ""
    if source_language and _normalize_language_code(source_language) != "auto":
        source_hint = f" The source language is {_language_label(source_language)}."

    system_prompt = (
        "You are a professional document translator and layout expert. "
        f"Translate ALL text in the provided page image into {target_label}.{source_hint} "
        "Return the translated content as clean HTML that preserves the visual layout: "
        "use <table> for tables, <h1>-<h3> for headings, <p> for paragraphs, "
        "<ul>/<ol> for lists. Use inline CSS for alignment and basic formatting. "
        "Do NOT include <html>, <head>, or <body> tags. "
        "Return ONLY the HTML content, no explanations."
    )

    img_b64 = _image_to_base64(image_path)

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_b64}",
                    },
                },
                {
                    "type": "text",
                    "text": f"Translate page {page_number} into {target_label}. Return only HTML.",
                },
            ],
        },
    ]

    try:
        # Budget guard
        try:
            from app.services.ai_cost_service import check_ai_budget

            check_ai_budget()
        except Exception:
            pass

        response = requests.post(
            settings.base_url,
            headers={
                "Authorization": f"Bearer {settings.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": effective_model,
                "messages": messages,
                "max_tokens": 4000,
                "temperature": 0.3,
            },
            timeout=VISION_TIMEOUT,
        )

        status_code = getattr(response, "status_code", 200)

        if status_code == 429:
            raise RetryableTranslationError(
                "AI service rate limited. Retrying...",
                error_code="VISION_RATE_LIMIT",
            )
        if status_code >= 500:
            raise RetryableTranslationError(
                "AI service error. Retrying...",
                error_code="VISION_SERVER_ERROR",
            )

        response.raise_for_status()
        data = response.json()

        if data.get("error"):
            error_msg = (
                data["error"].get("message", "")
                if isinstance(data["error"], dict)
                else str(data["error"])
            )
            raise PdfAiError(
                "Vision AI returned an error.",
                error_code="VISION_ERROR_PAYLOAD",
                detail=error_msg,
            )

        reply = extract_openrouter_text(data)
        if not reply:
            raise PdfAiError(
                "Vision AI returned an empty response.",
                error_code="VISION_EMPTY_RESPONSE",
            )

        # Log usage
        try:
            from app.services.ai_cost_service import log_ai_usage

            usage = data.get("usage", {})
            log_ai_usage(
                tool="pdf_translate_vision",
                model=effective_model,
                input_tokens=usage.get("prompt_tokens", 1000),
                output_tokens=usage.get("completion_tokens", _estimate_tokens(reply)),
            )
        except Exception:
            pass

        return reply

    except PdfAiError:
        raise
    except requests.exceptions.Timeout:
        raise RetryableTranslationError(
            "Vision AI timed out.",
            error_code="VISION_TIMEOUT",
        )
    except requests.exceptions.ConnectionError:
        raise RetryableTranslationError(
            "Cannot reach Vision AI service.",
            error_code="VISION_CONNECTION_ERROR",
        )
    except requests.exceptions.RequestException as e:
        raise PdfAiError(
            "Vision AI request failed.",
            error_code="VISION_REQUEST_ERROR",
            detail=str(e),
        )


def _pages_html_to_pdf(pages_html: list[str], output_path: str) -> None:
    """Render a list of per-page HTML fragments into a single PDF via weasyprint."""
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise PdfAiError(
            "PDF rendering library (weasyprint) is not installed.",
            error_code="WEASYPRINT_NOT_INSTALLED",
            detail=str(exc),
        )

    # Build a full HTML document with page breaks between pages
    page_divs = []
    for i, html_content in enumerate(pages_html):
        break_style = 'style="page-break-before: always;"' if i > 0 else ""
        page_divs.append(f'<div {break_style}>{html_content}</div>')

    full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: sans-serif; margin: 20mm; font-size: 11pt; line-height: 1.4; }}
    table {{ border-collapse: collapse; width: 100%; margin: 8px 0; }}
    td, th {{ border: 1px solid #ccc; padding: 6px 8px; text-align: left; }}
    th {{ background-color: #f5f5f5; font-weight: bold; }}
    h1 {{ font-size: 18pt; margin: 12px 0 6px; }}
    h2 {{ font-size: 14pt; margin: 10px 0 5px; }}
    h3 {{ font-size: 12pt; margin: 8px 0 4px; }}
    p {{ margin: 4px 0; }}
    ul, ol {{ margin: 4px 0 4px 20px; }}
</style>
</head>
<body>
{"".join(page_divs)}
</body>
</html>"""

    HTML(string=full_html).write_pdf(output_path)

    if not os.path.isfile(output_path) or os.path.getsize(output_path) < 100:
        raise PdfAiError(
            "PDF rendering produced an empty file.",
            error_code="WEASYPRINT_EMPTY_OUTPUT",
        )


def translate_pdf_vision(
    input_path: str,
    target_language: str,
    output_path: str,
    original_filename: str,
    source_language: str | None = None,
    model_id: str | None = None,
    on_progress: callable = None,
) -> dict:
    """Full vision-based translation pipeline.

    Returns:
        {
            "pages_translated": int,
            "pages": int,
            "target_language": str,
            "provider": str,
        }
    """
    normalized_target = _normalize_language_code(target_language)
    normalized_source = _normalize_language_code(source_language, default="auto")

    # Step 1: Render pages as images
    image_paths = _pdf_to_images(input_path)
    if not image_paths:
        raise PdfAiError(
            "Could not render any pages from the PDF.",
            error_code="VISION_NO_PAGES",
        )

    # Step 2: Translate each page via Vision AI
    pages_html: list[str] = []
    for i, img_path in enumerate(image_paths):
        page_num = i + 1
        if on_progress:
            on_progress(f"Translating page {page_num}/{len(image_paths)}...")

        html = _translate_with_retry(
            lambda p=img_path, n=page_num: _translate_page_with_vision(
                p,
                n,
                normalized_target,
                source_language=normalized_source,
                model_id=model_id,
            ),
            provider_name=f"Vision (page {page_num})",
        )
        pages_html.append(html)

    # Step 3: Render all pages to PDF
    _pages_html_to_pdf(pages_html, output_path)

    # Cleanup temp images
    if image_paths:
        tmpdir = os.path.dirname(image_paths[0])
        try:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

    return {
        "pages_translated": len(pages_html),
        "pages": len(image_paths),
        "target_language": normalized_target,
        "source_language": normalized_source,
        "provider": "vision",
    }
