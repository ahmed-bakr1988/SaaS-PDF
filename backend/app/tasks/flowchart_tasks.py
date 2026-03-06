"""Celery tasks for PDF-to-Flowchart extraction and generation."""
import os
import json
import logging

from app.extensions import celery
from app.services.flowchart_service import extract_and_generate, FlowchartError
from app.services.storage_service import storage
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


@celery.task(bind=True, name="app.tasks.flowchart_tasks.extract_flowchart_task")
def extract_flowchart_task(
    self, input_path: str, task_id: str, original_filename: str
):
    """
    Async task: Extract procedures from PDF and generate flowcharts.

    Returns a JSON result containing procedures and their flowcharts.
    """
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)

    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": "Extracting text from PDF..."},
        )

        result = extract_and_generate(input_path)

        self.update_state(
            state="PROCESSING",
            meta={"step": "Saving flowchart data..."},
        )

        # Save flowchart JSON to a file and upload
        output_path = os.path.join(output_dir, f"{task_id}_flowcharts.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        download_url = storage.generate_presigned_url(
            s3_key, original_filename="flowcharts.json"
        )

        final_result = {
            "status": "completed",
            "download_url": download_url,
            "filename": "flowcharts.json",
            "procedures": result["procedures"],
            "flowcharts": result["flowcharts"],
            "pages": result["pages"],
            "total_pages": result["total_pages"],
            "procedures_count": len(result["procedures"]),
        }

        _cleanup(task_id)
        logger.info(
            f"Task {task_id}: Flowchart extraction completed — "
            f"{len(result['procedures'])} procedures, "
            f"{result['total_pages']} pages"
        )
        return final_result

    except FlowchartError as e:
        logger.error(f"Task {task_id}: Flowchart error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}
