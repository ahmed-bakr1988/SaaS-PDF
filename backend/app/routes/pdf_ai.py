"""PDF AI tool routes — Chat, Summarize, Translate, Table Extract."""

import os

from flask import Blueprint, request, jsonify

from app.extensions import limiter
from app.services.policy_service import (
    assert_quota_available,
    build_task_tracking_kwargs,
    PolicyError,
    record_accepted_usage,
    resolve_web_actor,
    validate_actor_file,
)
from app.services.quote_service import create_quote, QuoteError
from app.services.translation_guardrails import (
    check_page_admission,
    TranslationAdmissionError,
)
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.pdf_ai_tasks import (
    chat_with_pdf_task,
    summarize_pdf_task,
    translate_pdf_task,
    extract_tables_task,
)

pdf_ai_bp = Blueprint("pdf_ai", __name__)


# ---------------------------------------------------------------------------
# Chat with PDF — POST /api/pdf-ai/chat
# ---------------------------------------------------------------------------
@pdf_ai_bp.route("/chat", methods=["POST"])
@limiter.limit("10/minute")
def chat_pdf_route():
    """
    Ask a question about a PDF document.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'question': The question to ask
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    question = request.form.get("question", "").strip()

    if not question:
        return jsonify({"error": "No question provided."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="chat-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    file_size_kb = os.path.getsize(input_path) / 1024

    try:
        quote = create_quote(actor.user_id, actor.plan, "chat-pdf", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = chat_with_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        question,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "chat-pdf", task.id, quote=quote)

    return jsonify(
        {
            "task_id": task.id,
            "message": "Processing your question. Poll /api/tasks/{task_id}/status for progress.",
            "quote": quote.to_dict(),
        }
    ), 202


# ---------------------------------------------------------------------------
# Summarize PDF — POST /api/pdf-ai/summarize
# ---------------------------------------------------------------------------
@pdf_ai_bp.route("/summarize", methods=["POST"])
@limiter.limit("10/minute")
def summarize_pdf_route():
    """
    Generate a summary of a PDF document.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'length' (optional): "short", "medium", or "long"
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    length = request.form.get("length", "medium").strip()

    if length not in ("short", "medium", "long"):
        length = "medium"

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="summarize-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    file_size_kb = os.path.getsize(input_path) / 1024

    try:
        quote = create_quote(actor.user_id, actor.plan, "summarize-pdf", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = summarize_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        length,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "summarize-pdf", task.id, quote=quote)

    return jsonify(
        {
            "task_id": task.id,
            "message": "Summarizing document. Poll /api/tasks/{task_id}/status for progress.",
            "quote": quote.to_dict(),
        }
    ), 202


# ---------------------------------------------------------------------------
# Translate PDF — POST /api/pdf-ai/translate
# ---------------------------------------------------------------------------
@pdf_ai_bp.route("/translate", methods=["POST"])
@limiter.limit("10/minute")
def translate_pdf_route():
    """
    Translate a PDF document to another language.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'target_language': Target language name
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    target_language = request.form.get("target_language", "").strip()
    source_language = request.form.get("source_language", "auto").strip()

    if not target_language:
        return jsonify({"error": "No target language specified."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="translate-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    # ── Page-count admission guard ──
    try:
        page_count = check_page_admission(input_path, actor.plan)
    except TranslationAdmissionError as e:
        return jsonify({"error": e.message}), e.status_code

    file_size_kb = os.path.getsize(input_path) / 1024

    try:
        quote = create_quote(actor.user_id, actor.plan, "translate-pdf", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = translate_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        target_language,
        source_language,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "translate-pdf", task.id, quote=quote)

    return jsonify(
        {
            "task_id": task.id,
            "message": "Translating document. Poll /api/tasks/{task_id}/status for progress.",
            "quote": quote.to_dict(),
        }
    ), 202


# ---------------------------------------------------------------------------
# Extract Tables — POST /api/pdf-ai/extract-tables
# ---------------------------------------------------------------------------
@pdf_ai_bp.route("/extract-tables", methods=["POST"])
@limiter.limit("10/minute")
def extract_tables_route():
    """
    Extract tables from a PDF document.

    Accepts: multipart/form-data with:
        - 'file': PDF file
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="extract-tables")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    file_size_kb = os.path.getsize(input_path) / 1024

    try:
        quote = create_quote(actor.user_id, actor.plan, "extract-tables", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = extract_tables_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "extract-tables", task.id, quote=quote)

    return jsonify(
        {
            "task_id": task.id,
            "message": "Extracting tables. Poll /api/tasks/{task_id}/status for progress.",
            "quote": quote.to_dict(),
        }
    ), 202
