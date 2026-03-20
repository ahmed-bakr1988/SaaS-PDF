"""User accounts, API keys, history, and usage storage using SQLite."""
import hashlib
import json
import logging
import os
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta

from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

logger = logging.getLogger(__name__)

VALID_PLANS = {"free", "pro"}
VALID_ROLES = {"user", "admin"}


def _utc_now() -> str:
    """Return a stable UTC timestamp string."""
    return datetime.now(timezone.utc).isoformat()


def get_current_period_month() -> str:
    """Return the active usage period in YYYY-MM format."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def normalize_plan(plan: str | None) -> str:
    """Normalize plan values to the supported set."""
    return "pro" if plan == "pro" else "free"


def normalize_role(role: str | None) -> str:
    """Normalize role values to the supported set."""
    return "admin" if role == "admin" else "user"


def _get_allowlisted_admin_emails() -> set[str]:
    configured = current_app.config.get("INTERNAL_ADMIN_EMAILS", ())
    return {
        str(email).strip().lower()
        for email in configured
        if str(email).strip()
    }


def is_allowlisted_admin_email(email: str | None) -> bool:
    """Return whether an email is bootstrapped as admin from configuration."""
    normalized_email = _normalize_email(email or "")
    return normalized_email in _get_allowlisted_admin_emails()


def _resolve_row_role(row: sqlite3.Row | None) -> str:
    if row is None:
        return "user"

    row_keys = row.keys()
    stored_role = normalize_role(row["role"]) if "role" in row_keys else "user"
    email = str(row["email"]).strip().lower() if "email" in row_keys else ""
    if stored_role == "admin" or email in _get_allowlisted_admin_emails():
        return "admin"
    return "user"


def _connect() -> sqlite3.Connection:
    """Create a SQLite connection with row access by column name."""
    db_path = current_app.config["DATABASE_PATH"]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _column_exists(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    """Check whether one column exists in a SQLite table."""
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def _serialize_user(row: sqlite3.Row | None) -> dict | None:
    """Convert a user row into API-safe data."""
    if row is None:
        return None

    return {
        "id": row["id"],
        "email": row["email"],
        "plan": normalize_plan(row["plan"]),
        "role": _resolve_row_role(row),
        "is_allowlisted_admin": is_allowlisted_admin_email(row["email"]),
        "created_at": row["created_at"],
    }


def _serialize_api_key(row: sqlite3.Row) -> dict:
    """Convert an API key row into public API-safe data."""
    return {
        "id": row["id"],
        "name": row["name"],
        "key_prefix": row["key_prefix"],
        "last_used_at": row["last_used_at"],
        "revoked_at": row["revoked_at"],
        "created_at": row["created_at"],
    }


def _normalize_email(email: str) -> str:
    """Normalize user emails for lookups and uniqueness."""
    return email.strip().lower()


def _hash_api_key(raw_key: str) -> str:
    """Return a deterministic digest for one API key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def init_account_db():
    """Initialize user, history, API key, and usage tables if they do not exist."""
    with _connect() as conn:
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

            CREATE INDEX IF NOT EXISTS idx_usage_events_user_source_period_event
            ON usage_events(user_id, source, period_month, event_type);

            CREATE INDEX IF NOT EXISTS idx_usage_events_task_lookup
            ON usage_events(user_id, source, task_id, event_type);
            """
        )

        if not _column_exists(conn, "users", "plan"):
            conn.execute(
                "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'"
            )
        if not _column_exists(conn, "users", "updated_at"):
            conn.execute(
                "ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"
            )
        if not _column_exists(conn, "users", "role"):
            conn.execute(
                "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
            )

        # Password reset tokens
        conn.executescript(
            """
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
            """
        )


def create_user(email: str, password: str) -> dict:
    """Create a new user and return the public record."""
    email = _normalize_email(email)
    now = _utc_now()
    role = "admin" if email in _get_allowlisted_admin_emails() else "user"

    try:
        with _connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO users (email, password_hash, plan, role, created_at, updated_at)
                VALUES (?, ?, 'free', ?, ?, ?)
                """,
                (email, generate_password_hash(password), role, now, now),
            )
            user_id = cursor.lastrowid
            row = conn.execute(
                "SELECT id, email, plan, role, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
    except sqlite3.IntegrityError as exc:
        raise ValueError("An account with this email already exists.") from exc

    return _serialize_user(row) or {}


def authenticate_user(email: str, password: str) -> dict | None:
    """Return the public user record when credentials are valid."""
    email = _normalize_email(email)

    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,),
        ).fetchone()

    if row is None or not check_password_hash(row["password_hash"], password):
        return None

    return _serialize_user(row)


def get_user_by_id(user_id: int) -> dict | None:
    """Fetch a public user record by id."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, plan, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    return _serialize_user(row)


def is_user_admin(user_id: int | None) -> bool:
    """Return whether one user has internal admin access."""
    if user_id is None:
        return False

    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, role FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    return _resolve_row_role(row) == "admin"


def set_user_role(user_id: int, role: str) -> dict | None:
    """Update one user role and return the public user record."""
    normalized_role = normalize_role(role)
    if normalized_role not in VALID_ROLES:
        raise ValueError("Invalid role.")

    with _connect() as conn:
        conn.execute(
            """
            UPDATE users
            SET role = ?, updated_at = ?
            WHERE id = ?
            """,
            (normalized_role, _utc_now(), user_id),
        )
        row = conn.execute(
            "SELECT id, email, plan, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    return _serialize_user(row)


def update_user_plan(user_id: int, plan: str) -> dict | None:
    """Update one user plan and return the public record."""
    normalized_plan = normalize_plan(plan)
    if normalized_plan not in VALID_PLANS:
        raise ValueError("Invalid plan.")

    with _connect() as conn:
        conn.execute(
            """
            UPDATE users
            SET plan = ?, updated_at = ?
            WHERE id = ?
            """,
            (normalized_plan, _utc_now(), user_id),
        )
        row = conn.execute(
            "SELECT id, email, plan, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    return _serialize_user(row)


def create_api_key(user_id: int, name: str) -> dict:
    """Create one API key and return the public record plus raw secret once."""
    name = name.strip()
    if not name:
        raise ValueError("API key name is required.")
    if len(name) > 100:
        raise ValueError("API key name must be 100 characters or less.")

    raw_key = f"spdf_{secrets.token_urlsafe(32)}"
    now = _utc_now()

    with _connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO api_keys (user_id, name, key_prefix, key_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                name,
                raw_key[:16],
                _hash_api_key(raw_key),
                now,
            ),
        )
        row = conn.execute(
            """
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM api_keys
            WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

    result = _serialize_api_key(row)
    result["raw_key"] = raw_key
    return result


def list_api_keys(user_id: int) -> list[dict]:
    """Return all API keys for one user."""
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM api_keys
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [_serialize_api_key(row) for row in rows]


def revoke_api_key(user_id: int, key_id: int) -> bool:
    """Revoke one API key owned by one user."""
    with _connect() as conn:
        cursor = conn.execute(
            """
            UPDATE api_keys
            SET revoked_at = ?
            WHERE id = ? AND user_id = ? AND revoked_at IS NULL
            """,
            (_utc_now(), key_id, user_id),
        )
    return cursor.rowcount > 0


def get_api_key_actor(raw_key: str) -> dict | None:
    """Resolve one raw API key into the owning active user context."""
    if not raw_key:
        return None

    key_hash = _hash_api_key(raw_key.strip())
    now = _utc_now()

    with _connect() as conn:
        row = conn.execute(
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
            WHERE api_keys.key_hash = ? AND api_keys.revoked_at IS NULL
            """,
            (key_hash,),
        ).fetchone()

        if row is None:
            return None

        conn.execute(
            "UPDATE api_keys SET last_used_at = ? WHERE id = ?",
            (now, row["api_key_id"]),
        )

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
    """Persist one generated-file history entry."""
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO file_history (
                user_id, tool, original_filename, output_filename,
                status, download_url, metadata_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
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
    """Persist task results when the request belongs to an authenticated user."""
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
    """Return most recent file history entries for one user."""
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, tool, original_filename, output_filename, status,
                   download_url, metadata_json, created_at
            FROM file_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()

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
    """Return aggregate public-friendly processing stats derived from history."""
    cutoff_24h = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    with _connect() as conn:
        totals_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
            FROM file_history
            """
        ).fetchone()

        recent_row = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM file_history
            WHERE created_at >= ?
            """,
            (cutoff_24h,),
        ).fetchone()

        top_rows = conn.execute(
            """
            SELECT tool, COUNT(*) AS count
            FROM file_history
            WHERE status = 'completed'
            GROUP BY tool
            ORDER BY count DESC, tool ASC
            LIMIT ?
            """,
            (limit_tools,),
        ).fetchall()

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
            {"tool": row["tool"], "count": int(row["count"])}
            for row in top_rows
        ],
    }


def record_usage_event(
    user_id: int | None,
    source: str,
    tool: str,
    task_id: str,
    event_type: str,
    api_key_id: int | None = None,
):
    """Persist one usage event when it belongs to an authenticated actor."""
    if user_id is None:
        return

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO usage_events (
                user_id, api_key_id, source, tool, task_id,
                event_type, created_at, period_month
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                api_key_id,
                source,
                tool,
                task_id,
                event_type,
                _utc_now(),
                get_current_period_month(),
            ),
        )


def count_usage_events(
    user_id: int,
    source: str,
    event_type: str = "accepted",
    period_month: str | None = None,
) -> int:
    """Count usage events for one user, source, period, and type."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS count
            FROM usage_events
            WHERE user_id = ? AND source = ? AND event_type = ? AND period_month = ?
            """,
            (user_id, source, event_type, period_month or get_current_period_month()),
        ).fetchone()

    return int(row["count"]) if row else 0


def has_task_access(user_id: int, source: str, task_id: str) -> bool:
    """Return whether one user owns one previously accepted task for one source."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT 1
            FROM usage_events
            WHERE user_id = ? AND source = ? AND task_id = ? AND event_type = 'accepted'
            LIMIT 1
            """,
            (user_id, source, task_id),
        ).fetchone()

    return row is not None


def has_download_access(user_id: int, file_task_id: str) -> bool:
    """Return whether one user owns a file_history entry whose download_url contains the given file task id."""
    pattern = f"/api/download/{file_task_id}/"
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT 1
            FROM file_history
            WHERE user_id = ? AND download_url LIKE ?
            LIMIT 1
            """,
            (user_id, f"%{pattern}%"),
        ).fetchone()

    return row is not None


# ---------------------------------------------------------------------------
# Password reset tokens
# ---------------------------------------------------------------------------

def get_user_by_email(email: str) -> dict | None:
    """Fetch a public user record by email."""
    email = _normalize_email(email)
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, plan, role, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    return _serialize_user(row)


def create_password_reset_token(user_id: int) -> str:
    """Generate a password-reset token (returned raw) and store its hash."""
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = _utc_now()
    # Expire in 1 hour
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    with _connect() as conn:
        # Invalidate any previous unused tokens for this user
        conn.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
            (now, user_id),
        )
        conn.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, token_hash, expires, now),
        )

    return raw_token


def verify_and_consume_reset_token(raw_token: str) -> int | None:
    """Verify a reset token. Returns user_id if valid, else None. Marks it used."""
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = _utc_now()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, user_id, expires_at
            FROM password_reset_tokens
            WHERE token_hash = ? AND used_at IS NULL
            """,
            (token_hash,),
        ).fetchone()

        if row is None:
            return None

        # Check expiry
        if row["expires_at"] < now:
            conn.execute(
                "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
                (now, row["id"]),
            )
            return None

        # Mark used
        conn.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
            (now, row["id"]),
        )

        return row["user_id"]


def update_user_password(user_id: int, new_password: str) -> bool:
    """Update a user's password hash."""
    now = _utc_now()
    password_hash = generate_password_hash(new_password)
    with _connect() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (password_hash, now, user_id),
        )
    return True


def log_file_event(event_type: str, file_path: str | None = None, detail: str | None = None) -> None:
    """Record a file lifecycle event (upload, download, cleanup, etc.)."""
    with _connect() as conn:
        conn.execute(
            "INSERT INTO file_events (event_type, file_path, detail, created_at) VALUES (?, ?, ?, ?)",
            (event_type, file_path, detail, _utc_now()),
        )
