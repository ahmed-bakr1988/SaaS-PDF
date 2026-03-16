"""Rating service — stores and aggregates user ratings per tool."""
import logging
import os
import sqlite3
from datetime import datetime, timezone

from flask import current_app

logger = logging.getLogger(__name__)


def _connect() -> sqlite3.Connection:
    """Create a SQLite connection."""
    db_path = current_app.config["DATABASE_PATH"]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_ratings_db():
    """Create ratings table if it does not exist."""
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tool_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                feedback TEXT DEFAULT '',
                tag TEXT DEFAULT '',
                fingerprint TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tool_ratings_tool
            ON tool_ratings(tool);

            CREATE INDEX IF NOT EXISTS idx_tool_ratings_fingerprint_tool
            ON tool_ratings(fingerprint, tool);
            """
        )


def submit_rating(
    tool: str,
    rating: int,
    feedback: str = "",
    tag: str = "",
    fingerprint: str = "",
) -> None:
    """Store a rating. Limits one rating per fingerprint per tool per day."""
    now = _utc_now()
    today = now[:10]  # YYYY-MM-DD

    with _connect() as conn:
        # Check for duplicate rating from same fingerprint today
        existing = conn.execute(
            """SELECT id FROM tool_ratings
               WHERE fingerprint = ? AND tool = ? AND created_at LIKE ?
               LIMIT 1""",
            (fingerprint, tool, f"{today}%"),
        ).fetchone()

        if existing:
            # Update existing rating instead of creating duplicate
            conn.execute(
                """UPDATE tool_ratings
                   SET rating = ?, feedback = ?, tag = ?, created_at = ?
                   WHERE id = ?""",
                (rating, feedback, tag, now, existing["id"]),
            )
        else:
            conn.execute(
                """INSERT INTO tool_ratings (tool, rating, feedback, tag, fingerprint, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (tool, rating, feedback, tag, fingerprint, now),
            )


def get_tool_rating_summary(tool: str) -> dict:
    """Return aggregate rating data for one tool."""
    with _connect() as conn:
        row = conn.execute(
            """SELECT
                 COUNT(*) as count,
                 COALESCE(AVG(rating), 0) as average,
                 COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) as star5,
                 COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) as star4,
                 COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) as star3,
                 COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) as star2,
                 COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) as star1
               FROM tool_ratings WHERE tool = ?""",
            (tool,),
        ).fetchone()

        return {
            "tool": tool,
            "count": row["count"],
            "average": round(row["average"], 1),
            "distribution": {
                "5": row["star5"],
                "4": row["star4"],
                "3": row["star3"],
                "2": row["star2"],
                "1": row["star1"],
            },
        }


def get_all_ratings_summary() -> list[dict]:
    """Return aggregated ratings for all tools that have at least one rating."""
    with _connect() as conn:
        rows = conn.execute(
            """SELECT
                 tool,
                 COUNT(*) as count,
                 COALESCE(AVG(rating), 0) as average
               FROM tool_ratings
               GROUP BY tool
               ORDER BY count DESC"""
        ).fetchall()

        return [
            {
                "tool": row["tool"],
                "count": row["count"],
                "average": round(row["average"], 1),
            }
            for row in rows
        ]


def get_global_rating_summary() -> dict:
    """Return aggregate rating stats across all rated tools."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*) AS count,
                COALESCE(AVG(rating), 0) AS average
            FROM tool_ratings
            """
        ).fetchone()

    return {
        "rating_count": int(row["count"]) if row else 0,
        "average_rating": round(row["average"], 1) if row else 0.0,
    }
