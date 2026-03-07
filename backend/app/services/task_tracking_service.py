"""Shared helpers for task completion tracking."""
from app.services.account_service import record_task_history, record_usage_event


def finalize_task_tracking(
    *,
    user_id: int | None,
    tool: str,
    original_filename: str | None,
    result: dict,
    usage_source: str,
    api_key_id: int | None,
    celery_task_id: str | None,
):
    """Persist task history and usage lifecycle events."""
    record_task_history(user_id, tool, original_filename, result)

    if user_id is None or not celery_task_id:
        return

    event_type = "completed" if result.get("status") == "completed" else "failed"
    record_usage_event(
        user_id=user_id,
        source=usage_source,
        tool=tool,
        task_id=celery_task_id,
        event_type=event_type,
        api_key_id=api_key_id,
    )
