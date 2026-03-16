"""Site assistant service — page-aware AI help plus persistent conversation logging."""
import json
import logging
import os
import sqlite3
import uuid
from datetime import datetime, timezone

import requests
from flask import current_app

from app.services.openrouter_config_service import get_openrouter_settings
from app.services.ai_cost_service import AiBudgetExceededError, check_ai_budget, log_ai_usage

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 8
MAX_MESSAGE_LENGTH = 4000

TOOL_CATALOG = [
    {"slug": "pdf-to-word", "label": "PDF to Word", "summary": "convert PDF files into editable Word documents"},
    {"slug": "word-to-pdf", "label": "Word to PDF", "summary": "turn DOC or DOCX files into PDF documents"},
    {"slug": "compress-pdf", "label": "Compress PDF", "summary": "reduce PDF file size while preserving readability"},
    {"slug": "merge-pdf", "label": "Merge PDF", "summary": "combine multiple PDF files into one document"},
    {"slug": "split-pdf", "label": "Split PDF", "summary": "extract ranges or split one PDF into separate pages"},
    {"slug": "rotate-pdf", "label": "Rotate PDF", "summary": "rotate PDF pages to the correct orientation"},
    {"slug": "pdf-to-images", "label": "PDF to Images", "summary": "convert each PDF page into PNG or JPG images"},
    {"slug": "images-to-pdf", "label": "Images to PDF", "summary": "combine multiple images into one PDF"},
    {"slug": "watermark-pdf", "label": "Watermark PDF", "summary": "add text watermarks to PDF pages"},
    {"slug": "remove-watermark-pdf", "label": "Remove Watermark", "summary": "remove supported text and image-overlay watermarks from PDFs"},
    {"slug": "protect-pdf", "label": "Protect PDF", "summary": "add password protection to PDF files"},
    {"slug": "unlock-pdf", "label": "Unlock PDF", "summary": "remove PDF password protection when the password is known"},
    {"slug": "page-numbers", "label": "Page Numbers", "summary": "add page numbers in different positions"},
    {"slug": "pdf-editor", "label": "PDF Editor", "summary": "optimize and clean PDF copies"},
    {"slug": "pdf-flowchart", "label": "PDF Flowchart", "summary": "analyze PDF procedures and turn them into flowcharts"},
    {"slug": "pdf-to-excel", "label": "PDF to Excel", "summary": "extract structured table data into spreadsheet files"},
    {"slug": "html-to-pdf", "label": "HTML to PDF", "summary": "convert HTML documents into PDF"},
    {"slug": "reorder-pdf", "label": "Reorder PDF", "summary": "rearrange PDF pages using a full page order"},
    {"slug": "extract-pages", "label": "Extract Pages", "summary": "create a PDF from selected pages"},
    {"slug": "chat-pdf", "label": "Chat with PDF", "summary": "ask questions about one uploaded PDF"},
    {"slug": "summarize-pdf", "label": "Summarize PDF", "summary": "generate a concise summary of one PDF"},
    {"slug": "translate-pdf", "label": "Translate PDF", "summary": "translate PDF content into another language"},
    {"slug": "extract-tables", "label": "Extract Tables", "summary": "find tables in a PDF and export them"},
    {"slug": "image-converter", "label": "Image Converter", "summary": "convert images between common formats"},
    {"slug": "image-resize", "label": "Image Resize", "summary": "resize images to exact dimensions"},
    {"slug": "compress-image", "label": "Compress Image", "summary": "reduce image file size"},
    {"slug": "ocr", "label": "OCR", "summary": "extract text from image or scanned PDF content"},
    {"slug": "remove-background", "label": "Remove Background", "summary": "remove image backgrounds automatically"},
    {"slug": "qr-code", "label": "QR Code", "summary": "generate QR codes from text or URLs"},
    {"slug": "video-to-gif", "label": "Video to GIF", "summary": "convert short videos into GIF animations"},
    {"slug": "word-counter", "label": "Word Counter", "summary": "count words, characters, and reading metrics"},
    {"slug": "text-cleaner", "label": "Text Cleaner", "summary": "clean up text spacing and formatting"},
]

SYSTEM_PROMPT = """You are the Dociva site assistant.
You help users choose the right tool, understand how to use the current tool, and explain site capabilities.
Rules:
- Reply in the same language as the user.
- Keep answers practical and concise.
- Prefer recommending existing site tools over generic outside advice.
- If the user is already on a tool page, explain that tool first, then mention alternatives only when useful.
- Never claim to process or access a file unless the current tool explicitly supports file upload.
- When the user asks what tool to use, recommend 1-3 tools max and explain why.
- If the user asks about sharing or privacy, explain that download links may expire and users should avoid sharing sensitive files publicly.
"""


def _connect() -> sqlite3.Connection:
    db_path = current_app.config["DATABASE_PATH"]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_site_assistant_db() -> None:
    """Create assistant conversation tables if they do not exist."""
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS assistant_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                user_id INTEGER,
                fingerprint TEXT NOT NULL,
                tool_slug TEXT DEFAULT '',
                page_url TEXT DEFAULT '',
                locale TEXT DEFAULT 'en',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS assistant_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                tool_slug TEXT DEFAULT '',
                page_url TEXT DEFAULT '',
                locale TEXT DEFAULT 'en',
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id
            ON assistant_conversations(user_id);

            CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_id
            ON assistant_messages(conversation_id);

            CREATE INDEX IF NOT EXISTS idx_assistant_messages_created_at
            ON assistant_messages(created_at);
            """
        )


def chat_with_site_assistant(
    message: str,
    session_id: str | None,
    fingerprint: str,
    tool_slug: str = "",
    page_url: str = "",
    locale: str = "en",
    user_id: int | None = None,
    history: list[dict] | None = None,
) -> dict:
    """Generate an assistant reply and persist both sides of the conversation."""
    prepared = _prepare_chat_request(
        message=message,
        session_id=session_id,
        fingerprint=fingerprint,
        tool_slug=tool_slug,
        page_url=page_url,
        locale=locale,
        user_id=user_id,
        history=history,
    )

    normalized_message = prepared["message"]
    normalized_session_id = prepared["session_id"]
    normalized_tool_slug = prepared["tool_slug"]
    normalized_page_url = prepared["page_url"]
    normalized_locale = prepared["locale"]
    normalized_fingerprint = prepared["fingerprint"]
    normalized_history = prepared["history"]
    conversation_id = prepared["conversation_id"]

    try:
        check_ai_budget()
        reply = _request_ai_reply(
            message=normalized_message,
            tool_slug=normalized_tool_slug,
            page_url=normalized_page_url,
            locale=normalized_locale,
            history=normalized_history,
        )
    except AiBudgetExceededError:
        reply = _fallback_reply(normalized_message, normalized_tool_slug)
    except Exception as exc:
        logger.warning("Site assistant fallback triggered: %s", exc)
        reply = _fallback_reply(normalized_message, normalized_tool_slug)

    _record_message(
        conversation_id=conversation_id,
        role="user",
        content=normalized_message,
        tool_slug=normalized_tool_slug,
        page_url=normalized_page_url,
        locale=normalized_locale,
        metadata={"fingerprint": normalized_fingerprint},
    )
    _record_message(
        conversation_id=conversation_id,
        role="assistant",
        content=reply,
        tool_slug=normalized_tool_slug,
        page_url=normalized_page_url,
        locale=normalized_locale,
        metadata={"model": _response_model_name()},
    )

    return {
        "session_id": normalized_session_id,
        "reply": reply,
        "stored": True,
    }


def stream_site_assistant_chat(
    message: str,
    session_id: str | None,
    fingerprint: str,
    tool_slug: str = "",
    page_url: str = "",
    locale: str = "en",
    user_id: int | None = None,
    history: list[dict] | None = None,
):
    """Yield assistant response events incrementally for SSE clients."""
    prepared = _prepare_chat_request(
        message=message,
        session_id=session_id,
        fingerprint=fingerprint,
        tool_slug=tool_slug,
        page_url=page_url,
        locale=locale,
        user_id=user_id,
        history=history,
    )

    normalized_message = prepared["message"]
    normalized_session_id = prepared["session_id"]
    normalized_tool_slug = prepared["tool_slug"]
    normalized_page_url = prepared["page_url"]
    normalized_locale = prepared["locale"]
    normalized_fingerprint = prepared["fingerprint"]
    normalized_history = prepared["history"]
    conversation_id = prepared["conversation_id"]

    def generate_events():
        yield {"event": "session", "data": {"session_id": normalized_session_id}}

        _record_message(
            conversation_id=conversation_id,
            role="user",
            content=normalized_message,
            tool_slug=normalized_tool_slug,
            page_url=normalized_page_url,
            locale=normalized_locale,
            metadata={"fingerprint": normalized_fingerprint},
        )

        reply = ""
        response_model = "fallback"

        try:
            check_ai_budget()
            settings = get_openrouter_settings()
            if not settings.api_key:
                raise RuntimeError("OPENROUTER_API_KEY is not configured for the application.")

            response_model = settings.model
            messages = _build_ai_messages(
                message=normalized_message,
                tool_slug=normalized_tool_slug,
                page_url=normalized_page_url,
                locale=normalized_locale,
                history=normalized_history,
            )

            for chunk in _stream_ai_reply(messages=messages, settings=settings):
                if not chunk:
                    continue
                reply += chunk
                yield {"event": "chunk", "data": {"content": chunk}}

            if not reply.strip():
                raise RuntimeError("Assistant returned an empty reply.")

            log_ai_usage(
                tool="site_assistant",
                model=settings.model,
                input_tokens=max(1, len(normalized_message) // 4),
                output_tokens=max(1, len(reply) // 4),
            )
        except AiBudgetExceededError:
            reply = _fallback_reply(normalized_message, normalized_tool_slug)
            yield {"event": "chunk", "data": {"content": reply}}
        except Exception as exc:
            logger.warning("Site assistant streaming fallback triggered: %s", exc)
            if not reply.strip():
                reply = _fallback_reply(normalized_message, normalized_tool_slug)
                yield {"event": "chunk", "data": {"content": reply}}
                response_model = "fallback"

        _record_message(
            conversation_id=conversation_id,
            role="assistant",
            content=reply,
            tool_slug=normalized_tool_slug,
            page_url=normalized_page_url,
            locale=normalized_locale,
            metadata={"model": response_model},
        )

        yield {
            "event": "done",
            "data": {
                "session_id": normalized_session_id,
                "reply": reply,
                "stored": True,
            },
        }

    return generate_events()


def _ensure_conversation(
    session_id: str,
    user_id: int | None,
    fingerprint: str,
    tool_slug: str,
    page_url: str,
    locale: str,
) -> int:
    now = _utc_now()
    with _connect() as conn:
        row = conn.execute(
            "SELECT id FROM assistant_conversations WHERE session_id = ?",
            (session_id,),
        ).fetchone()

        if row is not None:
            conn.execute(
                """
                UPDATE assistant_conversations
                SET user_id = ?, fingerprint = ?, tool_slug = ?, page_url = ?, locale = ?, updated_at = ?
                WHERE id = ?
                """,
                (user_id, fingerprint, tool_slug, page_url, locale, now, row["id"]),
            )
            return int(row["id"])

        cursor = conn.execute(
            """
            INSERT INTO assistant_conversations (
                session_id, user_id, fingerprint, tool_slug, page_url, locale, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, user_id, fingerprint, tool_slug, page_url, locale, now, now),
        )
        return int(cursor.lastrowid)


def _record_message(
    conversation_id: int,
    role: str,
    content: str,
    tool_slug: str,
    page_url: str,
    locale: str,
    metadata: dict | None = None,
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO assistant_messages (
                conversation_id, role, content, tool_slug, page_url, locale, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conversation_id,
                role,
                content,
                tool_slug,
                page_url,
                locale,
                json.dumps(metadata or {}, ensure_ascii=True),
                _utc_now(),
            ),
        )


def _prepare_chat_request(
    message: str,
    session_id: str | None,
    fingerprint: str,
    tool_slug: str,
    page_url: str,
    locale: str,
    user_id: int | None,
    history: list[dict] | None,
) -> dict:
    normalized_message = (message or "").strip()[:MAX_MESSAGE_LENGTH]
    if not normalized_message:
        raise ValueError("Message is required.")

    normalized_session_id = (session_id or "").strip() or str(uuid.uuid4())
    normalized_tool_slug = (tool_slug or "").strip()[:120]
    normalized_page_url = (page_url or "").strip()[:500]
    normalized_locale = (locale or "en").strip()[:16] or "en"
    normalized_fingerprint = (fingerprint or "anonymous").strip()[:120] or "anonymous"
    normalized_history = _normalize_history(history)

    conversation_id = _ensure_conversation(
        session_id=normalized_session_id,
        user_id=user_id,
        fingerprint=normalized_fingerprint,
        tool_slug=normalized_tool_slug,
        page_url=normalized_page_url,
        locale=normalized_locale,
    )

    return {
        "message": normalized_message,
        "session_id": normalized_session_id,
        "tool_slug": normalized_tool_slug,
        "page_url": normalized_page_url,
        "locale": normalized_locale,
        "fingerprint": normalized_fingerprint,
        "history": normalized_history,
        "conversation_id": conversation_id,
    }


def _normalize_history(history: list[dict] | None) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for item in history or []:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()[:MAX_MESSAGE_LENGTH]
        if role not in {"user", "assistant"} or not content:
            continue
        normalized.append({"role": role, "content": content})

    return normalized[-MAX_HISTORY_MESSAGES:]


def _request_ai_reply(
    message: str,
    tool_slug: str,
    page_url: str,
    locale: str,
    history: list[dict[str, str]],
) -> str:
    settings = get_openrouter_settings()

    if not settings.api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured for the application.")

    messages = _build_ai_messages(
        message=message,
        tool_slug=tool_slug,
        page_url=page_url,
        locale=locale,
        history=history,
    )

    response = requests.post(
        settings.base_url,
        headers={
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.model,
            "messages": messages,
            "max_tokens": 400,
            "temperature": 0.3,
        },
        timeout=30,
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
        raise RuntimeError("Assistant returned an empty reply.")

    usage = data.get("usage", {})
    log_ai_usage(
        tool="site_assistant",
        model=settings.model,
        input_tokens=usage.get("prompt_tokens", max(1, len(message) // 4)),
        output_tokens=usage.get("completion_tokens", max(1, len(reply) // 4)),
    )

    return reply


def _build_ai_messages(
    message: str,
    tool_slug: str,
    page_url: str,
    locale: str,
    history: list[dict[str, str]],
) -> list[dict[str, str]]:

    context_lines = [
        f"Current locale: {locale or 'en'}",
        f"Current tool slug: {tool_slug or 'none'}",
        f"Current page URL: {page_url or 'unknown'}",
        "Available tools:",
    ]
    context_lines.extend(
        f"- {tool['label']} ({tool['slug']}): {tool['summary']}"
        for tool in TOOL_CATALOG
    )
    context = "\n".join(context_lines)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": context},
    ]
    messages.extend(history)
    messages.append({"role": "user", "content": message})

    return messages


def _stream_ai_reply(messages: list[dict[str, str]], settings):
    response = requests.post(
        settings.base_url,
        headers={
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        json={
            "model": settings.model,
            "messages": messages,
            "max_tokens": 400,
            "temperature": 0.3,
            "stream": True,
        },
        timeout=60,
        stream=True,
    )
    response.raise_for_status()

    try:
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue

            line = raw_line.strip()
            if not line.startswith("data:"):
                continue

            payload = line[5:].strip()
            if not payload or payload == "[DONE]":
                continue

            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                continue

            choices = data.get("choices") or []
            if not choices:
                continue

            delta = choices[0].get("delta") or {}
            content = delta.get("content")
            if isinstance(content, str) and content:
                yield content
    finally:
        response.close()


def _fallback_reply(message: str, tool_slug: str) -> str:
    msg_lower = message.lower()

    if any(keyword in msg_lower for keyword in ["merge", "combine", "دمج", "جمع"]):
        return "إذا كنت تريد جمع أكثر من ملف PDF في ملف واحد فابدأ بأداة Merge PDF. إذا كنت تريد فقط إعادة ترتيب الصفحات داخل ملف واحد فاستخدم Reorder PDF."

    if any(keyword in msg_lower for keyword in ["split", "extract", "قس", "استخراج"]):
        return "لإخراج صفحات محددة في ملف جديد استخدم Extract Pages، أما إذا أردت تقسيم الملف إلى صفحات أو نطاقات متعددة فاستخدم Split PDF."

    if any(keyword in msg_lower for keyword in ["watermark", "علامة", "filigrane"]):
        return "إذا أردت إضافة علامة مائية فاستخدم Watermark PDF. إذا أردت إزالة علامة موجودة فاستخدم Remove Watermark، مع ملاحظة أن العلامات المسطحة أو المدمجة بعمق قد لا تكون قابلة للإزالة دائماً."

    if tool_slug:
        tool = next((item for item in TOOL_CATALOG if item["slug"] == tool_slug), None)
        if tool:
            return (
                f"أنت الآن على أداة {tool['label']}. هذه الأداة تُستخدم لـ {tool['summary']}. "
                "إذا وصفت لي ما تريد فعله بالتحديد فسأرشدك إلى الخطوات أو إلى أداة أنسب داخل الموقع."
            )

    return (
        "أستطيع مساعدتك في اختيار الأداة المناسبة داخل الموقع أو شرح طريقة استخدامها. "
        "اذكر لي الهدف الذي تريد الوصول إليه مثل ضغط PDF أو إزالة الخلفية أو ترجمة ملف PDF، وسأقترح الأداة المناسبة مباشرة."
    )


def _response_model_name() -> str:
    settings = get_openrouter_settings()
    return settings.model if settings.api_key else "fallback"