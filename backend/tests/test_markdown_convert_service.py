"""Tests for file-to-Markdown service behavior."""

import os

import pytest

from app.services.markdown_convert_service import (
    MarkdownConversionError,
    convert_file_to_markdown,
)


def test_text_file_converts_to_markdown(tmp_path):
    input_path = tmp_path / "notes.txt"
    output_path = tmp_path / "out.md"
    input_path.write_text("hello from a text file", encoding="utf-8")

    result = convert_file_to_markdown(
        str(input_path),
        str(output_path),
        original_filename="notes.txt",
        ext="txt",
        work_dir=str(tmp_path),
    )

    assert result.method in {"markitdown", "native"}
    assert output_path.exists()
    assert "hello from a text file" in output_path.read_text(encoding="utf-8")
    assert result.char_count > 0


def test_csv_file_converts_to_markdown_table(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "app.services.markdown_convert_service._convert_with_markitdown",
        lambda _path: (_ for _ in ()).throw(MarkdownConversionError("disabled")),
    )
    input_path = tmp_path / "data.csv"
    output_path = tmp_path / "out.md"
    input_path.write_text("name,count\nalpha,2\nbeta,3\n", encoding="utf-8")

    result = convert_file_to_markdown(
        str(input_path),
        str(output_path),
        original_filename="data.csv",
        ext="csv",
        work_dir=str(tmp_path),
    )

    markdown = output_path.read_text(encoding="utf-8")
    assert result.method == "native"
    assert "| name | count |" in markdown
    assert "| alpha | 2 |" in markdown


def test_unsupported_file_raises_after_attempts(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "app.services.markdown_convert_service._convert_with_markitdown",
        lambda _path: (_ for _ in ()).throw(MarkdownConversionError("disabled")),
    )
    input_path = tmp_path / "binary.bin"
    output_path = tmp_path / "out.md"
    input_path.write_bytes(os.urandom(128))

    with pytest.raises(MarkdownConversionError):
        convert_file_to_markdown(
            str(input_path),
            str(output_path),
            original_filename="binary.bin",
            ext="bin",
            work_dir=str(tmp_path),
        )

    assert not output_path.exists()
