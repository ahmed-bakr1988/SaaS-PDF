"""Celery tasks for PDF-to-Flowchart extraction and generation."""
import os
import json
import logging

from flask import current_app

from app.extensions import celery
from app.services.flowchart_service import extract_and_generate, FlowchartError
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


def _get_output_dir(task_id: str) -> str:
    """Resolve output directory from app config."""
    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _finalize_task(
    task_id: str,
    user_id: int | None,
    tool: str,
    original_filename: str | None,
    result: dict,
    usage_source: str,
    api_key_id: int | None,
    celery_task_id: str | None,
):
    """Persist optional history and cleanup task files."""
    finalize_task_tracking(
        user_id=user_id,
        tool=tool,
        original_filename=original_filename,
        result=result,
        usage_source=usage_source,
        api_key_id=api_key_id,
        celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result


def _build_sample_result() -> dict:
    """Return deterministic sample flowchart data for demo mode."""
    pages = [
        {
            "page": 1,
            "text": (
                "Employee Onboarding Procedure\n"
                "1. Create employee profile in HR system.\n"
                "2. Verify documents and eligibility.\n"
                "3. Assign department and manager.\n"
                "4. Send welcome package and access credentials.\n"
                "5. Confirm first-day orientation schedule."
            ),
        }
    ]

    procedures = [
        {
            "id": "sample-proc-1",
            "title": "Employee Onboarding Procedure",
            "description": "Create profile, verify docs, assign team, and confirm orientation.",
            "pages": [1],
            "step_count": 5,
        }
    ]

    flowcharts = [
        {
            "id": "flow-sample-proc-1",
            "procedureId": "sample-proc-1",
            "title": "Employee Onboarding Procedure",
            "steps": [
                {
                    "id": "1",
                    "type": "start",
                    "title": "Begin: Employee Onboarding",
                    "description": "Start of onboarding process",
                    "connections": ["2"],
                },
                {
                    "id": "2",
                    "type": "process",
                    "title": "Create Employee Profile",
                    "description": "Register employee in HR system",
                    "connections": ["3"],
                },
                {
                    "id": "3",
                    "type": "decision",
                    "title": "Documents Verified?",
                    "description": "Check eligibility and required documents",
                    "connections": ["4"],
                },
                {
                    "id": "4",
                    "type": "process",
                    "title": "Assign Team and Access",
                    "description": "Assign manager, department, and credentials",
                    "connections": ["5"],
                },
                {
                    "id": "5",
                    "type": "end",
                    "title": "Onboarding Complete",
                    "description": "Employee is ready for orientation",
                    "connections": [],
                },
            ],
        }
    ]

    return {
        "procedures": procedures,
        "flowcharts": flowcharts,
        "pages": pages,
        "total_pages": len(pages),
    }


@celery.task(bind=True, name="app.tasks.flowchart_tasks.extract_flowchart_task")
def extract_flowchart_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """
    Async task: Extract procedures from PDF and generate flowcharts.

    Returns a JSON result containing procedures and their flowcharts.
    """
    output_dir = _get_output_dir(task_id)

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

        logger.info(
            f"Task {task_id}: Flowchart extraction completed — "
            f"{len(result['procedures'])} procedures, "
            f"{result['total_pages']} pages"
        )
        return _finalize_task(
            task_id,
            user_id,
            "pdf-flowchart",
            original_filename,
            final_result,
            usage_source,
            api_key_id,
            self.request.id,
        )

    except FlowchartError as e:
        logger.error(f"Task {task_id}: Flowchart error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            "pdf-flowchart",
            original_filename,
            {"status": "failed", "error": str(e)},
            usage_source,
            api_key_id,
            self.request.id,
        )
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            "pdf-flowchart",
            original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source,
            api_key_id,
            self.request.id,
        )


@celery.task(bind=True, name="app.tasks.flowchart_tasks.extract_sample_flowchart_task")
def extract_sample_flowchart_task(
    self,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """
    Async task: Build a sample flowchart payload without requiring file upload.
    """
    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": "Preparing sample flowchart..."},
        )

        result = _build_sample_result()
        final_result = {
            "status": "completed",
            "filename": "sample_flowcharts.json",
            "procedures": result["procedures"],
            "flowcharts": result["flowcharts"],
            "pages": result["pages"],
            "total_pages": result["total_pages"],
            "procedures_count": len(result["procedures"]),
        }

        finalize_task_tracking(
            user_id=user_id,
            tool="pdf-flowchart-sample",
            original_filename="sample-document.pdf",
            result=final_result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        logger.info("Sample flowchart task completed")
        return final_result

    except Exception as e:
        logger.error(f"Sample flowchart task failed — {e}")
        return {"status": "failed", "error": "An unexpected error occurred."}
