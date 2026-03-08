"""HTML to PDF conversion service."""
import os
import logging

logger = logging.getLogger(__name__)


class HtmlToPdfError(Exception):
    """Custom exception for HTML to PDF conversion failures."""
    pass


def html_to_pdf(
    input_path: str,
    output_path: str,
) -> dict:
    """
    Convert an HTML file to PDF.

    Args:
        input_path: Path to the input HTML file
        output_path: Path for the output PDF

    Returns:
        dict with output_size

    Raises:
        HtmlToPdfError: If conversion fails
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        from weasyprint import HTML

        HTML(filename=input_path).write_pdf(output_path)

        output_size = os.path.getsize(output_path)
        logger.info(f"HTML→PDF conversion completed ({output_size} bytes)")

        return {
            "output_size": output_size,
        }

    except ImportError:
        raise HtmlToPdfError("weasyprint library is not installed.")
    except Exception as e:
        raise HtmlToPdfError(f"Failed to convert HTML to PDF: {str(e)}")


def html_string_to_pdf(
    html_content: str,
    output_path: str,
) -> dict:
    """
    Convert an HTML string to PDF.

    Args:
        html_content: HTML content as string
        output_path: Path for the output PDF

    Returns:
        dict with output_size

    Raises:
        HtmlToPdfError: If conversion fails
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        from weasyprint import HTML

        HTML(string=html_content).write_pdf(output_path)

        output_size = os.path.getsize(output_path)
        logger.info(f"HTML string→PDF conversion completed ({output_size} bytes)")

        return {
            "output_size": output_size,
        }

    except ImportError:
        raise HtmlToPdfError("weasyprint library is not installed.")
    except Exception as e:
        raise HtmlToPdfError(f"Failed to convert HTML to PDF: {str(e)}")
