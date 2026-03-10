"""Tests for the rating API endpoints."""
import json

import pytest


class TestRatingRoutes:
    """Tests for /api/ratings endpoints."""

    def test_submit_rating_success(self, client):
        """POST /api/ratings/submit — valid rating."""
        resp = client.post(
            "/api/ratings/submit",
            json={"tool": "compress-pdf", "rating": 5, "tag": "fast"},
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert "message" in data

    def test_submit_rating_missing_tool(self, client):
        """POST /api/ratings/submit — missing tool."""
        resp = client.post(
            "/api/ratings/submit",
            json={"rating": 4},
        )
        assert resp.status_code == 400

    def test_submit_rating_invalid_score(self, client):
        """POST /api/ratings/submit — score out of range."""
        resp = client.post(
            "/api/ratings/submit",
            json={"tool": "merge-pdf", "rating": 0},
        )
        assert resp.status_code == 400

    def test_submit_rating_score_too_high(self, client):
        """POST /api/ratings/submit — score > 5."""
        resp = client.post(
            "/api/ratings/submit",
            json={"tool": "merge-pdf", "rating": 6},
        )
        assert resp.status_code == 400

    def test_get_tool_rating(self, client):
        """GET /api/ratings/tool/<slug> — returns summary."""
        # Submit a rating first
        client.post(
            "/api/ratings/submit",
            json={"tool": "split-pdf", "rating": 4},
        )
        resp = client.get("/api/ratings/tool/split-pdf")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["tool"] == "split-pdf"
        assert data["count"] >= 1
        assert 1 <= data["average"] <= 5

    def test_get_all_ratings(self, client):
        """GET /api/ratings/all — returns all tool summaries."""
        client.post(
            "/api/ratings/submit",
            json={"tool": "ocr", "rating": 5},
        )
        resp = client.get("/api/ratings/all")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "tools" in data
        assert len(data["tools"]) >= 1

    def test_get_tool_rating_no_data(self, client):
        """GET /api/ratings/tool/<slug> — tool with no ratings."""
        resp = client.get("/api/ratings/tool/nonexistent-tool")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["count"] == 0
        assert data["average"] == 0

    def test_submit_rating_with_feedback(self, client):
        """POST /api/ratings/submit — with text feedback."""
        resp = client.post(
            "/api/ratings/submit",
            json={
                "tool": "pdf-editor",
                "rating": 3,
                "tag": "issue",
                "feedback": "The editor was a bit slow but worked.",
            },
        )
        assert resp.status_code == 201
