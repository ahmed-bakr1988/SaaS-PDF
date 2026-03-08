"""Background removal service using rembg."""
import logging
import os

from PIL import Image

logger = logging.getLogger(__name__)


class RemoveBGError(Exception):
    """Custom exception for background removal failures."""
    pass


def remove_background(input_path: str, output_path: str) -> dict:
    """Remove the background from an image.

    Args:
        input_path: Path to the input image.
        output_path: Path for the output PNG (always PNG — transparency).

    Returns:
        dict with ``original_size``, ``output_size``, ``width``, ``height``.

    Raises:
        RemoveBGError: If the operation fails.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        from rembg import remove as rembg_remove

        with Image.open(input_path) as img:
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            width, height = img.size
            original_size = os.path.getsize(input_path)

            result = rembg_remove(img)
            result.save(output_path, format="PNG", optimize=True)

        output_size = os.path.getsize(output_path)

        logger.info(
            "Background removed: %s → %s (%d → %d bytes)",
            input_path, output_path, original_size, output_size,
        )

        return {
            "original_size": original_size,
            "output_size": output_size,
            "width": width,
            "height": height,
        }
    except ImportError:
        raise RemoveBGError("rembg is not installed.")
    except (IOError, OSError) as e:
        raise RemoveBGError(f"Background removal failed: {str(e)}")
    except Exception as e:
        raise RemoveBGError(f"Background removal failed: {str(e)}")
