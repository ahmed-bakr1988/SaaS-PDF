"""Database abstraction — supports SQLite (dev) and PostgreSQL (production).

Usage:
    from app.utils.database import db_connection, adapt_query

The returned connection behaves like a sqlite3.Connection with row_factory set.
For PostgreSQL it wraps psycopg2 with RealDictCursor for dict-like rows.

Selection logic:
    - If DATABASE_URL env var is set (starts with ``postgres``), use PostgreSQL.
    - Otherwise fall back to SQLite via DATABASE_PATH config.
"""

import logging
import os
import re
import sqlite3
from contextlib import contextmanager

from flask import current_app

logger = logging.getLogger(__name__)

_pg_available = False
try:
    import psycopg2
    import psycopg2.extras
    import psycopg2.errors

    _pg_available = True
except ImportError:
    pass


def is_postgres() -> bool:
    """Return True when the app is configured to use PostgreSQL."""
    db_url = os.getenv("DATABASE_URL", "")
    return db_url.startswith("postgres")


def _sqlite_connect() -> sqlite3.Connection:
    db_path = current_app.config.get("DATABASE_PATH")
    if not db_path:
        db_path = os.path.join(
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
            "data",
            "dociva.db",
        )
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _pg_connect():
    """Return a psycopg2 connection with RealDictCursor."""
    if not _pg_available:
        raise RuntimeError("psycopg2 is not installed — cannot use PostgreSQL.")
    db_url = os.getenv("DATABASE_URL", "")
    conn = psycopg2.connect(
        db_url,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    conn.autocommit = False
    return conn


def get_connection():
    """Get a database connection (SQLite or PostgreSQL based on config)."""
    if is_postgres():
        return _pg_connect()
    return _sqlite_connect()


@contextmanager
def db_connection():
    """Context manager that yields a connection and handles commit/rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def adapt_query(sql: str, params: tuple = ()) -> tuple:
    """Adapt SQLite SQL and parameters to PostgreSQL if needed.

    Converts:
      - INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
      - ? placeholders -> %s placeholders
      - params tuple unchanged (psycopg2 accepts tuple with %s)

    Returns (adapted_sql, adapted_params).
    """
    if not is_postgres():
        return sql, params

    sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    sql = sql.replace("INTEGER PRIMARY KEY", "SERIAL PRIMARY KEY")
    sql = sql.replace("BOOLEAN DEFAULT 1", "BOOLEAN DEFAULT TRUE")
    sql = sql.replace("BOOLEAN DEFAULT 0", "BOOLEAN DEFAULT FALSE")
    sql = re.sub(r"\?", "%s", sql)

    return sql, params


def execute_query(conn, sql: str, params: tuple = ()):
    """Execute a query, adapting SQL for the current database.

    Returns the cursor.
    """
    adapted_sql, adapted_params = adapt_query(sql, params)
    if is_postgres():
        cursor = conn.cursor()
        cursor.execute(adapted_sql, adapted_params)
        return cursor
    return conn.execute(adapted_sql, adapted_params)


def get_last_insert_id(conn, cursor=None):
    """Get the last inserted row ID, compatible with both SQLite and PostgreSQL."""
    if is_postgres():
        if cursor is None:
            raise ValueError("cursor is required for PostgreSQL to get last insert ID")
        result = cursor.fetchone()
        if result:
            if isinstance(result, dict):
                return result.get("id") or result.get("lastval")
            return result[0]
        return None
    return cursor.lastrowid


def get_integrity_error():
    """Get the appropriate IntegrityError exception for the current database."""
    if is_postgres():
        if _pg_available:
            return psycopg2.IntegrityError
        raise RuntimeError("psycopg2 is not installed")
    return sqlite3.IntegrityError


def get_row_value(row, key: str):
    """Get a value from a row by key, compatible with both SQLite Row and psycopg2 dict."""
    if row is None:
        return None
    if isinstance(row, dict):
        return row.get(key)
    return row[key]


def row_to_dict(row):
    """Convert a database row to a plain dict."""
    if row is None:
        return None
    if isinstance(row, dict):
        return dict(row)
    return dict(row)


def init_tables(conn):
    """Run initialization SQL for all tables, adapting for the current database."""
    if is_postgres():
        cursor = conn.cursor()
        cursor.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
        if cursor.fetchone()[0]:
            return
    else:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        )
        if cursor.fetchone():
            return
