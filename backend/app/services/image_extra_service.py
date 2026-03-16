"""Image extra tools — Crop, Rotate/Flip."""
import os
import logging

from PIL import Image

logger = logging.getLogger(__name__)


class ImageExtraError(Exception):
    """Custom exception for image extra tool failures."""
    pass


FORMAT_MAP = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}


# ---------------------------------------------------------------------------
# Image Crop
# ---------------------------------------------------------------------------
def crop_image(
    input_path: str,
    output_path: str,
    left: int,
    top: int,
    right: int,
    bottom: int,
    quality: int = 85,
) -> dict:
    """Crop an image to a specified rectangle.

    Args:
        input_path: Path to the input image
        output_path: Path for the cropped output
        left: Left edge in pixels
        top: Top edge in pixels
        right: Right edge in pixels
        bottom: Bottom edge in pixels
        quality: Output quality for lossy formats

    Returns:
        dict with original and cropped dimensions

    Raises:
        ImageExtraError: If crop fails
    """
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with Image.open(input_path) as img:
            orig_w, orig_h = img.size

            if left < 0 or top < 0 or right > orig_w or bottom > orig_h:
                raise ImageExtraError(
                    f"Crop area ({left},{top},{right},{bottom}) outside image bounds ({orig_w}x{orig_h})."
                )
            if left >= right or top >= bottom:
                raise ImageExtraError("Invalid crop area: left must be < right, top must be < bottom.")

            cropped = img.crop((left, top, right, bottom))

            ext = os.path.splitext(output_path)[1].lower().strip(".")
            pil_format = FORMAT_MAP.get(ext, "PNG")

            save_kwargs = {"optimize": True}
            if pil_format in ("JPEG", "WEBP"):
                save_kwargs["quality"] = quality
                if cropped.mode in ("RGBA", "P", "LA"):
                    bg = Image.new("RGB", cropped.size, (255, 255, 255))
                    if cropped.mode == "P":
                        cropped = cropped.convert("RGBA")
                    bg.paste(cropped, mask=cropped.split()[-1] if "A" in cropped.mode else None)
                    cropped = bg

            cropped.save(output_path, format=pil_format, **save_kwargs)

        new_w = right - left
        new_h = bottom - top
        logger.info(f"Image crop: {orig_w}x{orig_h} → {new_w}x{new_h}")
        return {
            "original_width": orig_w,
            "original_height": orig_h,
            "cropped_width": new_w,
            "cropped_height": new_h,
        }

    except ImageExtraError:
        raise
    except (IOError, OSError, Image.DecompressionBombError) as e:
        raise ImageExtraError(f"Image crop failed: {str(e)}")


# ---------------------------------------------------------------------------
# Image Rotate / Flip
# ---------------------------------------------------------------------------
def rotate_flip_image(
    input_path: str,
    output_path: str,
    rotation: int = 0,
    flip_horizontal: bool = False,
    flip_vertical: bool = False,
    quality: int = 85,
) -> dict:
    """Rotate and/or flip an image.

    Args:
        input_path: Path to the input image
        output_path: Path for the output image
        rotation: Rotation angle (0, 90, 180, 270)
        flip_horizontal: Mirror horizontally
        flip_vertical: Mirror vertically
        quality: Output quality for lossy formats

    Returns:
        dict with original and new dimensions

    Raises:
        ImageExtraError: If operation fails
    """
    if rotation not in (0, 90, 180, 270):
        raise ImageExtraError("Rotation must be 0, 90, 180, or 270 degrees.")

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with Image.open(input_path) as img:
            orig_w, orig_h = img.size
            result = img

            if rotation:
                # PIL rotates counter-clockwise, so negate for clockwise
                result = result.rotate(-rotation, expand=True)

            if flip_horizontal:
                result = result.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

            if flip_vertical:
                result = result.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

            new_w, new_h = result.size

            ext = os.path.splitext(output_path)[1].lower().strip(".")
            pil_format = FORMAT_MAP.get(ext, "PNG")

            save_kwargs = {"optimize": True}
            if pil_format in ("JPEG", "WEBP"):
                save_kwargs["quality"] = quality
                if result.mode in ("RGBA", "P", "LA"):
                    bg = Image.new("RGB", result.size, (255, 255, 255))
                    if result.mode == "P":
                        result = result.convert("RGBA")
                    bg.paste(result, mask=result.split()[-1] if "A" in result.mode else None)
                    result = bg

            result.save(output_path, format=pil_format, **save_kwargs)

        logger.info(f"Image rotate/flip: {orig_w}x{orig_h} → {new_w}x{new_h}, rot={rotation}")
        return {
            "original_width": orig_w,
            "original_height": orig_h,
            "new_width": new_w,
            "new_height": new_h,
            "rotation": rotation,
            "flipped_horizontal": flip_horizontal,
            "flipped_vertical": flip_vertical,
        }

    except ImageExtraError:
        raise
    except (IOError, OSError, Image.DecompressionBombError) as e:
        raise ImageExtraError(f"Image rotate/flip failed: {str(e)}")
