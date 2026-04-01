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
from app.services.credit_config import (
    get_tool_credit_cost,
    get_credits_for_plan,
    get_all_tool_costs,
    GUEST_DEMO_BUDGET,
    GUEST_DEMO_TTL_HOURS,
    PRO_API_CREDITS_PER_WINDOW,
)
from app.services.credit_service import (
    deduct_credits,
    get_credit_summary,
    get_rolling_balance,
)
from app.services.guest_budget_service import (
    assert_guest_budget_available,
    record_guest_usage,
)
from app.utils.auth import get_current_user_id, logout_user_session
from app.utils.auth import has_session_task_access, remember_task_access
from app.utils.file_validator import validate_file

FREE_PLAN = "free"
PRO_PLAN = "pro"

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
    """Return the credit allocation for one web actor's window."""
    if actor_type == "anonymous":
        return None
    return get_credits_for_plan(normalize_plan(plan))


def get_api_quota_limit(plan: str) -> int | None:
    """Return the credit allocation for one API actor's window."""
    return PRO_API_CREDITS_PER_WINDOW if normalize_plan(plan) == PRO_PLAN else None


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
    credit_info = get_credit_summary(user_id, normalized_plan)

    return {
        "plan": normalized_plan,
        "ads_enabled": ads_enabled(normalized_plan, "session"),
        "history_limit": get_history_limit(normalized_plan),
        "file_limits_mb": get_effective_file_size_limits_mb(normalized_plan),
        "credits": credit_info,
        "tool_costs": get_all_tool_costs(),
        # Legacy fields for backward compatibility
        "web_quota": {
            "used": credit_info["credits_used"],
            "limit": credit_info["credits_allocated"],
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


def assert_quota_available(actor: ActorContext, tool: str | None = None):
    """Ensure an actor still has credits for the requested tool.

    For registered users: checks rolling credit window balance.
    For anonymous users: checks guest demo budget.
    """
    if actor.user_id is None:
        # Guest demo budget enforcement
        try:
            assert_guest_budget_available()
        except ValueError:
            raise PolicyError(
                "You have used all your free demo tries. "
                "Create a free account to continue.",
                429,
            )
        return

    if actor.source == "web":
        # Credit-based check
        cost = get_tool_credit_cost(tool) if tool else 1
        balance = get_rolling_balance(actor.user_id, actor.plan)
        if balance < cost:
            if normalize_plan(actor.plan) == PRO_PLAN:
                raise PolicyError(
                    f"Your Pro credit balance is exhausted ({balance} remaining, "
                    f"{cost} required). Credits reset at the end of your 30-day window.",
                    429,
                )
            raise PolicyError(
                f"Your free credit balance is exhausted ({balance} remaining, "
                f"{cost} required). Upgrade to Pro for more credits.",
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
    """Record one accepted usage event and deduct credits after task dispatch."""
    if actor.source == "web":
        remember_task_access(celery_task_id)

    cost = get_tool_credit_cost(tool)

    # Deduct credits from the rolling window (registered users only)
    if actor.user_id is not None and actor.source == "web":
        try:
            deduct_credits(actor.user_id, actor.plan, tool)
        except ValueError:
            # Balance check should have caught this in assert_quota_available.
            # Log but don't block — the usage event is the source of truth.
            import logging
            logging.getLogger(__name__).warning(
                "Credit deduction failed for user %d tool %s (insufficient balance at record time)",
                actor.user_id,
                tool,
            )
    elif actor.user_id is None and actor.source == "web":
        # Record guest demo usage
        record_guest_usage()

    record_usage_event(
        user_id=actor.user_id,
        source=actor.source,
        tool=tool,
        task_id=celery_task_id,
        event_type="accepted",
        api_key_id=actor.api_key_id,
        cost_points=cost,
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
