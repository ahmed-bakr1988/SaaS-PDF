"""Task status polling endpoint."""
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request
from celery.result import AsyncResult

from app.extensions import celery
from app.middleware.rate_limiter import limiter
from app.services.account_service import has_task_access, record_usage_event
from app.services.policy_service import (
    PolicyError,
    assert_api_task_access,
    assert_web_task_access,
    resolve_api_actor,
    resolve_web_actor,
)
from app.utils.auth import remember_task_access

tasks_bp = Blueprint("tasks", __name__)


def _extract_download_task_id(download_url: str | None) -> str | None:
    """Return the local download identifier embedded in one download URL."""
    if not download_url:
        return None

    path_parts = [part for part in urlparse(download_url).path.split("/") if part]
    if len(path_parts) >= 4 and path_parts[0] == "api" and path_parts[1] == "download":
        return path_parts[2]

    return None


def _remember_download_alias(actor, download_task_id: str | None):
    """Grant access to one local download identifier returned after task success."""
    if not download_task_id:
        return

    remember_task_access(download_task_id)

    if actor.user_id is None:
        return

    if has_task_access(actor.user_id, actor.source, download_task_id):
        return

    record_usage_event(
        user_id=actor.user_id,
        api_key_id=actor.api_key_id,
        source=actor.source,
        tool="download",
        task_id=download_task_id,
        event_type="download_alias",
    )


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
        _remember_download_alias(actor, _extract_download_task_id(task_result.get("download_url")))
        response["result"] = task_result

    elif result.state == "FAILURE":
        response["error"] = str(result.info) if result.info else "Task failed."

    return jsonify(response)
