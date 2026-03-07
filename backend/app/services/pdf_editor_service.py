"""PDF Editor service — add text annotations and simple edits to PDFs."""
import io
import logging
import os

logger = logging.getLogger(__name__)


class PDFEditorError(Exception):
    """Custom exception for PDF editor failures."""
    pass


def apply_pdf_edits(input_path: str, output_path: str, edits: list[dict]) -> dict:
    """Apply a list of edits (text annotations) to an existing PDF.

    Each edit dict can contain:
        - type: "text"
        - page: 1-based page number
        - x, y: position in points from bottom-left
        - content: text string to place
        - fontSize: optional, default 12
        - color: optional hex e.g. "#000000"

    Args:
        input_path: Path to the source PDF.
        output_path: Path for the edited PDF.
        edits: List of edit operation dicts.

    Returns:
        dict with ``page_count``, ``edits_applied``, ``output_size``.

    Raises:
        PDFEditorError: If the edit fails.
    """
    if not edits:
        raise PDFEditorError("No edits provided.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        from PyPDF2 import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.colors import HexColor

        reader = PdfReader(input_path)
        writer = PdfWriter()
        page_count = len(reader.pages)

        if page_count == 0:
            raise PDFEditorError("PDF has no pages.")

        # Group edits by page
        edits_by_page: dict[int, list[dict]] = {}
        for edit in edits:
            page_num = int(edit.get("page", 1))
            if page_num < 1 or page_num > page_count:
                continue
            edits_by_page.setdefault(page_num, []).append(edit)

        edits_applied = 0

        for page_idx in range(page_count):
            page = reader.pages[page_idx]
            page_num = page_idx + 1
            page_edits = edits_by_page.get(page_num, [])

            if page_edits:
                # Get page dimensions
                media_box = page.mediabox
                page_width = float(media_box.width)
                page_height = float(media_box.height)

                # Create overlay with annotations
                packet = io.BytesIO()
                c = canvas.Canvas(packet, pagesize=(page_width, page_height))

                for edit in page_edits:
                    edit_type = edit.get("type", "text")
                    if edit_type == "text":
                        x = float(edit.get("x", 72))
                        y = float(edit.get("y", 72))
                        content = str(edit.get("content", ""))
                        font_size = int(edit.get("fontSize", 12))
                        color = str(edit.get("color", "#000000"))

                        try:
                            c.setFillColor(HexColor(color))
                        except Exception:
                            c.setFillColor(HexColor("#000000"))

                        c.setFont("Helvetica", font_size)
                        c.drawString(x, y, content)
                        edits_applied += 1

                c.save()
                packet.seek(0)

                overlay_reader = PdfReader(packet)
                if len(overlay_reader.pages) > 0:
                    page.merge_page(overlay_reader.pages[0])

            writer.add_page(page)

        with open(output_path, "wb") as f:
            writer.write(f)

        output_size = os.path.getsize(output_path)

        return {
            "page_count": page_count,
            "edits_applied": edits_applied,
            "output_size": output_size,
        }

    except PDFEditorError:
        raise
    except Exception as e:
        raise PDFEditorError(f"PDF editing failed: {str(e)}")
