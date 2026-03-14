"""PDF AI services — Chat, Summarize, Translate, Table Extract."""
import json
import logging

import requests

from app.services.openrouter_config_service import get_openrouter_settings

logger = logging.getLogger(__name__)


class PdfAiError(Exception):
    """Custom exception for PDF AI service failures."""
    pass


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English."""
    return max(1, len(text) // 4)


def _extract_text_from_pdf(input_path: str, max_pages: int = 50) -> str:
    """Extract text content from a PDF file."""
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(input_path)
        pages = reader.pages[:max_pages]
        texts = []
        for i, page in enumerate(pages):
            text = page.extract_text() or ""
            if text.strip():
                texts.append(f"[Page {i + 1}]\n{text}")
        return "\n\n".join(texts)
    except Exception as e:
        raise PdfAiError(f"Failed to extract text from PDF: {str(e)}")


def _call_openrouter(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 1000,
    tool_name: str = "pdf_ai",
) -> str:
    """Send a request to OpenRouter API and return the reply."""
    # Budget guard
    try:
        from app.services.ai_cost_service import check_ai_budget, AiBudgetExceededError
        check_ai_budget()
    except AiBudgetExceededError:
        raise PdfAiError("Monthly AI processing budget has been reached. Please try again next month.")
    except Exception:
        pass  # Don't block if cost service unavailable

    settings = get_openrouter_settings()

    if not settings.api_key:
        raise PdfAiError(
            "AI service is not configured. Set OPENROUTER_API_KEY in the application configuration."
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
                "model": settings.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.5,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()

        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not reply:
            raise PdfAiError("AI returned an empty response. Please try again.")

        # Log usage
        try:
            from app.services.ai_cost_service import log_ai_usage
            usage = data.get("usage", {})
            log_ai_usage(
                tool=tool_name,
                model=settings.model,
                input_tokens=usage.get("prompt_tokens", _estimate_tokens(user_message)),
                output_tokens=usage.get("completion_tokens", _estimate_tokens(reply)),
            )
        except Exception:
            pass  # Don't fail the request if logging fails

        return reply

    except requests.exceptions.Timeout:
        raise PdfAiError("AI service timed out. Please try again.")
    except requests.exceptions.RequestException as e:
        logger.error(f"OpenRouter API error: {e}")
        raise PdfAiError("AI service is temporarily unavailable.")


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
        raise PdfAiError("Please provide a question.")

    text = _extract_text_from_pdf(input_path)
    if not text.strip():
        raise PdfAiError("Could not extract any text from the PDF.")

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
    reply = _call_openrouter(system_prompt, user_msg, max_tokens=800, tool_name="pdf_chat")

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
        raise PdfAiError("Could not extract any text from the PDF.")

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
    summary = _call_openrouter(system_prompt, user_msg, max_tokens=1000, tool_name="pdf_summarize")

    page_count = text.count("[Page ")
    return {"summary": summary, "pages_analyzed": page_count}


# ---------------------------------------------------------------------------
# 3. Translate PDF
# ---------------------------------------------------------------------------
def translate_pdf(input_path: str, target_language: str) -> dict:
    """
    Translate the text content of a PDF to another language.

    Args:
        input_path: Path to the PDF file
        target_language: Target language name (e.g. "English", "Arabic", "French")

    Returns:
        {"translation": "...", "pages_analyzed": int, "target_language": str}
    """
    if not target_language or not target_language.strip():
        raise PdfAiError("Please specify a target language.")

    text = _extract_text_from_pdf(input_path)
    if not text.strip():
        raise PdfAiError("Could not extract any text from the PDF.")

    max_chars = 10000
    truncated = text[:max_chars]

    system_prompt = (
        f"You are a professional translator. Translate the following document "
        f"content into {target_language}. Preserve the original formatting and "
        f"structure as much as possible. Only output the translation, nothing else."
    )

    translation = _call_openrouter(system_prompt, truncated, max_tokens=2000, tool_name="pdf_translate")

    page_count = text.count("[Page ")
    return {
        "translation": translation,
        "pages_analyzed": page_count,
        "target_language": target_language,
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

                result_tables.append({
                    "page": page_num,
                    "table_index": table_index,
                    "headers": headers,
                    "rows": rows,
                })
                table_index += 1

        if not result_tables:
            raise PdfAiError(
                "No tables found in the PDF. This tool works best with PDFs containing tabular data."
            )

        logger.info(f"Extracted {len(result_tables)} tables from PDF")

        return {
            "tables": result_tables,
            "tables_found": len(result_tables),
        }

    except PdfAiError:
        raise
    except ImportError:
        raise PdfAiError("tabula-py library is not installed.")
    except Exception as e:
        raise PdfAiError(f"Failed to extract tables: {str(e)}")
