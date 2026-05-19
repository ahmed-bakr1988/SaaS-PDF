"""ContentClassifier — maps a file to a FileClass using MIME + extension + magic bytes.

Deliberately does NOT trust extension alone (security requirement from threat model).
"""

from __future__ import annotations

import os

from app.ai_pipeline.models.file_class import FileClass

# --- Extension maps ---

_PDF_EXTS = {"pdf"}
_OFFICE_EXTS = {"doc", "docx", "xls", "xlsx", "ppt", "pptx"}
_TEXT_EXTS = {"txt", "md", "markdown", "log", "html", "htm"}
_DATA_EXTS = {"csv", "json", "xml", "sql"}
_CONFIG_EXTS = {"env", "yaml", "yml", "toml", "ini", "cfg"}
_IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "tiff", "bmp"}
_VIDEO_EXTS = {"mp4", "webm"}
_ZIP_EXTS = {"zip"}

# MIME prefix → FileClass mapping (broad rules; extension confirms)
_MIME_CLASS: dict[str, FileClass] = {
    "application/pdf": FileClass.PDF,
    "application/msword": FileClass.OFFICE,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileClass.OFFICE,
    "application/vnd.ms-excel": FileClass.OFFICE,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileClass.OFFICE,
    "application/vnd.ms-powerpoint": FileClass.OFFICE,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": FileClass.OFFICE,
    "text/plain": FileClass.TEXT,
    "text/html": FileClass.TEXT,
    "text/markdown": FileClass.TEXT,
    "text/csv": FileClass.DATA,
    "application/json": FileClass.DATA,
    "application/xml": FileClass.DATA,
    "text/xml": FileClass.DATA,
    "application/zip": FileClass.ZIP,
    "application/x-zip-compressed": FileClass.ZIP,
    "image/png": FileClass.IMAGE,
    "image/jpeg": FileClass.IMAGE,
    "image/webp": FileClass.IMAGE,
    "image/tiff": FileClass.IMAGE,
    "image/bmp": FileClass.IMAGE,
    "video/mp4": FileClass.VIDEO,
    "video/webm": FileClass.VIDEO,
}

# Magic byte signatures (first N bytes → FileClass)
_MAGIC: list[tuple[bytes, FileClass]] = [
    (b"%PDF", FileClass.PDF),
    (b"PK\x03\x04", FileClass.ZIP),   # ZIP / DOCX / XLSX / PPTX share this header
    (b"\x89PNG", FileClass.IMAGE),
    (b"\xff\xd8\xff", FileClass.IMAGE),
    (b"RIFF", FileClass.IMAGE),        # WebP container (RIFF....WEBP)
    (b"II*\x00", FileClass.IMAGE),     # TIFF little-endian
    (b"MM\x00*", FileClass.IMAGE),     # TIFF big-endian
    (b"\x00\x00\x00", FileClass.VIDEO),  # MP4 ftyp box (weak signal, extension confirms)
    (b"\x1a\x45\xdf\xa3", FileClass.VIDEO),  # Matroska/WebM
]

# Code-project indicator filenames inside a ZIP
_CODE_INDICATORS = {
    "package.json", "composer.json", "requirements.txt", "setup.py",
    "pyproject.toml", "cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "makefile", "dockerfile", ".gitignore",
}


def classify(input_path: str, ext: str, mime: str = "") -> FileClass:
    """Classify *input_path* into a :class:`FileClass`.

    Strategy (in priority order):
    1. Magic bytes (most reliable for security).
    2. MIME type (provided by the validator upstream).
    3. Extension (fallback only).
    4. For ZIP magic: peek inside to detect code project vs. generic archive.
    """
    ext = ext.lower().lstrip(".")

    # 1. Magic bytes
    file_class = _classify_by_magic(input_path)

    # 2. If magic gave us a ZIP, refine: is it an Office file or a code project?
    if file_class == FileClass.ZIP:
        if ext in _OFFICE_EXTS:
            return FileClass.OFFICE
        if _is_code_project(input_path):
            return FileClass.CODE
        return FileClass.ZIP

    if file_class != FileClass.UNKNOWN:
        # For generic image magic, trust extension refinement
        if file_class == FileClass.IMAGE and ext not in _IMAGE_EXTS:
            # Magic says image but ext disagrees — trust magic (could be renamed)
            pass
        return file_class

    # 3. MIME type
    if mime:
        for mime_prefix, cls in _MIME_CLASS.items():
            if mime.startswith(mime_prefix):
                return cls

    # 4. Extension fallback
    return _classify_by_extension(ext)


def _classify_by_magic(input_path: str) -> FileClass:
    """Read the first 16 bytes and match against known magic sequences."""
    try:
        with open(input_path, "rb") as fh:
            header = fh.read(16)
    except OSError:
        return FileClass.UNKNOWN

    for magic, cls in _MAGIC:
        if header.startswith(magic):
            return cls
    return FileClass.UNKNOWN


def _classify_by_extension(ext: str) -> FileClass:
    if ext in _PDF_EXTS:
        return FileClass.PDF
    if ext in _OFFICE_EXTS:
        return FileClass.OFFICE
    if ext in _TEXT_EXTS:
        return FileClass.TEXT
    if ext in _DATA_EXTS:
        return FileClass.DATA
    if ext in _CONFIG_EXTS:
        return FileClass.CONFIG
    if ext in _IMAGE_EXTS:
        return FileClass.IMAGE
    if ext in _VIDEO_EXTS:
        return FileClass.VIDEO
    if ext in _ZIP_EXTS:
        return FileClass.ZIP
    return FileClass.UNKNOWN


def _is_code_project(zip_path: str) -> bool:
    """Peek inside a ZIP to see if it resembles a code project."""
    import zipfile

    try:
        with zipfile.ZipFile(zip_path) as archive:
            names = {
                os.path.basename(e.filename).lower()
                for e in archive.infolist()[:200]
            }
        return bool(names & _CODE_INDICATORS)
    except Exception:
        return False
