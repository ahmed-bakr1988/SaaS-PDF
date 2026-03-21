"""Plan entitlements, actor resolution, and quota enforcement."""
from dataclasses import dataclass

from flask import current_app, request

from app.services.account_service import (
    count_usage_events,
    get_api_key_actor,
    get_user_by_id,
    get_current_period_month,
    has_task_access,
    normalize_plan,
    record_usage_event,
)
from app.utils.auth import get_current_user_id, logout_user_session
from app.utils.auth import has_session_task_access, remember_task_access
from app.utils.file_validator import validate_file

FREE_PLAN = "free"
PRO_PLAN = "pro"

FREE_WEB_MONTHLY_LIMIT = 50
PRO_WEB_MONTHLY_LIMIT = 500
PRO_API_MONTHLY_LIMIT = 1000

FREE_HISTORY_LIMIT = 25
PRO_HISTORY_LIMIT = 250

FREE_HOMEPAGE_LIMIT_MB = 50
PRO_HOMEPAGE_LIMIT_MB = 100


@dataclass(frozen=True)
class ActorContext:
    """Resolved access context for one incoming request."""

    source: str
    actor_type: str
    user_id: int | None
    plan: str
    api_key_id: int | None = None


class PolicyError(Exception):
    """A request failed access or quota policy validation."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def get_history_limit(plan: str) -> int:
    """Return the default history limit for one plan."""
    return PRO_HISTORY_LIMIT if normalize_plan(plan) == PRO_PLAN else FREE_HISTORY_LIMIT


def get_web_quota_limit(plan: str, actor_type: str) -> int | None:
    """Return the monthly accepted-task cap for one web actor."""
    if actor_type == "anonymous":
        return None
    return PRO_WEB_MONTHLY_LIMIT if normalize_plan(plan) == PRO_PLAN else FREE_WEB_MONTHLY_LIMIT


def get_api_quota_limit(plan: str) -> int | None:
    """Return the monthly accepted-task cap for one API actor."""
    return PRO_API_MONTHLY_LIMIT if normalize_plan(plan) == PRO_PLAN else None


def ads_enabled(plan: str, actor_type: str) -> bool:
    """Return whether ads should display for one actor."""
    return not (actor_type != "anonymous" and normalize_plan(plan) == PRO_PLAN)


def get_effective_file_size_limits_bytes(plan: str) -> dict[str, int]:
    """Return effective backend upload limits for one plan."""
    base_limits = current_app.config["FILE_SIZE_LIMITS"]
    if normalize_plan(plan) != PRO_PLAN:
        return dict(base_limits)
    return {key: value * 2 for key, value in base_limits.items()}


def get_effective_file_size_limits_mb(plan: str) -> dict[str, int]:
    """Return effective frontend-friendly upload limits for one plan."""
    byte_limits = get_effective_file_size_limits_bytes(plan)
    return {
        "pdf": byte_limits["pdf"] // (1024 * 1024),
        "word": byte_limits["docx"] // (1024 * 1024),
        "image": byte_limits["png"] // (1024 * 1024),
        "video": byte_limits["mp4"] // (1024 * 1024),
        "homepageSmartUpload": PRO_HOMEPAGE_LIMIT_MB
        if normalize_plan(plan) == PRO_PLAN
        else FREE_HOMEPAGE_LIMIT_MB,
    }


def get_usage_summary_for_user(user_id: int, plan: str) -> dict:
    """Return usage/quota summary for one authenticated user."""
    normalized_plan = normalize_plan(plan)
    current_period = get_current_period_month()
    web_used = count_usage_events(
        user_id, "web", event_type="accepted", period_month=current_period
    )
    api_used = count_usage_events(
        user_id, "api", event_type="accepted", period_month=current_period
    )

    return {
        "plan": normalized_plan,
        "period_month": current_period,
        "ads_enabled": ads_enabled(normalized_plan, "session"),
        "history_limit": get_history_limit(normalized_plan),
        "file_limits_mb": get_effective_file_size_limits_mb(normalized_plan),
        "web_quota": {
            "used": web_used,
            "limit": get_web_quota_limit(normalized_plan, "session"),
        },
        "api_quota": {
            "used": api_used,
            "limit": get_api_quota_limit(normalized_plan),
        },
    }


def resolve_web_actor() -> ActorContext:
    """Resolve the active web actor from session state."""
    user_id = get_current_user_id()
    if user_id is None:
        return ActorContext(source="web", actor_type="anonymous", user_id=None, plan=FREE_PLAN)

    user = get_user_by_id(user_id)
    if user is None:
        logout_user_session()
        return ActorContext(source="web", actor_type="anonymous", user_id=None, plan=FREE_PLAN)

    return ActorContext(
        source="web",
        actor_type="session",
        user_id=user["id"],
        plan=normalize_plan(user["plan"]),
    )


def resolve_api_actor() -> ActorContext:
    """Resolve the active B2B API actor from X-API-Key header."""
    raw_key = request.headers.get("X-API-Key", "").strip()
    if not raw_key:
        raise PolicyError("X-API-Key header is required.", 401)

    actor = get_api_key_actor(raw_key)
    if actor is None:
        raise PolicyError("Invalid or revoked API key.", 401)

    plan = normalize_plan(actor["plan"])
    if plan != PRO_PLAN:
        raise PolicyError("API access requires an active Pro plan.", 403)

    return ActorContext(
        source="api",
        actor_type="api_key",
        user_id=actor["user_id"],
        plan=plan,
        api_key_id=actor["api_key_id"],
    )


def validate_actor_file(file_storage, allowed_types: list[str], actor: ActorContext):
    """Validate one uploaded file with plan-aware size limits."""
    return validate_file(
        file_storage,
        allowed_types=allowed_types,
        size_limit_overrides=get_effective_file_size_limits_bytes(actor.plan),
    )


def assert_quota_available(actor: ActorContext):
    """Ensure an actor still has accepted-task quota for the current month."""
    if actor.user_id is None:
        return

    if actor.source == "web":
        limit = get_web_quota_limit(actor.plan, actor.actor_type)
        if limit is None:
            return
        used = count_usage_events(actor.user_id, "web", event_type="accepted")
        if used >= limit:
            if normalize_plan(actor.plan) == PRO_PLAN:
                raise PolicyError("Your monthly Pro web quota has been reached.", 429)
            raise PolicyError(
                "Your monthly free plan limit has been reached. Upgrade to Pro for higher limits.",
                429,
            )
        return

    limit = get_api_quota_limit(actor.plan)
    if limit is None:
        raise PolicyError("API access requires an active Pro plan.", 403)

    used = count_usage_events(actor.user_id, "api", event_type="accepted")
    if used >= limit:
        raise PolicyError("Your monthly API quota has been reached.", 429)


def record_accepted_usage(actor: ActorContext, tool: str, celery_task_id: str):
    """Record one accepted usage event after task dispatch succeeds."""
    if actor.source == "web":
        remember_task_access(celery_task_id)

    record_usage_event(
        user_id=actor.user_id,
        source=actor.source,
        tool=tool,
        task_id=celery_task_id,
        event_type="accepted",
        api_key_id=actor.api_key_id,
    )


def build_task_tracking_kwargs(actor: ActorContext) -> dict:
    """Return Celery kwargs required for task-side tracking."""
    return {
        "user_id": actor.user_id,
        "usage_source": actor.source,
        "api_key_id": actor.api_key_id,
    }


def assert_api_task_access(actor: ActorContext, task_id: str):
    """Ensure one API actor can poll one task id."""
    if actor.user_id is None or not has_task_access(actor.user_id, "api", task_id):
        raise PolicyError("Task not found.", 404)


def assert_web_task_access(actor: ActorContext, task_id: str):
    """Ensure one web browser session can access one task id."""
    if actor.user_id is not None and has_task_access(actor.user_id, "web", task_id):
        return

    if has_session_task_access(task_id):
        return

    raise PolicyError("Task not found.", 404)
