"""Credit window management — rolling 30-day balance for registered users.

Handles lazy window creation on first use, automatic reset after expiry,
balance queries, and atomic credit deduction.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

from app.services.credit_config import (
    CREDIT_WINDOW_DAYS,
    get_credits_for_plan,
    get_tool_credit_cost,
)
from app.utils.database import (
    db_connection,
    execute_query,
    is_postgres,
    row_to_dict,
)

logger = logging.getLogger(__name__)

# ── Redis caching (optional) ───────────────────────────────────
_BALANCE_CACHE_TTL = int(os.getenv("CREDIT_BALANCE_CACHE_TTL", "300"))  # 5 min


def _get_redis():
    try:
        import redis

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return redis.Redis.from_url(redis_url, decode_responses=True)
    except Exception:
        return None


def _balance_cache_key(user_id: int) -> str:
    return f"credit_balance:{user_id}"


def _invalidate_balance_cache(user_id: int) -> None:
    r = _get_redis()
    if r:
        try:
            r.delete(_balance_cache_key(user_id))
        except Exception:
            pass


def _cache_balance(user_id: int, balance: int) -> None:
    r = _get_redis()
    if r:
        try:
            r.setex(_balance_cache_key(user_id), _BALANCE_CACHE_TTL, str(balance))
        except Exception:
            pass


def _get_cached_balance(user_id: int) -> int | None:
    r = _get_redis()
    if r is None:
        return None
    try:
        val = r.get(_balance_cache_key(user_id))
        return int(str(val)) if val is not None else None
    except Exception:
        return None


# ── Window helpers ──────────────────────────────────────────────

def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_now_dt() -> datetime:
    return datetime.now(timezone.utc)


def _make_window_end(start_iso: str) -> str:
    start = datetime.fromisoformat(start_iso)
    end = start + timedelta(days=CREDIT_WINDOW_DAYS)
    return end.isoformat()


def _is_window_expired(window_end_at: str) -> bool:
    end = datetime.fromisoformat(window_end_at)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return _utc_now_dt() >= end


def _get_window(conn, user_id: int) -> dict | None:
    sql = (
        "SELECT * FROM user_credit_windows WHERE user_id = %s"
        if is_postgres()
        else "SELECT * FROM user_credit_windows WHERE user_id = ?"
    )
    cursor = execute_query(conn, sql, (user_id,))
    row = cursor.fetchone()
    return row_to_dict(row)


def _create_window(conn, user_id: int, plan: str) -> dict:
    now = _utc_now()
    credits = get_credits_for_plan(plan)
    end = _make_window_end(now)

    sql = (
        """
        INSERT INTO user_credit_windows
            (user_id, window_start_at, window_end_at, credits_allocated, credits_used, plan, updated_at)
        VALUES (%s, %s, %s, %s, 0, %s, %s)
        ON CONFLICT (user_id) DO UPDATE SET
            window_start_at = EXCLUDED.window_start_at,
            window_end_at = EXCLUDED.window_end_at,
            credits_allocated = EXCLUDED.credits_allocated,
            credits_used = 0,
            plan = EXCLUDED.plan,
            updated_at = EXCLUDED.updated_at
        """
        if is_postgres()
        else """
        INSERT OR REPLACE INTO user_credit_windows
            (user_id, window_start_at, window_end_at, credits_allocated, credits_used, plan, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
        """
    )
    execute_query(conn, sql, (user_id, now, end, credits, plan, now))

    return {
        "user_id": user_id,
        "window_start_at": now,
        "window_end_at": end,
        "credits_allocated": credits,
        "credits_used": 0,
        "plan": plan,
        "updated_at": now,
    }


def _reset_window(conn, user_id: int, plan: str) -> dict:
    """Reset an expired window — starts a fresh 30-day period."""
    return _create_window(conn, user_id, plan)


# ── Public API ──────────────────────────────────────────────────

def get_or_create_credit_window(user_id: int, plan: str) -> dict:
    """Return the active credit window, creating or resetting as needed.

    This is the lazy initialization entrypoint:
    - First call after registration creates the window.
    - First call after window expiry resets it with a fresh allocation.
    - Plan upgrades (free→pro) are reflected on the next reset.
    """
    with db_connection() as conn:
        window = _get_window(conn, user_id)

        if window is None:
            window = _create_window(conn, user_id, plan)
            logger.info("Created credit window for user %d (plan=%s)", user_id, plan)
            return window

        if _is_window_expired(window["window_end_at"]):
            window = _reset_window(conn, user_id, plan)
            _invalidate_balance_cache(user_id)
            logger.info("Reset expired credit window for user %d (plan=%s)", user_id, plan)
            return window

        # If plan changed mid-window, update allocation (pro upgrade benefit)
        expected_credits = get_credits_for_plan(plan)
        if window["plan"] != plan and expected_credits > window["credits_allocated"]:
            additional = expected_credits - window["credits_allocated"]
            sql = (
                """
                UPDATE user_credit_windows
                SET credits_allocated = credits_allocated + %s, plan = %s, updated_at = %s
                WHERE user_id = %s
                """
                if is_postgres()
                else """
                UPDATE user_credit_windows
                SET credits_allocated = credits_allocated + ?, plan = ?, updated_at = ?
                WHERE user_id = ?
                """
            )
            execute_query(conn, sql, (additional, plan, _utc_now(), user_id))
            window["credits_allocated"] += additional
            window["plan"] = plan
            _invalidate_balance_cache(user_id)
            logger.info(
                "Upgraded credit window for user %d: +%d credits (plan=%s)",
                user_id,
                additional,
                plan,
            )

        return window


def get_rolling_balance(user_id: int, plan: str) -> int:
    """Return remaining credits for the current window."""
    cached = _get_cached_balance(user_id)
    if cached is not None:
        return cached

    window = get_or_create_credit_window(user_id, plan)
    balance = max(0, window["credits_allocated"] - window["credits_used"])
    _cache_balance(user_id, balance)
    return balance


def deduct_credits(user_id: int, plan: str, tool: str) -> int:
    """Deduct tool credits from the user's window. Returns the cost deducted.

    Raises ValueError if insufficient credits.
    """
    cost = get_tool_credit_cost(tool)
    return deduct_credits_quoted(user_id, plan, cost)


def deduct_credits_quoted(user_id: int, plan: str, cost: int) -> int:
    """Deduct an explicit credit amount from the user's window.

    Used by the quote engine to deduct a pre-calculated (possibly dynamic)
    cost rather than looking up the fixed tier cost.
    Raises ValueError if insufficient credits.
    """
    with db_connection() as conn:
        window = _get_window(conn, user_id)
        if window is None or _is_window_expired(window.get("window_end_at", "")):
            pass
        window = get_or_create_credit_window(user_id, plan)

        balance = window["credits_allocated"] - window["credits_used"]
        if balance < cost:
            raise ValueError(
                f"Insufficient credits: {balance} remaining, {cost} required."
            )

        sql = (
            """
            UPDATE user_credit_windows
            SET credits_used = credits_used + %s, updated_at = %s
            WHERE user_id = %s
            """
            if is_postgres()
            else """
            UPDATE user_credit_windows
            SET credits_used = credits_used + ?, updated_at = ?
            WHERE user_id = ?
            """
        )
        execute_query(conn, sql, (cost, _utc_now(), user_id))

    _invalidate_balance_cache(user_id)
    return cost


def get_credit_summary(user_id: int, plan: str) -> dict:
    """Return a full credit summary for the account page."""
    window = get_or_create_credit_window(user_id, plan)
    balance = max(0, window["credits_allocated"] - window["credits_used"])
    return {
        "credits_allocated": window["credits_allocated"],
        "credits_used": window["credits_used"],
        "credits_remaining": balance,
        "window_start_at": window["window_start_at"],
        "window_end_at": window["window_end_at"],
        "plan": window["plan"],
        "window_days": CREDIT_WINDOW_DAYS,
    }
