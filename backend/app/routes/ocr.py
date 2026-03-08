"""OCR routes — extract text from images and PDFs."""
from flask import Blueprint, request, jsonify, current_app

from app.extensions import limiter
from app.services.policy_service import (
    assert_quota_available,
    build_task_tracking_kwargs,
    PolicyError,
    record_accepted_usage,
    resolve_web_actor,
    validate_actor_file,
)
from app.services.ocr_service import SUPPORTED_LANGUAGES
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.ocr_tasks import ocr_image_task, ocr_pdf_task

ocr_bp = Blueprint("ocr", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp", "tiff", "bmp"]
ALLOWED_OCR_TYPES = ALLOWED_IMAGE_TYPES + ["pdf"]


def _check_feature_flag():
    """Return an error response if FEATURE_OCR is disabled."""
    if not current_app.config.get("FEATURE_OCR", True):
        return jsonify({"error": "This feature is not enabled."}), 403
    return None


@ocr_bp.route("/image", methods=["POST"])
@limiter.limit("10/minute")
def ocr_image_route():
    """Extract text from an image using OCR.

    Accepts: multipart/form-data with:
        - 'file': Image file
        - 'lang' (optional): Language code — eng, ara, fra (default: eng)
    Returns: JSON with task_id for polling
    """
    flag_err = _check_feature_flag()
    if flag_err:
        return flag_err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    lang = request.form.get("lang", "eng").lower()
    if lang not in SUPPORTED_LANGUAGES:
        lang = "eng"

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = ocr_image_task.delay(
        input_path, task_id, original_filename, lang,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "ocr-image", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "OCR started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


@ocr_bp.route("/pdf", methods=["POST"])
@limiter.limit("5/minute")
def ocr_pdf_route():
    """Extract text from a scanned PDF using OCR.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'lang' (optional): Language code — eng, ara, fra (default: eng)
    Returns: JSON with task_id for polling
    """
    flag_err = _check_feature_flag()
    if flag_err:
        return flag_err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    lang = request.form.get("lang", "eng").lower()
    if lang not in SUPPORTED_LANGUAGES:
        lang = "eng"

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
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

    task = ocr_pdf_task.delay(
        input_path, task_id, original_filename, lang,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "ocr-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "OCR started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


@ocr_bp.route("/languages", methods=["GET"])
def ocr_languages_route():
    """Return the list of supported OCR languages."""
    return jsonify({"languages": SUPPORTED_LANGUAGES}), 200
