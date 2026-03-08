"""Email service — sends transactional emails via SMTP."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import current_app

logger = logging.getLogger(__name__)


def _get_smtp_config() -> dict:
    """Read SMTP settings from Flask config."""
    return {
        "host": current_app.config.get("SMTP_HOST", ""),
        "port": current_app.config.get("SMTP_PORT", 587),
        "user": current_app.config.get("SMTP_USER", ""),
        "password": current_app.config.get("SMTP_PASSWORD", ""),
        "from_addr": current_app.config.get("SMTP_FROM", "noreply@saas-pdf.com"),
        "use_tls": current_app.config.get("SMTP_USE_TLS", True),
    }


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send an HTML email. Returns True on success."""
    cfg = _get_smtp_config()

    if not cfg["host"]:
        logger.warning("SMTP not configured — email to %s suppressed.", to)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        if cfg["use_tls"]:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)

        if cfg["user"]:
            server.login(cfg["user"], cfg["password"])

        server.sendmail(cfg["from_addr"], [to], msg.as_string())
        server.quit()
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


def send_password_reset_email(to: str, token: str) -> bool:
    """Send a password reset link."""
    frontend = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend}/reset-password?token={token}"

    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Password Reset</h2>
      <p>You requested a password reset for your SaaS-PDF account.</p>
      <p><a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">
        Reset Password
      </a></p>
      <p style="color:#666;font-size:14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    return send_email(to, "Reset your SaaS-PDF password", html)
