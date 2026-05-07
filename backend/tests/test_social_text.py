"""Tests for the social media text analyzer endpoint and service."""

from flask import Flask
import pytest

from app.extensions import limiter
from app.routes.text import text_bp
from app.services.social_text_service import (
    MAX_TEXT_LENGTH,
    SocialTextValidationError,
    analyze_social_text,
)


@pytest.fixture
def client():
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        RATELIMIT_ENABLED=False,
    )
    limiter.init_app(app)
    app.register_blueprint(text_bp, url_prefix="/api/text")

    with app.test_client() as test_client:
        yield test_client


def test_social_text_service_detects_platform_fit():
    result = analyze_social_text(
        "Launching our new analytics dashboard today. Save this post, try the demo, "
        "and tell us which metric you want next. #analytics #saas"
    )

    assert result["stats"]["words"] > 10
    assert result["stats"]["hashtags"] == 2
    assert result["suggestions"]["top_priority"] in {"X", "LinkedIn", "Instagram", "Facebook", "TikTok"}
    assert len(result["platforms"]) == 5


def test_social_text_service_rejects_empty_text():
    try:
        analyze_social_text("   ")
    except SocialTextValidationError as exc:
        assert str(exc) == "Text is required."
    else:
        raise AssertionError("Expected SocialTextValidationError")


def test_social_text_endpoint_success(client):
    response = client.post(
        "/api/text/social-analyzer",
        json={"text": "Short launch update with CTA. Try it now. #launch"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["stats"]["hashtags"] == 1
    assert data["overall_score"] >= 0


def test_social_text_endpoint_rejects_large_payload(client):
    response = client.post(
        "/api/text/social-analyzer",
        json={"text": "x" * (MAX_TEXT_LENGTH + 1)},
    )

    assert response.status_code == 400
    assert "maximum allowed length" in response.get_json()["error"]
