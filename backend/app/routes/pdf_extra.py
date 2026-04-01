"""Routes for extended PDF tools — Crop, Flatten, Repair, Metadata Editor."""
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
from app.tasks.pdf_extra_tasks import (
    crop_pdf_task,
    flatten_pdf_task,
    repair_pdf_task,
    edit_metadata_task,
)

pdf_extra_bp = Blueprint("pdf_extra", __name__)


# ---------------------------------------------------------------------------
# Crop PDF — POST /api/pdf-tools/crop
# ---------------------------------------------------------------------------
@pdf_extra_bp.route("/crop", methods=["POST"])
@limiter.limit("10/minute")
def crop_pdf_route():
    """Crop margins from a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'margin_left', 'margin_right', 'margin_top', 'margin_bottom': Points to crop
        - 'pages' (optional): "all" or comma-separated page numbers
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="crop-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    try:
        margin_left = float(request.form.get("margin_left", 0))
        margin_right = float(request.form.get("margin_right", 0))
        margin_top = float(request.form.get("margin_top", 0))
        margin_bottom = float(request.form.get("margin_bottom", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Margin values must be numbers."}), 400

    pages = request.form.get("pages", "all")

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = crop_pdf_task.delay(
        input_path, task_id, original_filename,
        margin_left, margin_right, margin_top, margin_bottom, pages,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "crop-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Cropping started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Flatten PDF — POST /api/pdf-tools/flatten
# ---------------------------------------------------------------------------
@pdf_extra_bp.route("/flatten", methods=["POST"])
@limiter.limit("10/minute")
def flatten_pdf_route():
    """Flatten a PDF — remove interactive forms and annotations."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="flatten-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = flatten_pdf_task.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "flatten-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Flattening started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Repair PDF — POST /api/pdf-tools/repair
# ---------------------------------------------------------------------------
@pdf_extra_bp.route("/repair", methods=["POST"])
@limiter.limit("10/minute")
def repair_pdf_route():
    """Attempt to repair a damaged PDF."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="repair-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = repair_pdf_task.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "repair-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Repair started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Edit PDF Metadata — POST /api/pdf-tools/metadata
# ---------------------------------------------------------------------------
@pdf_extra_bp.route("/metadata", methods=["POST"])
@limiter.limit("10/minute")
def edit_metadata_route():
    """Edit PDF metadata fields.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'title', 'author', 'subject', 'keywords', 'creator' (optional)
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    title = request.form.get("title")
    author = request.form.get("author")
    subject = request.form.get("subject")
    keywords = request.form.get("keywords")
    creator = request.form.get("creator")

    if not any([title, author, subject, keywords, creator]):
        return jsonify({"error": "At least one metadata field must be provided."}), 400

    # Validate string lengths
    for field_name, field_val in [("title", title), ("author", author),
                                   ("subject", subject), ("keywords", keywords),
                                   ("creator", creator)]:
        if field_val and len(field_val) > 500:
            return jsonify({"error": f"{field_name} must be 500 characters or less."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="edit-metadata")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = edit_metadata_task.delay(
        input_path, task_id, original_filename,
        title, author, subject, keywords, creator,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "edit-metadata", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Metadata editing started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
