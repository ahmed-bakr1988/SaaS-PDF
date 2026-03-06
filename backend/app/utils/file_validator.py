"""File validation utilities — multi-layer security checks."""
import os

try:
    import magic
    HAS_MAGIC = True
except (ImportError, OSError):
    HAS_MAGIC = False

from flask import current_app
from werkzeug.utils import secure_filename


class FileValidationError(Exception):
    """Custom exception for file validation failures."""

    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(self.message)


def validate_file(file_storage, allowed_types: list[str] | None = None):
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

    filename = secure_filename(file_storage.filename)
    if not filename:
        raise FileValidationError("Invalid filename.")

    # Layer 2: Check file extension against whitelist
    ext = _get_extension(filename)
    allowed_extensions = config.get("ALLOWED_EXTENSIONS", {})

    if allowed_types:
        valid_extensions = {k: v for k, v in allowed_extensions.items() if k in allowed_types}
    else:
        valid_extensions = allowed_extensions

    if ext not in valid_extensions:
        raise FileValidationError(
            f"File type '.{ext}' is not allowed. "
            f"Allowed types: {', '.join(valid_extensions.keys())}"
        )

    # Layer 3: Check file size against type-specific limits
    file_storage.seek(0, os.SEEK_END)
    file_size = file_storage.tell()
    file_storage.seek(0)

    size_limits = config.get("FILE_SIZE_LIMITS", {})
    max_size = size_limits.get(ext, 20 * 1024 * 1024)  # Default 20MB

    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise FileValidationError(
            f"File too large. Maximum size for .{ext} files is {max_mb:.0f}MB."
        )

    if file_size == 0:
        raise FileValidationError("File is empty.")

    # Layer 4: Check MIME type using magic bytes (if libmagic is available)
    file_header = file_storage.read(8192)
    file_storage.seek(0)

    if HAS_MAGIC:
        detected_mime = magic.from_buffer(file_header, mime=True)
        expected_mimes = valid_extensions.get(ext, [])

        if detected_mime not in expected_mimes:
            raise FileValidationError(
                f"File content does not match extension '.{ext}'. "
                f"Detected type: {detected_mime}"
            )

    # Layer 5: Additional content checks for specific types
    if ext == "pdf":
        _check_pdf_safety(file_header)

    return filename, ext


def _get_extension(filename: str) -> str:
    """Extract and normalize file extension."""
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def _check_pdf_safety(file_header: bytes):
    """Check PDF for potentially dangerous embedded content."""
    dangerous_patterns = [b"/JS", b"/JavaScript", b"/Launch", b"/EmbeddedFile"]
    header_str = file_header

    for pattern in dangerous_patterns:
        if pattern in header_str:
            raise FileValidationError(
                "PDF contains potentially unsafe content (embedded scripts)."
            )
