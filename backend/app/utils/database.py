"""Database abstraction — supports SQLite (dev) and PostgreSQL (production).

Usage:
    from app.utils.database import get_connection

The returned connection behaves like a sqlite3.Connection with row_factory set.
For PostgreSQL it wraps psycopg2 with RealDictCursor for dict-like rows.

Selection logic:
    - If DATABASE_URL env var is set (starts with ``postgres``), use PostgreSQL.
    - Otherwise fall back to SQLite via DATABASE_PATH config.
"""
import logging
import os
import sqlite3
from contextlib import contextmanager

from flask import current_app

logger = logging.getLogger(__name__)

_pg_available = False
try:
    import psycopg2
    import psycopg2.extras
    _pg_available = True
except ImportError:
    pass


def is_postgres() -> bool:
    """Return True when the app is configured to use PostgreSQL."""
    db_url = os.getenv("DATABASE_URL", "")
    return db_url.startswith("postgres")


def _sqlite_connect() -> sqlite3.Connection:
    db_path = current_app.config["DATABASE_PATH"]
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
    conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
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


def adapt_sql(sql: str) -> str:
    """Adapt SQLite SQL to PostgreSQL if needed.

    Converts:
      - INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
      - ? placeholders -> %s placeholders
    """
    if not is_postgres():
        return sql

    sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    sql = sql.replace("?", "%s")
    return sql
