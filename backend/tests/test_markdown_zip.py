"""Tests for the Markdown ZIP packaging and OCR image extraction functionality."""

import os
import tempfile
import zipfile
import json
from unittest.mock import MagicMock, patch

from app.tasks.markdown_convert_tasks import convert_file_to_markdown_task
from app.utils.ocr_image_extractor import extract_ocr_images


def test_ocr_image_extractor_image(tmp_path):
    """Should copy the image itself when given an image input."""
    input_file = tmp_path / "test.png"
    input_file.write_bytes(b"dummy image data")
    
    output_dir = tmp_path / "ocr_images"
    
    count = extract_ocr_images(str(input_file), "png", str(output_dir))
    assert count == 1
    assert os.path.exists(output_dir / "image_1.png")
    assert (output_dir / "image_1.png").read_bytes() == b"dummy image data"


def test_ocr_image_extractor_office(tmp_path):
    """Should extract media items from a mock DOCX ZIP file."""
    # Build a dummy docx (which is a ZIP file)
    docx_path = tmp_path / "test.docx"
    with zipfile.ZipFile(docx_path, "w") as zf:
        zf.writestr("word/media/image1.png", b"office image bytes")
        zf.writestr("word/document.xml", b"<xml></xml>")
        
    output_dir = tmp_path / "ocr_images"
    count = extract_ocr_images(str(docx_path), "docx", str(output_dir))
    assert count == 1
    extracted_files = os.listdir(output_dir)
    assert len(extracted_files) == 1
    assert extracted_files[0].endswith("image1.png")
    assert (output_dir / extracted_files[0]).read_bytes() == b"office image bytes"


def test_convert_file_to_markdown_task_packages_zip(app, tmp_path, monkeypatch):
    """Task should perform Markdown conversion, export JSON, extract images, package ZIP, and store URLs."""
    # Setup dummy input file
    input_file = tmp_path / "document.txt"
    input_file.write_text("Hello project context converter. Let's make sure ZIP packaging works!")
    
    task_id = "test-zip-task-123"
    original_filename = "document.txt"
    ext = "txt"
    
    # Mock base_pipeline.run to return dummy result
    mock_run = MagicMock()
    from app.ai_pipeline.models.ai_context_result import AIContextResult, AIContextMetrics
    mock_metrics = AIContextMetrics(
        original_size_bytes=100,
        output_size_bytes=50,
        char_count=50,
        token_estimate=12,
        token_reduction_pct=50,
        estimated_cost_saved_usd=0.0001,
        noise_removed=["noise1"],
        ai_readability_score=85,
        conversion_method="text_analyzer",
    )
    
    from app.ai_pipeline.models.chunk import Chunk
    mock_result = AIContextResult(
        markdown="# Generated Context\n\nHello project context converter.",
        method="text_analyzer",
        char_count=50,
        chunks=[Chunk.from_markdown("Header", "Hello project context converter.")],
        prompt="Tell me about the document",
        metrics=mock_metrics,
    )
    monkeypatch.setattr("app.ai_pipeline.pipelines.base_pipeline.run", mock_run)
    mock_run.return_value = mock_result

    # Mock celery task self update_state
    mock_self = MagicMock()
    mock_self.request.id = "celery-id-123"

    with app.app_context():
        # Execute run conversion using our task helper
        from app.tasks.markdown_convert_tasks import _run_markdown_conversion
        result = _run_markdown_conversion(
            mock_self,
            input_path=str(input_file),
            task_id=task_id,
            original_filename=original_filename,
            ext=ext,
            user_id=1,
            usage_source="web",
        )
        
        assert result["status"] == "completed"
        assert result["format"] == "zip"
        assert "document.zip" in result["filename"]
        
        # Verify the ZIP contains MD and JSON files
        output_dir = os.path.join(app.config["OUTPUT_FOLDER"], task_id)
        zip_file_path = os.path.join(output_dir, f"{task_id}.zip")
        assert os.path.exists(zip_file_path)
        
        with zipfile.ZipFile(zip_file_path, "r") as zf:
            namelist = zf.namelist()
            assert "document.md" in namelist
            assert "document.json" in namelist
            
            # Read content from the JSON inside the zip
            json_content = json.loads(zf.read("document.json"))
            assert json_content["metadata"]["title"] == "document"
            assert "chunks" in json_content
            assert json_content["suggested_prompt"] == "Tell me about the document"
            
        # Verify individual download URLs are present in result dict
        assert "download_url_md" in result
        assert "download_url_json" in result
        assert result["download_url_md"].endswith("name=document.md")
        assert result["download_url_json"].endswith("name=document.json")
