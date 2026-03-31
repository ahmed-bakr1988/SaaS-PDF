"""Contact form service — stores messages and sends notification emails.

Supports both SQLite (development) and PostgreSQL (production).
"""

import logging
from datetime import datetime, timezone

from flask import current_app

from app.services.email_service import send_email
from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"general", "bug", "feature"}


def init_contact_db() -> None:
    """Create the contact_messages table if it doesn't exist."""
    with db_connection() as conn:
        if is_postgres():
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contact_messages (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'general',
                    subject TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE
                )
            """)
        else:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS contact_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'general',
                    subject TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_read INTEGER NOT NULL DEFAULT 0
                )
            """)


def save_message(
    name: str, email: str, category: str, subject: str, message: str
) -> dict:
    """Persist a contact message and send a notification email."""
    if category not in VALID_CATEGORIES:
        category = "general"

    now = datetime.now(timezone.utc).isoformat()

    with db_connection() as conn:
        sql = (
            """INSERT INTO contact_messages (name, email, category, subject, message, created_at)
           VALUES (%s, %s, %s, %s, %s, %s)
           RETURNING id"""
            if is_postgres()
            else """INSERT INTO contact_messages (name, email, category, subject, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?)"""
        )
        cursor = execute_query(
            conn, sql, (name, email, category, subject, message, now)
        )

        if is_postgres():
            result = cursor.fetchone()
            msg_id = result["id"] if result else None
        else:
            msg_id = cursor.lastrowid

    admin_emails = tuple(current_app.config.get("INTERNAL_ADMIN_EMAILS", ()))
    admin_email = (
        admin_emails[0]
        if admin_emails
        else current_app.config.get("SMTP_FROM", "noreply@dociva.io")
    )
    try:
        send_email(
            to=admin_email,
            subject=f"[Dociva Contact] [{category}] {subject}",
            html_body=f"""
            <h2>New Contact Message</h2>
            <p><strong>From:</strong> {name} &lt;{email}&gt;</p>
            <p><strong>Category:</strong> {category}</p>
            <p><strong>Subject:</strong> {subject}</p>
            <hr />
            <p>{message}</p>
            """,
        )
    except Exception:
        logger.exception("Failed to send contact notification email")

    return {"id": msg_id, "created_at": now}


def get_messages(page: int = 1, per_page: int = 20) -> dict:
    """Retrieve paginated contact messages (admin use)."""
    offset = (page - 1) * per_page

    with db_connection() as conn:
        cursor = execute_query(conn, "SELECT COUNT(*) FROM contact_messages")
        total = cursor.fetchone()[0]

        sql = (
            """SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT %s OFFSET %s"""
            if is_postgres()
            else """SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?"""
        )
        cursor2 = execute_query(conn, sql, (per_page, offset))
        rows = cursor2.fetchall()
        messages = [row_to_dict(r) for r in rows]

    return {
        "messages": messages,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def mark_read(message_id: int) -> bool:
    """Mark a contact message as read."""
    with db_connection() as conn:
        sql = (
            "UPDATE contact_messages SET is_read = TRUE WHERE id = %s"
            if is_postgres()
            else "UPDATE contact_messages SET is_read = 1 WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (message_id,))
    return cursor.rowcount > 0
