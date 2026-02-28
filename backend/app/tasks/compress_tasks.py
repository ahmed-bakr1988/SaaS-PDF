"""Celery tasks for PDF compression."""
import os
import logging

from app.extensions import celery
from app.services.compress_service import compress_pdf, PDFCompressionError
from app.services.storage_service import storage
from app.utils.sanitizer import cleanup_task_files


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.compress_tasks.compress_pdf_task")
def compress_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    quality: str = "medium",
):
    """
    Async task: Compress a PDF file.

    Args:
        input_path: Path to the uploaded PDF file
        task_id: Unique task identifier
        original_filename: Original filename for download
        quality: Compression quality ("low", "medium", "high")

    Returns:
        dict with download_url, compression stats, and file info
    """
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}.pdf")

    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": f"Compressing PDF ({quality} quality)..."},
        )

        # Compress using Ghostscript
        stats = compress_pdf(input_path, output_path, quality)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        # Upload to S3
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        # Generate download filename
        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_compressed.pdf"

        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "original_size": stats["original_size"],
            "compressed_size": stats["compressed_size"],
            "reduction_percent": stats["reduction_percent"],
        }

        _cleanup(task_id)

        logger.info(
            f"Task {task_id}: PDF compression completed — "
            f"{stats['reduction_percent']}% reduction"
        )
        return result

    except PDFCompressionError as e:
        logger.error(f"Task {task_id}: Compression error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}
