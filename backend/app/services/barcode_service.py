"""Barcode generation service."""
import os
import io
import logging

logger = logging.getLogger(__name__)


class BarcodeGenerationError(Exception):
    """Custom exception for barcode generation failures."""
    pass


SUPPORTED_BARCODE_TYPES = [
    "code128",
    "code39",
    "ean13",
    "ean8",
    "upca",
    "isbn13",
    "isbn10",
    "issn",
    "pzn",
]


def generate_barcode(
    data: str,
    barcode_type: str = "code128",
    output_path: str = "",
    output_format: str = "png",
) -> dict:
    """Generate a barcode image.

    Args:
        data: The data to encode in the barcode
        barcode_type: Type of barcode (code128, code39, ean13, etc.)
        output_path: Path for the output image
        output_format: "png" or "svg"

    Returns:
        dict with barcode_type, data, and output_size

    Raises:
        BarcodeGenerationError: If generation fails
    """
    barcode_type = barcode_type.lower()
    if barcode_type not in SUPPORTED_BARCODE_TYPES:
        raise BarcodeGenerationError(
            f"Unsupported barcode type: {barcode_type}. "
            f"Supported: {', '.join(SUPPORTED_BARCODE_TYPES)}"
        )

    if not data or not data.strip():
        raise BarcodeGenerationError("Barcode data cannot be empty.")

    if len(data) > 200:
        raise BarcodeGenerationError("Barcode data is too long (max 200 characters).")

    try:
        import barcode
        from barcode.writer import ImageWriter

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Map friendly names to python-barcode class names
        type_map = {
            "code128": "code128",
            "code39": "code39",
            "ean13": "ean13",
            "ean8": "ean8",
            "upca": "upca",
            "isbn13": "isbn13",
            "isbn10": "isbn10",
            "issn": "issn",
            "pzn": "pzn",
        }
        bc_type = type_map[barcode_type]

        if output_format == "svg":
            bc = barcode.get(bc_type, data)
            # barcode.save() appends the extension automatically
            output_base = output_path.rsplit(".", 1)[0] if "." in output_path else output_path
            final_path = bc.save(output_base)
        else:
            bc = barcode.get(bc_type, data, writer=ImageWriter())
            output_base = output_path.rsplit(".", 1)[0] if "." in output_path else output_path
            final_path = bc.save(output_base)

        if not os.path.exists(final_path):
            raise BarcodeGenerationError("Barcode file was not created.")

        output_size = os.path.getsize(final_path)
        logger.info(f"Barcode generated: type={barcode_type}, data={data[:20]}... ({output_size} bytes)")

        return {
            "barcode_type": barcode_type,
            "data": data,
            "output_size": output_size,
            "output_path": final_path,
        }

    except BarcodeGenerationError:
        raise
    except Exception as e:
        raise BarcodeGenerationError(f"Barcode generation failed: {str(e)}")
