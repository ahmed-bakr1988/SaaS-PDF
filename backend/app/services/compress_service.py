"""PDF compression service using Ghostscript."""
import os
import subprocess
import logging

logger = logging.getLogger(__name__)


class PDFCompressionError(Exception):
    """Custom exception for PDF compression failures."""
    pass


# Ghostscript quality presets
QUALITY_PRESETS = {
    "low": "/screen",        # 72 dpi — smallest file, lowest quality
    "medium": "/ebook",      # 150 dpi — good balance (default)
    "high": "/printer",      # 300 dpi — high quality, moderate compression
}


def compress_pdf(
    input_path: str, output_path: str, quality: str = "medium"
) -> dict:
    """
    Compress a PDF file using Ghostscript.

    Args:
        input_path: Path to the input PDF file
        output_path: Path for the compressed output file
        quality: Compression quality — "low", "medium", or "high"

    Returns:
        dict with original_size, compressed_size, reduction_percent

    Raises:
        PDFCompressionError: If compression fails
    """
    if quality not in QUALITY_PRESETS:
        quality = "medium"

    gs_quality = QUALITY_PRESETS[quality]

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cmd = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={gs_quality}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dColorImageResolution=150",
        "-dGrayImageResolution=150",
        "-dMonoImageResolution=150",
        f"-sOutputFile={output_path}",
        input_path,
    ]

    try:
        original_size = os.path.getsize(input_path)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            logger.error(f"Ghostscript compression failed: {result.stderr}")
            raise PDFCompressionError(
                f"Compression failed: {result.stderr or 'Unknown error'}"
            )

        if not os.path.exists(output_path):
            raise PDFCompressionError("Compressed file was not created.")

        compressed_size = os.path.getsize(output_path)

        # If compressed file is larger, keep original
        if compressed_size >= original_size:
            import shutil
            shutil.copy2(input_path, output_path)
            compressed_size = original_size

        reduction = (
            ((original_size - compressed_size) / original_size) * 100
            if original_size > 0
            else 0
        )

        logger.info(
            f"PDF compression: {original_size} → {compressed_size} "
            f"({reduction:.1f}% reduction)"
        )

        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "reduction_percent": round(reduction, 1),
        }

    except subprocess.TimeoutExpired:
        raise PDFCompressionError("Compression timed out. File may be too large.")
    except FileNotFoundError:
        raise PDFCompressionError("Ghostscript is not installed on the server.")
