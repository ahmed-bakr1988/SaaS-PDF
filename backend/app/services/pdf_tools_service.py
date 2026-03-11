"""Extended PDF tools service — Merge, Split, Rotate, Page Numbers, PDF↔Images."""
import os
import io
import logging
import math
import re
import subprocess
import tempfile
import zipfile

from PIL import Image

logger = logging.getLogger(__name__)

_TRAILING_TEXT_WATERMARK_RE = re.compile(
    rb"q\s*"
    rb"0 0 [-+]?\d*\.?\d+ [-+]?\d*\.?\d+ re\s*"
    rb"W\s*n\s*"
    rb"1 0 0 1 0 0 cm\s*"
    rb"BT\s*/[^\s]+\s+[-+]?\d*\.?\d+\s+Tf\s+[-+]?\d*\.?\d+\s+TL\s+ET\s*"
    rb"BT\s*/[^\s]+\s+[-+]?\d*\.?\d+\s+Tf\s+[-+]?\d*\.?\d+\s+TL\s+ET\s*"
    rb"[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+rg\s*"
    rb"/[^\s]+\s+gs\s*"
    rb"q\s*[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+cm\s*"
    rb"BT\s+1 0 0 1\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+Tm\s*"
    rb".*?"
    rb"ET\s*Q\s*Q\s*\Z",
    re.DOTALL,
)

_TRAILING_IMAGE_WATERMARK_RE = re.compile(
    rb"q\s*"
    rb"(?:"
    rb"0 0 [-+]?\d*\.?\d+ [-+]?\d*\.?\d+ re\s*"
    rb"W\s*n\s*"
    rb"1 0 0 1 0 0 cm\s*"
    rb"(?:BT\s*/[^\s]+\s+[-+]?\d*\.?\d+\s+Tf\s+[-+]?\d*\.?\d+\s+TL\s+ET\s*)?"
    rb")?"
    rb"(?:q\s*)?"
    rb"(?:/[^\s]+\s+gs\s*)?"
    rb"(?P<a>[-+]?\d*\.?\d+)\s+"
    rb"(?P<b>[-+]?\d*\.?\d+)\s+"
    rb"(?P<c>[-+]?\d*\.?\d+)\s+"
    rb"(?P<d>[-+]?\d*\.?\d+)\s+"
    rb"(?P<e>[-+]?\d*\.?\d+)\s+"
    rb"(?P<f>[-+]?\d*\.?\d+)\s+cm\s*"
    rb"/(?P<name>[^\s]+)\s+Do\s*Q(?:\s*Q)?\s*\Z",
    re.DOTALL,
)


class PDFToolsError(Exception):
    """Custom exception for PDF tools failures."""
    pass


# ---------------------------------------------------------------------------
# 1. Merge PDFs
# ---------------------------------------------------------------------------
def merge_pdfs(input_paths: list[str], output_path: str) -> dict:
    """
    Merge multiple PDF files into a single PDF.

    Args:
        input_paths: List of paths to PDF files (in order)
        output_path: Path for the merged output PDF

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFToolsError: If merge fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        writer = PdfWriter()
        total_pages = 0

        for path in input_paths:
            if not os.path.exists(path):
                raise PDFToolsError(f"File not found: {os.path.basename(path)}")
            reader = PdfReader(path)
            for page in reader.pages:
                writer.add_page(page)
                total_pages += 1

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        output_size = os.path.getsize(output_path)
        logger.info(f"Merged {len(input_paths)} PDFs → {total_pages} pages ({output_size} bytes)")

        return {
            "total_pages": total_pages,
            "files_merged": len(input_paths),
            "output_size": output_size,
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to merge PDFs: {str(e)}")


# ---------------------------------------------------------------------------
# 2. Split PDF
# ---------------------------------------------------------------------------
def split_pdf(
    input_path: str,
    output_dir: str,
    mode: str = "all",
    pages: str | None = None,
) -> dict:
    """
    Split a PDF into individual pages or a specific range.

    Args:
        input_path: Path to the input PDF
        output_dir: Directory for the output files
        mode: "all" (every page) or "range" (specific pages)
        pages: Page specification for range mode, e.g. "1,3,5-8"

    Returns:
        dict with output_files list, total_pages, and zip_path

    Raises:
        PDFToolsError: If split fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        os.makedirs(output_dir, exist_ok=True)
        reader = PdfReader(input_path)
        total_pages = len(reader.pages)

        if total_pages == 0:
            raise PDFToolsError("PDF has no pages.")

        # Determine which pages to extract
        if mode == "range" and pages:
            page_indices = _parse_page_range(pages, total_pages)
        else:
            page_indices = list(range(total_pages))

        output_files = []
        for idx in page_indices:
            writer = PdfWriter()
            writer.add_page(reader.pages[idx])

            page_num = idx + 1
            out_path = os.path.join(output_dir, f"page_{page_num}.pdf")
            with open(out_path, "wb") as f:
                writer.write(f)
            output_files.append(out_path)

        # Create a ZIP of all output files
        zip_path = os.path.join(output_dir, "split_pages.zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for fpath in output_files:
                zf.write(fpath, os.path.basename(fpath))

        logger.info(f"Split PDF: {total_pages} pages → {len(output_files)} files")

        return {
            "total_pages": total_pages,
            "extracted_pages": len(output_files),
            "output_size": os.path.getsize(zip_path),
            "zip_path": zip_path,
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to split PDF: {str(e)}")


def _parse_page_range(spec: str, total: int) -> list[int]:
    """Parse a page specification like '1,3,5-8' into 0-based indices."""
    if not spec or not spec.strip():
        raise PDFToolsError("Please specify at least one page (e.g. 1,3,5-8).")

    indices = set()
    invalid_tokens = []
    out_of_range_tokens = []

    for raw_part in spec.split(","):
        part = raw_part.strip()

        if not part:
            continue

        if "-" in part:
            if part.count("-") != 1:
                invalid_tokens.append(part)
                continue

            start_s, end_s = part.split("-", 1)
            start_s = start_s.strip()
            end_s = end_s.strip()

            if not start_s.isdigit() or not end_s.isdigit():
                invalid_tokens.append(part)
                continue

            start = int(start_s)
            end = int(end_s)

            if start > end:
                invalid_tokens.append(part)
                continue

            if start < 1 or end > total:
                out_of_range_tokens.append(f"{start}-{end}")
                continue

            indices.update(range(start - 1, end))
        else:
            if not part.isdigit():
                invalid_tokens.append(part)
                continue

            page = int(part)
            if page < 1 or page > total:
                out_of_range_tokens.append(str(page))
                continue

            indices.add(page - 1)

    if invalid_tokens:
        tokens = ", ".join(invalid_tokens)
        raise PDFToolsError(
            f"Invalid page format: {tokens}. Use a format like 1,3,5-8."
        )

    if out_of_range_tokens:
        tokens = ", ".join(out_of_range_tokens)
        page_word = "page" if total == 1 else "pages"
        raise PDFToolsError(
            f"Selected pages ({tokens}) are out of range. This PDF has only {total} {page_word}."
        )

    if not indices:
        page_word = "page" if total == 1 else "pages"
        raise PDFToolsError(
            f"No pages selected. This PDF has {total} {page_word}."
        )

    return sorted(indices)


# ---------------------------------------------------------------------------
# 3. Rotate PDF
# ---------------------------------------------------------------------------
def rotate_pdf(
    input_path: str,
    output_path: str,
    rotation: int = 90,
    pages: str = "all",
) -> dict:
    """
    Rotate pages in a PDF.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the rotated output PDF
        rotation: Degrees to rotate (90, 180, 270)
        pages: "all" or comma-separated page numbers (1-based)

    Returns:
        dict with total_pages and rotated_pages

    Raises:
        PDFToolsError: If rotation fails
    """
    if rotation not in (90, 180, 270):
        raise PDFToolsError("Rotation must be 90, 180, or 270 degrees.")

    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        # Determine which pages to rotate
        if pages == "all":
            rotate_indices = set(range(total_pages))
        else:
            rotate_indices = set(_parse_page_range(pages, total_pages))

        rotated_count = 0
        for i, page in enumerate(reader.pages):
            if i in rotate_indices:
                page.rotate(rotation)
                rotated_count += 1
            writer.add_page(page)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(f"Rotated {rotated_count}/{total_pages} pages by {rotation}°")

        return {
            "total_pages": total_pages,
            "rotated_pages": rotated_count,
            "rotation": rotation,
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to rotate PDF: {str(e)}")


# ---------------------------------------------------------------------------
# 4. Add Page Numbers
# ---------------------------------------------------------------------------
def add_page_numbers(
    input_path: str,
    output_path: str,
    position: str = "bottom-center",
    start_number: int = 1,
) -> dict:
    """
    Add page numbers to a PDF.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the numbered output PDF
        position: Number position — "bottom-center", "bottom-right", "bottom-left",
                  "top-center", "top-right", "top-left"
        start_number: Starting page number

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFToolsError: If numbering fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        for i, page in enumerate(reader.pages):
            page_num = start_number + i
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            # Create overlay with page number
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=(page_width, page_height))
            c.setFont("Helvetica", 10)

            # Calculate position
            x, y = _get_number_position(position, page_width, page_height)
            c.drawCentredString(x, y, str(page_num))
            c.save()
            packet.seek(0)

            # Merge overlay onto original page
            from PyPDF2 import PdfReader as OverlayReader
            overlay = OverlayReader(packet)
            page.merge_page(overlay.pages[0])
            writer.add_page(page)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(f"Added page numbers to {total_pages} pages")

        return {
            "total_pages": total_pages,
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to add page numbers: {str(e)}")


def _get_number_position(
    position: str, page_width: float, page_height: float
) -> tuple[float, float]:
    """Calculate x, y coordinates for the page number text."""
    margin = 30  # points from edge

    positions = {
        "bottom-center": (page_width / 2, margin),
        "bottom-right": (page_width - margin, margin),
        "bottom-left": (margin, margin),
        "top-center": (page_width / 2, page_height - margin),
        "top-right": (page_width - margin, page_height - margin),
        "top-left": (margin, page_height - margin),
    }

    return positions.get(position, positions["bottom-center"])


# ---------------------------------------------------------------------------
# 5. PDF to Images
# ---------------------------------------------------------------------------
def pdf_to_images(
    input_path: str,
    output_dir: str,
    output_format: str = "png",
    dpi: int = 200,
) -> dict:
    """
    Convert each page of a PDF to an image.

    Args:
        input_path: Path to the input PDF
        output_dir: Directory for output images
        output_format: "png" or "jpg"
        dpi: Resolution (72-600)

    Returns:
        dict with page_count, output_files, zip_path, output_size

    Raises:
        PDFToolsError: If conversion fails
    """
    if output_format not in ("png", "jpg", "jpeg"):
        output_format = "png"
    if output_format == "jpeg":
        output_format = "jpg"

    dpi = max(72, min(600, dpi))

    try:
        from pdf2image import convert_from_path

        os.makedirs(output_dir, exist_ok=True)

        images = convert_from_path(input_path, dpi=dpi)
        output_files = []

        for i, img in enumerate(images):
            page_num = i + 1
            out_path = os.path.join(output_dir, f"page_{page_num}.{output_format}")

            if output_format == "jpg":
                # Convert to RGB for JPEG
                if img.mode in ("RGBA", "P", "LA"):
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    bg.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
                    img = bg
                img.save(out_path, "JPEG", quality=90, optimize=True)
            else:
                img.save(out_path, "PNG", optimize=True)

            output_files.append(out_path)

        # Create ZIP of all images
        zip_path = os.path.join(output_dir, "pdf_images.zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for fpath in output_files:
                zf.write(fpath, os.path.basename(fpath))

        logger.info(f"PDF→Images: {len(images)} pages → {output_format.upper()} @ {dpi} DPI")

        return {
            "page_count": len(images),
            "format": output_format,
            "dpi": dpi,
            "output_size": os.path.getsize(zip_path),
            "zip_path": zip_path,
        }

    except ImportError:
        raise PDFToolsError(
            "pdf2image is not installed. Install it with: pip install pdf2image"
        )
    except Exception as e:
        raise PDFToolsError(f"Failed to convert PDF to images: {str(e)}")


# ---------------------------------------------------------------------------
# 6. Images to PDF
# ---------------------------------------------------------------------------
def images_to_pdf(input_paths: list[str], output_path: str) -> dict:
    """
    Combine multiple images into a single PDF.

    Args:
        input_paths: List of paths to image files (in order)
        output_path: Path for the output PDF

    Returns:
        dict with page_count and output_size

    Raises:
        PDFToolsError: If conversion fails
    """
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        images = []
        for path in input_paths:
            if not os.path.exists(path):
                raise PDFToolsError(f"Image not found: {os.path.basename(path)}")
            img = Image.open(path)
            # Convert to RGB (required for PDF)
            if img.mode in ("RGBA", "P", "LA"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                bg.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            images.append(img)

        if not images:
            raise PDFToolsError("No valid images provided.")

        # Save all images as a single PDF
        images[0].save(
            output_path,
            "PDF",
            save_all=True,
            append_images=images[1:],
            resolution=150,
        )

        # Close images
        for img in images:
            img.close()

        output_size = os.path.getsize(output_path)
        logger.info(f"Images→PDF: {len(input_paths)} images → {output_size} bytes")

        return {
            "page_count": len(input_paths),
            "output_size": output_size,
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to create PDF from images: {str(e)}")


# ---------------------------------------------------------------------------
# 7. Watermark PDF
# ---------------------------------------------------------------------------
def add_watermark(
    input_path: str,
    output_path: str,
    watermark_text: str,
    opacity: float = 0.3,
    font_size: int = 50,
    rotation: int = 45,
) -> dict:
    """
    Add a text watermark to every page of a PDF.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the watermarked output PDF
        watermark_text: Text to use as watermark
        opacity: Watermark opacity (0.0-1.0)
        font_size: Font size for watermark text
        rotation: Rotation angle in degrees

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFToolsError: If watermarking fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas
        from reportlab.lib.colors import Color

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        for page in reader.pages:
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            # Create watermark overlay
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=(page_width, page_height))

            # Set watermark properties
            c.setFont("Helvetica", font_size)
            c.setFillColor(Color(0.5, 0.5, 0.5, alpha=opacity))

            # Draw rotated watermark text at center
            c.saveState()
            c.translate(page_width / 2, page_height / 2)
            c.rotate(rotation)
            c.drawCentredString(0, 0, watermark_text)
            c.restoreState()

            c.save()
            packet.seek(0)

            from PyPDF2 import PdfReader as OverlayReader
            overlay = OverlayReader(packet)
            page.merge_page(overlay.pages[0])
            writer.add_page(page)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(f"Added watermark '{watermark_text}' to {total_pages} pages")

        return {
            "total_pages": total_pages,
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to add watermark: {str(e)}")


# ---------------------------------------------------------------------------
# 8. Protect PDF (add password)
# ---------------------------------------------------------------------------
def protect_pdf(
    input_path: str,
    output_path: str,
    password: str,
) -> dict:
    """
    Add password protection to a PDF.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the protected output PDF
        password: Password to set

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFToolsError: If protection fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        for page in reader.pages:
            writer.add_page(page)

        writer.encrypt(password)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(f"Protected PDF with password ({total_pages} pages)")

        return {
            "total_pages": total_pages,
            "output_size": os.path.getsize(output_path),
        }

    except Exception as e:
        raise PDFToolsError(f"Failed to protect PDF: {str(e)}")


# ---------------------------------------------------------------------------
# 9. Unlock PDF (remove password)
# ---------------------------------------------------------------------------
def unlock_pdf(
    input_path: str,
    output_path: str,
    password: str,
) -> dict:
    """
    Remove password protection from a PDF.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the unlocked output PDF
        password: Current password of the PDF

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFToolsError: If unlock fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)

        if reader.is_encrypted:
            if not reader.decrypt(password):
                raise PDFToolsError("Incorrect password.")
        else:
            raise PDFToolsError("PDF is not password-protected.")

        writer = PdfWriter()
        total_pages = len(reader.pages)

        for page in reader.pages:
            writer.add_page(page)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(f"Unlocked PDF ({total_pages} pages)")

        return {
            "total_pages": total_pages,
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to unlock PDF: {str(e)}")


# ---------------------------------------------------------------------------
# 10. Remove Watermark (best-effort text removal)
# ---------------------------------------------------------------------------
def remove_watermark(
    input_path: str,
    output_path: str,
) -> dict:
    """
    Attempt to remove supported trailing watermark overlays from a PDF.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the output PDF

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFToolsError: If removal fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from PyPDF2.generic import DecodedStreamObject, NameObject

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)
        cleaned_pages = 0
        removed_watermarks = 0

        for page in reader.pages:
            contents = page.get_contents()
            if contents is not None:
                cleaned_stream, removed_count = _strip_known_watermarks(
                    contents.get_data(),
                    float(page.mediabox.width),
                    float(page.mediabox.height),
                )
                if removed_count > 0:
                    replacement_stream = DecodedStreamObject()
                    replacement_stream.set_data(cleaned_stream)
                    page[NameObject("/Contents")] = replacement_stream
                    cleaned_pages += 1
                    removed_watermarks += removed_count

            writer.add_page(page)

        if removed_watermarks == 0:
            raise PDFToolsError(
                "No removable watermark overlay was detected. "
                "Flattened or embedded page-content watermarks are not currently supported."
            )

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(
            "Remove watermark cleaned %s watermark block(s) across %s/%s page(s)",
            removed_watermarks,
            cleaned_pages,
            total_pages,
        )

        return {
            "total_pages": total_pages,
            "cleaned_pages": cleaned_pages,
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to remove watermark: {str(e)}")


def _strip_known_watermarks(
    stream_data: bytes,
    page_width: float,
    page_height: float,
) -> tuple[bytes, int]:
    """Remove supported trailing text or image watermark overlays from a page stream."""
    cleaned_stream = stream_data
    removed_count = 0

    while True:
        cleaned_stream, removed_text_count = _strip_known_text_watermarks(cleaned_stream)
        cleaned_stream, removed_image_count = _strip_known_image_watermarks(
            cleaned_stream,
            page_width,
            page_height,
        )

        if removed_text_count == 0 and removed_image_count == 0:
            break

        removed_count += removed_text_count + removed_image_count

    return cleaned_stream, removed_count


def _strip_known_text_watermarks(stream_data: bytes) -> tuple[bytes, int]:
    """Remove trailing text watermark overlays generated by common PDF watermark flows."""
    cleaned_stream = stream_data
    removed_count = 0

    while True:
        updated_stream, replacements = _TRAILING_TEXT_WATERMARK_RE.subn(
            b"", cleaned_stream, count=1
        )
        if replacements == 0:
            break

        cleaned_stream = updated_stream.rstrip(b"\r\n")
        removed_count += replacements

    return cleaned_stream, removed_count


def _strip_known_image_watermarks(
    stream_data: bytes,
    page_width: float,
    page_height: float,
) -> tuple[bytes, int]:
    """Remove trailing image XObject watermark overlays when they match the supported pattern."""
    cleaned_stream = stream_data
    removed_count = 0

    while True:
        match = _TRAILING_IMAGE_WATERMARK_RE.search(cleaned_stream)
        if match is None:
            break

        if not _is_probable_image_watermark(match, page_width, page_height):
            break

        cleaned_stream = cleaned_stream[:match.start()].rstrip(b"\r\n")
        removed_count += 1

    return cleaned_stream, removed_count


def _is_probable_image_watermark(
    match: re.Match[bytes],
    page_width: float,
    page_height: float,
) -> bool:
    """Heuristic guardrail so only overlay-style trailing image blocks are stripped."""
    name = match.group("name").lower()
    if not name.startswith((b"formxob", b"im", b"img", b"image")):
        return False

    a = float(match.group("a"))
    b = float(match.group("b"))
    c = float(match.group("c"))
    d = float(match.group("d"))
    e = float(match.group("e"))
    f = float(match.group("f"))

    width = math.hypot(a, b)
    height = math.hypot(c, d)
    if width < 24 or height < 24:
        return False

    page_area = page_width * page_height
    overlay_area = width * height
    if page_area <= 0 or overlay_area <= 0:
        return False

    coverage_ratio = overlay_area / page_area
    if coverage_ratio > 0.95:
        return False

    if e == 0 and f == 0 and coverage_ratio > 0.6:
        return False

    return True


# ---------------------------------------------------------------------------
# 11. Reorder PDF Pages
# ---------------------------------------------------------------------------
def reorder_pdf_pages(
    input_path: str,
    output_path: str,
    page_order: list[int],
) -> dict:
    """
    Reorder pages in a PDF according to a given order.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the reordered output PDF
        page_order: List of 1-based page numbers in desired order

    Returns:
        dict with total_pages, output_size

    Raises:
        PDFToolsError: If reorder fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        _validate_full_page_permutation(page_order, total_pages)

        # Build new PDF in the requested order
        for p in page_order:
            writer.add_page(reader.pages[p - 1])

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(f"Reordered PDF: {total_pages} pages → order {page_order}")

        return {
            "total_pages": total_pages,
            "reordered_pages": len(page_order),
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to reorder PDF pages: {str(e)}")


def _validate_full_page_permutation(page_order: list[int], total_pages: int) -> None:
    """Require reorder requests to provide every page exactly once."""
    if not page_order:
        raise PDFToolsError("No page order specified.")

    out_of_range = sorted({page for page in page_order if page < 1 or page > total_pages})
    if out_of_range:
        pages = ", ".join(str(page) for page in out_of_range)
        raise PDFToolsError(
            f"Page order contains out-of-range pages: {pages}. This PDF has {total_pages} pages."
        )

    duplicates: list[int] = []
    seen: set[int] = set()
    for page in page_order:
        if page in seen and page not in duplicates:
            duplicates.append(page)
        seen.add(page)

    missing = [page for page in range(1, total_pages + 1) if page not in seen]
    if duplicates or missing or len(page_order) != total_pages:
        details = ["Provide every page exactly once in the new order."]
        if duplicates:
            details.append(
                f"Duplicate pages: {', '.join(str(page) for page in duplicates)}."
            )
        if missing:
            details.append(
                f"Missing pages: {', '.join(str(page) for page in missing)}."
            )
        raise PDFToolsError(
            "Invalid page order. "
            + " ".join(details)
            + f" This PDF has {total_pages} pages."
        )


# ---------------------------------------------------------------------------
# 12. Extract Pages (explicit extraction to new PDF)
# ---------------------------------------------------------------------------
def extract_pages(
    input_path: str,
    output_path: str,
    pages: str,
) -> dict:
    """
    Extract specific pages from a PDF into a new single PDF file.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the extracted output PDF
        pages: Page specification e.g. "1,3,5-8"

    Returns:
        dict with total_pages, extracted_pages, output_size

    Raises:
        PDFToolsError: If extraction fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        page_indices = _parse_page_range(pages, total_pages)

        for idx in page_indices:
            writer.add_page(reader.pages[idx])

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        logger.info(
            f"Extracted {len(page_indices)} pages from {total_pages}-page PDF"
        )

        return {
            "total_pages": total_pages,
            "extracted_pages": len(page_indices),
            "output_size": os.path.getsize(output_path),
        }

    except PDFToolsError:
        raise
    except Exception as e:
        raise PDFToolsError(f"Failed to extract pages: {str(e)}")
