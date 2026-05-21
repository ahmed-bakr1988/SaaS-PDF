"""Tests for the AI Context Optimization Engine — pipeline components."""

from __future__ import annotations

import os
import zipfile

import pytest


# ─── ContentClassifier ────────────────────────────────────────────────────────

class TestContentClassifier:
    def _cls(self, *args, **kwargs):
        from app.ai_pipeline.classifiers.content_classifier import classify
        return classify(*args, **kwargs)

    def test_classifies_pdf_by_magic(self, tmp_path):
        f = tmp_path / "doc.pdf"
        f.write_bytes(b"%PDF-1.4 ...")
        result = self._cls(str(f), "pdf")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.PDF

    def test_classifies_txt_by_extension(self, tmp_path):
        f = tmp_path / "notes.txt"
        f.write_text("hello")
        result = self._cls(str(f), "txt")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.TEXT

    def test_classifies_csv_as_data(self, tmp_path):
        f = tmp_path / "data.csv"
        f.write_text("a,b\n1,2")
        result = self._cls(str(f), "csv")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.DATA

    def test_classifies_image_png_by_magic(self, tmp_path):
        f = tmp_path / "photo.png"
        f.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
        result = self._cls(str(f), "png")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.IMAGE

    def test_classifies_zip_generic(self, tmp_path):
        z = tmp_path / "archive.zip"
        with zipfile.ZipFile(z, "w") as archive:
            archive.writestr("readme.txt", "hello")
        result = self._cls(str(z), "zip")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.ZIP

    def test_classifies_code_project_zip(self, tmp_path):
        z = tmp_path / "project.zip"
        with zipfile.ZipFile(z, "w") as archive:
            archive.writestr("package.json", '{"name":"test"}')
            archive.writestr("src/index.js", "console.log('hi')")
        result = self._cls(str(z), "zip")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.CODE

    def test_classifies_env_as_config(self, tmp_path):
        f = tmp_path / ".env"
        f.write_text("DB_PASSWORD=secret")
        result = self._cls(str(f), "env")
        from app.ai_pipeline.models.file_class import FileClass
        assert result == FileClass.CONFIG


# ─── SensitiveDataCleaner ─────────────────────────────────────────────────────

class TestSensitiveDataCleaner:
    def _clean(self, text: str):
        from app.ai_pipeline.sanitizers.sensitive_data_cleaner import clean
        return clean(text)

    def test_redacts_api_key(self):
        text = "api_key = sk-abc123xyz456def789ghi"
        cleaned, removed = self._clean(text)
        assert "sk-abc123" not in cleaned
        assert "[REDACTED]" in cleaned

    def test_redacts_password(self):
        text = "password=supersecret123"
        cleaned, removed = self._clean(text)
        assert "supersecret123" not in cleaned
        assert "password" in removed

    def test_redacts_openai_key(self):
        text = "key: sk-abcdefghijklmnopqrstuvwxyz123"
        cleaned, removed = self._clean(text)
        assert "sk-abcdefghijklmnopqrstuvwxyz123" not in cleaned
        assert "openai_key" in removed

    def test_redacts_github_token(self):
        text = "token = ghp_" + "a" * 36
        cleaned, removed = self._clean(text)
        assert "ghp_" + "a" * 36 not in cleaned

    def test_clean_text_unchanged(self):
        text = "This is a normal document with no secrets."
        cleaned, removed = self._clean(text)
        assert cleaned == text
        assert removed == []


# ─── TokenOptimizer ───────────────────────────────────────────────────────────

class TestTokenOptimizer:
    def _opt(self, text: str):
        from app.ai_pipeline.optimizers.token_optimizer import optimize
        return optimize(text)

    def test_collapses_blank_lines(self):
        text = "line1\n\n\n\n\nline2"
        result, noise = self._opt(text)
        assert "\n\n\n" not in result
        assert "excessive_blank_lines" in noise

    def test_removes_separator_lines(self):
        text = "Section\n------\nContent"
        result, noise = self._opt(text)
        assert "------" not in result
        assert "separator_lines" in noise

    def test_clean_text_unchanged(self):
        text = "# Heading\n\nSome content here."
        result, noise = self._opt(text)
        assert "# Heading" in result
        assert noise == []


# ─── LogOptimizer ─────────────────────────────────────────────────────────────

class TestLogOptimizer:
    def _opt(self, text: str):
        from app.ai_pipeline.optimizers.log_optimizer import optimize
        return optimize(text)

    def test_summarizes_large_log(self):
        # Create a log with >2000 lines
        lines = ["2024-01-01 INFO Starting up"] * 1000
        lines += ["2024-01-01 ERROR Database connection failed"] * 5
        lines += ["2024-01-01 WARNING Slow query"] * 3
        text = "\n".join(lines)
        result, noise = self._opt(text)
        assert "## Log Summary" in result
        assert "repetitive_log_lines" in noise
        assert "Error Samples" in result

    def test_small_log_passes_through(self):
        text = "\n".join(["INFO Starting"] * 10)
        result, noise = self._opt(text)
        # Small log: just token_optimizer pass-through
        assert "INFO Starting" in result


# ─── SemanticChunker ──────────────────────────────────────────────────────────

class TestSemanticChunker:
    def _chunk(self, markdown: str):
        from app.ai_pipeline.chunkers.semantic_chunker import chunk
        return chunk(markdown)

    def test_splits_on_h2_headings(self):
        md = "## Section A\n\nContent A\n\n## Section B\n\nContent B"
        chunks = self._chunk(md)
        assert len(chunks) == 2
        assert chunks[0].section == "Section A"
        assert chunks[1].section == "Section B"

    def test_single_section_no_heading(self):
        md = "Just some raw content without headings."
        chunks = self._chunk(md)
        assert len(chunks) >= 1
        assert "Content" in chunks[0].section or chunks[0].markdown

    def test_token_estimate_calculated(self):
        md = "## Test\n\n" + "word " * 100
        chunks = self._chunk(md)
        assert chunks[0].token_estimate > 0

    def test_chunk_to_dict(self):
        from app.ai_pipeline.models.chunk import Chunk
        c = Chunk.from_markdown("Auth", "## Auth\n\nContent here")
        d = c.to_dict()
        assert d["section"] == "Auth"
        assert "token_estimate" in d


# ─── BasePipeline end-to-end (TXT file) ───────────────────────────────────────

class TestBasePipelineWithTextFile:
    def test_txt_file_produces_ai_context_result(self, tmp_path):
        input_f = tmp_path / "notes.txt"
        output_f = tmp_path / "out.md"
        input_f.write_text("Hello from a text file\nLine two", encoding="utf-8")

        from app.ai_pipeline.pipelines.base_pipeline import run
        result = run(
            str(input_f),
            str(output_f),
            original_filename="notes.txt",
            ext="txt",
        )

        assert output_f.exists()
        assert result.char_count > 0
        assert result.markdown
        assert result.metrics is not None
        assert result.metrics.token_estimate > 0
        assert isinstance(result.chunks, list)
        assert result.prompt  # PromptEngine always returns something

    def test_metrics_has_required_fields(self, tmp_path):
        input_f = tmp_path / "data.csv"
        output_f = tmp_path / "out.md"
        input_f.write_text("name,score\nalice,90\nbob,85", encoding="utf-8")

        from app.ai_pipeline.pipelines.base_pipeline import run
        result = run(
            str(input_f),
            str(output_f),
            original_filename="data.csv",
            ext="csv",
        )

        m = result.metrics.to_dict()
        assert "token_estimate" in m
        assert "token_reduction_pct" in m
        assert "estimated_cost_saved_usd" in m
        assert "ai_readability_score" in m
        assert "conversion_method" in m


# ─── Backward compat: service adapter ─────────────────────────────────────────

class TestServiceAdapterBackwardCompat:
    def test_convert_file_to_markdown_returns_result_with_method(self, tmp_path):
        from app.services.markdown_convert_service import convert_file_to_markdown

        input_f = tmp_path / "hello.txt"
        output_f = tmp_path / "hello.md"
        input_f.write_text("backward compat test", encoding="utf-8")

        result = convert_file_to_markdown(
            str(input_f),
            str(output_f),
            original_filename="hello.txt",
            ext="txt",
            work_dir=str(tmp_path),
        )

        assert result.method
        assert result.char_count > 0
        assert "backward compat test" in result.markdown or output_f.exists()

    def test_monkeypatch_target_still_resolves(self, monkeypatch):
        """Ensure test_markdown_convert_service.py monkeypatches still work."""
        from app.services import markdown_convert_service

        patched = []
        monkeypatch.setattr(
            "app.services.markdown_convert_service._convert_with_markitdown",
            lambda path: patched.append(path) or "patched",
        )
        assert hasattr(markdown_convert_service, "_convert_with_markitdown")


# ─── ZipAnalyzer security ─────────────────────────────────────────────────────

class TestZipAnalyzerSecurity:
    def test_rejects_path_traversal(self, tmp_path):
        z = tmp_path / "evil.zip"
        with zipfile.ZipFile(z, "w") as archive:
            archive.writestr("../../../etc/passwd", "root:x:0:0")

        from app.ai_pipeline.analyzers.zip_analyzer import analyze
        from app.services.markdown_convert_service import MarkdownConversionError

        with pytest.raises(MarkdownConversionError):
            analyze(str(z), "evil.zip")

    def test_accepts_clean_zip(self, tmp_path):
        z = tmp_path / "clean.zip"
        with zipfile.ZipFile(z, "w") as archive:
            archive.writestr("readme.txt", "Hello world")

        from app.ai_pipeline.analyzers.zip_analyzer import analyze
        result = analyze(str(z), "clean.zip")
        assert "readme.txt" in result


# ─── PromptEngine ─────────────────────────────────────────────────────────────

class TestPromptEngine:
    def test_generates_prompt_for_each_file_class(self):
        from app.ai_pipeline.models.file_class import FileClass
        from app.ai_pipeline.prompts.prompt_engine import generate

        for fc in FileClass:
            prompt = generate(fc)
            assert isinstance(prompt, str)
            assert len(prompt) > 10

    def test_code_prompt_mentions_architecture(self):
        from app.ai_pipeline.models.file_class import FileClass
        from app.ai_pipeline.prompts.prompt_engine import generate

        prompt = generate(FileClass.CODE)
        assert "architecture" in prompt.lower() or "framework" in prompt.lower()
