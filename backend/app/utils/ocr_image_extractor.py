"""OCR Image Extractor — extracts embedded images or renders pages to images.

Designed to be memory-efficient and run on resource-constrained VPS environments.
"""

from __future__ import annotations

import logging
import os
import shutil
import zipfile

logger = logging.getLogger(__name__)


def extract_ocr_images(input_path: str, ext: str, output_ocr_dir: str) -> int:
    """Extract embedded images or render pages/frames to images.

    Args:
        input_path: Absolute path to the source file.
        ext: File extension (e.g. "pdf", "docx").
        output_ocr_dir: Absolute path to directory where images should be saved.

    Returns:
        Number of images extracted/created.
    """
    os.makedirs(output_ocr_dir, exist_ok=True)
    ext = ext.lower().lstrip(".")
    img_count = 0

    # 1. Image formats -> Copy original image
    if ext in {"png", "jpg", "jpeg", "webp", "tiff", "bmp"}:
        try:
            dest = os.path.join(output_ocr_dir, f"image_1.{ext}")
            shutil.copy2(input_path, dest)
            img_count += 1
        except Exception as e:
            logger.warning("Failed to copy source image: %s", e)

    # 2. PDF format -> Extract embedded images or render pages
    elif ext == "pdf":
        try:
            import fitz
            doc = fitz.open(input_path)
            
            # Try to extract embedded images first
            for page_idx, page in enumerate(doc):
                image_list = page.get_images(full=True)
                for img_info in image_list:
                    xref = img_info[0]
                    try:
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]
                        # Save only standard image formats
                        if image_ext in {"png", "jpeg", "jpg", "webp"}:
                            filename = f"extracted_img_{img_count + 1}.{image_ext}"
                            with open(os.path.join(output_ocr_dir, filename), "wb") as f:
                                f.write(image_bytes)
                            img_count += 1
                    except Exception as e:
                        logger.debug("Failed to extract xref %d on page %d: %s", xref, page_idx, e)
            
            # If no embedded images found, render pages (e.g., scanned PDFs)
            if img_count == 0:
                # Limit rendering to max 30 pages to protect 2 vCPU / 4GB RAM VPS
                limit = min(len(doc), 30)
                zoom = 150 / 72  # 150 DPI is standard and fast
                matrix = fitz.Matrix(zoom, zoom)
                for index in range(limit):
                    try:
                        page = doc.load_page(index)
                        pix = page.get_pixmap(matrix=matrix, alpha=False)
                        filename = f"page_{index + 1}.png"
                        pix.save(os.path.join(output_ocr_dir, filename))
                        pix.cleanup()
                        img_count += 1
                    except Exception as e:
                        logger.warning("Failed to render page %d: %s", index + 1, e)
            doc.close()
        except Exception as e:
            logger.warning("Failed to extract images from PDF: %s", e)

    # 3. Office formats (docx, pptx, xlsx) -> Extract from zip archive
    elif ext in {"docx", "pptx", "xlsx"}:
        try:
            with zipfile.ZipFile(input_path) as archive:
                for f in archive.namelist():
                    # Look for media files inside Office ZIP package (e.g. word/media/image1.png)
                    if any(part in f.lower() for part in {"media/", "pictures/"}) and f.lower().endswith(
                        (".png", ".jpg", ".jpeg", ".webp", ".gif", ".tiff")
                    ):
                        try:
                            data = archive.read(f)
                            name = os.path.basename(f)
                            # Prepend counter to prevent duplicate basenames
                            dest_name = f"office_img_{img_count + 1}_{name}"
                            with open(os.path.join(output_ocr_dir, dest_name), "wb") as dest_f:
                                dest_f.write(data)
                            img_count += 1
                        except Exception as e:
                            logger.debug("Failed to read Office ZIP file %s: %s", f, e)
        except Exception as e:
            logger.warning("Failed to extract images from Office document: %s", e)

    # 4. ZIP format -> Extract any images
    elif ext == "zip":
        try:
            with zipfile.ZipFile(input_path) as archive:
                for f in archive.namelist():
                    if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".tiff")):
                        try:
                            data = archive.read(f)
                            name = os.path.basename(f)
                            dest_name = f"zip_img_{img_count + 1}_{name}"
                            with open(os.path.join(output_ocr_dir, dest_name), "wb") as dest_f:
                                dest_f.write(data)
                            img_count += 1
                        except Exception as e:
                            logger.debug("Failed to read ZIP entry %s: %s", f, e)
        except Exception as e:
            logger.warning("Failed to extract images from ZIP file: %s", e)

    return img_count
