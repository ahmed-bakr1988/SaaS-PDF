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

from app.services.gemini_client import (
    call_gemini_vision,
    get_gemini_settings,
    GeminiError,
    RetryableGeminiError,
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
    """Send a page image to Gemini vision and get translated HTML back."""
    settings = get_gemini_settings()
    effective_model = model_id or settings.vision_model

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

    user_text = f"Translate page {page_number} into {target_label}. Return only HTML."
    img_b64 = _image_to_base64(image_path)

    try:
        reply = call_gemini_vision(
            system_prompt,
            user_text,
            img_b64,
            mime_type="image/png",
            max_tokens=4000,
            temperature=0.3,
            tool_name="pdf_translate_vision",
            model=effective_model,
        )
    except RetryableGeminiError as exc:
        raise RetryableTranslationError(
            exc.user_message,
            error_code=exc.error_code,
        )
    except GeminiError as exc:
        raise PdfAiError(
            exc.user_message,
            error_code=exc.error_code,
            detail=exc.detail,
        )

    return reply


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
