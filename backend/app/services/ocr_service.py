"""OCR service — extract text from images and PDFs using Tesseract."""
import logging
import os

from PIL import Image, ImageOps

from app.services.pdf_runtime import PdfPasswordProtectedError, render_pdf_pages

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


def _preprocess_for_ocr(img: Image.Image) -> Image.Image:
    """Apply light preprocessing to improve OCR accuracy without altering layout heavily."""
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    grayscale = img.convert("L")
    grayscale = ImageOps.autocontrast(grayscale)
    return grayscale


def _tesseract_config_for_lang(lang: str) -> str:
    """Return a conservative Tesseract config tuned for document text."""
    if lang == "ara":
        return "--oem 3 --psm 6"
    return "--oem 3 --psm 3"


def _ocr_pil_image(img: Image.Image, lang: str) -> str:
    """Run Tesseract on a PIL image after lightweight preprocessing."""
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()
    processed = _preprocess_for_ocr(img)
    return pytesseract.image_to_string(
        processed,
        lang=lang,
        config=_tesseract_config_for_lang(lang),
    )


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
            text = _ocr_pil_image(img, lang)

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
        images = render_pdf_pages(input_path, dpi=300)
        if not images:
            raise OCRError("Could not convert PDF to images — file may be empty.")

        all_text = []
        for i, img in enumerate(images, 1):
            page_text = _ocr_pil_image(img, lang)
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
    except PdfPasswordProtectedError:
        raise OCRError("This PDF is password-protected. Please unlock it first.")
    except ImportError as e:
        raise OCRError(f"Missing dependency: {e}")
    except OCRError:
        raise
    except Exception as e:
        raise OCRError(f"PDF OCR failed: {str(e)}")
