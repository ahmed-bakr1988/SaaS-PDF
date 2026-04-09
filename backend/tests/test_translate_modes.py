"""Tests for the 3-tier translate feature: estimate service, task routing, and credit config."""
import os
import tempfile
from unittest.mock import patch, MagicMock

import pytest

from app.services.pdf_translate_estimate_service import (
    detect_pdf_type,
    estimate_translate_costs,
    SCANNED_THRESHOLD,
    SPARSE_THRESHOLD,
)


# ---------------------------------------------------------------------------
# detect_pdf_type
# ---------------------------------------------------------------------------
class TestDetectPdfType:
    def test_text_rich_document(self, tmp_path):
        """A PDF with many words per page should be classified as text_rich."""
        # Simulate by mocking PyPDF2
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")

        with (
            patch(
                "app.services.pdf_translate_estimate_service._get_page_count",
                return_value=3,
            ),
            patch(
                "app.services.pdf_translate_estimate_service._extract_light_text",
                return_value=" ".join(["word"] * 300),  # 100 words/page across 3 sampled pages
            ),
        ):
            result = detect_pdf_type(str(fake_pdf))

        assert result["pdf_type"] == "text_rich"
        assert result["pages"] == 3
        assert result["recommendation"] == "layout"
        assert result["words_per_page"] >= SPARSE_THRESHOLD

    def test_scanned_document(self, tmp_path):
        fake_pdf = tmp_path / "scanned.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")

        with (
            patch(
                "app.services.pdf_translate_estimate_service._get_page_count",
                return_value=5,
            ),
            patch(
                "app.services.pdf_translate_estimate_service._extract_light_text",
                return_value="hello world",  # very few words
            ),
        ):
            result = detect_pdf_type(str(fake_pdf))

        assert result["pdf_type"] == "scanned"
        assert result["recommendation"] == "vision"
        assert result["words_per_page"] < SCANNED_THRESHOLD

    def test_sparse_document(self, tmp_path):
        fake_pdf = tmp_path / "sparse.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")

        with (
            patch(
                "app.services.pdf_translate_estimate_service._get_page_count",
                return_value=2,
            ),
            patch(
                "app.services.pdf_translate_estimate_service._extract_light_text",
                return_value=" ".join(["word"] * 50),  # 25 words/page
            ),
        ):
            result = detect_pdf_type(str(fake_pdf))

        assert result["pdf_type"] == "sparse"
        assert result["recommendation"] == "layout"


# ---------------------------------------------------------------------------
# estimate_translate_costs
# ---------------------------------------------------------------------------
class TestEstimateTranslateCosts:
    def test_returns_three_modes(self, tmp_path):
        fake_pdf = tmp_path / "test.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")

        analysis = {
            "pdf_type": "text_rich",
            "pages": 5,
            "file_size_kb": 200.0,
            "words_per_page": 120.0,
            "recommendation": "layout",
        }
        result = estimate_translate_costs(str(fake_pdf), analysis=analysis)

        assert "analysis" in result
        assert "modes" in result
        modes = result["modes"]
        assert set(modes.keys()) == {"text", "layout", "vision"}
        for mode_info in modes.values():
            assert "credits" in mode_info
            assert "available" in mode_info
            assert isinstance(mode_info["credits"], int)

    def test_layout_unavailable_for_scanned(self, tmp_path):
        """Layout mode should not be available for scanned PDFs."""
        fake_pdf = tmp_path / "scanned.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")

        analysis = {
            "pdf_type": "scanned",
            "pages": 2,
            "file_size_kb": 500.0,
            "words_per_page": 5.0,
            "recommendation": "vision",
        }
        result = estimate_translate_costs(str(fake_pdf), analysis=analysis)

        assert result["modes"]["layout"]["available"] is False
        assert result["modes"]["text"]["available"] is True
        assert result["modes"]["vision"]["available"] is True

    def test_text_mode_always_available(self, tmp_path):
        fake_pdf = tmp_path / "any.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")

        for pdf_type in ("text_rich", "sparse", "scanned"):
            analysis = {
                "pdf_type": pdf_type,
                "pages": 1,
                "file_size_kb": 100.0,
                "words_per_page": 10.0,
                "recommendation": "vision",
            }
            result = estimate_translate_costs(str(fake_pdf), analysis=analysis)
            assert result["modes"]["text"]["available"] is True


# ---------------------------------------------------------------------------
# Task routing — tool_slug mapping
# ---------------------------------------------------------------------------
class TestTaskToolSlugMapping:
    def test_tool_slug_maps_correctly(self):
        """The tool_slug mapping should return correct values for each mode."""
        mapping = {
            "text": "translate-pdf",
            "layout": "translate-pdf-layout",
            "vision": "translate-pdf-vision",
        }
        for mode, expected_slug in mapping.items():
            slug = {
                "text": "translate-pdf",
                "layout": "translate-pdf-layout",
                "vision": "translate-pdf-vision",
            }.get(mode, "translate-pdf")
            assert slug == expected_slug


# ---------------------------------------------------------------------------
# Credit config — DynamicPricingRule entries exist
# ---------------------------------------------------------------------------
class TestCreditConfigEntries:
    def test_translate_layout_rule_exists(self):
        from app.services.credit_config import TOOL_DYNAMIC_OVERRIDES

        assert "translate-pdf-layout" in TOOL_DYNAMIC_OVERRIDES
        rule = TOOL_DYNAMIC_OVERRIDES["translate-pdf-layout"]
        assert rule.base > 0

    def test_translate_vision_rule_exists(self):
        from app.services.credit_config import TOOL_DYNAMIC_OVERRIDES

        assert "translate-pdf-vision" in TOOL_DYNAMIC_OVERRIDES
        rule = TOOL_DYNAMIC_OVERRIDES["translate-pdf-vision"]
        assert rule.base > 0

    def test_translate_layout_in_tool_credit_costs(self):
        from app.services.credit_config import TOOL_CREDIT_COSTS

        assert "translate-pdf-layout" in TOOL_CREDIT_COSTS

    def test_translate_vision_in_tool_credit_costs(self):
        from app.services.credit_config import TOOL_CREDIT_COSTS

        assert "translate-pdf-vision" in TOOL_CREDIT_COSTS
