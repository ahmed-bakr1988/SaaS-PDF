"""Session helpers for authenticated routes."""
from flask import session


def get_current_user_id() -> int | None:
    """Return the authenticated user id from session storage."""
    user_id = session.get("user_id")
    return user_id if isinstance(user_id, int) else None


def login_user_session(user_id: int):
    """Persist the authenticated user in the Flask session."""
    session.clear()
    session.permanent = True
    session["user_id"] = user_id


def logout_user_session():
    """Clear the active Flask session."""
    session.clear()
