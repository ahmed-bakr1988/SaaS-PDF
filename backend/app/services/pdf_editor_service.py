"""PDF Editor service powered by PyMuPDF.

This module provides the core logic for applying visual annotations
(text, shapes, images, links, arrows) to PDF documents.  Operations
arrive as percentage-based coordinates so they are resolution-independent.
Arabic text is automatically reshaped and reordered when the required
libraries (arabic-reshaper, python-bidi) are installed.
"""
from __future__ import annotations

import base64
import logging
import math
import os
import re
from typing import Any


logger = logging.getLogger(__name__)


class PDFEditorError(Exception):
    """Custom exception raised when a PDF editing operation fails."""


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Maximum allowed size for a single embedded image (base64-decoded).
MAX_IMAGE_BYTES = 12 * 1024 * 1024

# All edit operation types the service can process.
SUPPORTED_TYPES = {"text", "rect", "ellipse", "line", "arrow", "image", "link", "note"}

# Regex matching any Arabic / extended-Arabic Unicode block character.
ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")

# Map user-facing font family names → PyMuPDF built-in font identifiers.
# Includes Arabic-capable font names sent by the frontend editor.
FONT_FALLBACKS: dict[str, str] = {
    # Latin fonts
    "Helvetica": "helv",
    "Arial": "helv",
    "Times New Roman": "tiro",
    "Times": "tiro",
    "Courier": "cour",
    "Courier New": "cour",
    # Arabic / RTL fonts — the frontend sends CSS font-stack strings;
    # we strip quotes and match the first family name.
    "Noto Kufi Arabic": "helv",
    "Amiri": "helv",
    "Noto Naskh Arabic": "helv",
    "Cairo": "helv",
    "Tajawal": "helv",
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_pymupdf():
    """Dynamically import PyMuPDF (``pymupdf`` or legacy ``fitz``).

    Returns:
        The PyMuPDF module object.

    Raises:
        ImportError: If neither ``pymupdf`` nor ``fitz`` is installed.
    """
    try:
        import pymupdf
        return pymupdf
    except ImportError:
        import fitz
        return fitz


def _clamp(value: float, minimum: float, maximum: float) -> float:
    """Clamp *value* to the inclusive range [*minimum*, *maximum*].

    Args:
        value: The number to clamp.
        minimum: Lower bound.
        maximum: Upper bound.

    Returns:
        The clamped number.
    """
    return max(minimum, min(maximum, value))


def _to_float(value: Any, default: float = 0.0) -> float:
    """Safely cast *value* to ``float``, returning *default* on failure.

    Args:
        value: Any value to attempt float conversion on.
        default: Fallback if conversion fails.

    Returns:
        The float representation or *default*.
    """
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_color(
    value: Any,
    fallback: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> tuple[float, float, float]:
    """Parse a CSS hex color string (``#RRGGBB`` or ``#RGB``) into an
    RGB tuple with components in [0.0, 1.0].

    Args:
        value: A string like ``"#2563eb"`` or ``"#abc"``.
        fallback: Returned when *value* cannot be parsed.

    Returns:
        An ``(r, g, b)`` tuple with each channel normalised to 0–1.
    """
    if not isinstance(value, str):
        return fallback

    color = value.strip().lstrip("#")
    if len(color) == 3:
        color = "".join(ch * 2 for ch in color)

    if len(color) != 6:
        return fallback

    try:
        return tuple(int(color[i:i + 2], 16) / 255 for i in range(0, 6, 2))
    except ValueError:
        return fallback


def _resolve_font_name(raw_family: str) -> str:
    """Resolve a CSS ``font-family`` value to a PyMuPDF built-in font ID.

    The frontend may send a full CSS font-stack such as::

        '"Noto Kufi Arabic", "Amiri", sans-serif'

    This helper extracts each family name, strips quotes, and checks
    :data:`FONT_FALLBACKS` for a match.  If nothing matches, ``"helv"``
    (Helvetica) is returned as a safe default.

    Args:
        raw_family: The ``font_family`` value from an edit operation.

    Returns:
        A PyMuPDF built-in font identifier string.
    """
    if not raw_family:
        return "helv"

    # Direct lookup first (handles simple names like "Helvetica").
    direct = FONT_FALLBACKS.get(raw_family)
    if direct:
        return direct

    # Parse CSS font-stack: split on commas, strip quotes & whitespace.
    for part in raw_family.split(","):
        cleaned = part.strip().strip("'\"").strip()
        match = FONT_FALLBACKS.get(cleaned)
        if match:
            return match

    return "helv"


def _prepare_pdf_text(text: str) -> str:
    """Reshape and reorder Arabic text for correct PDF rendering.

    Uses ``arabic_reshaper`` to join letter forms and ``python-bidi``
    to apply the Unicode BiDi algorithm.  If those libraries are not
    installed the text is returned unchanged.

    Args:
        text: The raw text string (may contain Arabic characters).

    Returns:
        The display-ready text string.
    """
    if not text or not ARABIC_RE.search(text):
        return text

    try:
        import arabic_reshaper
        from bidi.algorithm import get_display

        return "\n".join(
            get_display(arabic_reshaper.reshape(line)) if line.strip() else ""
            for line in text.splitlines()
        )
    except Exception:
        logger.debug("Arabic reshaping libraries unavailable for PDF editor text")
        return text


# ---------------------------------------------------------------------------
# Coordinate helpers
# ---------------------------------------------------------------------------

def _page_rect_from_edit(page, edit: dict, pymupdf):
    """Convert percentage-based bounding-box coordinates from an edit
    operation into an absolute ``pymupdf.Rect`` on *page*.

    Args:
        page: A PyMuPDF page object.
        edit: Dict with ``x_pct``, ``y_pct``, ``width_pct``, ``height_pct``.
        pymupdf: The PyMuPDF module.

    Returns:
        A ``pymupdf.Rect`` in absolute page coordinates.
    """
    page_rect = page.rect
    x = _clamp(_to_float(edit.get("x_pct"), 0.0), 0.0, 100.0)
    y = _clamp(_to_float(edit.get("y_pct"), 0.0), 0.0, 100.0)
    width = _clamp(_to_float(edit.get("width_pct"), 0.0), 0.0, 100.0)
    height = _clamp(_to_float(edit.get("height_pct"), 0.0), 0.0, 100.0)

    x0 = page_rect.x0 + (page_rect.width * x / 100)
    y0 = page_rect.y0 + (page_rect.height * y / 100)
    x1 = x0 + (page_rect.width * width / 100)
    y1 = y0 + (page_rect.height * height / 100)
    return pymupdf.Rect(x0, y0, x1, y1)


def _page_point_from_pct(page, x_pct: Any, y_pct: Any, pymupdf):
    """Convert a percentage-based point into an absolute ``pymupdf.Point``.

    Args:
        page: A PyMuPDF page object.
        x_pct: Horizontal position as a percentage of page width.
        y_pct: Vertical position as a percentage of page height.
        pymupdf: The PyMuPDF module.

    Returns:
        A ``pymupdf.Point`` in absolute page coordinates.
    """
    page_rect = page.rect
    x = page_rect.x0 + (page_rect.width * _clamp(_to_float(x_pct), 0.0, 100.0) / 100)
    y = page_rect.y0 + (page_rect.height * _clamp(_to_float(y_pct), 0.0, 100.0) / 100)
    return pymupdf.Point(x, y)


def _decode_data_url(data_url: str) -> bytes:
    """Decode a ``data:`` URL into raw bytes.

    Args:
        data_url: A base64-encoded data-URL string (e.g. from ``<canvas>``).

    Returns:
        The decoded binary payload.

    Raises:
        PDFEditorError: If the URL is malformed, empty, or exceeds
            :data:`MAX_IMAGE_BYTES`.
    """
    if not isinstance(data_url, str) or "," not in data_url:
        raise PDFEditorError("Invalid image payload.")

    _, encoded = data_url.split(",", 1)
    try:
        payload = base64.b64decode(encoded)
    except Exception as exc:
        raise PDFEditorError("Could not decode embedded image data.") from exc

    if not payload or len(payload) > MAX_IMAGE_BYTES:
        raise PDFEditorError("Embedded image is empty or exceeds the size limit.")

    return payload


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def _draw_arrow(page, start, end, color, width, fill_opacity, pymupdf):
    """Draw a line with a triangular arrowhead pointing from *start* to *end*.

    The arrowhead size scales with the stroke *width*.

    Args:
        page: PyMuPDF page to draw on.
        start: ``pymupdf.Point`` — line origin.
        end: ``pymupdf.Point`` — line destination (arrowhead tip).
        color: RGB tuple for stroke/fill colour.
        width: Stroke width in points.
        fill_opacity: Opacity in [0, 1].
        pymupdf: The PyMuPDF module.
    """
    page.draw_line(start, end, color=color, width=width, stroke_opacity=fill_opacity)

    dx = end.x - start.x
    dy = end.y - start.y
    length = math.hypot(dx, dy)
    if length <= 0:
        return

    ux = dx / length
    uy = dy / length
    head_len = max(10.0, width * 5)
    head_width = max(6.0, width * 3)

    base_x = end.x - ux * head_len
    base_y = end.y - uy * head_len
    perp_x = -uy
    perp_y = ux

    left = pymupdf.Point(base_x + perp_x * head_width, base_y + perp_y * head_width)
    right = pymupdf.Point(base_x - perp_x * head_width, base_y - perp_y * head_width)

    page.draw_polyline(
        [left, end, right],
        color=color,
        width=width,
        closePath=True,
        fill=color,
        fill_opacity=fill_opacity,
        stroke_opacity=fill_opacity,
    )


# ---------------------------------------------------------------------------
# Per-type edit applicators
# ---------------------------------------------------------------------------

def _apply_text(page, edit: dict, pymupdf) -> bool:
    """Insert a text box onto *page*.

    Handles font resolution, Arabic reshaping, optional background
    fill (for sticky-note style annotations), and inline hyperlinks.

    Args:
        page: PyMuPDF page object.
        edit: Edit operation dict with ``text``, ``font_size``, ``fill``,
              ``font_family``, ``align``, and optional ``bg_fill`` /
              ``bg_opacity`` / ``link_url`` keys.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if the text was successfully inserted, ``False`` otherwise.
    """
    rect = _page_rect_from_edit(page, edit, pymupdf)
    if rect.width < 2 or rect.height < 2:
        return False

    text = str(edit.get("text", "")).strip()
    if not text:
        return False
    text = _prepare_pdf_text(text)

    font_size = _clamp(_to_float(edit.get("font_size"), 16), 6, 144)
    color = _normalize_color(edit.get("fill"), (0, 0, 0))
    opacity = _clamp(_to_float(edit.get("opacity"), 1), 0, 1)
    align_map = {"left": 0, "center": 1, "right": 2, "justify": 3}
    align = align_map.get(str(edit.get("align", "left")), 2 if ARABIC_RE.search(text) else 0)
    font_name = _resolve_font_name(str(edit.get("font_family", "Helvetica")))
    background_fill = edit.get("bg_fill")

    # Draw a coloured background rectangle (used by "note" annotations).
    if background_fill:
        page.draw_rect(
            rect,
            fill=_normalize_color(background_fill, (1, 0.97, 0.7)),
            color=None,
            fill_opacity=_clamp(_to_float(edit.get("bg_opacity"), 0.9), 0, 1),
            overlay=True,
        )

    page.insert_textbox(
        rect,
        text,
        fontsize=font_size,
        fontname=font_name,
        color=color,
        align=align,
        fill_opacity=opacity,
        stroke_opacity=opacity,
        overlay=True,
    )

    # Optionally attach a clickable URI link over the text area.
    link_url = str(edit.get("link_url", "")).strip()
    if link_url:
        try:
            page.insert_link({
                "kind": pymupdf.LINK_URI,
                "from": rect,
                "uri": link_url,
            })
        except Exception:
            logger.debug("Failed to insert PDF link for %s", link_url)

    return True


def _apply_note(page, edit: dict, pymupdf) -> bool:
    """Insert a sticky-note style annotation (text with coloured background).

    This is a convenience wrapper around :func:`_apply_text` that ensures
    the ``bg_fill`` and ``bg_opacity`` keys are set to note defaults when
    the caller didn't provide them.

    Args:
        page: PyMuPDF page object.
        edit: Edit operation dict (same as for ``_apply_text``).
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if successfully inserted.
    """
    note_edit = {
        **edit,
        "type": "text",
        "bg_fill": edit.get("bg_fill", "#fff4b8"),
        "bg_opacity": edit.get("bg_opacity", 0.95),
        "fill": edit.get("fill", "#92400e"),
    }
    return _apply_text(page, note_edit, pymupdf)


def _apply_rect(page, edit: dict, pymupdf) -> bool:
    """Draw a rectangle annotation on *page*.

    Args:
        page: PyMuPDF page object.
        edit: Edit dict with position, stroke, fill, and opacity keys.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if the rectangle was drawn.
    """
    rect = _page_rect_from_edit(page, edit, pymupdf)
    if rect.width < 2 or rect.height < 2:
        return False

    page.draw_rect(
        rect,
        color=_normalize_color(edit.get("stroke"), (0.11, 0.11, 0.11)),
        fill=_normalize_color(edit.get("fill"), (1, 1, 1)) if edit.get("fill") else None,
        width=_clamp(_to_float(edit.get("stroke_width"), 2), 0.5, 24),
        stroke_opacity=_clamp(_to_float(edit.get("opacity"), 1), 0, 1),
        fill_opacity=_clamp(_to_float(edit.get("fill_opacity"), edit.get("opacity", 0.18)), 0, 1),
        overlay=True,
    )
    return True


def _apply_ellipse(page, edit: dict, pymupdf) -> bool:
    """Draw an ellipse (oval) annotation on *page*.

    Args:
        page: PyMuPDF page object.
        edit: Edit dict with position, stroke, fill, and opacity keys.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if the ellipse was drawn.
    """
    rect = _page_rect_from_edit(page, edit, pymupdf)
    if rect.width < 2 or rect.height < 2:
        return False

    page.draw_oval(
        rect,
        color=_normalize_color(edit.get("stroke"), (0.11, 0.11, 0.11)),
        fill=_normalize_color(edit.get("fill"), (1, 1, 1)) if edit.get("fill") else None,
        width=_clamp(_to_float(edit.get("stroke_width"), 2), 0.5, 24),
        stroke_opacity=_clamp(_to_float(edit.get("opacity"), 1), 0, 1),
        fill_opacity=_clamp(_to_float(edit.get("fill_opacity"), edit.get("opacity", 0.18)), 0, 1),
        overlay=True,
    )
    return True


def _apply_line(page, edit: dict, pymupdf) -> bool:
    """Draw a straight line on *page*.

    Args:
        page: PyMuPDF page object.
        edit: Edit dict with ``x1_pct``, ``y1_pct``, ``x2_pct``, ``y2_pct``.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` (lines are always drawn).
    """
    start = _page_point_from_pct(page, edit.get("x1_pct"), edit.get("y1_pct"), pymupdf)
    end = _page_point_from_pct(page, edit.get("x2_pct"), edit.get("y2_pct"), pymupdf)
    page.draw_line(
        start,
        end,
        color=_normalize_color(edit.get("stroke"), (0.11, 0.11, 0.11)),
        width=_clamp(_to_float(edit.get("stroke_width"), 2), 0.5, 24),
        stroke_opacity=_clamp(_to_float(edit.get("opacity"), 1), 0, 1),
        overlay=True,
    )
    return True


def _apply_arrow(page, edit: dict, pymupdf) -> bool:
    """Draw a line with an arrowhead on *page*.

    Args:
        page: PyMuPDF page object.
        edit: Edit dict with line endpoints and styling.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` (arrows are always drawn).
    """
    start = _page_point_from_pct(page, edit.get("x1_pct"), edit.get("y1_pct"), pymupdf)
    end = _page_point_from_pct(page, edit.get("x2_pct"), edit.get("y2_pct"), pymupdf)
    _draw_arrow(
        page,
        start,
        end,
        _normalize_color(edit.get("stroke"), (0.11, 0.11, 0.11)),
        _clamp(_to_float(edit.get("stroke_width"), 2), 0.5, 24),
        _clamp(_to_float(edit.get("opacity"), 1), 0, 1),
        pymupdf,
    )
    return True


def _apply_image(page, edit: dict, pymupdf) -> bool:
    """Embed a raster image onto *page* from a base64 data-URL.

    Args:
        page: PyMuPDF page object.
        edit: Edit dict with ``data_url`` and position keys.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if the image was inserted.
    """
    rect = _page_rect_from_edit(page, edit, pymupdf)
    if rect.width < 2 or rect.height < 2:
        return False

    image_bytes = _decode_data_url(str(edit.get("data_url", "")))
    page.insert_image(rect, stream=image_bytes, overlay=True, keep_proportion=False)
    return True


def _apply_link(page, edit: dict, pymupdf) -> bool:
    """Insert a clickable hyperlink annotation rendered as underlined text.

    Delegates to :func:`_apply_text` with a blue colour default.

    Args:
        page: PyMuPDF page object.
        edit: Edit dict with ``link_url``, ``text``, and position keys.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if the link text was inserted.
    """
    text = str(edit.get("text", edit.get("link_url", "Link"))).strip()
    if not text:
        return False

    link_edit = {
        **edit,
        "text": text,
        "fill": edit.get("fill", "#2563eb"),
        "align": edit.get("align", "left"),
    }
    return _apply_text(page, link_edit, pymupdf)


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def _apply_single_edit(page, edit: dict, pymupdf) -> bool:
    """Route a single edit operation to the appropriate drawing function.

    Args:
        page: PyMuPDF page object.
        edit: Edit operation dict — must contain a ``type`` key.
        pymupdf: The PyMuPDF module.

    Returns:
        ``True`` if the edit was applied, ``False`` if skipped.
    """
    edit_type = str(edit.get("type", "")).strip().lower()
    if edit_type not in SUPPORTED_TYPES:
        return False

    if edit_type == "text":
        return _apply_text(page, edit, pymupdf)
    if edit_type == "note":
        return _apply_note(page, edit, pymupdf)
    if edit_type == "rect":
        return _apply_rect(page, edit, pymupdf)
    if edit_type == "ellipse":
        return _apply_ellipse(page, edit, pymupdf)
    if edit_type == "line":
        return _apply_line(page, edit, pymupdf)
    if edit_type == "arrow":
        return _apply_arrow(page, edit, pymupdf)
    if edit_type == "image":
        return _apply_image(page, edit, pymupdf)
    if edit_type == "link":
        return _apply_link(page, edit, pymupdf)
    return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def apply_pdf_edits(input_path: str, output_path: str, edits: list[dict]) -> dict:
    """Apply a list of visual editor operations to a PDF and save the result.

    Each *edit* dict is expected to contain a ``type`` key (one of
    :data:`SUPPORTED_TYPES`) and a ``page`` number (1-indexed).  Position
    and size are expressed as **percentages** of the target page dimensions
    so the frontend can work with any zoom level.

    Args:
        input_path: Path to the source PDF file.
        output_path: Destination path for the edited PDF.
        edits: List of edit operation dicts.

    Returns:
        A summary dict with ``page_count``, ``edits_applied``, and
        ``output_size`` (bytes).

    Raises:
        PDFEditorError: On invalid input, password-protected PDFs,
            or internal PyMuPDF failures.
    """
    if not edits:
        raise PDFEditorError("No edits provided.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    pymupdf = _load_pymupdf()

    try:
        doc = pymupdf.open(input_path)
        try:
            if getattr(doc, "is_encrypted", False) and not doc.authenticate(""):
                raise PDFEditorError("This PDF is password-protected. Please unlock it first.")

            page_count = doc.page_count
            if page_count == 0:
                raise PDFEditorError("PDF has no pages.")

            edits_applied = 0
            for edit in edits:
                page_num = int(edit.get("page", 1))
                if page_num < 1 or page_num > page_count:
                    continue

                page = doc.load_page(page_num - 1)
                if _apply_single_edit(page, edit, pymupdf):
                    edits_applied += 1

            if edits_applied == 0:
                raise PDFEditorError("No valid edits could be applied.")

            doc.save(output_path, garbage=3, deflate=True)
        finally:
            doc.close()

        return {
            "page_count": page_count,
            "edits_applied": edits_applied,
            "output_size": os.path.getsize(output_path),
        }
    except PDFEditorError:
        raise
    except Exception as exc:
        raise PDFEditorError(f"PDF editing failed: {str(exc)}") from exc
