"""Celery tasks for extended PDF tools (merge, split, rotate, etc.)."""
import os
import logging

from app.extensions import celery
from app.services.pdf_tools_service import (
    merge_pdfs,
    split_pdf,
    rotate_pdf,
    add_page_numbers,
    pdf_to_images,
    images_to_pdf,
    add_watermark,
    protect_pdf,
    unlock_pdf,
    PDFToolsError,
)
from app.services.storage_service import storage
from app.utils.sanitizer import cleanup_task_files


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Merge PDFs
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.merge_pdfs_task")
def merge_pdfs_task(
    self, input_paths: list[str], task_id: str, original_filenames: list[str]
):
    """Async task: Merge multiple PDFs into one."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_merged.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Merging PDFs..."})
        stats = merge_pdfs(input_paths, output_path)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        download_name = "merged.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "files_merged": stats["files_merged"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: Merge completed — {stats['files_merged']} files, {stats['total_pages']} pages")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Merge error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Split PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.split_pdf_task")
def split_pdf_task(
    self, input_path: str, task_id: str, original_filename: str,
    mode: str = "all", pages: str | None = None,
):
    """Async task: Split a PDF into individual pages."""
    output_dir = os.path.join("/tmp/outputs", task_id)

    try:
        self.update_state(state="PROCESSING", meta={"step": "Splitting PDF..."})
        stats = split_pdf(input_path, output_dir, mode=mode, pages=pages)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        zip_path = stats["zip_path"]
        s3_key = storage.upload_file(zip_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_split.zip"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "extracted_pages": stats["extracted_pages"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: Split completed — {stats['extracted_pages']} pages extracted")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Split error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Rotate PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.rotate_pdf_task")
def rotate_pdf_task(
    self, input_path: str, task_id: str, original_filename: str,
    rotation: int = 90, pages: str = "all",
):
    """Async task: Rotate pages in a PDF."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_rotated.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": f"Rotating PDF by {rotation}°..."})
        stats = rotate_pdf(input_path, output_path, rotation=rotation, pages=pages)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_rotated.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "rotated_pages": stats["rotated_pages"],
            "rotation": stats["rotation"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: Rotate completed — {stats['rotated_pages']} pages")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Rotate error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Add Page Numbers
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.add_page_numbers_task")
def add_page_numbers_task(
    self, input_path: str, task_id: str, original_filename: str,
    position: str = "bottom-center", start_number: int = 1,
):
    """Async task: Add page numbers to a PDF."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_numbered.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Adding page numbers..."})
        stats = add_page_numbers(input_path, output_path, position=position, start_number=start_number)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_numbered.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: Page numbers added to {stats['total_pages']} pages")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Page numbers error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# PDF to Images
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.pdf_to_images_task")
def pdf_to_images_task(
    self, input_path: str, task_id: str, original_filename: str,
    output_format: str = "png", dpi: int = 200,
):
    """Async task: Convert PDF pages to images."""
    output_dir = os.path.join("/tmp/outputs", task_id)

    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting PDF to images..."})
        stats = pdf_to_images(input_path, output_dir, output_format=output_format, dpi=dpi)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        zip_path = stats["zip_path"]
        s3_key = storage.upload_file(zip_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_images.zip"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "page_count": stats["page_count"],
            "format": stats["format"],
            "dpi": stats["dpi"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: PDF→Images completed — {stats['page_count']} pages")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: PDF→Images error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Images to PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.images_to_pdf_task")
def images_to_pdf_task(
    self, input_paths: list[str], task_id: str, original_filenames: list[str]
):
    """Async task: Combine images into a PDF."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_images.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Creating PDF from images..."})
        stats = images_to_pdf(input_paths, output_path)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        download_name = "images_combined.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "page_count": stats["page_count"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: Images→PDF completed — {stats['page_count']} pages")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Images→PDF error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Watermark PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.watermark_pdf_task")
def watermark_pdf_task(
    self, input_path: str, task_id: str, original_filename: str,
    watermark_text: str, opacity: float = 0.3,
):
    """Async task: Add watermark to a PDF."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_watermarked.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Adding watermark..."})
        stats = add_watermark(input_path, output_path, watermark_text=watermark_text, opacity=opacity)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_watermarked.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: Watermark added")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Watermark error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Protect PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.protect_pdf_task")
def protect_pdf_task(
    self, input_path: str, task_id: str, original_filename: str,
    password: str,
):
    """Async task: Add password protection to a PDF."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_protected.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Protecting PDF..."})
        stats = protect_pdf(input_path, output_path, password=password)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_protected.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: PDF protected")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Protect error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


# ---------------------------------------------------------------------------
# Unlock PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_tools_tasks.unlock_pdf_task")
def unlock_pdf_task(
    self, input_path: str, task_id: str, original_filename: str,
    password: str,
):
    """Async task: Remove password from a PDF."""
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}_unlocked.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Unlocking PDF..."})
        stats = unlock_pdf(input_path, output_path, password=password)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_unlocked.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "total_pages": stats["total_pages"],
            "output_size": stats["output_size"],
        }

        _cleanup(task_id)
        logger.info(f"Task {task_id}: PDF unlocked")
        return result

    except PDFToolsError as e:
        logger.error(f"Task {task_id}: Unlock error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}
