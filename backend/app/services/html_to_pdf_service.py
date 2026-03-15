"""HTML to PDF conversion service."""
import os
import logging
from importlib.metadata import PackageNotFoundError, version

logger = logging.getLogger(__name__)


class HtmlToPdfError(Exception):
    """Custom exception for HTML to PDF conversion failures."""
    pass


def _parse_version_parts(raw_version: str | None) -> tuple[int, ...]:
    """Parse a package version into comparable integer parts."""
    if not raw_version:
        return ()

    parts: list[int] = []
    for token in raw_version.replace("-", ".").split("."):
        digits = "".join(ch for ch in token if ch.isdigit())
        if not digits:
            break
        parts.append(int(digits))
    return tuple(parts)


def _get_installed_version(package_name: str) -> str | None:
    """Return installed package version, if available."""
    try:
        return version(package_name)
    except PackageNotFoundError:
        return None


def _get_dependency_mismatch_error() -> str | None:
    """
    Detect the known WeasyPrint/pydyf incompatibility before conversion starts.

    WeasyPrint 61.x instantiates pydyf.PDF with constructor arguments, while
    pydyf 0.11+ moved these parameters to PDF.write(). That mismatch raises:
    "PDF.__init__() takes 1 positional argument but 3 were given".
    """
    weasyprint_version = _get_installed_version("weasyprint")
    pydyf_version = _get_installed_version("pydyf")
    if not weasyprint_version or not pydyf_version:
        return None

    if (
        _parse_version_parts(weasyprint_version) < (62,)
        and _parse_version_parts(pydyf_version) >= (0, 11)
    ):
        return (
            "Installed HTML-to-PDF dependencies are incompatible: "
            f"WeasyPrint {weasyprint_version} with pydyf {pydyf_version}. "
            "Reinstall backend dependencies after pinning pydyf<0.11."
        )

    return None


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
        dependency_error = _get_dependency_mismatch_error()
        if dependency_error:
            raise HtmlToPdfError(dependency_error)

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
        dependency_error = _get_dependency_mismatch_error()
        if dependency_error:
            raise HtmlToPdfError(dependency_error)

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
