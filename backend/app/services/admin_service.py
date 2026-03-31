"""Internal admin aggregation helpers for operational dashboards.

Supports both SQLite (development) and PostgreSQL (production).
"""

import json
import os
from datetime import datetime, timedelta, timezone

from flask import current_app

from app.services.account_service import is_allowlisted_admin_email, normalize_role
from app.services.ai_cost_service import get_monthly_spend
from app.services.contact_service import mark_read
from app.services.rating_service import get_global_rating_summary
from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict


def _parse_metadata(raw_value: str | None) -> dict:
    if not raw_value:
        return {}
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def get_admin_overview(limit_recent: int = 8, top_tools_limit: int = 6) -> dict:
    cutoff_24h = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    ai_cost_summary = get_monthly_spend()

    with db_connection() as conn:
        users_sql = """
            SELECT
                COUNT(*) AS total_users,
                COALESCE(SUM(CASE WHEN plan = 'pro' THEN 1 ELSE 0 END), 0) AS pro_users,
                COALESCE(SUM(CASE WHEN plan = 'free' THEN 1 ELSE 0 END), 0) AS free_users
            FROM users
        """
        cursor = execute_query(conn, users_sql)
        users_row = row_to_dict(cursor.fetchone())

        history_sql = (
            """
            SELECT
                COUNT(*) AS total_files_processed,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_files,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_files,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS files_last_24h
            FROM file_history
        """
            if is_postgres()
            else """
            SELECT
                COUNT(*) AS total_files_processed,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_files,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_files,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS files_last_24h
            FROM file_history
        """
        )
        cursor2 = execute_query(conn, history_sql, (cutoff_24h,))
        history_row = row_to_dict(cursor2.fetchone())

        top_tools_sql = (
            """
            SELECT
                tool,
                COUNT(*) AS total_runs,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_runs
            FROM file_history
            GROUP BY tool
            ORDER BY total_runs DESC, tool ASC
            LIMIT %s
        """
            if is_postgres()
            else """
            SELECT
                tool,
                COUNT(*) AS total_runs,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_runs
            FROM file_history
            GROUP BY tool
            ORDER BY total_runs DESC, tool ASC
            LIMIT ?
        """
        )
        cursor3 = execute_query(conn, top_tools_sql, (top_tools_limit,))
        top_tools_rows = [row_to_dict(r) for r in cursor3.fetchall()]

        failure_sql = (
            """
            SELECT
                file_history.id,
                file_history.user_id,
                file_history.tool,
                file_history.original_filename,
                file_history.metadata_json,
                file_history.created_at,
                users.email
            FROM file_history
            LEFT JOIN users ON users.id = file_history.user_id
            WHERE file_history.status = 'failed'
            ORDER BY file_history.created_at DESC
            LIMIT %s
        """
            if is_postgres()
            else """
            SELECT
                file_history.id,
                file_history.user_id,
                file_history.tool,
                file_history.original_filename,
                file_history.metadata_json,
                file_history.created_at,
                users.email
            FROM file_history
            LEFT JOIN users ON users.id = file_history.user_id
            WHERE file_history.status = 'failed'
            ORDER BY file_history.created_at DESC
            LIMIT ?
        """
        )
        cursor4 = execute_query(conn, failure_sql, (limit_recent,))
        failure_rows = [row_to_dict(r) for r in cursor4.fetchall()]

        recent_user_sql = (
            """
            SELECT
                users.id,
                users.email,
                users.plan,
                users.created_at,
                COALESCE((SELECT COUNT(*) FROM file_history WHERE file_history.user_id = users.id), 0) AS total_tasks,
                COALESCE((SELECT COUNT(*) FROM api_keys WHERE api_keys.user_id = users.id AND api_keys.revoked_at IS NULL), 0) AS active_api_keys
            FROM users
            ORDER BY users.created_at DESC
            LIMIT %s
        """
            if is_postgres()
            else """
            SELECT
                users.id,
                users.email,
                users.plan,
                users.created_at,
                COALESCE((SELECT COUNT(*) FROM file_history WHERE file_history.user_id = users.id), 0) AS total_tasks,
                COALESCE((SELECT COUNT(*) FROM api_keys WHERE api_keys.user_id = users.id AND api_keys.revoked_at IS NULL), 0) AS active_api_keys
            FROM users
            ORDER BY users.created_at DESC
            LIMIT ?
        """
        )
        cursor5 = execute_query(conn, recent_user_sql, (limit_recent,))
        recent_user_rows = [row_to_dict(r) for r in cursor5.fetchall()]

        contact_sql = (
            """
            SELECT
                COUNT(*) AS total_messages,
                COALESCE(SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END), 0) AS unread_messages
            FROM contact_messages
        """
            if is_postgres()
            else """
            SELECT
                COUNT(*) AS total_messages,
                COALESCE(SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_messages
            FROM contact_messages
        """
        )
        cursor6 = execute_query(conn, contact_sql)
        contact_row = row_to_dict(cursor6.fetchone())

        recent_contact_sql = (
            """
            SELECT id, name, email, category, subject, message, created_at, is_read
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT %s
        """
            if is_postgres()
            else """
            SELECT id, name, email, category, subject, message, created_at, is_read
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT ?
        """
        )
        cursor7 = execute_query(conn, recent_contact_sql, (limit_recent,))
        recent_contact_rows = [row_to_dict(r) for r in cursor7.fetchall()]

    total_processed = int(history_row["total_files_processed"]) if history_row else 0
    completed_files = int(history_row["completed_files"]) if history_row else 0
    success_rate = (
        round((completed_files / total_processed) * 100, 1) if total_processed else 0.0
    )

    return {
        "users": {
            "total": int(users_row["total_users"]) if users_row else 0,
            "pro": int(users_row["pro_users"]) if users_row else 0,
            "free": int(users_row["free_users"]) if users_row else 0,
        },
        "processing": {
            "total_files_processed": total_processed,
            "completed_files": completed_files,
            "failed_files": int(history_row["failed_files"]) if history_row else 0,
            "files_last_24h": int(history_row["files_last_24h"]) if history_row else 0,
            "success_rate": success_rate,
        },
        "ratings": get_global_rating_summary(),
        "ai_cost": {
            "month": ai_cost_summary["period"],
            "total_usd": ai_cost_summary["total_cost_usd"],
            "budget_usd": ai_cost_summary["budget_usd"],
            "percent_used": ai_cost_summary["budget_used_percent"],
        },
        "contacts": {
            "total_messages": int(contact_row["total_messages"]) if contact_row else 0,
            "unread_messages": int(contact_row["unread_messages"])
            if contact_row
            else 0,
            "recent": [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "email": row["email"],
                    "category": row["category"],
                    "subject": row["subject"],
                    "message": row["message"],
                    "created_at": row["created_at"],
                    "is_read": bool(row["is_read"]),
                }
                for row in recent_contact_rows
            ],
        },
        "top_tools": [
            {
                "tool": row["tool"],
                "total_runs": int(row["total_runs"]),
                "failed_runs": int(row["failed_runs"]),
            }
            for row in top_tools_rows
        ],
        "recent_failures": [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "email": row["email"],
                "tool": row["tool"],
                "original_filename": row["original_filename"],
                "created_at": row["created_at"],
                "metadata": _parse_metadata(row["metadata_json"]),
            }
            for row in failure_rows
        ],
        "recent_users": [
            {
                "id": row["id"],
                "email": row["email"],
                "plan": row["plan"],
                "created_at": row["created_at"],
                "total_tasks": int(row["total_tasks"]),
                "active_api_keys": int(row["active_api_keys"]),
            }
            for row in recent_user_rows
        ],
    }


def list_admin_users(limit: int = 25, query: str = "") -> list[dict]:
    normalized_query = query.strip().lower()
    sql = """
        SELECT
            users.id,
            users.email,
            users.plan,
            users.role,
            users.created_at,
            COALESCE((SELECT COUNT(*) FROM file_history WHERE file_history.user_id = users.id), 0) AS total_tasks,
            COALESCE((SELECT COUNT(*) FROM file_history WHERE file_history.user_id = users.id AND file_history.status = 'completed'), 0) AS completed_tasks,
            COALESCE((SELECT COUNT(*) FROM file_history WHERE file_history.user_id = users.id AND file_history.status = 'failed'), 0) AS failed_tasks,
            COALESCE((SELECT COUNT(*) FROM api_keys WHERE api_keys.user_id = users.id AND api_keys.revoked_at IS NULL), 0) AS active_api_keys
        FROM users
    """
    params: list[object] = []
    if normalized_query:
        sql += (
            " WHERE LOWER(users.email) LIKE %s"
            if is_postgres()
            else " WHERE LOWER(users.email) LIKE ?"
        )
        params.append(f"%{normalized_query}%")
    sql += (
        " ORDER BY users.created_at DESC LIMIT %s"
        if is_postgres()
        else " ORDER BY users.created_at DESC LIMIT ?"
    )
    params.append(limit)

    with db_connection() as conn:
        cursor = execute_query(conn, sql, tuple(params))
        rows = cursor.fetchall()
        rows = [row_to_dict(r) for r in rows]

    return [
        {
            "id": row["id"],
            "email": row["email"],
            "plan": row["plan"],
            "role": "admin"
            if is_allowlisted_admin_email(row["email"])
            else normalize_role(row["role"]),
            "is_allowlisted_admin": is_allowlisted_admin_email(row["email"]),
            "created_at": row["created_at"],
            "total_tasks": int(row["total_tasks"]),
            "completed_tasks": int(row["completed_tasks"]),
            "failed_tasks": int(row["failed_tasks"]),
            "active_api_keys": int(row["active_api_keys"]),
        }
        for row in rows
    ]


def list_admin_contacts(page: int = 1, per_page: int = 20) -> dict:
    safe_page = max(1, page)
    safe_per_page = max(1, min(per_page, 100))
    offset = (safe_page - 1) * safe_per_page

    with db_connection() as conn:
        total_sql = (
            "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END), 0) AS unread FROM contact_messages"
            if is_postgres()
            else "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END), 0) AS unread FROM contact_messages"
        )
        cursor = execute_query(conn, total_sql)
        total_row = row_to_dict(cursor.fetchone())

        rows_sql = (
            """
            SELECT id, name, email, category, subject, message, created_at, is_read
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
            if is_postgres()
            else """
            SELECT id, name, email, category, subject, message, created_at, is_read
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """
        )
        cursor2 = execute_query(conn, rows_sql, (safe_per_page, offset))
        rows = [row_to_dict(r) for r in cursor2.fetchall()]

    return {
        "items": [
            {
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "category": row["category"],
                "subject": row["subject"],
                "message": row["message"],
                "created_at": row["created_at"],
                "is_read": bool(row["is_read"]),
            }
            for row in rows
        ],
        "page": safe_page,
        "per_page": safe_per_page,
        "total": int(total_row["total"]) if total_row else 0,
        "unread": int(total_row["unread"]) if total_row else 0,
    }


def mark_admin_contact_read(message_id: int) -> bool:
    return mark_read(message_id)


def _ensure_plan_interest_table():
    """Create plan_interest_clicks table if it does not exist."""
    with db_connection() as conn:
        if is_postgres():
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS plan_interest_clicks (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    plan TEXT NOT NULL,
                    billing TEXT NOT NULL DEFAULT 'monthly',
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_plan_interest_created ON plan_interest_clicks(created_at)
            """)
        else:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS plan_interest_clicks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    plan TEXT NOT NULL,
                    billing TEXT NOT NULL DEFAULT 'monthly',
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_plan_interest_created ON plan_interest_clicks(created_at)"
            )


def record_plan_interest_click(
    user_id: int | None, plan: str, billing: str = "monthly"
) -> None:
    """Record a click on a pricing plan button."""
    _ensure_plan_interest_table()
    now = datetime.now(timezone.utc).isoformat()
    with db_connection() as conn:
        sql = (
            "INSERT INTO plan_interest_clicks (user_id, plan, billing, created_at) VALUES (%s, %s, %s, %s)"
            if is_postgres()
            else "INSERT INTO plan_interest_clicks (user_id, plan, billing, created_at) VALUES (?, ?, ?, ?)"
        )
        execute_query(conn, sql, (user_id, plan, billing, now))


def get_plan_interest_summary() -> dict:
    """Return summary of paid plan button clicks."""
    _ensure_plan_interest_table()
    cutoff_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    with db_connection() as conn:
        total_sql = (
            """
            SELECT
                COUNT(*) AS total_clicks,
                COUNT(DISTINCT user_id) AS unique_users,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS clicks_last_7d,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS clicks_last_30d
            FROM plan_interest_clicks
        """
            if is_postgres()
            else """
            SELECT
                COUNT(*) AS total_clicks,
                COUNT(DISTINCT user_id) AS unique_users,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS clicks_last_7d,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS clicks_last_30d
            FROM plan_interest_clicks
        """
        )
        cursor = execute_query(conn, total_sql, (cutoff_7d, cutoff_30d))
        total_row = row_to_dict(cursor.fetchone())

        by_plan_sql = """
            SELECT plan, billing, COUNT(*) AS clicks
            FROM plan_interest_clicks
            GROUP BY plan, billing
            ORDER BY clicks DESC
        """
        cursor2 = execute_query(conn, by_plan_sql)
        by_plan_rows = [row_to_dict(r) for r in cursor2.fetchall()]

        recent_sql = """
            SELECT
                plan_interest_clicks.id,
                plan_interest_clicks.user_id,
                plan_interest_clicks.plan,
                plan_interest_clicks.billing,
                plan_interest_clicks.created_at,
                users.email
            FROM plan_interest_clicks
            LEFT JOIN users ON users.id = plan_interest_clicks.user_id
            ORDER BY plan_interest_clicks.created_at DESC
            LIMIT 20
        """
        cursor3 = execute_query(conn, recent_sql)
        recent_rows = [row_to_dict(r) for r in cursor3.fetchall()]

    return {
        "total_clicks": int(total_row["total_clicks"]) if total_row else 0,
        "unique_users": int(total_row["unique_users"]) if total_row else 0,
        "clicks_last_7d": int(total_row["clicks_last_7d"]) if total_row else 0,
        "clicks_last_30d": int(total_row["clicks_last_30d"]) if total_row else 0,
        "by_plan": [
            {
                "plan": row["plan"],
                "billing": row["billing"],
                "clicks": int(row["clicks"]),
            }
            for row in by_plan_rows
        ],
        "recent": [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "email": row["email"],
                "plan": row["plan"],
                "billing": row["billing"],
                "created_at": row["created_at"],
            }
            for row in recent_rows
        ],
    }


def get_admin_ratings_detail(
    page: int = 1, per_page: int = 20, tool_filter: str = ""
) -> dict:
    """Return detailed ratings list with feedback for the admin dashboard."""
    safe_page = max(1, page)
    safe_per_page = max(1, min(per_page, 100))
    offset = (safe_page - 1) * safe_per_page

    with db_connection() as conn:
        count_sql = "SELECT COUNT(*) AS total FROM tool_ratings"
        count_params: list[object] = []
        if tool_filter:
            count_sql += " WHERE tool = %s" if is_postgres() else " WHERE tool = ?"
            count_params.append(tool_filter)

        cursor = execute_query(conn, count_sql, tuple(count_params))
        total_row = row_to_dict(cursor.fetchone())

        sql = """
            SELECT id, tool, rating, feedback, tag, fingerprint, created_at
            FROM tool_ratings
        """
        params: list[object] = []
        if tool_filter:
            sql += " WHERE tool = %s" if is_postgres() else " WHERE tool = ?"
            params.append(tool_filter)
        sql += (
            " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            if is_postgres()
            else " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        params.extend([safe_per_page, offset])

        cursor2 = execute_query(conn, sql, tuple(params))
        rows = [row_to_dict(r) for r in cursor2.fetchall()]

        summary_sql = """
            SELECT
                tool,
                COUNT(*) AS count,
                COALESCE(AVG(rating), 0) AS average,
                COALESCE(SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END), 0) AS positive,
                COALESCE(SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END), 0) AS negative
            FROM tool_ratings
            GROUP BY tool
            ORDER BY count DESC
        """
        cursor3 = execute_query(conn, summary_sql)
        summary_rows = [row_to_dict(r) for r in cursor3.fetchall()]

    return {
        "items": [
            {
                "id": row["id"],
                "tool": row["tool"],
                "rating": int(row["rating"]),
                "feedback": row["feedback"] or "",
                "tag": row["tag"] or "",
                "created_at": row["created_at"],
            }
            for row in rows
        ],
        "page": safe_page,
        "per_page": safe_per_page,
        "total": int(total_row["total"]) if total_row else 0,
        "tool_summaries": [
            {
                "tool": row["tool"],
                "count": int(row["count"]),
                "average": round(row["average"], 1),
                "positive": int(row["positive"]),
                "negative": int(row["negative"]),
            }
            for row in summary_rows
        ],
    }


def get_admin_tool_analytics() -> dict:
    """Return detailed per-tool usage analytics for the admin dashboard."""
    cutoff_24h = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    cutoff_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    with db_connection() as conn:
        tool_sql = (
            """
            SELECT
                tool,
                COUNT(*) AS total_runs,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS runs_24h,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS runs_7d,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS runs_30d,
                COUNT(DISTINCT user_id) AS unique_users
            FROM file_history
            GROUP BY tool
            ORDER BY total_runs DESC
        """
            if is_postgres()
            else """
            SELECT
                tool,
                COUNT(*) AS total_runs,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS runs_24h,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS runs_7d,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS runs_30d,
                COUNT(DISTINCT user_id) AS unique_users
            FROM file_history
            GROUP BY tool
            ORDER BY total_runs DESC
        """
        )
        cursor = execute_query(conn, tool_sql, (cutoff_24h, cutoff_7d, cutoff_30d))
        tool_rows = [row_to_dict(r) for r in cursor.fetchall()]

        daily_sql = (
            """
            SELECT
                created_at::date AS day,
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
            FROM file_history
            WHERE created_at >= %s
            GROUP BY created_at::date
            ORDER BY day ASC
        """
            if is_postgres()
            else """
            SELECT
                DATE(created_at) AS day,
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
            FROM file_history
            WHERE created_at >= ?
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """
        )
        cursor2 = execute_query(conn, daily_sql, (cutoff_30d,))
        daily_rows = [row_to_dict(r) for r in cursor2.fetchall()]

        error_sql = (
            """
            SELECT
                tool,
                metadata_json,
                COUNT(*) AS occurrences
            FROM file_history
            WHERE status = 'failed' AND created_at >= %s
            GROUP BY tool, metadata_json
            ORDER BY occurrences DESC
            LIMIT 15
        """
            if is_postgres()
            else """
            SELECT
                tool,
                metadata_json,
                COUNT(*) AS occurrences
            FROM file_history
            WHERE status = 'failed' AND created_at >= ?
            GROUP BY tool, metadata_json
            ORDER BY occurrences DESC
            LIMIT 15
        """
        )
        cursor3 = execute_query(conn, error_sql, (cutoff_30d,))
        error_rows = [row_to_dict(r) for r in cursor3.fetchall()]

    return {
        "tools": [
            {
                "tool": row["tool"],
                "total_runs": int(row["total_runs"]),
                "completed": int(row["completed"]),
                "failed": int(row["failed"]),
                "success_rate": round(
                    (int(row["completed"]) / int(row["total_runs"])) * 100, 1
                )
                if int(row["total_runs"]) > 0
                else 0,
                "runs_24h": int(row["runs_24h"]),
                "runs_7d": int(row["runs_7d"]),
                "runs_30d": int(row["runs_30d"]),
                "unique_users": int(row["unique_users"]),
            }
            for row in tool_rows
        ],
        "daily_usage": [
            {
                "day": str(row["day"]),
                "total": int(row["total"]),
                "completed": int(row["completed"]),
                "failed": int(row["failed"]),
            }
            for row in daily_rows
        ],
        "common_errors": [
            {
                "tool": row["tool"],
                "error": _parse_metadata(row["metadata_json"]).get(
                    "error", "Unknown error"
                ),
                "occurrences": int(row["occurrences"]),
            }
            for row in error_rows
        ],
    }


def get_admin_user_registration_stats() -> dict:
    """Return user registration trends and breakdown."""
    cutoff_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    with db_connection() as conn:
        totals_sql = (
            """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS last_7d,
                COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS last_30d,
                COALESCE(SUM(CASE WHEN plan = 'pro' THEN 1 ELSE 0 END), 0) AS pro_count,
                COALESCE(SUM(CASE WHEN plan = 'free' THEN 1 ELSE 0 END), 0) AS free_count
            FROM users
        """
            if is_postgres()
            else """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS last_7d,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS last_30d,
                COALESCE(SUM(CASE WHEN plan = 'pro' THEN 1 ELSE 0 END), 0) AS pro_count,
                COALESCE(SUM(CASE WHEN plan = 'free' THEN 1 ELSE 0 END), 0) AS free_count
            FROM users
        """
        )
        cursor = execute_query(conn, totals_sql, (cutoff_7d, cutoff_30d))
        totals_row = row_to_dict(cursor.fetchone())

        daily_sql = (
            """
            SELECT created_at::date AS day, COUNT(*) AS registrations
            FROM users
            WHERE created_at >= %s
            GROUP BY created_at::date
            ORDER BY day ASC
        """
            if is_postgres()
            else """
            SELECT DATE(created_at) AS day, COUNT(*) AS registrations
            FROM users
            WHERE created_at >= ?
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """
        )
        cursor2 = execute_query(conn, daily_sql, (cutoff_30d,))
        daily_rows = [row_to_dict(r) for r in cursor2.fetchall()]

        active_sql = """
            SELECT
                users.id,
                users.email,
                users.plan,
                users.created_at,
                COUNT(file_history.id) AS total_tasks
            FROM users
            JOIN file_history ON file_history.user_id = users.id
            GROUP BY users.id
            ORDER BY total_tasks DESC
            LIMIT 10
        """
        cursor3 = execute_query(conn, active_sql)
        active_rows = [row_to_dict(r) for r in cursor3.fetchall()]

    return {
        "total_users": int(totals_row["total"]) if totals_row else 0,
        "new_last_7d": int(totals_row["last_7d"]) if totals_row else 0,
        "new_last_30d": int(totals_row["last_30d"]) if totals_row else 0,
        "pro_users": int(totals_row["pro_count"]) if totals_row else 0,
        "free_users": int(totals_row["free_count"]) if totals_row else 0,
        "daily_registrations": [
            {"day": str(row["day"]), "count": int(row["registrations"])}
            for row in daily_rows
        ],
        "most_active_users": [
            {
                "id": row["id"],
                "email": row["email"],
                "plan": row["plan"],
                "created_at": row["created_at"],
                "total_tasks": int(row["total_tasks"]),
            }
            for row in active_rows
        ],
    }


def get_admin_system_health() -> dict:
    """Return system health indicators for the admin dashboard."""
    from app.services.openrouter_config_service import get_openrouter_settings

    ai_cost_summary = get_monthly_spend()
    settings = get_openrouter_settings()

    with db_connection() as conn:
        cutoff_1h = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        error_sql = (
            """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
            FROM file_history
            WHERE created_at >= %s
        """
            if is_postgres()
            else """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
            FROM file_history
            WHERE created_at >= ?
        """
        )
        cursor = execute_query(conn, error_sql, (cutoff_1h,))
        error_row = row_to_dict(cursor.fetchone())

        db_size_mb = 0
        if not is_postgres():
            db_path = current_app.config.get("DATABASE_PATH", "")
            if db_path and os.path.exists(db_path):
                db_size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2)

    error_total = int(error_row["total"]) if error_row else 0
    error_failed = int(error_row["failed"]) if error_row else 0

    return {
        "ai_configured": bool(settings.api_key),
        "ai_model": settings.model,
        "ai_budget_used_percent": ai_cost_summary["budget_used_percent"],
        "error_rate_1h": round((error_failed / error_total) * 100, 1)
        if error_total > 0
        else 0,
        "tasks_last_1h": error_total,
        "failures_last_1h": error_failed,
        "database_size_mb": db_size_mb,
        "database_type": "postgresql" if is_postgres() else "sqlite",
    }
