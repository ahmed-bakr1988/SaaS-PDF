"""Internal admin aggregation helpers for operational dashboards."""
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

from flask import current_app

from app.services.account_service import is_allowlisted_admin_email, normalize_role
from app.services.ai_cost_service import get_monthly_spend
from app.services.contact_service import mark_read
from app.services.rating_service import get_global_rating_summary


def _connect() -> sqlite3.Connection:
    db_path = current_app.config["DATABASE_PATH"]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


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

    with _connect() as conn:
        users_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_users,
                COALESCE(SUM(CASE WHEN plan = 'pro' THEN 1 ELSE 0 END), 0) AS pro_users,
                COALESCE(SUM(CASE WHEN plan = 'free' THEN 1 ELSE 0 END), 0) AS free_users
            FROM users
            """
        ).fetchone()

        history_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_files_processed,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_files,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_files,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS files_last_24h
            FROM file_history
            """,
            (cutoff_24h,),
        ).fetchone()

        top_tools_rows = conn.execute(
            """
            SELECT
                tool,
                COUNT(*) AS total_runs,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_runs
            FROM file_history
            GROUP BY tool
            ORDER BY total_runs DESC, tool ASC
            LIMIT ?
            """,
            (top_tools_limit,),
        ).fetchall()

        failure_rows = conn.execute(
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
            LIMIT ?
            """,
            (limit_recent,),
        ).fetchall()

        recent_user_rows = conn.execute(
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
            LIMIT ?
            """,
            (limit_recent,),
        ).fetchall()

        contact_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_messages,
                COALESCE(SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_messages
            FROM contact_messages
            """
        ).fetchone()

        recent_contact_rows = conn.execute(
            """
            SELECT id, name, email, category, subject, message, created_at, is_read
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit_recent,),
        ).fetchall()

    total_processed = int(history_row["total_files_processed"]) if history_row else 0
    completed_files = int(history_row["completed_files"]) if history_row else 0
    success_rate = round((completed_files / total_processed) * 100, 1) if total_processed else 0.0

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
            "unread_messages": int(contact_row["unread_messages"]) if contact_row else 0,
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
        sql += " WHERE LOWER(users.email) LIKE ?"
        params.append(f"%{normalized_query}%")
    sql += " ORDER BY users.created_at DESC LIMIT ?"
    params.append(limit)

    with _connect() as conn:
        rows = conn.execute(sql, tuple(params)).fetchall()

    return [
        {
            "id": row["id"],
            "email": row["email"],
            "plan": row["plan"],
            "role": "admin" if is_allowlisted_admin_email(row["email"]) else normalize_role(row["role"]),
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

    with _connect() as conn:
        total_row = conn.execute(
            "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END), 0) AS unread FROM contact_messages"
        ).fetchone()
        rows = conn.execute(
            """
            SELECT id, name, email, category, subject, message, created_at, is_read
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (safe_per_page, offset),
        ).fetchall()

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