"""Contact form service — stores messages and sends notification emails."""
import logging
import os
import sqlite3
from datetime import datetime, timezone

from flask import current_app

from app.services.email_service import send_email

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"general", "bug", "feature"}


def _connect() -> sqlite3.Connection:
    db_path = current_app.config["DATABASE_PATH"]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_contact_db() -> None:
    """Create the contact_messages table if it doesn't exist."""
    conn = _connect()
    try:
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
        conn.commit()
    finally:
        conn.close()


def save_message(name: str, email: str, category: str, subject: str, message: str) -> dict:
    """Persist a contact message and send a notification email."""
    if category not in VALID_CATEGORIES:
        category = "general"

    now = datetime.now(timezone.utc).isoformat()
    conn = _connect()
    try:
        cursor = conn.execute(
            """INSERT INTO contact_messages (name, email, category, subject, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, email, category, subject, message, now),
        )
        conn.commit()
        msg_id = cursor.lastrowid
    finally:
        conn.close()

    # Send notification email to admin
    admin_email = current_app.config.get("SMTP_FROM", "noreply@saas-pdf.com")
    try:
        send_email(
            to=admin_email,
            subject=f"[SaaS-PDF Contact] [{category}] {subject}",
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
    conn = _connect()
    try:
        total = conn.execute("SELECT COUNT(*) FROM contact_messages").fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (per_page, offset),
        ).fetchall()
        messages = [dict(r) for r in rows]
    finally:
        conn.close()

    return {
        "messages": messages,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def mark_read(message_id: int) -> bool:
    """Mark a contact message as read."""
    conn = _connect()
    try:
        result = conn.execute(
            "UPDATE contact_messages SET is_read = 1 WHERE id = ?",
            (message_id,),
        )
        conn.commit()
        return result.rowcount > 0
    finally:
        conn.close()
