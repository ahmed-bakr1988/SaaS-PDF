"""Celery tasks for PDF conversion (PDF↔Word)."""
import os
import logging

from app.extensions import celery
from app.services.pdf_service import pdf_to_word, word_to_pdf, PDFConversionError
from app.services.storage_service import storage
from app.utils.sanitizer import cleanup_task_files


def _cleanup(task_id: str):
    """Cleanup with local-aware flag."""
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.convert_tasks.convert_pdf_to_word")
def convert_pdf_to_word(self, input_path: str, task_id: str, original_filename: str):
    """
    Async task: Convert PDF to Word document.

    Args:
        input_path: Path to the uploaded PDF file
        task_id: Unique task identifier
        original_filename: Original filename for download

    Returns:
        dict with download_url and file info
    """
    output_dir = os.path.join("/tmp/outputs", task_id)

    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting PDF to Word..."})

        # Convert using LibreOffice
        output_path = pdf_to_word(input_path, output_dir)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        # Upload to S3
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        # Generate download filename
        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}.docx"

        # Generate presigned URL
        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "output_size": os.path.getsize(output_path),
        }

        # Cleanup local files
        _cleanup(task_id)

        logger.info(f"Task {task_id}: PDF→Word conversion completed")
        return result

    except PDFConversionError as e:
        logger.error(f"Task {task_id}: Conversion error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


@celery.task(bind=True, name="app.tasks.convert_tasks.convert_word_to_pdf")
def convert_word_to_pdf(self, input_path: str, task_id: str, original_filename: str):
    """
    Async task: Convert Word document to PDF.

    Args:
        input_path: Path to the uploaded Word file
        task_id: Unique task identifier
        original_filename: Original filename for download

    Returns:
        dict with download_url and file info
    """
    output_dir = os.path.join("/tmp/outputs", task_id)

    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting Word to PDF..."})

        output_path = word_to_pdf(input_path, output_dir)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}.pdf"

        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "output_size": os.path.getsize(output_path),
        }

        _cleanup(task_id)

        logger.info(f"Task {task_id}: Word→PDF conversion completed")
        return result

    except PDFConversionError as e:
        logger.error(f"Task {task_id}: Conversion error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}
