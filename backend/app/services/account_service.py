"""User accounts, API keys, history, and usage storage.

Supports both SQLite (development) and PostgreSQL (production)
via the app.utils.database abstraction layer.
"""

import hashlib
import json
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta

from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

from app.utils.database import (
    db_connection,
    execute_query,
    get_connection,
    get_integrity_error,
    get_last_insert_id,
    get_row_value,
    is_postgres,
    row_to_dict,
)

logger = logging.getLogger(__name__)

VALID_PLANS = {"free", "micro", "pro"}
VALID_ROLES = {"user", "admin"}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_current_period_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def normalize_plan(plan: str | None) -> str:
    if plan in ("pro", "micro"):
        return plan
    return "free"


def normalize_role(role: str | None) -> str:
    return "admin" if role == "admin" else "user"


def _get_allowlisted_admin_emails() -> set[str]:
    configured = current_app.config.get("INTERNAL_ADMIN_EMAILS", ())
    return {str(email).strip().lower() for email in configured if str(email).strip()}


def is_allowlisted_admin_email(email: str | None) -> bool:
    normalized_email = _normalize_email(email or "")
    return normalized_email in _get_allowlisted_admin_emails()


def _resolve_row_role(row: dict | None) -> str:
    if row is None:
        return "user"
    stored_role = normalize_role(row.get("role")) if "role" in row else "user"
    email = str(row.get("email", "")).strip().lower()
    if stored_role == "admin" or email in _get_allowlisted_admin_emails():
        return "admin"
    return "user"


def _serialize_user(row: dict | None) -> dict | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "plan": normalize_plan(row.get("plan")),
        "role": _resolve_row_role(row),
        "is_allowlisted_admin": is_allowlisted_admin_email(row.get("email")),
        "created_at": row.get("created_at"),
        "welcome_bonus_available": int(row.get("welcome_bonus_used") or 0) == 0,
    }


def _serialize_api_key(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "key_prefix": row["key_prefix"],
        "last_used_at": row.get("last_used_at"),
        "revoked_at": row.get("revoked_at"),
        "created_at": row["created_at"],
    }


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    if is_postgres():
        sql = """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        """
        cursor = conn.cursor()
        cursor.execute(sql, (table_name, column_name))
        return cursor.fetchone() is not None
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def init_account_db():
    """Initialize tables if they do not exist."""
    with db_connection() as conn:
        if is_postgres():
            _init_postgres_tables(conn)
        else:
            _init_sqlite_tables(conn)


def _init_postgres_tables(conn):
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            plan TEXT NOT NULL DEFAULT 'free',
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            provider_user_id TEXT NOT NULL,
            provider_email TEXT,
            provider_username TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (provider, provider_user_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            tool TEXT NOT NULL,
            original_filename TEXT,
            output_filename TEXT,
            status TEXT NOT NULL,
            download_url TEXT,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            key_prefix TEXT NOT NULL,
            key_hash TEXT NOT NULL UNIQUE,
            last_used_at TEXT,
            revoked_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usage_events (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            api_key_id INTEGER,
            source TEXT NOT NULL,
            tool TEXT NOT NULL,
            task_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            period_month TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_file_history_user_created
        ON file_history(user_id, created_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_api_keys_user_created
        ON api_keys(user_id, created_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user
        ON oauth_accounts(user_id, provider)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_usage_events_user_source_period_event
        ON usage_events(user_id, source, period_month, event_type)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_usage_events_task_lookup
        ON usage_events(user_id, source, task_id, event_type)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_prt_token_hash
        ON password_reset_tokens(token_hash)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_events (
            id SERIAL PRIMARY KEY,
            event_type TEXT NOT NULL,
            file_path TEXT,
            detail TEXT,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_file_events_created
        ON file_events(created_at DESC)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_credit_windows (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE,
            window_start_at TEXT NOT NULL,
            window_end_at TEXT NOT NULL,
            credits_allocated INTEGER NOT NULL,
            credits_used INTEGER NOT NULL DEFAULT 0,
            plan TEXT NOT NULL DEFAULT 'free',
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id INTEGER PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            profile_picture_url TEXT,
            bio TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_ucw_user
        ON user_credit_windows(user_id)
    """)

    # Add cost_points column to usage_events if missing
    if not _column_exists(conn, "usage_events", "cost_points"):
        cursor.execute(
            "ALTER TABLE usage_events ADD COLUMN cost_points INTEGER NOT NULL DEFAULT 1"
        )

    # Add quoted_credits column to usage_events if missing
    if not _column_exists(conn, "usage_events", "quoted_credits"):
        cursor.execute(
            "ALTER TABLE usage_events ADD COLUMN quoted_credits INTEGER"
        )

    # Add welcome_bonus_used flag to users if missing
    if not _column_exists(conn, "users", "welcome_bonus_used"):
        cursor.execute(
            "ALTER TABLE users ADD COLUMN welcome_bonus_used INTEGER NOT NULL DEFAULT 0"
        )
    if not _column_exists(conn, "users", "plan"):
        cursor.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'")
    if not _column_exists(conn, "users", "updated_at"):
        cursor.execute("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    if not _column_exists(conn, "users", "role"):
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")



def _init_sqlite_tables(conn):
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            plan TEXT NOT NULL DEFAULT 'free',
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS oauth_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            provider_user_id TEXT NOT NULL,
            provider_email TEXT,
            provider_username TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (provider, provider_user_id)
        );

        CREATE TABLE IF NOT EXISTS file_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tool TEXT NOT NULL,
            original_filename TEXT,
            output_filename TEXT,
            status TEXT NOT NULL,
            download_url TEXT,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            key_prefix TEXT NOT NULL,
            key_hash TEXT NOT NULL UNIQUE,
            last_used_at TEXT,
            revoked_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS usage_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            api_key_id INTEGER,
            source TEXT NOT NULL,
            tool TEXT NOT NULL,
            task_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            period_month TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_file_history_user_created
        ON file_history(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_api_keys_user_created
        ON api_keys(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user
        ON oauth_accounts(user_id, provider);

        CREATE INDEX IF NOT EXISTS idx_usage_events_user_source_period_event
        ON usage_events(user_id, source, period_month, event_type);

        CREATE INDEX IF NOT EXISTS idx_usage_events_task_lookup
        ON usage_events(user_id, source, task_id, event_type);

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_prt_token_hash
        ON password_reset_tokens(token_hash);

        CREATE TABLE IF NOT EXISTS file_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            file_path TEXT,
            detail TEXT,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_file_events_created
        ON file_events(created_at DESC);

        CREATE TABLE IF NOT EXISTS user_credit_windows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            window_start_at TEXT NOT NULL,
            window_end_at TEXT NOT NULL,
            credits_allocated INTEGER NOT NULL,
            credits_used INTEGER NOT NULL DEFAULT 0,
            plan TEXT NOT NULL DEFAULT 'free',
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id INTEGER PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            profile_picture_url TEXT,
            bio TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_ucw_user
        ON user_credit_windows(user_id);
        """
    )

    if not _column_exists(conn, "users", "plan"):
        conn.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'")
    if not _column_exists(conn, "users", "updated_at"):
        conn.execute("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    if not _column_exists(conn, "users", "role"):
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
    if not _column_exists(conn, "usage_events", "cost_points"):
        conn.execute("ALTER TABLE usage_events ADD COLUMN cost_points INTEGER NOT NULL DEFAULT 1")
    if not _column_exists(conn, "usage_events", "quoted_credits"):
        conn.execute("ALTER TABLE usage_events ADD COLUMN quoted_credits INTEGER")
    if not _column_exists(conn, "users", "welcome_bonus_used"):
        conn.execute("ALTER TABLE users ADD COLUMN welcome_bonus_used INTEGER NOT NULL DEFAULT 0")


def create_user(email: str, password: str) -> dict:
    email = _normalize_email(email)
    now = _utc_now()
    role = "admin" if email in _get_allowlisted_admin_emails() else "user"

    try:
        with db_connection() as conn:
            sql = (
                """
                INSERT INTO users (email, password_hash, plan, role, created_at, updated_at)
                VALUES (%s, %s, 'free', %s, %s, %s)
                RETURNING id
            """
                if is_postgres()
                else """
                INSERT INTO users (email, password_hash, plan, role, created_at, updated_at)
                VALUES (?, ?, 'free', ?, ?, ?)
            """
            )
            cursor = execute_query(
                conn, sql, (email, generate_password_hash(password), role, now, now)
            )

            if is_postgres():
                result = cursor.fetchone()
                user_id = result["id"] if result else None
            else:
                user_id = cursor.lastrowid

            row_sql = (
                "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = %s"
                if is_postgres()
                else "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = ?"
            )
            cursor2 = execute_query(conn, row_sql, (user_id,))
            row = cursor2.fetchone()
            row = row_to_dict(row)
    except Exception as exc:
        if isinstance(exc, get_integrity_error()):
            raise ValueError("An account with this email already exists.") from exc
        raise

    return _serialize_user(row) or {}


def authenticate_user(email: str, password: str) -> dict | None:
    email = _normalize_email(email)

    with db_connection() as conn:
        sql = (
            "SELECT * FROM users WHERE email = %s"
            if is_postgres()
            else "SELECT * FROM users WHERE email = ?"
        )
        cursor = execute_query(conn, sql, (email,))
        row = cursor.fetchone()
        row = row_to_dict(row)

    if row is None or not check_password_hash(row["password_hash"], password):
        return None

    return _serialize_user(row)


def get_user_profile(user_id: int) -> dict:
    """Return the extended profile for a user, or a default empty structure."""
    with db_connection() as conn:
        sql = "SELECT * FROM user_profiles WHERE user_id = ?"
        if is_postgres():
            sql = "SELECT * FROM user_profiles WHERE user_id = %s"
        
        cursor = execute_query(conn, sql, (user_id,))
        row = cursor.fetchone()
        if row:
            return row_to_dict(row)
            
        return {
            "user_id": user_id,
            "first_name": None,
            "last_name": None,
            "profile_picture_url": None,
            "bio": None,
        }


def update_user_profile(user_id: int, data: dict) -> dict:
    """Update or create user profile data."""
    now = _utc_now()
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    profile_picture_url = data.get("profile_picture_url")
    bio = data.get("bio")

    with db_connection() as conn:
        if is_postgres():
            sql = """
                INSERT INTO user_profiles (user_id, first_name, last_name, profile_picture_url, bio, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    profile_picture_url = EXCLUDED.profile_picture_url,
                    bio = EXCLUDED.bio,
                    updated_at = EXCLUDED.updated_at
            """
        else:
            sql = """
                INSERT INTO user_profiles (user_id, first_name, last_name, profile_picture_url, bio, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET
                    first_name = excluded.first_name,
                    last_name = excluded.last_name,
                    profile_picture_url = excluded.profile_picture_url,
                    bio = excluded.bio,
                    updated_at = excluded.updated_at
            """
        
        execute_query(conn, sql, (user_id, first_name, last_name, profile_picture_url, bio, now))
        
    return get_user_profile(user_id)


def get_user_by_id(user_id: int) -> dict | None:
    with db_connection() as conn:
        sql = (
            "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (user_id,))
        row = cursor.fetchone()
        row = row_to_dict(row)

    return _serialize_user(row)


def is_user_admin(user_id: int | None) -> bool:
    if user_id is None:
        return False

    with db_connection() as conn:
        sql = (
            "SELECT id, email, role FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT id, email, role FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (user_id,))
        row = cursor.fetchone()
        row = row_to_dict(row)

    return _resolve_row_role(row) == "admin"


def set_user_role(user_id: int, role: str) -> dict | None:
    normalized_role = normalize_role(role)
    if normalized_role not in VALID_ROLES:
        raise ValueError("Invalid role.")

    with db_connection() as conn:
        sql = (
            """
            UPDATE users
            SET role = %s, updated_at = %s
            WHERE id = %s
        """
            if is_postgres()
            else """
            UPDATE users
            SET role = ?, updated_at = ?
            WHERE id = ?
        """
        )
        execute_query(conn, sql, (normalized_role, _utc_now(), user_id))

        sql2 = (
            "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql2, (user_id,))
        row = cursor.fetchone()
        row = row_to_dict(row)

    return _serialize_user(row)


def update_user_plan(user_id: int, plan: str) -> dict | None:
    normalized_plan = normalize_plan(plan)
    if normalized_plan not in VALID_PLANS:
        raise ValueError("Invalid plan.")

    with db_connection() as conn:
        sql = (
            """
            UPDATE users
            SET plan = %s, updated_at = %s
            WHERE id = %s
        """
            if is_postgres()
            else """
            UPDATE users
            SET plan = ?, updated_at = ?
            WHERE id = ?
        """
        )
        execute_query(conn, sql, (normalized_plan, _utc_now(), user_id))

        sql2 = (
            "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql2, (user_id,))
        row = cursor.fetchone()
        row = row_to_dict(row)

    return _serialize_user(row)


def create_api_key(user_id: int, name: str) -> dict:
    name = name.strip()
    if not name:
        raise ValueError("API key name is required.")
    if len(name) > 100:
        raise ValueError("API key name must be 100 characters or less.")

    raw_key = f"spdf_{secrets.token_urlsafe(32)}"
    now = _utc_now()

    with db_connection() as conn:
        sql = (
            """
            INSERT INTO api_keys (user_id, name, key_prefix, key_hash, created_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
            if is_postgres()
            else """
            INSERT INTO api_keys (user_id, name, key_prefix, key_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
        """
        )
        cursor = execute_query(
            conn, sql, (user_id, name, raw_key[:16], _hash_api_key(raw_key), now)
        )

        if is_postgres():
            result = cursor.fetchone()
            key_id = result["id"] if result else None
        else:
            key_id = cursor.lastrowid

        sql2 = (
            """
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM api_keys
            WHERE id = %s
        """
            if is_postgres()
            else """
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM api_keys
            WHERE id = ?
        """
        )
        cursor2 = execute_query(conn, sql2, (key_id,))
        row = cursor2.fetchone()
        row = row_to_dict(row)

    result = _serialize_api_key(row)
    result["raw_key"] = raw_key
    return result


def list_api_keys(user_id: int) -> list[dict]:
    with db_connection() as conn:
        sql = (
            """
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM api_keys
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
            if is_postgres()
            else """
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM api_keys
            WHERE user_id = ?
            ORDER BY created_at DESC
        """
        )
        cursor = execute_query(conn, sql, (user_id,))
        rows = cursor.fetchall()
        rows = [row_to_dict(r) for r in rows]

    return [_serialize_api_key(row) for row in rows]


def revoke_api_key(user_id: int, key_id: int) -> bool:
    with db_connection() as conn:
        sql = (
            """
            UPDATE api_keys
            SET revoked_at = %s
            WHERE id = %s AND user_id = %s AND revoked_at IS NULL
        """
            if is_postgres()
            else """
            UPDATE api_keys
            SET revoked_at = ?
            WHERE id = ? AND user_id = ? AND revoked_at IS NULL
        """
        )
        cursor = execute_query(conn, sql, (_utc_now(), key_id, user_id))
    return cursor.rowcount > 0


def get_api_key_actor(raw_key: str) -> dict | None:
    if not raw_key:
        return None

    key_hash = _hash_api_key(raw_key.strip())
    now = _utc_now()

    with db_connection() as conn:
        sql = (
            """
            SELECT
                api_keys.id AS api_key_id,
                api_keys.user_id,
                api_keys.name,
                api_keys.key_prefix,
                api_keys.last_used_at,
                users.email,
                users.plan,
                users.created_at
            FROM api_keys
            INNER JOIN users ON users.id = api_keys.user_id
            WHERE api_keys.key_hash = %s AND api_keys.revoked_at IS NULL
        """
            if is_postgres()
            else """
            SELECT
                api_keys.id AS api_key_id,
                api_keys.user_id,
                api_keys.name,
                api_keys.key_prefix,
                api_keys.last_used_at,
                users.email,
                users.plan,
                users.created_at
            FROM api_keys
            INNER JOIN users ON users.id = api_keys.user_id
            WHERE api_keys.key_hash = ? AND api_keys.revoked_at IS NULL
        """
        )
        cursor = execute_query(conn, sql, (key_hash,))
        row = cursor.fetchone()
        row = row_to_dict(row)

        if row is None:
            return None

        sql2 = (
            "UPDATE api_keys SET last_used_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE api_keys SET last_used_at = ? WHERE id = ?"
        )
        execute_query(conn, sql2, (now, row["api_key_id"]))

    return {
        "api_key_id": row["api_key_id"],
        "user_id": row["user_id"],
        "email": row["email"],
        "plan": normalize_plan(row["plan"]),
        "created_at": row["created_at"],
        "name": row["name"],
        "key_prefix": row["key_prefix"],
        "last_used_at": now,
    }


def record_file_history(
    user_id: int,
    tool: str,
    original_filename: str | None,
    output_filename: str | None,
    status: str,
    download_url: str | None,
    metadata: dict | None = None,
):
    with db_connection() as conn:
        sql = (
            """
            INSERT INTO file_history (
                user_id, tool, original_filename, output_filename,
                status, download_url, metadata_json, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
            if is_postgres()
            else """
            INSERT INTO file_history (
                user_id, tool, original_filename, output_filename,
                status, download_url, metadata_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        )
        execute_query(
            conn,
            sql,
            (
                user_id,
                tool,
                original_filename,
                output_filename,
                status,
                download_url,
                json.dumps(metadata or {}, ensure_ascii=True),
                _utc_now(),
            ),
        )


def record_task_history(
    user_id: int | None,
    tool: str,
    original_filename: str | None,
    result: dict,
):
    if user_id is None:
        return

    metadata = {}
    for key, value in result.items():
        if key in {"status", "download_url", "filename"}:
            continue
        if key in {"procedures", "flowcharts", "pages"} and isinstance(value, list):
            metadata[f"{key}_count"] = len(value)
            continue
        metadata[key] = value

    try:
        record_file_history(
            user_id=user_id,
            tool=tool,
            original_filename=original_filename,
            output_filename=result.get("filename"),
            status=result.get("status", "completed"),
            download_url=result.get("download_url"),
            metadata=metadata,
        )
    except Exception:
        logger.exception("Failed to persist task history for tool=%s", tool)


def list_file_history(user_id: int, limit: int = 50) -> list[dict]:
    with db_connection() as conn:
        sql = (
            """
            SELECT id, tool, original_filename, output_filename, status,
                   download_url, metadata_json, created_at
            FROM file_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
            if is_postgres()
            else """
            SELECT id, tool, original_filename, output_filename, status,
                   download_url, metadata_json, created_at
            FROM file_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """
        )
        cursor = execute_query(conn, sql, (user_id, limit))
        rows = cursor.fetchall()
        rows = [row_to_dict(r) for r in rows]

    return [
        {
            "id": row["id"],
            "tool": row["tool"],
            "original_filename": row["original_filename"],
            "output_filename": row["output_filename"],
            "status": row["status"],
            "download_url": row["download_url"],
            "metadata": json.loads(row["metadata_json"] or "{}"),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def get_public_history_summary(limit_tools: int = 5) -> dict:
    cutoff_24h = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    with db_connection() as conn:
        sql = """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
            FROM file_history
        """
        cursor = execute_query(conn, sql)
        totals_row = row_to_dict(cursor.fetchone())

        sql2 = (
            """
            SELECT COUNT(*) AS total
            FROM file_history
            WHERE created_at >= %s
        """
            if is_postgres()
            else """
            SELECT COUNT(*) AS total
            FROM file_history
            WHERE created_at >= ?
        """
        )
        cursor2 = execute_query(conn, sql2, (cutoff_24h,))
        recent_row = row_to_dict(cursor2.fetchone())

        sql3 = (
            """
            SELECT tool, COUNT(*) AS count
            FROM file_history
            WHERE status = 'completed'
            GROUP BY tool
            ORDER BY count DESC, tool ASC
            LIMIT %s
        """
            if is_postgres()
            else """
            SELECT tool, COUNT(*) AS count
            FROM file_history
            WHERE status = 'completed'
            GROUP BY tool
            ORDER BY count DESC, tool ASC
            LIMIT ?
        """
        )
        cursor3 = execute_query(conn, sql3, (limit_tools,))
        top_rows = [row_to_dict(r) for r in cursor3.fetchall()]

    total = int(totals_row["total"]) if totals_row else 0
    completed = int(totals_row["completed"]) if totals_row else 0
    failed = int(totals_row["failed"]) if totals_row else 0
    success_rate = round((completed / total) * 100, 1) if total else 0.0

    return {
        "total_files_processed": total,
        "completed_files": completed,
        "failed_files": failed,
        "success_rate": success_rate,
        "files_last_24h": int(recent_row["total"]) if recent_row else 0,
        "top_tools": [
            {"tool": row["tool"], "count": int(row["count"])} for row in top_rows
        ],
    }


def record_usage_event(
    user_id: int | None,
    source: str,
    tool: str,
    task_id: str,
    event_type: str,
    api_key_id: int | None = None,
    cost_points: int = 1,
    quoted_credits: int | None = None,
):
    if user_id is None:
        return

    with db_connection() as conn:
        sql = (
            """
            INSERT INTO usage_events (
                user_id, api_key_id, source, tool, task_id,
                event_type, created_at, period_month, cost_points, quoted_credits
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
            if is_postgres()
            else """
            INSERT INTO usage_events (
                user_id, api_key_id, source, tool, task_id,
                event_type, created_at, period_month, cost_points, quoted_credits
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        )
        execute_query(
            conn,
            sql,
            (
                user_id,
                api_key_id,
                source,
                tool,
                task_id,
                event_type,
                _utc_now(),
                get_current_period_month(),
                cost_points,
                quoted_credits,
            ),
        )


def count_usage_events(
    user_id: int,
    source: str,
    event_type: str = "accepted",
    period_month: str | None = None,
) -> int:
    with db_connection() as conn:
        sql = (
            """
            SELECT COUNT(*) AS count
            FROM usage_events
            WHERE user_id = %s AND source = %s AND event_type = %s AND period_month = %s
        """
            if is_postgres()
            else """
            SELECT COUNT(*) AS count
            FROM usage_events
            WHERE user_id = ? AND source = ? AND event_type = ? AND period_month = ?
        """
        )
        cursor = execute_query(
            conn,
            sql,
            (user_id, source, event_type, period_month or get_current_period_month()),
        )
        row = row_to_dict(cursor.fetchone())

    return int(row["count"]) if row else 0


def has_task_access(user_id: int, source: str, task_id: str) -> bool:
    with db_connection() as conn:
        sql = (
            """
            SELECT 1
            FROM usage_events
            WHERE user_id = %s AND source = %s AND task_id = %s
              AND event_type IN ('accepted', 'download_alias')
            LIMIT 1
        """
            if is_postgres()
            else """
            SELECT 1
            FROM usage_events
            WHERE user_id = ? AND source = ? AND task_id = ?
              AND event_type IN ('accepted', 'download_alias')
            LIMIT 1
        """
        )
        cursor = execute_query(conn, sql, (user_id, source, task_id))
        row = cursor.fetchone()

    return row is not None


def get_user_by_email(email: str) -> dict | None:
    email = _normalize_email(email)
    with db_connection() as conn:
        sql = (
            "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE email = %s"
            if is_postgres()
            else "SELECT id, email, plan, role, created_at, welcome_bonus_used FROM users WHERE email = ?"
        )
        cursor = execute_query(conn, sql, (email,))
        row = row_to_dict(cursor.fetchone())
    return _serialize_user(row)


def get_user_by_oauth_account(provider: str, provider_user_id: str) -> dict | None:
    provider = provider.strip().lower()
    provider_user_id = str(provider_user_id).strip()
    if not provider or not provider_user_id:
        return None

    with db_connection() as conn:
        sql = (
            """
            SELECT users.id, users.email, users.plan, users.role, users.created_at, users.welcome_bonus_used
            FROM oauth_accounts
            INNER JOIN users ON users.id = oauth_accounts.user_id
            WHERE oauth_accounts.provider = %s AND oauth_accounts.provider_user_id = %s
        """
            if is_postgres()
            else """
            SELECT users.id, users.email, users.plan, users.role, users.created_at, users.welcome_bonus_used
            FROM oauth_accounts
            INNER JOIN users ON users.id = oauth_accounts.user_id
            WHERE oauth_accounts.provider = ? AND oauth_accounts.provider_user_id = ?
        """
        )
        cursor = execute_query(conn, sql, (provider, provider_user_id))
        row = row_to_dict(cursor.fetchone())

    return _serialize_user(row)


def link_oauth_account(
    user_id: int,
    provider: str,
    provider_user_id: str,
    provider_email: str | None = None,
    provider_username: str | None = None,
) -> None:
    provider = provider.strip().lower()
    provider_user_id = str(provider_user_id).strip()
    normalized_email = _normalize_email(provider_email) if provider_email else None
    normalized_username = str(provider_username).strip() if provider_username else None
    now = _utc_now()

    if not provider or not provider_user_id:
        raise ValueError("A valid social account identifier is required.")

    with db_connection() as conn:
        lookup_sql = (
            """
            SELECT id, user_id, provider_email, provider_username
            FROM oauth_accounts
            WHERE provider = %s AND provider_user_id = %s
        """
            if is_postgres()
            else """
            SELECT id, user_id, provider_email, provider_username
            FROM oauth_accounts
            WHERE provider = ? AND provider_user_id = ?
        """
        )
        lookup_cursor = execute_query(conn, lookup_sql, (provider, provider_user_id))
        existing = row_to_dict(lookup_cursor.fetchone())

        if existing is not None and int(existing["user_id"]) != int(user_id):
            raise ValueError("This social account is already linked to another user.")

        if existing is None:
            insert_sql = (
                """
                INSERT INTO oauth_accounts (
                    user_id, provider, provider_user_id, provider_email,
                    provider_username, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
                if is_postgres()
                else """
                INSERT INTO oauth_accounts (
                    user_id, provider, provider_user_id, provider_email,
                    provider_username, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            )
            execute_query(
                conn,
                insert_sql,
                (
                    user_id,
                    provider,
                    provider_user_id,
                    normalized_email,
                    normalized_username,
                    now,
                    now,
                ),
            )
            return

        update_sql = (
            """
            UPDATE oauth_accounts
            SET provider_email = %s,
                provider_username = %s,
                updated_at = %s
            WHERE id = %s
        """
            if is_postgres()
            else """
            UPDATE oauth_accounts
            SET provider_email = ?,
                provider_username = ?,
                updated_at = ?
            WHERE id = ?
        """
        )
        execute_query(
            conn,
            update_sql,
            (
                normalized_email or existing.get("provider_email"),
                normalized_username or existing.get("provider_username"),
                now,
                existing["id"],
            ),
        )


def resolve_user_for_oauth_login(
    provider: str,
    provider_user_id: str,
    email: str | None,
    email_is_verified: bool,
    provider_username: str | None = None,
) -> tuple[dict, bool]:
    provider = provider.strip().lower()
    provider_user_id = str(provider_user_id).strip()
    normalized_email = _normalize_email(email) if email else None

    user = get_user_by_oauth_account(provider, provider_user_id)
    if user is not None:
        link_oauth_account(
            int(user["id"]),
            provider,
            provider_user_id,
            provider_email=normalized_email,
            provider_username=provider_username,
        )
        return user, False

    if not normalized_email:
        if provider == "x":
            raise ValueError(
                "X did not share your email address. "
                "Please sign up with email and password first, then link your X account "
                "from the account page. Alternatively, enable email sharing in your X "
                "privacy settings and try again."
            )
        raise ValueError("We couldn't get an email address from that social account.")

    if not email_is_verified:
        raise ValueError("That social account email is not verified.")

    user = get_user_by_email(normalized_email)
    is_new_account = user is None
    if user is None:
        user = create_user(normalized_email, secrets.token_urlsafe(32))

    link_oauth_account(
        int(user["id"]),
        provider,
        provider_user_id,
        provider_email=normalized_email,
        provider_username=provider_username,
    )
    return user, is_new_account


def create_password_reset_token(user_id: int) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = _utc_now()
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    with db_connection() as conn:
        sql1 = (
            "UPDATE password_reset_tokens SET used_at = %s WHERE user_id = %s AND used_at IS NULL"
            if is_postgres()
            else "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL"
        )
        execute_query(conn, sql1, (now, user_id))

        sql2 = (
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
            VALUES (%s, %s, %s, %s)
        """
            if is_postgres()
            else """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        """
        )
        execute_query(conn, sql2, (user_id, token_hash, expires, now))

    return raw_token


def verify_and_consume_reset_token(raw_token: str) -> int | None:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = _utc_now()

    with db_connection() as conn:
        sql = (
            """
            SELECT id, user_id, expires_at
            FROM password_reset_tokens
            WHERE token_hash = %s AND used_at IS NULL
        """
            if is_postgres()
            else """
            SELECT id, user_id, expires_at
            FROM password_reset_tokens
            WHERE token_hash = ? AND used_at IS NULL
        """
        )
        cursor = execute_query(conn, sql, (token_hash,))
        row = row_to_dict(cursor.fetchone())

        if row is None:
            return None

        if row["expires_at"] < now:
            sql2 = (
                "UPDATE password_reset_tokens SET used_at = %s WHERE id = %s"
                if is_postgres()
                else "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?"
            )
            execute_query(conn, sql2, (now, row["id"]))
            return None

        sql3 = (
            "UPDATE password_reset_tokens SET used_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?"
        )
        execute_query(conn, sql3, (now, row["id"]))

        return row["user_id"]


def update_user_password(user_id: int, new_password: str) -> bool:
    now = _utc_now()
    password_hash = generate_password_hash(new_password)
    with db_connection() as conn:
        sql = (
            "UPDATE users SET password_hash = %s, updated_at = %s WHERE id = %s"
            if is_postgres()
            else "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
        )
        execute_query(conn, sql, (password_hash, now, user_id))
    return True


def log_file_event(
    event_type: str, file_path: str | None = None, detail: str | None = None
) -> None:
    with db_connection() as conn:
        sql = (
            "INSERT INTO file_events (event_type, file_path, detail, created_at) VALUES (%s, %s, %s, %s)"
            if is_postgres()
            else "INSERT INTO file_events (event_type, file_path, detail, created_at) VALUES (?, ?, ?, ?)"
        )
        execute_query(conn, sql, (event_type, file_path, detail, _utc_now()))


# ── Welcome-bonus helpers ───────────────────────────────────────

def is_welcome_bonus_available(user_id: int) -> bool:
    """Return True if the user has never used their welcome bonus."""
    with db_connection() as conn:
        sql = (
            "SELECT welcome_bonus_used FROM users WHERE id = %s"
            if is_postgres()
            else "SELECT welcome_bonus_used FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (user_id,))
        row = row_to_dict(cursor.fetchone())
    if row is None:
        return False
    return int(row.get("welcome_bonus_used", 0)) == 0


def consume_welcome_bonus(user_id: int) -> bool:
    """Mark the welcome bonus as used. Returns True if it was actually consumed."""
    with db_connection() as conn:
        sql = (
            "UPDATE users SET welcome_bonus_used = 1, updated_at = %s WHERE id = %s AND welcome_bonus_used = 0"
            if is_postgres()
            else "UPDATE users SET welcome_bonus_used = 1, updated_at = ? WHERE id = ? AND welcome_bonus_used = 0"
        )
        cursor = execute_query(conn, sql, (_utc_now(), user_id))
    return cursor.rowcount > 0
