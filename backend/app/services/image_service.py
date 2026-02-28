"""Image processing service using Pillow."""
import os
import logging

from PIL import Image

logger = logging.getLogger(__name__)


class ImageProcessingError(Exception):
    """Custom exception for image processing failures."""
    pass


# Supported format mappings
FORMAT_MAP = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}


def convert_image(
    input_path: str,
    output_path: str,
    output_format: str,
    quality: int = 85,
) -> dict:
    """
    Convert an image to a different format.

    Args:
        input_path: Path to the input image
        output_path: Path for the output image
        output_format: Target format ("jpg", "png", "webp")
        quality: Output quality 1-100 (for lossy formats)

    Returns:
        dict with original_size, converted_size, dimensions

    Raises:
        ImageProcessingError: If conversion fails
    """
    output_format = output_format.lower()
    if output_format not in FORMAT_MAP:
        raise ImageProcessingError(
            f"Unsupported output format: {output_format}. "
            f"Supported: {', '.join(FORMAT_MAP.keys())}"
        )

    pil_format = FORMAT_MAP[output_format]
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        original_size = os.path.getsize(input_path)

        # Open and re-encode (strips any malicious payloads)
        with Image.open(input_path) as img:
            # Convert RGBA to RGB for JPEG (JPEG doesn't support alpha)
            if pil_format == "JPEG" and img.mode in ("RGBA", "P", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
                img = background

            width, height = img.size

            # Save with quality setting
            save_kwargs = {}
            if pil_format in ("JPEG", "WEBP"):
                save_kwargs["quality"] = max(1, min(100, quality))
                save_kwargs["optimize"] = True
            elif pil_format == "PNG":
                save_kwargs["optimize"] = True

            img.save(output_path, format=pil_format, **save_kwargs)

        converted_size = os.path.getsize(output_path)

        logger.info(
            f"Image conversion: {input_path} → {output_format} "
            f"({original_size} → {converted_size})"
        )

        return {
            "original_size": original_size,
            "converted_size": converted_size,
            "width": width,
            "height": height,
            "format": output_format,
        }

    except (IOError, OSError, Image.DecompressionBombError) as e:
        raise ImageProcessingError(f"Image processing failed: {str(e)}")


def resize_image(
    input_path: str,
    output_path: str,
    width: int | None = None,
    height: int | None = None,
    quality: int = 85,
) -> dict:
    """
    Resize an image while maintaining aspect ratio.

    Args:
        input_path: Path to the input image
        output_path: Path for the resized image
        width: Target width (None to auto-calculate from height)
        height: Target height (None to auto-calculate from width)
        quality: Output quality 1-100

    Returns:
        dict with original and new dimensions

    Raises:
        ImageProcessingError: If resize fails
    """
    if width is None and height is None:
        raise ImageProcessingError("At least one of width or height must be specified.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        with Image.open(input_path) as img:
            orig_width, orig_height = img.size

            # Calculate missing dimension to maintain aspect ratio
            if width and not height:
                ratio = width / orig_width
                height = int(orig_height * ratio)
            elif height and not width:
                ratio = height / orig_height
                width = int(orig_width * ratio)

            # Resize using high-quality resampling
            resized = img.resize((width, height), Image.Resampling.LANCZOS)

            # Detect format from output extension
            ext = os.path.splitext(output_path)[1].lower().strip(".")
            pil_format = FORMAT_MAP.get(ext, "PNG")

            save_kwargs = {"optimize": True}
            if pil_format in ("JPEG", "WEBP"):
                save_kwargs["quality"] = quality
                # Handle RGBA for JPEG
                if resized.mode in ("RGBA", "P", "LA"):
                    background = Image.new("RGB", resized.size, (255, 255, 255))
                    if resized.mode == "P":
                        resized = resized.convert("RGBA")
                    background.paste(
                        resized, mask=resized.split()[-1] if "A" in resized.mode else None
                    )
                    resized = background

            resized.save(output_path, format=pil_format, **save_kwargs)

        return {
            "original_width": orig_width,
            "original_height": orig_height,
            "new_width": width,
            "new_height": height,
        }

    except (IOError, OSError, Image.DecompressionBombError) as e:
        raise ImageProcessingError(f"Image resize failed: {str(e)}")
