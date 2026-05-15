"""OCR service — extract text from images and PDFs using Tesseract."""
from collections.abc import Callable
import logging
import os
import re

from PIL import Image, ImageOps

from app.services.pdf_runtime import PdfPasswordProtectedError, iter_pdf_page_images

logger = logging.getLogger(__name__)

ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")


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
MAX_OCR_DIMENSION = 2400


def _get_tesseract_cmd() -> str:
    """Return the tesseract binary path."""
    return os.getenv("TESSERACT_CMD", "tesseract")


def _preprocess_for_ocr(img: Image.Image) -> Image.Image:
    """Apply light preprocessing to improve OCR accuracy without altering layout heavily."""
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    if max(img.size) > MAX_OCR_DIMENSION:
        resized = img.copy()
        resized.thumbnail((MAX_OCR_DIMENSION, MAX_OCR_DIMENSION))
        img = resized

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


def ocr_pdf(
    input_path: str,
    output_path: str,
    lang: str = DEFAULT_LANG,
    progress_callback: Callable[[int, int], None] | None = None,
) -> dict:
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
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        total_pages = 0
        char_count = 0
        preview_parts: list[str] = []
        preview_length = 0

        with open(output_path, "w", encoding="utf-8") as f:
            wrote_any_page = False
            for page_number, total_pages, img in iter_pdf_page_images(input_path, dpi=300):
                try:
                    page_text = _ocr_pil_image(img, lang).strip()
                finally:
                    img.close()

                page_block = f"--- Page {page_number} ---\n{page_text}"
                if wrote_any_page:
                    f.write("\n\n")
                    char_count += 2
                f.write(page_block)
                wrote_any_page = True
                char_count += len(page_block)

                if preview_length < 5000:
                    remaining = 5000 - preview_length
                    preview_parts.append(page_block[:remaining])
                    preview_length += min(len(page_block), remaining)

                if progress_callback is not None:
                    progress_callback(page_number, total_pages)

        if total_pages == 0:
            raise OCRError("Could not convert PDF to images — file may be empty.")

        preview_text = "\n\n".join(preview_parts)

        return {
            "text": preview_text,
            "page_count": total_pages,
            "char_count": char_count,
        }
    except PdfPasswordProtectedError:
        raise OCRError("This PDF is password-protected. Please unlock it first.")
    except ImportError as e:
        raise OCRError(f"Missing dependency: {e}")
    except OCRError:
        raise
    except Exception as e:
        raise OCRError(f"PDF OCR failed: {str(e)}")


def _get_word_boxes(img: Image.Image, lang: str) -> list[dict]:
    """Return word-level bounding boxes from Tesseract for invisible text embedding.

    Each dict has keys: ``text``, ``x0``, ``y0``, ``x1``, ``y1``.
    Coordinates are in image-pixel space (top-left origin).
    """
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()
    processed = _preprocess_for_ocr(img)
    data = pytesseract.image_to_data(
        processed,
        lang=lang,
        config=_tesseract_config_for_lang(lang),
        output_type=pytesseract.Output.DICT,
    )
    boxes: list[dict] = []
    n = len(data["text"])
    for i in range(n):
        word = data["text"][i].strip()
        if not word or data["conf"][i] < 5:
            continue
        boxes.append({
            "text": word,
            "x0": data["left"][i],
            "y0": data["top"][i],
            "x1": data["left"][i] + data["width"][i],
            "y1": data["top"][i] + data["height"][i],
        })
    return boxes


def ocr_pdf_searchable(
    input_path: str,
    output_path: str,
    lang: str = DEFAULT_LANG,
    progress_callback: Callable[[int, int], None] | None = None,
) -> dict:
    """Create a searchable PDF by embedding invisible OCR text layers.

    Processes pages one at a time to stay within RAM limits.  For each
    page the original raster image is kept visible and the recognised
    words are inserted at their pixel-accurate positions with zero
    opacity so the result is fully searchable and selectable.

    Args:
        input_path: Path to the scanned PDF.
        output_path: Path for the output searchable PDF.
        lang: Tesseract language code.
        progress_callback: Called with ``(page_number, total_pages)``.

    Returns:
        dict with ``page_count``, ``char_count``, ``text`` (preview).

    Raises:
        OCRError: If the OCR or PDF assembly fails.
    """
    if lang not in SUPPORTED_LANGUAGES:
        lang = DEFAULT_LANG

    try:
        import fitz
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        src_doc = fitz.open(input_path)
        try:
            if getattr(src_doc, "is_encrypted", False) and not src_doc.authenticate(""):
                raise OCRError("This PDF is password-protected. Please unlock it first.")

            total_pages = src_doc.page_count
            if total_pages == 0:
                raise OCRError("PDF has no pages.")

            out_doc = fitz.open()
            char_count = 0
            preview_parts: list[str] = []
            preview_length = 0

            zoom = 300 / 72
            matrix = fitz.Matrix(zoom, zoom)

            for index in range(total_pages):
                page_number = index + 1
                src_page = src_doc.load_page(index)
                pix = src_page.get_pixmap(matrix=matrix, alpha=False)

                pil_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                word_boxes = _get_word_boxes(pil_img, lang)
                page_text = " ".join(w["text"] for w in word_boxes)
                pix.cleanup()

                # Build new page: invisible text layer + visible image overlay.
                new_page = out_doc.new_page(
                    width=src_page.rect.width,
                    height=src_page.rect.height,
                )

                img_width = pix.width
                img_height = pix.height

                if word_boxes and img_width > 0 and img_height > 0:
                    font_name = "helv"
                    if ARABIC_RE.search(page_text):
                        font_name = "tnbg"  # Times-Bold-Oblique-Greek (has Arabic glyphs in base14)

                    for wb in word_boxes:
                        x0_pdf = wb["x0"] / img_width * src_page.rect.width
                        y0_pdf = wb["y0"] / img_height * src_page.rect.height
                        y1_pdf = wb["y1"] / img_height * src_page.rect.height
                        font_size = max(6, (y1_pdf - y0_pdf))
                        try:
                            new_page.insert_textbox(
                                fitz.Rect(x0_pdf, y0_pdf, x0_pdf + src_page.rect.width, y1_pdf),
                                wb["text"],
                                fontsize=font_size,
                                fontname=font_name,
                                fill_opacity=0,
                                stroke_opacity=0,
                                overlay=False,
                            )
                        except Exception:
                            pass

                # Overlay the original page image on top of the text layer.
                new_page.insert_image(
                    fitz.Rect(0, 0, src_page.rect.width, src_page.rect.height),
                    stream=pix.tobytes("png"),
                    overlay=True,
                )

                char_count += len(page_text)

                if preview_length < 5000:
                    remaining = 5000 - preview_length
                    preview_parts.append(page_text[:remaining])
                    preview_length += min(len(page_text), remaining)

                if progress_callback is not None:
                    progress_callback(page_number, total_pages)

            out_doc.save(output_path, garbage=3, deflate=True)
        finally:
            src_doc.close()
        out_doc.close()

        if not os.path.getsize(output_path):
            raise OCRError("Generated searchable PDF is empty.")

        preview_text = "\n\n".join(preview_parts)
        return {
            "text": preview_text,
            "page_count": total_pages,
            "char_count": char_count,
        }
    except PdfPasswordProtectedError:
        raise OCRError("This PDF is password-protected. Please unlock it first.")
    except ImportError as e:
        raise OCRError(f"Missing dependency: {e}")
    except OCRError:
        raise
    except Exception as e:
        raise OCRError(f"Searchable PDF OCR failed: {str(e)}")
