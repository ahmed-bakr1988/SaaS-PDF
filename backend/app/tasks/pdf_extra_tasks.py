"""Celery tasks for extended PDF tools — Crop, Flatten, Repair, Metadata."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.pdf_extra_service import (
    crop_pdf,
    flatten_pdf,
    repair_pdf,
    edit_pdf_metadata,
    PDFExtraError,
)
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


def _get_output_dir(task_id: str) -> str:
    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _finalize_task(
    task_id, user_id, tool, original_filename, result,
    usage_source, api_key_id, celery_task_id,
):
    finalize_task_tracking(
        user_id=user_id, tool=tool, original_filename=original_filename,
        result=result, usage_source=usage_source, api_key_id=api_key_id,
        celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result


# ---------------------------------------------------------------------------
# Crop PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_extra_tasks.crop_pdf_task")
def crop_pdf_task(
    self, input_path, task_id, original_filename,
    margin_left=0, margin_right=0, margin_top=0, margin_bottom=0, pages="all",
    crop_x_pct=None, crop_y_pct=None, crop_width_pct=None, crop_height_pct=None,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}_cropped.pdf")
    try:
        self.update_state(state="PROCESSING", meta={"step": "Cropping PDF..."})
        stats = crop_pdf(
            input_path,
            output_path,
            margin_left,
            margin_right,
            margin_top,
            margin_bottom,
            pages,
            crop_x_pct,
            crop_y_pct,
            crop_width_pct,
            crop_height_pct,
        )

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}_cropped.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "crop-pdf", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFExtraError as e:
        return _finalize_task(task_id, user_id, "crop-pdf", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# Flatten PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_extra_tasks.flatten_pdf_task")
def flatten_pdf_task(
    self, input_path, task_id, original_filename,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}_flattened.pdf")
    try:
        self.update_state(state="PROCESSING", meta={"step": "Flattening PDF..."})
        stats = flatten_pdf(input_path, output_path)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}_flattened.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "flatten-pdf", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFExtraError as e:
        return _finalize_task(task_id, user_id, "flatten-pdf", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# Repair PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_extra_tasks.repair_pdf_task")
def repair_pdf_task(
    self, input_path, task_id, original_filename,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}_repaired.pdf")
    try:
        self.update_state(state="PROCESSING", meta={"step": "Repairing PDF..."})
        stats = repair_pdf(input_path, output_path)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}_repaired.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "repair-pdf", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFExtraError as e:
        return _finalize_task(task_id, user_id, "repair-pdf", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# Edit PDF Metadata
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_extra_tasks.edit_metadata_task")
def edit_metadata_task(
    self, input_path, task_id, original_filename,
    title=None, author=None, subject=None, keywords=None, creator=None,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}_metadata.pdf")
    try:
        self.update_state(state="PROCESSING", meta={"step": "Editing PDF metadata..."})
        stats = edit_pdf_metadata(input_path, output_path, title, author, subject, keywords, creator)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        download_name = original_filename
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "edit-metadata", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFExtraError as e:
        return _finalize_task(task_id, user_id, "edit-metadata", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)
