"""Rating service — stores and aggregates user ratings per tool.

Supports both SQLite (development) and PostgreSQL (production).
"""

import logging
from datetime import datetime, timezone

from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict

logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_ratings_db():
    """Create ratings table if it does not exist."""
    with db_connection() as conn:
        if is_postgres():
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tool_ratings (
                    id SERIAL PRIMARY KEY,
                    tool TEXT NOT NULL,
                    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                    feedback TEXT DEFAULT '',
                    tag TEXT DEFAULT '',
                    fingerprint TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_tool_ratings_tool
                ON tool_ratings(tool)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_tool_ratings_fingerprint_tool
                ON tool_ratings(fingerprint, tool)
            """)
        else:
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
    today = now[:10]

    with db_connection() as conn:
        like_sql = "LIKE %s" if is_postgres() else "LIKE ?"
        sql = (
            f"""SELECT id FROM tool_ratings
           WHERE fingerprint = %s AND tool = %s AND created_at {like_sql}
           LIMIT 1"""
            if is_postgres()
            else f"""SELECT id FROM tool_ratings
           WHERE fingerprint = ? AND tool = ? AND created_at {like_sql}
           LIMIT 1"""
        )
        cursor = execute_query(conn, sql, (fingerprint, tool, f"{today}%"))
        existing = cursor.fetchone()

        if existing:
            existing = row_to_dict(existing)
            update_sql = (
                """UPDATE tool_ratings
               SET rating = %s, feedback = %s, tag = %s, created_at = %s
               WHERE id = %s"""
                if is_postgres()
                else """UPDATE tool_ratings
               SET rating = ?, feedback = ?, tag = ?, created_at = ?
               WHERE id = ?"""
            )
            execute_query(
                conn, update_sql, (rating, feedback, tag, now, existing["id"])
            )
        else:
            insert_sql = (
                """INSERT INTO tool_ratings (tool, rating, feedback, tag, fingerprint, created_at)
               VALUES (%s, %s, %s, %s, %s, %s)"""
                if is_postgres()
                else """INSERT INTO tool_ratings (tool, rating, feedback, tag, fingerprint, created_at)
               VALUES (?, ?, ?, ?, ?, ?)"""
            )
            execute_query(
                conn, insert_sql, (tool, rating, feedback, tag, fingerprint, now)
            )


def get_tool_rating_summary(tool: str) -> dict:
    """Return aggregate rating data for one tool."""
    with db_connection() as conn:
        sql = (
            """SELECT
             COUNT(*) as count,
             COALESCE(AVG(rating), 0) as average,
             COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) as star5,
             COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) as star4,
             COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) as star3,
             COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) as star2,
             COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) as star1
           FROM tool_ratings WHERE tool = %s"""
            if is_postgres()
            else """SELECT
             COUNT(*) as count,
             COALESCE(AVG(rating), 0) as average,
             COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) as star5,
             COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) as star4,
             COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) as star3,
             COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) as star2,
             COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) as star1
           FROM tool_ratings WHERE tool = ?"""
        )
        cursor = execute_query(conn, sql, (tool,))
        row = row_to_dict(cursor.fetchone())

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
    with db_connection() as conn:
        sql = """SELECT
             tool,
             COUNT(*) as count,
             COALESCE(AVG(rating), 0) as average
           FROM tool_ratings
           GROUP BY tool
           ORDER BY count DESC"""
        cursor = execute_query(conn, sql)
        rows = [row_to_dict(r) for r in cursor.fetchall()]

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
    with db_connection() as conn:
        sql = """
            SELECT
                COUNT(*) AS count,
                COALESCE(AVG(rating), 0) AS average
            FROM tool_ratings
        """
        cursor = execute_query(conn, sql)
        row = row_to_dict(cursor.fetchone())

    return {
        "rating_count": int(row["count"]) if row else 0,
        "average_rating": round(row["average"], 1) if row else 0.0,
    }
