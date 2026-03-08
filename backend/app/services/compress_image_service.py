"""Image compression service using Pillow."""
import os
import logging

from PIL import Image

logger = logging.getLogger(__name__)


class CompressImageError(Exception):
    """Custom exception for image compression failures."""
    pass


FORMAT_MAP = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}


def compress_image(
    input_path: str,
    output_path: str,
    quality: int = 75,
) -> dict:
    """
    Compress an image by reducing quality and optimizing encoding.

    Args:
        input_path: Path to the input image
        output_path: Path for the compressed image
        quality: Output quality 1-100

    Returns:
        dict with original_size, compressed_size, reduction_percent

    Raises:
        CompressImageError: If compression fails
    """
    quality = max(1, min(100, quality))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        original_size = os.path.getsize(input_path)

        with Image.open(input_path) as img:
            width, height = img.size
            ext = os.path.splitext(output_path)[1].lower().strip(".")
            pil_format = FORMAT_MAP.get(ext, "JPEG")

            # Convert RGBA to RGB for JPEG
            if pil_format == "JPEG" and img.mode in ("RGBA", "P", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(
                    img, mask=img.split()[-1] if "A" in img.mode else None
                )
                img = background

            save_kwargs = {"optimize": True}
            if pil_format in ("JPEG", "WEBP"):
                save_kwargs["quality"] = quality
            elif pil_format == "PNG":
                save_kwargs["compress_level"] = 9

            img.save(output_path, format=pil_format, **save_kwargs)

        compressed_size = os.path.getsize(output_path)
        reduction = round(
            (1 - compressed_size / original_size) * 100, 1
        ) if original_size > 0 else 0

        logger.info(
            f"Image compression: {original_size} → {compressed_size} "
            f"({reduction}% reduction)"
        )

        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "reduction_percent": reduction,
            "width": width,
            "height": height,
        }

    except (IOError, OSError, Image.DecompressionBombError) as e:
        raise CompressImageError(f"Image compression failed: {str(e)}")
