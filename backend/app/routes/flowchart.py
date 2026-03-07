"""Flowchart route — POST /api/flowchart/extract, /chat, /generate-manual."""
import logging
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
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.flowchart_tasks import (
    extract_flowchart_task,
    extract_sample_flowchart_task,
)

logger = logging.getLogger(__name__)

flowchart_bp = Blueprint("flowchart", __name__)


@flowchart_bp.route("/extract", methods=["POST"])
@limiter.limit("10/minute")
def extract_flowchart_route():
    """
    Extract procedures from a PDF and generate flowcharts.

    Accepts: multipart/form-data with a single 'file' field (PDF)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext)
    file.save(input_path)

    task = extract_flowchart_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-flowchart", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Flowchart extraction started.",
    }), 202


@flowchart_bp.route("/extract-sample", methods=["POST"])
@limiter.limit("20/minute")
def extract_sample_flowchart_route():
    """
    Generate a sample flowchart payload for demo/testing flows.

    Returns: JSON with task_id for polling
    """
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    task = extract_sample_flowchart_task.delay(**build_task_tracking_kwargs(actor))
    record_accepted_usage(actor, "pdf-flowchart-sample", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Sample flowchart generation started.",
    }), 202


@flowchart_bp.route("/chat", methods=["POST"])
@limiter.limit("20/minute")
def flowchart_chat_route():
    """
    AI chat endpoint for flowchart improvement suggestions.

    Accepts JSON: { message, flow_id, flow_data }
    Returns JSON: { reply, updated_flow? }
    """
    data = request.get_json(silent=True)
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required."}), 400

    message = str(data["message"])[:2000]  # Limit message length
    flow_data = data.get("flow_data")

    try:
        from app.services.ai_chat_service import chat_about_flowchart
        result = chat_about_flowchart(message, flow_data)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Flowchart chat error: {e}")
        return jsonify({"reply": "Sorry, I couldn't process your request. Please try again."}), 200


@flowchart_bp.route("/generate-manual", methods=["POST"])
@limiter.limit("10/minute")
def generate_manual_flowchart_route():
    """
    Generate a flowchart from manually specified procedure data.

    Accepts JSON: { title, description, pages (list of page texts) }
    Returns JSON: { flowchart }
    """
    data = request.get_json(silent=True)
    if not data or not data.get("title"):
        return jsonify({"error": "Title is required."}), 400

    title = str(data["title"])[:200]
    description = str(data.get("description", ""))[:500]
    page_texts = data.get("pages", [])

    from app.services.flowchart_service import generate_flowchart

    # Build a synthetic procedure
    procedure = {
        "id": f"manual-{hash(title) % 100000}",
        "title": title,
        "description": description,
        "pages": list(range(1, len(page_texts) + 1)),
    }

    pages_data = [
        {"page": i + 1, "text": str(p.get("text", ""))[:5000]}
        for i, p in enumerate(page_texts)
    ]

    flowchart = generate_flowchart(procedure, pages_data)
    return jsonify({"flowchart": flowchart}), 200
