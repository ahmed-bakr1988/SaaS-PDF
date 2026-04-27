"""PDF conversion service using LibreOffice headless."""
import os
import subprocess
import logging
import tempfile
from pdf2docx import Converter

logger = logging.getLogger(__name__)


class PDFConversionError(Exception):
    """Custom exception for PDF conversion failures."""
    pass


def pdf_to_word(input_path: str, output_dir: str) -> str:
    """
    Convert a PDF file to Word (DOCX) format using pdf2docx.

    Args:
        input_path: Path to the input PDF file
        output_dir: Directory for the output file

    Returns:
        Path to the converted DOCX file

    Raises:
        PDFConversionError: If conversion fails
    """
    os.makedirs(output_dir, exist_ok=True)

    input_basename = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(output_dir, f"{input_basename}.docx")

    try:
        logger.info(f"Running pdf2docx conversion for: {input_path}")
        
        # Initialize the converter
        cv = Converter(input_path)
        
        # Convert all pages to docx
        cv.convert(output_path, start=0, end=None)
        
        # Close the converter
        cv.close()

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"PDF→Word conversion successful: {output_path}")
            return output_path

        raise PDFConversionError("Output file was not created or is empty.")

    except Exception as e:
        logger.error(f"pdf2docx PDF→Word failed: {str(e)}")
        raise PDFConversionError(f"Conversion failed: {str(e)}")


def word_to_pdf(input_path: str, output_dir: str) -> str:
    """
    Convert a Word (DOC/DOCX) file to PDF format using LibreOffice headless.

    Args:
        input_path: Path to the input Word file
        output_dir: Directory for the output file

    Returns:
        Path to the converted PDF file

    Raises:
        PDFConversionError: If conversion fails
    """
    os.makedirs(output_dir, exist_ok=True)

    # Use a unique user profile per process to avoid lock conflicts
    user_install_dir = tempfile.mkdtemp(prefix="lo_word2pdf_")

    cmd = [
        "soffice",
        "--headless",
        "--norestore",
        f"-env:UserInstallation=file://{user_install_dir}",
        "--convert-to", "pdf",
        "--outdir", output_dir,
        input_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, "HOME": user_install_dir},
        )

        input_basename = os.path.splitext(os.path.basename(input_path))[0]
        output_path = os.path.join(output_dir, f"{input_basename}.pdf")

        # Check output file first — LibreOffice may return non-zero
        # due to harmless warnings (e.g. javaldx) even on success
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"Word→PDF conversion successful: {output_path}")
            return output_path

        if result.returncode != 0:
            stderr = result.stderr or ""
            real_errors = [
                line for line in stderr.strip().splitlines()
                if not line.startswith("Warning: failed to launch javaldx")
            ]
            error_msg = "\n".join(real_errors) if real_errors else stderr
            logger.error(f"LibreOffice Word→PDF failed: {error_msg}")
            raise PDFConversionError(
                f"Conversion failed: {error_msg or 'Unknown error'}"
            )

        raise PDFConversionError("Output file was not created.")

    except subprocess.TimeoutExpired:
        raise PDFConversionError("Conversion timed out. File may be too large.")
    except FileNotFoundError:
        raise PDFConversionError("LibreOffice is not installed on the server.")
    finally:
        # Cleanup temporary user profile
        import shutil
        shutil.rmtree(user_install_dir, ignore_errors=True)
