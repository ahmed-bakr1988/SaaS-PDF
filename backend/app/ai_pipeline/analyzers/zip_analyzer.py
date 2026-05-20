"""ZipAnalyzer — indexes ZIP archives; detects code projects vs. generic archives.

Security hardening:
- Entry count limit: 256
- Per-entry size limit: 100MB
- Path traversal check: rejects entries with '..' in filename
- Compression ratio check: rejects if uncompressed/compressed > 50 (ZIP bomb)
"""

from __future__ import annotations

import logging
import os
import zipfile

from app.ai_pipeline.utils.md_helpers import rows_to_md
from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

_MAX_ENTRIES = 256
_MAX_ENTRY_SIZE = 100 * 1024 * 1024   # 100MB
_MAX_RATIO = 50                         # compression ratio limit (ZIP bomb)

# Files that indicate a code project
_CODE_INDICATORS = {
    "package.json", "composer.json", "requirements.txt", "setup.py",
    "pyproject.toml", "cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "makefile", "dockerfile", ".gitignore",
}

# Directories to skip in code projects
_SKIP_DIRS = {
    "node_modules", "vendor", "build", "dist", ".git",
    "__pycache__", ".pytest_cache", ".venv", "venv",
}


def analyze(input_path: str, original_filename: str) -> str:
    """Produce a markdown index of the ZIP archive."""
    logger.debug("ZipAnalyzer: processing %s", original_filename)

    try:
        with zipfile.ZipFile(input_path) as archive:
            entries = archive.infolist()
    except zipfile.BadZipFile as exc:
        raise MarkdownConversionError("ZIP archive could not be read.") from exc

    if len(entries) > _MAX_ENTRIES:
        raise MarkdownConversionError(
            f"ZIP archive has too many entries ({len(entries)} > {_MAX_ENTRIES})."
        )

    _validate_entries(entries)

    is_code = _looks_like_code_project(entries)
    if is_code:
        return _code_project_index(entries, input_path, original_filename)
    return _generic_index(entries, original_filename)


def _validate_entries(entries: list[zipfile.ZipInfo]) -> None:
    """Raise MarkdownConversionError for any security violation."""
    for entry in entries:
        # Path traversal
        if ".." in entry.filename or entry.filename.startswith("/"):
            raise MarkdownConversionError(
                f"ZIP contains unsafe path: {entry.filename!r}"
            )
        # Oversized entry
        if entry.file_size > _MAX_ENTRY_SIZE:
            raise MarkdownConversionError(
                f"ZIP entry exceeds size limit: {entry.filename!r}"
            )
        # Compression ratio (ZIP bomb)
        if entry.compress_size > 0:
            ratio = entry.file_size / entry.compress_size
            if ratio > _MAX_RATIO:
                raise MarkdownConversionError(
                    f"ZIP entry has suspicious compression ratio ({ratio:.0f}:1): "
                    f"{entry.filename!r}"
                )


def _looks_like_code_project(entries: list[zipfile.ZipInfo]) -> bool:
    names = {os.path.basename(e.filename).lower() for e in entries}
    return bool(names & _CODE_INDICATORS)


# Files whose content is worth reading for AI context
_IMPORTANT_FILES = {
    "readme.md", "readme.txt", "readme",
    "package.json", "requirements.txt", "pyproject.toml",
    "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".env.example", "config.json", "setup.py", "setup.cfg",
    "cargo.toml", "go.mod", "pom.xml",
}
_MAX_FILE_CONTENT_SIZE = 10_000  # 10KB per file
_MAX_FILES_TO_READ = 5


def _code_project_index(
    entries: list[zipfile.ZipInfo], archive_path: str, original_filename: str
) -> str:
    """Produce an AI-friendly project structure summary with key file contents."""
    dirs: dict[str, int] = {}
    files: list[str] = []

    for entry in entries:
        parts = entry.filename.replace("\\", "/").split("/")
        # Skip noise directories
        if any(p in _SKIP_DIRS for p in parts):
            continue
        if entry.filename.endswith("/"):
            top = parts[0] if parts else ""
            if top:
                dirs[top] = dirs.get(top, 0) + 1
        else:
            files.append(entry.filename)

    lines = [
        f"# Project: {original_filename}",
        "",
        "## Directory Structure",
        "",
    ]
    for d, count in sorted(dirs.items()):
        lines.append(f"- `{d}/` ({count} items)")
    lines += [
        "",
        "## Source Files",
        "",
    ]
    for f in sorted(files)[:200]:
        lines.append(f"- `{f}`")

    # Read important files for richer AI context
    key_contents = _read_important_files(entries, archive_path)
    if key_contents:
        lines += ["", "## Key File Contents", ""]
        lines.extend(key_contents)

    return "\n".join(lines)


def _read_important_files(
    entries: list[zipfile.ZipInfo], archive_path: str
) -> list[str]:
    """Read the content of important project files (README, config, etc.)."""
    sections: list[str] = []
    read_count = 0

    try:
        with zipfile.ZipFile(archive_path) as archive:
            for entry in entries:
                if read_count >= _MAX_FILES_TO_READ:
                    break
                basename = os.path.basename(entry.filename).lower()
                if (
                    basename in _IMPORTANT_FILES
                    and entry.file_size < _MAX_FILE_CONTENT_SIZE
                    and not entry.filename.endswith("/")
                ):
                    try:
                        raw = archive.read(entry.filename)
                        content = raw.decode("utf-8", errors="replace").strip()
                        if content:
                            sections.append(
                                f"### {entry.filename}\n\n```\n{content}\n```"
                            )
                            read_count += 1
                    except Exception:
                        continue
    except Exception:
        pass

    return sections


def _generic_index(entries: list[zipfile.ZipInfo], original_filename: str) -> str:
    rows = [["Path", "Size (bytes)"]]
    for entry in entries:
        rows.append([entry.filename, str(entry.file_size)])
    return f"## Archive Contents: {original_filename}\n\n" + rows_to_md(rows)
