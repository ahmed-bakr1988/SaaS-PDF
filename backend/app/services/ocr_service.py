"""OCR service — extract text from images and PDFs using Tesseract."""
import logging
import os
import subprocess
import tempfile

from PIL import Image

logger = logging.getLogger(__name__)


class OCRError(Exception):
    """Custom exception for OCR failures."""
    pass


# Tesseract language codes
SUPPORTED_LANGUAGES = {
    "eng": "English",
    "ara": "Arabic",
    "fra": "French",
}

DEFAULT_LANG = "eng"


def _get_tesseract_cmd() -> str:
    """Return the tesseract binary path."""
    return os.getenv("TESSERACT_CMD", "tesseract")


def ocr_image(input_path: str, lang: str = DEFAULT_LANG) -> dict:
    """Extract text from an image file using Tesseract.

    Args:
        input_path: Path to the input image.
        lang: Tesseract language code (e.g. "eng", "ara", "fra").

    Returns:
        dict with ``text``, ``lang``, ``char_count``.

    Raises:
        OCRError: If the OCR operation fails.
    """
    if lang not in SUPPORTED_LANGUAGES:
        lang = DEFAULT_LANG

    try:
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()

        with Image.open(input_path) as img:
            # Convert to RGB if needed (tesseract works best with RGB)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            text = pytesseract.image_to_string(img, lang=lang)

        text = text.strip()
        return {
            "text": text,
            "lang": lang,
            "char_count": len(text),
        }
    except ImportError:
        raise OCRError("pytesseract is not installed.")
    except Exception as e:
        raise OCRError(f"OCR failed: {str(e)}")


def ocr_pdf(input_path: str, output_path: str, lang: str = DEFAULT_LANG) -> dict:
    """Extract text from a scanned PDF by converting pages to images first.

    Args:
        input_path: Path to the input PDF.
        output_path: Path for the output text file.
        lang: Tesseract language code.

    Returns:
        dict with ``text``, ``page_count``, ``char_count``.

    Raises:
        OCRError: If the OCR operation fails.
    """
    if lang not in SUPPORTED_LANGUAGES:
        lang = DEFAULT_LANG

    try:
        from pdf2image import convert_from_path
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()

        images = convert_from_path(input_path, dpi=300)
        if not images:
            raise OCRError("Could not convert PDF to images — file may be empty.")

        all_text = []
        for i, img in enumerate(images, 1):
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            page_text = pytesseract.image_to_string(img, lang=lang)
            all_text.append(f"--- Page {i} ---\n{page_text.strip()}")

        full_text = "\n\n".join(all_text)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_text)

        return {
            "text": full_text,
            "page_count": len(images),
            "char_count": len(full_text),
        }
    except ImportError as e:
        raise OCRError(f"Missing dependency: {e}")
    except OCRError:
        raise
    except Exception as e:
        raise OCRError(f"PDF OCR failed: {str(e)}")
