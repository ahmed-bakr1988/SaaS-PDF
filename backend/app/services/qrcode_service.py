"""QR Code generation service."""
import os
import logging

logger = logging.getLogger(__name__)


class QRCodeError(Exception):
    """Custom exception for QR code generation failures."""
    pass


def generate_qr_code(
    data: str,
    output_path: str,
    size: int = 300,
    output_format: str = "png",
) -> dict:
    """
    Generate a QR code image from text or URL data.

    Args:
        data: The content to encode (URL, text, etc.)
        output_path: Path for the output image
        size: QR code image size in pixels (100-2000)
        output_format: Output format ("png" or "svg")

    Returns:
        dict with output_size

    Raises:
        QRCodeError: If generation fails
    """
    if not data or not data.strip():
        raise QRCodeError("No data provided for QR code.")

    if len(data) > 4000:
        raise QRCodeError("Data too long. Maximum 4000 characters.")

    size = max(100, min(2000, size))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        import qrcode
        from PIL import Image

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Resize to requested size
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        img.save(output_path)

        output_size = os.path.getsize(output_path)
        logger.info(f"QR code generated: {size}x{size} ({output_size} bytes)")

        return {
            "output_size": output_size,
            "width": size,
            "height": size,
        }

    except ImportError:
        raise QRCodeError("qrcode library is not installed.")
    except Exception as e:
        raise QRCodeError(f"Failed to generate QR code: {str(e)}")
