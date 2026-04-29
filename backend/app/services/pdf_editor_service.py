"""PDF Editor service powered by PyMuPDF."""
from __future__ import annotations

import base64
import logging
import math
import os
import re
from typing import Any


logger = logging.getLogger(__name__)


class PDFEditorError(Exception):
    """Custom exception for PDF editor failures."""


MAX_IMAGE_BYTES = 12 * 1024 * 1024
SUPPORTED_TYPES = {"text", "rect", "ellipse", "line", "arrow", "image", "link"}
ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
FONT_FALLBACKS = {
    "Helvetica": "helv",
    "Arial": "helv",
    "Times New Roman": "tiro",
    "Times": "tiro",
    "Courier": "cour",
}


def _load_pymupdf():
    try:
        import pymupdf

        return pymupdf
    except ImportError:
        import fitz

        return fitz


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_color(value: Any, fallback: tuple[float, float, float]) -> tuple[float, float, float]:
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


def _prepare_pdf_text(text: str) -> str:
    """Reshape Arabic text when support libraries are available."""
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


def _page_rect_from_edit(page, edit: dict, pymupdf):
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
    page_rect = page.rect
    x = page_rect.x0 + (page_rect.width * _clamp(_to_float(x_pct), 0.0, 100.0) / 100)
    y = page_rect.y0 + (page_rect.height * _clamp(_to_float(y_pct), 0.0, 100.0) / 100)
    return pymupdf.Point(x, y)


def _decode_data_url(data_url: str) -> bytes:
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


def _draw_arrow(page, start, end, color, width, fill_opacity, pymupdf):
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

    page.draw_polyline([left, end, right], color=color, width=width, closePath=True, fill=color, fill_opacity=fill_opacity, stroke_opacity=fill_opacity)


def _apply_text(page, edit: dict, pymupdf):
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
    font_name = FONT_FALLBACKS.get(str(edit.get("font_family", "Helvetica")), "helv")
    background_fill = edit.get("bg_fill")

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


def _apply_rect(page, edit: dict, pymupdf):
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


def _apply_ellipse(page, edit: dict, pymupdf):
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


def _apply_line(page, edit: dict, pymupdf):
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


def _apply_arrow(page, edit: dict, pymupdf):
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


def _apply_image(page, edit: dict, pymupdf):
    rect = _page_rect_from_edit(page, edit, pymupdf)
    if rect.width < 2 or rect.height < 2:
        return False

    image_bytes = _decode_data_url(str(edit.get("data_url", "")))
    page.insert_image(rect, stream=image_bytes, overlay=True, keep_proportion=False)
    return True


def _apply_link(page, edit: dict, pymupdf):
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


def _apply_single_edit(page, edit: dict, pymupdf) -> bool:
    edit_type = str(edit.get("type", "")).strip().lower()
    if edit_type not in SUPPORTED_TYPES:
        return False

    if edit_type == "text":
        return _apply_text(page, edit, pymupdf)
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


def apply_pdf_edits(input_path: str, output_path: str, edits: list[dict]) -> dict:
    """Apply visual editor operations to a PDF using PyMuPDF."""
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
