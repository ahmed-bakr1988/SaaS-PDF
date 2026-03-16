"""Tests for public stats summary endpoint."""

from app.services.account_service import create_user, record_file_history
from app.services.rating_service import submit_rating


class TestStatsSummary:
    def test_summary_returns_processing_and_rating_totals(self, app, client):
        with app.app_context():
            user = create_user("stats@example.com", "testpass123")

            record_file_history(
                user_id=user["id"],
                tool="compress-pdf",
                original_filename="input.pdf",
                output_filename="output.pdf",
                status="completed",
                download_url="https://example.com/file.pdf",
            )
            record_file_history(
                user_id=user["id"],
                tool="compress-pdf",
                original_filename="input-2.pdf",
                output_filename="output-2.pdf",
                status="completed",
                download_url="https://example.com/file-2.pdf",
            )
            record_file_history(
                user_id=user["id"],
                tool="repair-pdf",
                original_filename="broken.pdf",
                output_filename=None,
                status="failed",
                download_url=None,
                metadata={"error": "Repair failed."},
            )

            submit_rating("compress-pdf", 5, fingerprint="stats-a")
            submit_rating("repair-pdf", 4, fingerprint="stats-b")

        response = client.get("/api/stats/summary")
        assert response.status_code == 200

        data = response.get_json()
        assert data["total_files_processed"] == 3
        assert data["completed_files"] == 2
        assert data["failed_files"] == 1
        assert data["success_rate"] == 66.7
        assert data["files_last_24h"] == 3
        assert data["rating_count"] == 2
        assert data["average_rating"] == 4.5
        assert data["top_tools"][0] == {"tool": "compress-pdf", "count": 2}