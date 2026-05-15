"""Extended PDF tools — Crop, Flatten, Repair, Metadata Editor."""
import os
import io
import logging

logger = logging.getLogger(__name__)


class PDFExtraError(Exception):
    """Custom exception for extended PDF tool failures."""
    pass


# ---------------------------------------------------------------------------
# Crop PDF
# ---------------------------------------------------------------------------
def crop_pdf(
    input_path: str,
    output_path: str,
    margin_left: float = 0,
    margin_right: float = 0,
    margin_top: float = 0,
    margin_bottom: float = 0,
    pages: str = "all",
    crop_x_pct: float | None = None,
    crop_y_pct: float | None = None,
    crop_width_pct: float | None = None,
    crop_height_pct: float | None = None,
) -> dict:
    """Crop margins from PDF pages.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the cropped output
        margin_left/right/top/bottom: Points to crop from each side
        pages: "all" or comma-separated page numbers (1-based)
        crop_*_pct: Optional normalized crop box percentages per page

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFExtraError: If cropping fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        if total_pages == 0:
            raise PDFExtraError("PDF has no pages.")

        target_indices = _parse_pages(pages, total_pages)
        if not target_indices:
            raise PDFExtraError("No valid pages were selected for cropping.")
        use_normalized_crop = all(
            value is not None
            for value in (crop_x_pct, crop_y_pct, crop_width_pct, crop_height_pct)
        )

        for i, page in enumerate(reader.pages):
            if i in target_indices:
                box = page.mediabox
                left = float(box.left)
                bottom = float(box.bottom)
                right = float(box.right)
                top = float(box.top)
                page_width = right - left
                page_height = top - bottom

                if use_normalized_crop:
                    crop_left = left + (page_width * float(crop_x_pct) / 100.0)
                    crop_right = crop_left + (page_width * float(crop_width_pct) / 100.0)
                    crop_top = top - (page_height * float(crop_y_pct) / 100.0)
                    crop_bottom = crop_top - (page_height * float(crop_height_pct) / 100.0)
                else:
                    crop_left = left + margin_left
                    crop_right = right - margin_right
                    crop_top = top - margin_top
                    crop_bottom = bottom + margin_bottom

                if crop_left >= crop_right or crop_bottom >= crop_top:
                    raise PDFExtraError("Invalid crop area for one or more selected pages.")

                box.lower_left = (crop_left, crop_bottom)
                box.upper_right = (crop_right, crop_top)
                page.mediabox = box
                page.cropbox = box
            writer.add_page(page)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        output_size = os.path.getsize(output_path)
        logger.info(f"Crop PDF: {len(target_indices)} pages cropped ({output_size} bytes)")
        return {
            "total_pages": total_pages,
            "cropped_pages": len(target_indices),
            "output_size": output_size,
        }

    except PDFExtraError:
        raise
    except Exception as e:
        raise PDFExtraError(f"Failed to crop PDF: {str(e)}")


# ---------------------------------------------------------------------------
# Flatten PDF (remove interactive form fields, annotations)
# ---------------------------------------------------------------------------
def flatten_pdf(input_path: str, output_path: str) -> dict:
    """Flatten a PDF — burn form fields and annotations into static content.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the flattened output

    Returns:
        dict with total_pages and output_size

    Raises:
        PDFExtraError: If flatten fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        if total_pages == 0:
            raise PDFExtraError("PDF has no pages.")

        for page in reader.pages:
            # Remove annotations to flatten
            if "/Annots" in page:
                del page["/Annots"]
            writer.add_page(page)

        # Remove AcroForm (interactive forms) at document level
        if "/AcroForm" in writer._root_object:
            del writer._root_object["/AcroForm"]

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        output_size = os.path.getsize(output_path)
        logger.info(f"Flatten PDF: {total_pages} pages ({output_size} bytes)")
        return {"total_pages": total_pages, "output_size": output_size}

    except PDFExtraError:
        raise
    except Exception as e:
        raise PDFExtraError(f"Failed to flatten PDF: {str(e)}")


# ---------------------------------------------------------------------------
# Repair PDF
# ---------------------------------------------------------------------------
def repair_pdf(input_path: str, output_path: str) -> dict:
    """Attempt to repair a damaged PDF by re-writing it.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the repaired output

    Returns:
        dict with total_pages, output_size, and repaired flag

    Raises:
        PDFExtraError: If repair fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from PyPDF2.errors import PdfReadError

        try:
            reader = PdfReader(input_path, strict=False)
        except PdfReadError as e:
            raise PDFExtraError(f"Cannot read PDF — file may be severely corrupted: {str(e)}")

        writer = PdfWriter()
        total_pages = len(reader.pages)

        if total_pages == 0:
            raise PDFExtraError("PDF has no recoverable pages.")

        recovered = 0
        for i, page in enumerate(reader.pages):
            try:
                writer.add_page(page)
                recovered += 1
            except Exception:
                logger.warning(f"Repair: skipped unrecoverable page {i + 1}")

        if recovered == 0:
            raise PDFExtraError("No pages could be recovered from the PDF.")

        # Copy metadata if available
        try:
            if reader.metadata:
                writer.add_metadata(reader.metadata)
        except Exception:
            pass

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        output_size = os.path.getsize(output_path)
        logger.info(f"Repair PDF: {recovered}/{total_pages} pages recovered ({output_size} bytes)")
        return {
            "total_pages": total_pages,
            "recovered_pages": recovered,
            "output_size": output_size,
            "repaired": True,
        }

    except PDFExtraError:
        raise
    except Exception as e:
        raise PDFExtraError(f"Failed to repair PDF: {str(e)}")


# ---------------------------------------------------------------------------
# PDF Metadata Editor
# ---------------------------------------------------------------------------
def edit_pdf_metadata(
    input_path: str,
    output_path: str,
    title: str | None = None,
    author: str | None = None,
    subject: str | None = None,
    keywords: str | None = None,
    creator: str | None = None,
) -> dict:
    """Edit PDF metadata fields.

    Args:
        input_path: Path to the input PDF
        output_path: Path for the output PDF
        title/author/subject/keywords/creator: New metadata values (None = keep existing)

    Returns:
        dict with updated metadata and output_size

    Raises:
        PDFExtraError: If metadata edit fails
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        # Build metadata dict
        metadata = {}
        if title is not None:
            metadata["/Title"] = title
        if author is not None:
            metadata["/Author"] = author
        if subject is not None:
            metadata["/Subject"] = subject
        if keywords is not None:
            metadata["/Keywords"] = keywords
        if creator is not None:
            metadata["/Creator"] = creator

        if not metadata:
            raise PDFExtraError("At least one metadata field must be provided.")

        writer.add_metadata(metadata)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        output_size = os.path.getsize(output_path)

        # Read back to confirm
        current_meta = {}
        try:
            r2 = PdfReader(output_path)
            if r2.metadata:
                current_meta = {
                    "title": r2.metadata.get("/Title", ""),
                    "author": r2.metadata.get("/Author", ""),
                    "subject": r2.metadata.get("/Subject", ""),
                    "keywords": r2.metadata.get("/Keywords", ""),
                    "creator": r2.metadata.get("/Creator", ""),
                }
        except Exception:
            pass

        logger.info(f"Edit metadata: updated {len(metadata)} fields ({output_size} bytes)")
        return {
            "total_pages": len(reader.pages),
            "output_size": output_size,
            "metadata": current_meta,
        }

    except PDFExtraError:
        raise
    except Exception as e:
        raise PDFExtraError(f"Failed to edit PDF metadata: {str(e)}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_pages(pages_spec: str, total_pages: int) -> set[int]:
    """Parse page specification to set of 0-based indices."""
    if pages_spec.strip().lower() == "all":
        return set(range(total_pages))

    indices = set()
    for part in pages_spec.split(","):
        part = part.strip()
        if "-" in part:
            try:
                start, end = part.split("-", 1)
                start = max(1, int(start))
                end = min(total_pages, int(end))
                for p in range(start, end + 1):
                    indices.add(p - 1)
            except ValueError:
                continue
        else:
            try:
                p = int(part)
                if 1 <= p <= total_pages:
                    indices.add(p - 1)
            except ValueError:
                continue
    return indices
