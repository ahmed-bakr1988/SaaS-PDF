"""Extended PDF tools service — Merge, Split, Rotate, Page Numbers, PDF↔Images."""
import os
import io
import logging
import subprocess
import tempfile
import zipfile

from PIL import Image

logger = logging.getLogger(__name__)


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
    indices = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            start_s, end_s = part.split("-", 1)
            start = max(1, int(start_s.strip()))
            end = min(total, int(end_s.strip()))
            indices.update(range(start - 1, end))
        else:
            page = int(part)
            if 1 <= page <= total:
                indices.add(page - 1)
    if not indices:
        raise PDFToolsError("No valid pages specified.")
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
            rotate_indices = set()
            for part in pages.split(","):
                part = part.strip()
                page = int(part)
                if 1 <= page <= total_pages:
                    rotate_indices.add(page - 1)

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
