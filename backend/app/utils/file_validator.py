"""File validation utilities — multi-layer security checks."""

import os

from flask import current_app
from werkzeug.utils import secure_filename


class FileValidationError(Exception):
    """Custom exception for file validation failures."""

    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(self.message)


def validate_file(
    file_storage,
    allowed_types: list[str] | None = None,
    size_limit_overrides: dict[str, int] | None = None,
):
    """
    Validate an uploaded file through multiple security layers.

    Args:
        file_storage: Flask FileStorage object from request.files
        allowed_types: List of allowed extensions (e.g., ["pdf", "docx"]).
                      If None, uses all allowed extensions from config.

    Returns:
        tuple: (sanitized_filename, detected_extension)

    Raises:
        FileValidationError: If validation fails at any layer.
    """
    config = current_app.config

    # Layer 1: Check if file exists and has a filename
    if not file_storage or file_storage.filename == "":
        raise FileValidationError("No file provided.")

    raw_filename = str(file_storage.filename).strip()
    if not raw_filename:
        raise FileValidationError("No file provided.")

    filename = secure_filename(raw_filename)
    allowed_extensions = config.get("ALLOWED_EXTENSIONS", {})

    if allowed_types:
        valid_extensions = {
            k: v for k, v in allowed_extensions.items() if k in allowed_types
        }
    else:
        valid_extensions = allowed_extensions

    # Layer 2: Reject clearly invalid extensions before touching file streams.
    ext = _get_extension(raw_filename) or _get_extension(filename)
    if ext and ext not in valid_extensions:
        raise FileValidationError(
            f"File type '.{ext}' is not allowed. "
            f"Allowed types: {', '.join(valid_extensions.keys())}"
        )

    # Layer 3: Check basic file size and header first so we can recover
    # from malformed filenames like ".pdf" or "." using content sniffing.
    file_storage.seek(0, os.SEEK_END)
    file_size = file_storage.tell()
    file_storage.seek(0)

    if file_size == 0:
        raise FileValidationError("File is empty.")

    file_header = file_storage.read(8192)
    file_storage.seek(0)

    detected_mime = _detect_mime(file_header)

    if not ext:
        ext = _infer_extension_from_content(
            file_header, detected_mime, valid_extensions
        )

    if raw_filename.startswith(".") and not _get_extension(filename):
        filename = ""

    if not filename:
        filename = f"upload.{ext}" if ext else "upload"

    if ext not in valid_extensions:
        raise FileValidationError(
            f"File type '.{ext}' is not allowed. "
            f"Allowed types: {', '.join(valid_extensions.keys())}"
        )

    # Layer 4: Check file size against type-specific limits
    size_limits = size_limit_overrides or config.get("FILE_SIZE_LIMITS", {})
    max_size = size_limits.get(ext, 20 * 1024 * 1024)  # Default 20MB

    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise FileValidationError(
            f"File too large. Maximum size for .{ext} files is {max_mb:.0f}MB."
        )

    # Layer 5: Check MIME type using magic bytes (if libmagic is available)
    if detected_mime:
        expected_mimes = valid_extensions.get(ext, [])

        if detected_mime not in expected_mimes:
            raise FileValidationError(
                f"File content does not match extension '.{ext}'. "
                f"Detected type: {detected_mime}"
            )

    # Layer 6: Additional content checks for specific types
    if ext == "pdf":
        _check_pdf_safety(file_header)

    return filename, ext


def _get_extension(filename: str) -> str:
    """Extract and normalize file extension."""
    filename = str(filename or "").strip()
    if not filename or "." not in filename:
        return ""
    stem, ext = filename.rsplit(".", 1)
    if not ext:
        return ""
    if not stem and filename.startswith("."):
        return ext.lower()
    return ext.lower()


def _detect_mime(file_header: bytes) -> str | None:
    """Detect MIME type lazily so environments without libmagic stay usable."""
    try:
        import magic as magic_module
    except (ImportError, OSError):
        return None

    try:
        return magic_module.from_buffer(file_header, mime=True)
    except Exception:
        return None


def _infer_extension_from_content(
    file_header: bytes,
    detected_mime: str | None,
    valid_extensions: dict[str, list[str]],
) -> str:
    """Infer a safe extension from MIME type or common signatures."""
    if detected_mime:
        for ext, mimes in valid_extensions.items():
            if detected_mime in mimes:
                return ext

    signature_map = {
        b"%PDF": "pdf",
        b"\x89PNG\r\n\x1a\n": "png",
        b"\xff\xd8\xff": "jpg",
        b"RIFF": "webp",
    }
    for signature, ext in signature_map.items():
        if file_header.startswith(signature) and ext in valid_extensions:
            return ext

    return ""


def _check_pdf_safety(file_header: bytes):
    """Check PDF for potentially dangerous embedded content."""
    dangerous_patterns = [b"/JS", b"/JavaScript", b"/Launch", b"/EmbeddedFile"]
    header_str = file_header

    for pattern in dangerous_patterns:
        if pattern in header_str:
            raise FileValidationError(
                "PDF contains potentially unsafe content (embedded scripts)."
            )
