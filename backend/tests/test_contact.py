"""Tests for the contact form endpoint."""
import pytest


class TestContactSubmission:
    """Tests for POST /api/contact/submit."""

    def test_submit_success(self, client):
        response = client.post("/api/contact/submit", json={
            "name": "Test User",
            "email": "test@example.com",
            "category": "general",
            "subject": "Test Subject",
            "message": "This is a test message body.",
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data["message"] == "Message sent successfully."
        assert "id" in data
        assert "created_at" in data

    def test_submit_missing_name(self, client):
        response = client.post("/api/contact/submit", json={
            "email": "test@example.com",
            "subject": "Test",
            "message": "Body",
        })
        assert response.status_code == 400
        assert "Name" in response.get_json()["error"]

    def test_submit_invalid_email(self, client):
        response = client.post("/api/contact/submit", json={
            "name": "User",
            "email": "not-an-email",
            "subject": "Test",
            "message": "Body",
        })
        assert response.status_code == 400
        assert "email" in response.get_json()["error"].lower()

    def test_submit_missing_subject(self, client):
        response = client.post("/api/contact/submit", json={
            "name": "User",
            "email": "test@example.com",
            "subject": "",
            "message": "Body",
        })
        assert response.status_code == 400
        assert "Subject" in response.get_json()["error"]

    def test_submit_missing_message(self, client):
        response = client.post("/api/contact/submit", json={
            "name": "User",
            "email": "test@example.com",
            "subject": "Test",
            "message": "",
        })
        assert response.status_code == 400
        assert "Message" in response.get_json()["error"]

    def test_submit_bug_category(self, client):
        response = client.post("/api/contact/submit", json={
            "name": "Bug Reporter",
            "email": "bug@example.com",
            "category": "bug",
            "subject": "Found a bug",
            "message": "The merge tool crashes on large files.",
        })
        assert response.status_code == 201

    def test_submit_invalid_category_defaults_to_general(self, client):
        response = client.post("/api/contact/submit", json={
            "name": "User",
            "email": "test@example.com",
            "category": "hacking",
            "subject": "Test",
            "message": "Body text here.",
        })
        assert response.status_code == 201
