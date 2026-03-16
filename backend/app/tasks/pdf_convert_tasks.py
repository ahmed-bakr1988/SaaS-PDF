"""Celery tasks for new PDF conversions — PDF↔PPTX, Excel→PDF, Sign PDF."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.pdf_convert_service import (
    pdf_to_pptx,
    excel_to_pdf,
    pptx_to_pdf,
    sign_pdf,
    PDFConvertError,
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
# PDF to PowerPoint
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_convert_tasks.pdf_to_pptx_task")
def pdf_to_pptx_task(
    self, input_path, task_id, original_filename,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.pptx")
    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting PDF to PowerPoint..."})
        stats = pdf_to_pptx(input_path, output_path)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}.pptx"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed", "download_url": download_url,
            "filename": download_name, **stats,
        }
        return _finalize_task(task_id, user_id, "pdf-to-pptx", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFConvertError as e:
        return _finalize_task(task_id, user_id, "pdf-to-pptx", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# Excel to PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_convert_tasks.excel_to_pdf_task")
def excel_to_pdf_task(
    self, input_path, task_id, original_filename,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting Excel to PDF..."})
        output_path = excel_to_pdf(input_path, output_dir)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        output_size = os.path.getsize(output_path)
        result = {
            "status": "completed", "download_url": download_url,
            "filename": download_name, "output_size": output_size,
        }
        return _finalize_task(task_id, user_id, "excel-to-pdf", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFConvertError as e:
        return _finalize_task(task_id, user_id, "excel-to-pdf", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# PowerPoint to PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_convert_tasks.pptx_to_pdf_task")
def pptx_to_pdf_task(
    self, input_path, task_id, original_filename,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting PowerPoint to PDF..."})
        output_path = pptx_to_pdf(input_path, output_dir)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        output_size = os.path.getsize(output_path)
        result = {
            "status": "completed", "download_url": download_url,
            "filename": download_name, "output_size": output_size,
        }
        return _finalize_task(task_id, user_id, "pptx-to-pdf", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFConvertError as e:
        return _finalize_task(task_id, user_id, "pptx-to-pdf", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# Sign PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_convert_tasks.sign_pdf_task")
def sign_pdf_task(
    self, input_path, signature_path, task_id, original_filename,
    page=0, x=100, y=100, width=200, height=80,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}_signed.pdf")
    try:
        self.update_state(state="PROCESSING", meta={"step": "Signing PDF..."})
        stats = sign_pdf(input_path, signature_path, output_path, page, x, y, width, height)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}_signed.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed", "download_url": download_url,
            "filename": download_name, **stats,
        }
        return _finalize_task(task_id, user_id, "sign-pdf", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except PDFConvertError as e:
        return _finalize_task(task_id, user_id, "sign-pdf", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)
