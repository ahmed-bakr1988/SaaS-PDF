"""Tests for the resilient PDF translation workflow."""

from app.services.pdf_ai_service import DeepLSettings, PdfAiError, translate_pdf


def test_translate_pdf_prefers_premium_provider(monkeypatch):
    """Should use the premium provider when configured and available."""
    monkeypatch.setattr(
        "app.services.pdf_ai_service._extract_text_from_pdf",
        lambda _path: "[Page 1]\nHello world\n\n[Page 2]\nSecond page",
    )
    monkeypatch.setattr(
        "app.services.pdf_ai_service._get_deepl_settings",
        lambda: DeepLSettings(
            api_key="key",
            base_url="https://api-free.deepl.com/v2/translate",
            timeout_seconds=90,
        ),
    )
    monkeypatch.setattr(
        "app.services.pdf_ai_service._translate_with_retry",
        lambda action, provider_name: action(),
    )
    monkeypatch.setattr(
        "app.services.pdf_ai_service._call_deepl_translate",
        lambda chunk, target_language, source_language=None: {
            "translation": f"translated::{chunk}",
            "provider": "deepl",
            "detected_source_language": "en",
        },
    )

    result = translate_pdf("/tmp/demo.pdf", "fr", source_language="en")

    assert result["provider"] == "deepl"
    assert result["target_language"] == "fr"
    assert result["detected_source_language"] == "en"
    assert "translated::" in result["translation"]


def test_translate_pdf_falls_back_when_premium_provider_fails(monkeypatch):
    """Should fall back to Gemini if the premium provider fails."""
    monkeypatch.setattr(
        "app.services.pdf_ai_service._extract_text_from_pdf",
        lambda _path: "[Page 1]\nHello world",
    )
    monkeypatch.setattr(
        "app.services.pdf_ai_service._get_deepl_settings",
        lambda: DeepLSettings(
            api_key="key",
            base_url="https://api-free.deepl.com/v2/translate",
            timeout_seconds=90,
        ),
    )
    monkeypatch.setattr(
        "app.services.pdf_ai_service._translate_with_retry",
        lambda action, provider_name: action(),
    )

    def fail_deepl(*_args, **_kwargs):
        raise PdfAiError("DeepL unavailable", error_code="DEEPL_SERVER_ERROR")

    monkeypatch.setattr("app.services.pdf_ai_service._call_deepl_translate", fail_deepl)
    monkeypatch.setattr(
        "app.services.pdf_ai_service._call_openrouter_translate",
        lambda chunk, target_language, source_language=None, model_id=None: {
            "translation": f"fallback::{chunk}",
            "provider": "gemini",
            "detected_source_language": "en",
        },
    )

    result = translate_pdf("/tmp/demo.pdf", "de", source_language="auto")

    assert result["provider"] == "gemini"
    assert result["detected_source_language"] == "en"
    assert result["translation"].startswith("fallback::")


def test_translate_pdf_rejects_identical_languages(monkeypatch):
    """Should reject no-op translation requests."""
    monkeypatch.setattr(
        "app.services.pdf_ai_service._extract_text_from_pdf",
        lambda _path: "[Page 1]\nHello world",
    )

    try:
        translate_pdf("/tmp/demo.pdf", "fr", source_language="fr")
    except PdfAiError as error:
        assert error.error_code == "PDF_AI_INVALID_INPUT"
        assert "different source and target languages" in error.user_message
    else:
        raise AssertionError("Expected identical language validation to fail")
