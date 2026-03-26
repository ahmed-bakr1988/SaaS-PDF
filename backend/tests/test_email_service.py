"""Tests for SMTP configuration normalization."""
from app.services.email_service import send_email


def test_placeholder_smtp_host_is_treated_as_unconfigured(app, monkeypatch):
    """A copied sample SMTP host should not trigger a network call."""
    with app.app_context():
        app.config.update({
            "SMTP_HOST": "smtp.your-provider.com",
            "SMTP_PORT": 587,
            "SMTP_USER": "noreply@dociva.io",
            "SMTP_PASSWORD": "replace-with-smtp-password",
        })

        def fail_if_called(*args, **kwargs):
            raise AssertionError("SMTP should not be contacted for placeholder config")

        monkeypatch.setattr("smtplib.SMTP", fail_if_called)
        assert send_email("user@example.com", "Subject", "<p>Body</p>") is False
