"""PDF AI services — Chat, Summarize, Translate, Table Extract."""

import json
import logging
import os
import tempfile
import time
from dataclasses import dataclass

import requests

from app.services.openrouter_config_service import (
    extract_openrouter_text,
    get_openrouter_settings,
)
from app.services import google_ai_service

logger = logging.getLogger(__name__)

DEFAULT_DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"
DEFAULT_DEEPL_TIMEOUT_SECONDS = 90
MAX_TRANSLATION_CHUNK_CHARS = 3500

FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "fonts")
TRANSLATION_RETRY_ATTEMPTS = 3
TRANSLATION_RETRY_DELAY_SECONDS = 2

LANGUAGE_LABELS = {
    "auto": "Auto Detect",
    "en": "English",
    "ar": "Arabic",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "pt": "Portuguese",
    "ru": "Russian",
    "tr": "Turkish",
    "it": "Italian",
}

DEEPL_LANGUAGE_CODES = {
    "ar": "AR",
    "de": "DE",
    "en": "EN",
    "es": "ES",
    "fr": "FR",
    "it": "IT",
    "ja": "JA",
    "ko": "KO",
    "pt": "PT-PT",
    "ru": "RU",
    "tr": "TR",
    "zh": "ZH",
}

OCR_LANGUAGE_CODES = {
    "ar": "ara",
    "en": "eng",
    "fr": "fra",
}


@dataclass(frozen=True)
class DeepLSettings:
    api_key: str
    base_url: str
    timeout_seconds: int


def _normalize_language_code(value: str | None, default: str = "") -> str:
    normalized = str(value or "").strip().lower()
    return normalized or default


def _language_label(value: str | None) -> str:
    normalized = _normalize_language_code(value)
    return LANGUAGE_LABELS.get(normalized, normalized or "Unknown")


def _get_font_for_language(lang: str) -> tuple[str, str]:
    """Return (font_family_name, absolute_font_file_path) for language code.

    Falls back to NotoSans (Latin) or built-in Helvetica if the file is absent.
    """
    if lang in ("ar",):
        path = os.path.abspath(os.path.join(FONTS_DIR, "NotoSansArabic-Regular.ttf"))
        if os.path.isfile(path):
            return "NotoSansArabic", path
    elif lang in ("zh", "ja", "ko"):
        path = os.path.abspath(os.path.join(FONTS_DIR, "NotoSansSC-Regular.otf"))
        if os.path.isfile(path):
            return "NotoSansSC", path
    path = os.path.abspath(os.path.join(FONTS_DIR, "NotoSans-Regular.ttf"))
    if os.path.isfile(path):
        return "NotoSans", path
    return "Helvetica", ""


def _build_translated_pdf(
    text: str,
    target_language: str,
    output_path: str,
    original_filename: str,
) -> None:
    """Render translated text into a PDF file using fpdf2 with Unicode font support."""
    try:
        from fpdf import FPDF
    except ImportError as exc:
        raise PdfAiError(
            "PDF generation library is not installed on this server.",
            error_code="FPDF2_NOT_INSTALLED",
            detail=str(exc),
        )

    is_rtl = target_language in ("ar",)
    font_name, font_path = _get_font_for_language(target_language)

    if is_rtl:
        try:
            import arabic_reshaper
            from bidi.algorithm import get_display

            reshaped_lines: list[str] = []
            for line in text.splitlines():
                if line.strip():
                    reshaped_lines.append(get_display(arabic_reshaper.reshape(line)))
                else:
                    reshaped_lines.append("")
            text = "\n".join(reshaped_lines)
        except ImportError:
            logger.warning(
                "arabic_reshaper / python-bidi not installed; Arabic RTL may not render correctly."
            )

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    if font_path and os.path.isfile(font_path):
        pdf.add_font(font_name, "", font_path)
        pdf.set_font(font_name, size=10)
    else:
        font_name = "Helvetica"
        pdf.set_font("Helvetica", size=10)

    base_name = os.path.splitext(original_filename)[0]
    lang_label = _language_label(target_language)
    header = f"Translation \u2014 {base_name} ({lang_label})"
    text_align = "R" if is_rtl else "L"
    pdf.cell(0, 7, header, align=text_align, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font(font_name, size=11)
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            pdf.multi_cell(0, 7, stripped, align=text_align, new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.ln(4)

    pdf.output(output_path)


def _get_deepl_settings() -> DeepLSettings:
    api_key = str(os.getenv("DEEPL_API_KEY", "")).strip()
    base_url = (
        str(os.getenv("DEEPL_API_URL", DEFAULT_DEEPL_API_URL)).strip()
        or DEFAULT_DEEPL_API_URL
    )
    timeout_seconds = int(
        os.getenv("DEEPL_TIMEOUT_SECONDS", DEFAULT_DEEPL_TIMEOUT_SECONDS)
    )
    return DeepLSettings(
        api_key=api_key, base_url=base_url, timeout_seconds=timeout_seconds
    )


class PdfAiError(Exception):
    """Custom exception for PDF AI service failures."""

    def __init__(
        self,
        user_message: str,
        error_code: str = "PDF_AI_ERROR",
        detail: str | None = None,
    ):
        super().__init__(user_message)
        self.user_message = user_message
        self.error_code = error_code
        self.detail = detail


class RetryableTranslationError(PdfAiError):
    """Error wrapper used for provider failures that should be retried."""


def _translate_with_retry(action, provider_name: str) -> dict:
    last_error: PdfAiError | None = None

    for attempt in range(1, TRANSLATION_RETRY_ATTEMPTS + 1):
        try:
            return action()
        except RetryableTranslationError as error:
            last_error = error
            logger.warning(
                "%s translation attempt %s/%s failed with retryable error %s",
                provider_name,
                attempt,
                TRANSLATION_RETRY_ATTEMPTS,
                error.error_code,
            )
            if attempt == TRANSLATION_RETRY_ATTEMPTS:
                break
            time.sleep(TRANSLATION_RETRY_DELAY_SECONDS * attempt)

    if last_error:
        raise PdfAiError(
            last_error.user_message,
            error_code=last_error.error_code,
            detail=last_error.detail,
        )

    raise PdfAiError(
        "Translation provider failed unexpectedly.",
        error_code="TRANSLATION_PROVIDER_FAILED",
    )


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English."""
    return max(1, len(text) // 4)


def _extract_text_from_pdf(input_path: str, max_pages: int = 50) -> str:
    """Extract text content from a PDF file."""
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(input_path)
        if reader.is_encrypted and reader.decrypt("") == 0:
            raise PdfAiError(
                "This PDF is password-protected. Please unlock it first.",
                error_code="PDF_ENCRYPTED",
            )

        pages = reader.pages[:max_pages]
        texts = []
        for i, page in enumerate(pages):
            text = page.extract_text() or ""
            if text.strip():
                texts.append(f"[Page {i + 1}]\n{text}")

        extracted = "\n\n".join(texts)
        if extracted.strip():
            return extracted

        # Fall back to OCR for scanned/image-only PDFs instead of failing fast.
        try:
            from app.services.ocr_service import ocr_pdf

            with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
                ocr_output_path = handle.name

            try:
                data = ocr_pdf(input_path, ocr_output_path, lang="eng")
                ocr_text = str(data.get("text", "")).strip()
                if ocr_text:
                    return ocr_text
            finally:
                if os.path.exists(ocr_output_path):
                    os.unlink(ocr_output_path)
        except Exception as ocr_error:
            logger.warning("OCR fallback for PDF text extraction failed: %s", ocr_error)

        return ""
    except PdfAiError:
        raise
    except Exception as e:
        raise PdfAiError(
            "Failed to extract text from PDF.",
            error_code="PDF_TEXT_EXTRACTION_FAILED",
            detail=str(e),
        )


def _call_openrouter(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 1000,
    tool_name: str = "pdf_ai",
    model_id: str | None = None,
) -> str:
    """Send a request to OpenRouter API and return the reply."""
    # Budget guard
    try:
        from app.services.ai_cost_service import check_ai_budget, AiBudgetExceededError

        check_ai_budget()
    except ImportError:
        pass
    except Exception as error:
        if error.__class__.__name__ == "AiBudgetExceededError":
            raise PdfAiError(
                "Monthly AI processing budget has been reached. Please try again next month.",
                error_code="AI_BUDGET_EXCEEDED",
            )
        pass

    settings = get_openrouter_settings()
    effective_model = model_id if model_id else settings.model

    if not settings.api_key:
        logger.error("OPENROUTER_API_KEY is not set or is a placeholder value.")
        raise PdfAiError(
            "AI features are temporarily unavailable. Our team has been notified.",
            error_code="OPENROUTER_MISSING_API_KEY",
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    try:
        response = requests.post(
            settings.base_url,
            headers={
                "Authorization": f"Bearer {settings.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": effective_model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.5,
            },
            timeout=60,
        )

        status_code = getattr(response, "status_code", 200)

        if status_code == 401:
            logger.error("OpenRouter API key is invalid or expired (401).")
            raise PdfAiError(
                "AI features are temporarily unavailable due to a configuration issue. Our team has been notified.",
                error_code="OPENROUTER_UNAUTHORIZED",
            )

        if status_code == 402:
            logger.error("OpenRouter account has insufficient credits (402).")
            raise PdfAiError(
                "AI processing credits have been exhausted. Please try again later.",
                error_code="OPENROUTER_INSUFFICIENT_CREDITS",
            )

        if status_code == 429:
            logger.warning("OpenRouter rate limit reached (429).")
            raise RetryableTranslationError(
                "AI service is experiencing high demand. Please wait a moment and try again.",
                error_code="OPENROUTER_RATE_LIMIT",
            )

        if status_code >= 500:
            logger.error("OpenRouter server error (%s).", status_code)
            raise RetryableTranslationError(
                "AI service provider is experiencing issues. Please try again shortly.",
                error_code="OPENROUTER_SERVER_ERROR",
            )

        response.raise_for_status()
        data = response.json()

        # Handle model-level errors returned inside a 200 response
        if data.get("error"):
            error_msg = (
                data["error"].get("message", "")
                if isinstance(data["error"], dict)
                else str(data["error"])
            )
            logger.error("OpenRouter returned an error payload: %s", error_msg)
            raise PdfAiError(
                "AI service encountered an issue. Please try again.",
                error_code="OPENROUTER_ERROR_PAYLOAD",
                detail=error_msg,
            )

        reply = extract_openrouter_text(data)

        if not reply:
            raise PdfAiError(
                "AI returned an empty response. Please try again.",
                error_code="OPENROUTER_EMPTY_RESPONSE",
            )

        # Log usage
        try:
            from app.services.ai_cost_service import log_ai_usage

            usage = data.get("usage", {})
            log_ai_usage(
                tool=tool_name,
                model=effective_model,
                input_tokens=usage.get("prompt_tokens", _estimate_tokens(user_message)),
                output_tokens=usage.get("completion_tokens", _estimate_tokens(reply)),
            )
        except Exception:
            pass  # Don't fail the request if logging fails

        return reply

    except PdfAiError:
        raise
    except requests.exceptions.Timeout:
        raise RetryableTranslationError(
            "AI service timed out. Please try again.",
            error_code="OPENROUTER_TIMEOUT",
        )
    except requests.exceptions.ConnectionError:
        logger.error("Cannot connect to OpenRouter API at %s", settings.base_url)
        raise RetryableTranslationError(
            "AI service is unreachable. Please try again shortly.",
            error_code="OPENROUTER_CONNECTION_ERROR",
        )
    except requests.exceptions.RequestException as e:
        logger.error("OpenRouter API error: %s", e)
        raise PdfAiError(
            "AI service is temporarily unavailable.",
            error_code="OPENROUTER_REQUEST_ERROR",
            detail=str(e),
        )


def _split_translation_chunks(
    text: str, max_chars: int = MAX_TRANSLATION_CHUNK_CHARS
) -> list[str]:
    """Split extracted PDF text into stable chunks while preserving page markers."""
    chunks: list[str] = []
    current: list[str] = []
    current_length = 0

    for block in text.split("\n\n"):
        normalized = block.strip()
        if not normalized:
            continue

        block_length = len(normalized) + 2
        if current and current_length + block_length > max_chars:
            chunks.append("\n\n".join(current))
            current = [normalized]
            current_length = block_length
            continue

        current.append(normalized)
        current_length += block_length

    if current:
        chunks.append("\n\n".join(current))

    return chunks or [text]


def _call_openrouter_translate(
    chunk: str, target_language: str, source_language: str | None = None
) -> dict:
    """Attempt translation via OpenRouter, fall back to Google Generative AI if configured."""
    source_hint = "auto-detect the source language"
    if source_language and _normalize_language_code(source_language) != "auto":
        source_hint = f"treat {_language_label(source_language)} as the source language"

    system_prompt = (
        "You are a professional document translator. "
        f"Translate the provided PDF content into {_language_label(target_language)}. "
        f"Please {source_hint}. Preserve headings, lists, tables, and page markers. "
        "Return only the translated text."
    )

    # Try OpenRouter first
    try:
        translation = _call_openrouter(
            system_prompt,
            chunk,
            max_tokens=2200,
            tool_name="pdf_translate_fallback",
        )
        provider = "openrouter"
    except (RetryableTranslationError, PdfAiError) as open_err:
        # If Google is configured, try as a fallback
        try:
            g_settings = google_ai_service.get_google_settings()
        except Exception:
            g_settings = None

        if g_settings and g_settings.api_key:
            try:
                translation = google_ai_service.call_google_text(
                    system_prompt, chunk, max_tokens=2200, tool_name="pdf_translate_fallback"
                )
                provider = "google"
            except Exception as google_err:
                logger.exception("Google fallback for translation failed: %s", google_err)
                raise open_err
        else:
            raise open_err

    return {
        "translation": translation,
        "provider": provider,
        "detected_source_language": _normalize_language_code(
            source_language, default=""
        ),
    }


def _call_deepl_translate(
    chunk: str, target_language: str, source_language: str | None = None
) -> dict:
    """Translate a chunk with DeepL when premium credentials are configured."""
    settings = _get_deepl_settings()
    if not settings.api_key:
        raise PdfAiError(
            "DeepL is not configured.",
            error_code="DEEPL_NOT_CONFIGURED",
        )

    target_code = DEEPL_LANGUAGE_CODES.get(_normalize_language_code(target_language))
    if not target_code:
        raise PdfAiError(
            f"Target language '{target_language}' is not supported by the premium translation provider.",
            error_code="DEEPL_UNSUPPORTED_TARGET_LANGUAGE",
        )

    payload: dict[str, object] = {
        "text": [chunk],
        "target_lang": target_code,
        "preserve_formatting": True,
        "tag_handling": "xml",
        "split_sentences": "nonewlines",
    }

    source_code = DEEPL_LANGUAGE_CODES.get(_normalize_language_code(source_language))
    if source_code:
        payload["source_lang"] = source_code

    try:
        response = requests.post(
            settings.base_url,
            headers={
                "Authorization": f"DeepL-Auth-Key {settings.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=settings.timeout_seconds,
        )
    except requests.exceptions.Timeout:
        raise RetryableTranslationError(
            "Premium translation service timed out. Retrying...",
            error_code="DEEPL_TIMEOUT",
        )
    except requests.exceptions.ConnectionError:
        raise RetryableTranslationError(
            "Premium translation service is temporarily unreachable. Retrying...",
            error_code="DEEPL_CONNECTION_ERROR",
        )
    except requests.exceptions.RequestException as error:
        raise PdfAiError(
            "Premium translation service is temporarily unavailable.",
            error_code="DEEPL_REQUEST_ERROR",
            detail=str(error),
        )

    if response.status_code == 429:
        raise RetryableTranslationError(
            "Premium translation service is busy. Retrying...",
            error_code="DEEPL_RATE_LIMIT",
        )

    if response.status_code >= 500:
        raise RetryableTranslationError(
            "Premium translation service is experiencing issues. Retrying...",
            error_code="DEEPL_SERVER_ERROR",
        )

    if response.status_code in {403, 456}:
        raise PdfAiError(
            "Premium translation provider credits or permissions need attention.",
            error_code="DEEPL_CREDITS_OR_PERMISSIONS",
        )

    response.raise_for_status()
    data = response.json()
    translations = data.get("translations") or []
    if not translations:
        raise PdfAiError(
            "Premium translation provider returned an empty response.",
            error_code="DEEPL_EMPTY_RESPONSE",
        )

    first = translations[0]
    translated_text = str(first.get("text", "")).strip()
    if not translated_text:
        raise PdfAiError(
            "Premium translation provider returned an empty response.",
            error_code="DEEPL_EMPTY_TEXT",
        )

    return {
        "translation": translated_text,
        "provider": "deepl",
        "detected_source_language": str(first.get("detected_source_language", ""))
        .strip()
        .lower(),
    }


def _call_openrouter_translate(
    chunk: str,
    target_language: str,
    source_language: str | None = None,
    model_id: str | None = None,
) -> dict:
    source_hint = "auto-detect the source language"
    if source_language and _normalize_language_code(source_language) != "auto":
        source_hint = f"treat {_language_label(source_language)} as the source language"

    system_prompt = (
        "You are a professional document translator. "
        f"Translate the provided PDF content into {_language_label(target_language)}. "
        f"Please {source_hint}. Preserve headings, lists, tables, and page markers. "
        "Return only the translated text."
    )
    translation = _call_openrouter(
        system_prompt,
        chunk,
        max_tokens=2200,
        tool_name="pdf_translate_fallback",
        model_id=model_id,
    )
    return {
        "translation": translation,
        "provider": "openrouter",
        "detected_source_language": _normalize_language_code(
            source_language, default=""
        ),
    }


def _translate_document_text(
    text: str,
    target_language: str,
    source_language: str | None = None,
    model_id: str | None = None,
) -> dict:
    chunks = _split_translation_chunks(text)
    translations: list[str] = []
    detected_source_language = _normalize_language_code(source_language)
    if detected_source_language == "auto":
        detected_source_language = ""
    providers_used: list[str] = []

    for chunk in chunks:
        chunk_result: dict | None = None

        deepl_settings = _get_deepl_settings()
        if deepl_settings.api_key:
            try:
                chunk_result = _translate_with_retry(
                    lambda c=chunk: _call_deepl_translate(
                        c, target_language, source_language
                    ),
                    provider_name="DeepL",
                )
            except PdfAiError as deepl_error:
                logger.warning(
                    "DeepL translation failed for chunk; falling back to OpenRouter. code=%s detail=%s",
                    deepl_error.error_code,
                    deepl_error.detail,
                )

        if chunk_result is None:
            chunk_result = _translate_with_retry(
                lambda c=chunk: _call_openrouter_translate(
                    c, target_language, source_language, model_id=model_id
                ),
                provider_name="OpenRouter",
            )

        translations.append(str(chunk_result["translation"]).strip())
        providers_used.append(str(chunk_result["provider"]))
        if not detected_source_language and chunk_result.get(
            "detected_source_language"
        ):
            detected_source_language = _normalize_language_code(
                chunk_result["detected_source_language"]
            )

    return {
        "translation": "\n\n".join(part for part in translations if part),
        "provider": ", ".join(sorted(set(providers_used))),
        "detected_source_language": detected_source_language,
        "chunks_translated": len(translations),
    }


# ---------------------------------------------------------------------------
# 1. Chat with PDF
# ---------------------------------------------------------------------------
def chat_with_pdf(input_path: str, question: str) -> dict:
    """
    Answer a question about a PDF document.

    Args:
        input_path: Path to the PDF file
        question: User's question about the document

    Returns:
        {"reply": "...", "pages_analyzed": int}
    """
    if not question or not question.strip():
        raise PdfAiError(
            "Please provide a question.", error_code="PDF_AI_INVALID_INPUT"
        )

    text = _extract_text_from_pdf(input_path)
    if not text.strip():
        raise PdfAiError(
            "Could not extract any text from the PDF.", error_code="PDF_TEXT_EMPTY"
        )

    # Truncate to fit context window
    max_chars = 12000
    truncated = text[:max_chars]

    system_prompt = (
        "You are a helpful document assistant. The user has uploaded a PDF document. "
        "Answer questions about the document based only on the content provided. "
        "If the answer is not in the document, say so. "
        "Reply in the same language the user uses."
    )

    user_msg = f"Document content:\n{truncated}\n\nQuestion: {question}"
    try:
        reply = _call_openrouter(
            system_prompt, user_msg, max_tokens=800, tool_name="pdf_chat"
        )
    except (RetryableTranslationError, PdfAiError) as open_err:
        try:
            g_settings = google_ai_service.get_google_settings()
        except Exception:
            g_settings = None

        if g_settings and g_settings.api_key:
            try:
                reply = google_ai_service.call_google_text(
                    system_prompt, user_msg, max_tokens=800, tool_name="pdf_chat"
                )
            except Exception as google_err:
                logger.exception("Google fallback for pdf chat failed: %s", google_err)
                raise open_err
        else:
            raise open_err

    page_count = text.count("[Page ")
    return {"reply": reply, "pages_analyzed": page_count}


# ---------------------------------------------------------------------------
# 2. Summarize PDF
# ---------------------------------------------------------------------------
def summarize_pdf(input_path: str, length: str = "medium") -> dict:
    """
    Generate a summary of a PDF document.

    Args:
        input_path: Path to the PDF file
        length: Summary length — "short", "medium", or "long"

    Returns:
        {"summary": "...", "pages_analyzed": int}
    """
    text = _extract_text_from_pdf(input_path)
    if not text.strip():
        raise PdfAiError(
            "Could not extract any text from the PDF.", error_code="PDF_TEXT_EMPTY"
        )

    length_instruction = {
        "short": "Provide a brief summary in 2-3 sentences.",
        "medium": "Provide a summary in 1-2 paragraphs covering the main points.",
        "long": "Provide a detailed summary covering all key points, arguments, and conclusions.",
    }.get(length, "Provide a summary in 1-2 paragraphs covering the main points.")

    max_chars = 12000
    truncated = text[:max_chars]

    system_prompt = (
        "You are a professional document summarizer. "
        "Summarize the document accurately and concisely. "
        "Reply in the same language as the document."
    )

    user_msg = f"{length_instruction}\n\nDocument content:\n{truncated}"
    try:
        summary = _call_openrouter(
            system_prompt, user_msg, max_tokens=1000, tool_name="pdf_summarize"
        )
    except (RetryableTranslationError, PdfAiError) as open_err:
        try:
            g_settings = google_ai_service.get_google_settings()
        except Exception:
            g_settings = None

        if g_settings and g_settings.api_key:
            try:
                summary = google_ai_service.call_google_text(
                    system_prompt, user_msg, max_tokens=1000, tool_name="pdf_summarize"
                )
            except Exception as google_err:
                logger.exception("Google fallback for pdf summarize failed: %s", google_err)
                raise open_err
        else:
            raise open_err

    page_count = text.count("[Page ")
    return {"summary": summary, "pages_analyzed": page_count}


# ---------------------------------------------------------------------------
# 3. Translate PDF
# ---------------------------------------------------------------------------
def translate_pdf(
    input_path: str,
    target_language: str,
    source_language: str | None = None,
    model_id: str | None = None,
) -> dict:
    """
    Translate the text content of a PDF to another language.

    Args:
        input_path: Path to the PDF file
        target_language: Target language name (e.g. "English", "Arabic", "French")
        model_id: Optional OpenRouter model ID override for this job

    Returns:
        {"translation": "...", "pages_analyzed": int, "target_language": str}
    """
    normalized_target_language = _normalize_language_code(target_language)
    normalized_source_language = _normalize_language_code(
        source_language, default="auto"
    )

    if not normalized_target_language:
        raise PdfAiError(
            "Please specify a target language.", error_code="PDF_AI_INVALID_INPUT"
        )

    if (
        normalized_target_language == normalized_source_language
        and normalized_source_language != "auto"
    ):
        raise PdfAiError(
            "Please choose different source and target languages.",
            error_code="PDF_AI_INVALID_INPUT",
        )

    text = _extract_text_from_pdf(input_path)
    if not text.strip():
        raise PdfAiError(
            "Could not extract any text from the PDF.", error_code="PDF_TEXT_EMPTY"
        )

    translated = _translate_document_text(
        text,
        target_language=normalized_target_language,
        source_language=normalized_source_language,
        model_id=model_id,
    )

    page_count = text.count("[Page ")
    return {
        "translation": translated["translation"],
        "pages_analyzed": page_count,
        "target_language": normalized_target_language,
        "source_language": normalized_source_language,
        "detected_source_language": translated["detected_source_language"],
        "provider": translated["provider"],
        "chunks_translated": translated["chunks_translated"],
    }


# ---------------------------------------------------------------------------
# 4. Extract Tables from PDF
# ---------------------------------------------------------------------------
def extract_tables(input_path: str) -> dict:
    """
    Extract tables from a PDF and return them as structured data.

    Args:
        input_path: Path to the PDF file

    Returns:
        {"tables": [...], "tables_found": int}
    """
    try:
        import tabula  # type: ignore[import-untyped]
        from PyPDF2 import PdfReader

        # Get total page count
        reader = PdfReader(input_path)
        total_pages = len(reader.pages)

        result_tables = []
        table_index = 0

        for page_num in range(1, total_pages + 1):
            page_tables = tabula.read_pdf(
                input_path, pages=str(page_num), multiple_tables=True, silent=True
            )
            if not page_tables:
                continue
            for df in page_tables:
                if df.empty:
                    continue
                headers = [str(c) for c in df.columns]
                rows = []
                for _, row in df.iterrows():
                    cells = []
                    for col in df.columns:
                        val = row[col]
                        if isinstance(val, float) and str(val) == "nan":
                            cells.append("")
                        else:
                            cells.append(str(val))
                    rows.append(cells)

                result_tables.append(
                    {
                        "page": page_num,
                        "table_index": table_index,
                        "headers": headers,
                        "rows": rows,
                    }
                )
                table_index += 1

        if not result_tables:
            raise PdfAiError(
                "No tables found in the PDF. This tool works best with PDFs containing tabular data.",
                error_code="PDF_TABLES_NOT_FOUND",
            )

        logger.info(f"Extracted {len(result_tables)} tables from PDF")

        return {
            "tables": result_tables,
            "tables_found": len(result_tables),
        }

    except PdfAiError:
        raise
    except ImportError:
        raise PdfAiError(
            "tabula-py library is not installed.", error_code="TABULA_NOT_INSTALLED"
        )
    except Exception as e:
        raise PdfAiError(
            "Failed to extract tables.",
            error_code="PDF_TABLE_EXTRACTION_FAILED",
            detail=str(e),
        )
