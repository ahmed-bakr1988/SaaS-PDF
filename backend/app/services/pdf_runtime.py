"""Shared PDF runtime helpers with safe optional backends."""
import logging

from PIL import Image

logger = logging.getLogger(__name__)


class PdfRuntimeError(Exception):
    """Base error for shared PDF runtime helpers."""


class PdfPasswordProtectedError(PdfRuntimeError):
    """Raised when a PDF cannot be opened without a password."""


def get_pdf_reader_class():
    """Return the preferred PDF reader class with compatibility fallback."""
    try:
        from pypdf import PdfReader

        return PdfReader
    except ImportError:
        from PyPDF2 import PdfReader

        return PdfReader


def create_pdf_reader(source, **kwargs):
    """Create a PDF reader from either pypdf or PyPDF2."""
    return get_pdf_reader_class()(source, **kwargs)


def _ensure_reader_unlocked(reader) -> None:
    """Reject password-protected PDFs that cannot be opened anonymously."""
    if getattr(reader, "is_encrypted", False) and reader.decrypt("") == 0:
        raise PdfPasswordProtectedError("This PDF is password-protected.")


def count_pdf_pages(input_path: str) -> int:
    """Return page count using the compatible reader stack."""
    reader = create_pdf_reader(input_path)
    _ensure_reader_unlocked(reader)
    return len(reader.pages)


def extract_text_pages(input_path: str, max_pages: int | None = None) -> list[dict]:
    """Extract text page-by-page with a conservative fallback strategy."""
    reader = create_pdf_reader(input_path)
    _ensure_reader_unlocked(reader)

    limit = len(reader.pages) if max_pages is None else min(len(reader.pages), max_pages)
    pages = []

    for index in range(limit):
        text = reader.pages[index].extract_text() or ""
        pages.append({"page": index + 1, "text": text.strip()})

    if any(page["text"] for page in pages):
        return pages

    try:
        import pdfplumber

        fallback_pages = []
        with pdfplumber.open(input_path) as pdf:
            plumber_limit = len(pdf.pages) if max_pages is None else min(len(pdf.pages), max_pages)
            for index in range(plumber_limit):
                text = pdf.pages[index].extract_text() or ""
                fallback_pages.append({"page": index + 1, "text": text.strip()})

        if any(page["text"] for page in fallback_pages):
            return fallback_pages
    except PdfPasswordProtectedError:
        raise
    except Exception as exc:
        logger.debug("pdfplumber fallback failed for %s: %s", input_path, exc)

    return pages


def render_pdf_pages(input_path: str, dpi: int = 300) -> list[Image.Image]:
    """Render PDF pages to PIL images with PyMuPDF first, pdf2image fallback."""
    try:
        import fitz

        images = []
        doc = fitz.open(input_path)
        try:
            if getattr(doc, "is_encrypted", False) and not doc.authenticate(""):
                raise PdfPasswordProtectedError("This PDF is password-protected.")

            zoom = dpi / 72
            matrix = fitz.Matrix(zoom, zoom)
            for page in doc:
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                images.append(image)
        finally:
            doc.close()

        if images:
            return images
    except PdfPasswordProtectedError:
        raise
    except Exception as exc:
        logger.debug("PyMuPDF render failed for %s: %s", input_path, exc)

    from pdf2image import convert_from_path

    return convert_from_path(input_path, dpi=dpi)
