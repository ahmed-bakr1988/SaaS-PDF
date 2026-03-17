"""Session helpers for authenticated routes."""
from flask import session

TASK_ACCESS_SESSION_KEY = "task_access_ids"
MAX_TRACKED_TASK_IDS = 200


def get_current_user_id() -> int | None:
    """Return the authenticated user id from session storage."""
    user_id = session.get("user_id")
    return user_id if isinstance(user_id, int) else None


def remember_task_access(task_id: str):
    """Persist one web task id in the active browser session."""
    tracked = session.get(TASK_ACCESS_SESSION_KEY, [])
    if not isinstance(tracked, list):
        tracked = []

    normalized = [value for value in tracked if isinstance(value, str) and value != task_id]
    normalized.append(task_id)
    session[TASK_ACCESS_SESSION_KEY] = normalized[-MAX_TRACKED_TASK_IDS:]


def has_session_task_access(task_id: str) -> bool:
    """Return whether the active browser session owns one web task id."""
    tracked = session.get(TASK_ACCESS_SESSION_KEY, [])
    return isinstance(tracked, list) and task_id in tracked


def login_user_session(user_id: int):
    """Persist the authenticated user in the Flask session."""
    tracked_task_ids = session.get(TASK_ACCESS_SESSION_KEY, [])
    session.clear()
    session.permanent = True
    session["user_id"] = user_id
    if isinstance(tracked_task_ids, list) and tracked_task_ids:
        session[TASK_ACCESS_SESSION_KEY] = tracked_task_ids[-MAX_TRACKED_TASK_IDS:]


def logout_user_session():
    """Clear the active Flask session."""
    session.clear()
