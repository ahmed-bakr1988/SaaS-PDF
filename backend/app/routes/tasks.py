"""Task status polling endpoint."""
from flask import Blueprint, jsonify
from celery.result import AsyncResult

from app.extensions import celery

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route("/<task_id>/status", methods=["GET"])
def get_task_status(task_id: str):
    """
    Get the status of an async task.

    Returns:
        JSON with task state and result (if completed)
    """
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

    elif result.state == "FAILURE":
        response["error"] = str(result.info) if result.info else "Task failed."

    return jsonify(response)
