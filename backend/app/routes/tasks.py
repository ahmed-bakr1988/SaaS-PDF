"""Task status polling endpoint."""
from flask import Blueprint, jsonify, request
from celery.result import AsyncResult

from app.extensions import celery
from app.middleware.rate_limiter import limiter
from app.services.policy_service import (
    PolicyError,
    assert_api_task_access,
    assert_web_task_access,
    resolve_api_actor,
    resolve_web_actor,
)
from app.utils.auth import remember_task_access

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route("/<task_id>/status", methods=["GET"])
@limiter.limit("300/minute", override_defaults=True)
def get_task_status(task_id: str):
    """
    Get the status of an async task.

    Returns:
        JSON with task state and result (if completed)
    """
    try:
        if request.headers.get("X-API-Key", "").strip():
            actor = resolve_api_actor()
            assert_api_task_access(actor, task_id)
        else:
            actor = resolve_web_actor()
            assert_web_task_access(actor, task_id)
    except PolicyError as exc:
        return jsonify({"error": exc.message}), exc.status_code

    result = AsyncResult(task_id, app=celery)

    response = {
        "task_id": task_id,
        "state": result.state,
    }

    if result.state == "PENDING":
        response["progress"] = "Task is waiting in queue..."

    elif result.state == "PROCESSING":
        meta = result.info or {}
        response["progress"] = meta.get("step", "Processing...")

    elif result.state == "SUCCESS":
        task_result = result.result or {}
        response["result"] = task_result

        # Remember the file UUID in the session so the download route can verify access.
        # The download URL contains a different UUID than the Celery task ID.
        download_url = task_result.get("download_url", "")
        if download_url:
            parts = download_url.split("/")
            # URL format: /api/download/<file_uuid>/<filename>
            if len(parts) >= 4:
                file_uuid = parts[3]
                if file_uuid != task_id:
                    remember_task_access(file_uuid)

    elif result.state == "FAILURE":
        response["error"] = str(result.info) if result.info else "Task failed."

    return jsonify(response)
