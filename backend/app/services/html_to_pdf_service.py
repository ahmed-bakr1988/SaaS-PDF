"""HTML to PDF conversion service."""
import logging
import os
import re
import shutil
import threading
import zipfile
from collections.abc import Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path, PurePosixPath
from urllib.parse import quote

logger = logging.getLogger(__name__)

_PAGE_FORMAT_ALIASES = {
    "letter": "Letter",
    "legal": "Legal",
    "tabloid": "Tabloid",
    "ledger": "Ledger",
    "a0": "A0",
    "a1": "A1",
    "a2": "A2",
    "a3": "A3",
    "a4": "A4",
    "a5": "A5",
    "a6": "A6",
}
_MARGIN_VALUE_RE = re.compile(r"^\d+(?:\.\d+)?(?:px|in|cm|mm)?$", re.IGNORECASE)


class HtmlToPdfError(Exception):
    """Custom exception for HTML to PDF conversion failures."""


@dataclass(slots=True)
class HtmlToPdfRenderOptions:
    """User-facing rendering options for HTML-to-PDF conversion."""

    source_kind: str = "html"
    entry_html: str | None = None
    page_format: str = "A4"
    landscape: bool = False
    print_background: bool = True
    prefer_css_page_size: bool = True
    margin_top: str = "0"
    margin_right: str = "0"
    margin_bottom: str = "0"
    margin_left: str = "0"

    def to_payload(self) -> dict[str, object]:
        """Return a Celery-safe representation of render options."""
        return {
            "source_kind": self.source_kind,
            "entry_html": self.entry_html,
            "page_format": self.page_format,
            "landscape": self.landscape,
            "print_background": self.print_background,
            "prefer_css_page_size": self.prefer_css_page_size,
            "margin_top": self.margin_top,
            "margin_right": self.margin_right,
            "margin_bottom": self.margin_bottom,
            "margin_left": self.margin_left,
        }

    @classmethod
    def from_payload(
        cls,
        payload: "HtmlToPdfRenderOptions | Mapping[str, object] | None",
    ) -> "HtmlToPdfRenderOptions":
        """Normalize render options loaded from Celery payloads or defaults."""
        if isinstance(payload, cls):
            return payload

        if not payload:
            return cls()

        source_kind = str(payload.get("source_kind") or "html").strip().lower()
        if source_kind not in {"html", "archive"}:
            raise HtmlToPdfError("Unsupported HTML-to-PDF source type.")

        try:
            entry_html_raw = payload.get("entry_html")
            return cls(
                source_kind=source_kind,
                entry_html=(
                    _normalize_entry_html(entry_html_raw)
                    if entry_html_raw not in (None, "")
                    else None
                ),
                page_format=_normalize_page_format(payload.get("page_format"), default="A4"),
                landscape=_coerce_bool(payload.get("landscape"), default=False),
                print_background=_coerce_bool(
                    payload.get("print_background"), default=True
                ),
                prefer_css_page_size=_coerce_bool(
                    payload.get("prefer_css_page_size"), default=True
                ),
                margin_top=_normalize_margin_value(
                    payload.get("margin_top"), default="0"
                ),
                margin_right=_normalize_margin_value(
                    payload.get("margin_right"), default="0"
                ),
                margin_bottom=_normalize_margin_value(
                    payload.get("margin_bottom"), default="0"
                ),
                margin_left=_normalize_margin_value(
                    payload.get("margin_left"), default="0"
                ),
            )
        except ValueError as exc:
            raise HtmlToPdfError(str(exc)) from exc


@dataclass(slots=True)
class _PreparedRenderSource:
    """A task-local HTML source prepared for browser or WeasyPrint rendering."""

    entry_path: Path
    source_root: Path
    source_kind: str


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

    WeasyPrint 62+ officially requires pydyf >= 0.11, so no mismatch there.
    """
    weasyprint_version = _get_installed_version("weasyprint")
    pydyf_version = _get_installed_version("pydyf")
    if not weasyprint_version or not pydyf_version:
        return None

    wp = _parse_version_parts(weasyprint_version)
    pd = _parse_version_parts(pydyf_version)

    if wp >= (62,):
        return None

    if pd >= (0, 11):
        return (
            "Installed HTML-to-PDF dependencies are incompatible: "
            f"WeasyPrint {weasyprint_version} with pydyf {pydyf_version}. "
            "Reinstall backend dependencies after pinning pydyf<0.11 "
            "or upgrade WeasyPrint to 62+."
        )

    return None


def parse_html_to_pdf_render_options(
    form_data: Mapping[str, str] | None,
    source_extension: str,
) -> HtmlToPdfRenderOptions:
    """Parse and validate HTML-to-PDF request options from multipart form data."""
    form_data = form_data or {}
    normalized_ext = str(source_extension or "html").strip().lower()
    source_kind = "archive" if normalized_ext == "zip" else "html"

    orientation = str(form_data.get("orientation") or "portrait").strip().lower()
    if orientation not in {"portrait", "landscape"}:
        raise ValueError("Orientation must be either 'portrait' or 'landscape'.")

    return HtmlToPdfRenderOptions(
        source_kind=source_kind,
        entry_html=(
            _normalize_entry_html(form_data.get("entry_html"))
            if source_kind == "archive" and form_data.get("entry_html")
            else None
        ),
        page_format=_normalize_page_format(form_data.get("page_format"), default="A4"),
        landscape=orientation == "landscape",
        print_background=_coerce_bool(
            form_data.get("print_background"), default=True
        ),
        prefer_css_page_size=_coerce_bool(
            form_data.get("prefer_css_page_size"), default=True
        ),
        margin_top=_normalize_margin_value(form_data.get("margin_top"), default="0"),
        margin_right=_normalize_margin_value(form_data.get("margin_right"), default="0"),
        margin_bottom=_normalize_margin_value(
            form_data.get("margin_bottom"), default="0"
        ),
        margin_left=_normalize_margin_value(form_data.get("margin_left"), default="0"),
    )


def _coerce_bool(raw_value: object | None, *, default: bool) -> bool:
    """Parse booleans from form strings or Celery payloads."""
    if isinstance(raw_value, bool):
        return raw_value

    if raw_value is None:
        return default

    normalized = str(raw_value).strip().lower()
    if not normalized:
        return default
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False

    raise ValueError(f"Invalid boolean value: {raw_value}")


def _normalize_page_format(raw_value: object | None, *, default: str) -> str:
    """Validate and normalize Playwright page format values."""
    normalized = str(raw_value or default).strip()
    if not normalized:
        normalized = default

    canonical = _PAGE_FORMAT_ALIASES.get(normalized.lower())
    if canonical is None:
        raise ValueError(
            "Unsupported page_format. Use one of: "
            + ", ".join(sorted(_PAGE_FORMAT_ALIASES.values()))
        )
    return canonical


def _normalize_margin_value(raw_value: object | None, *, default: str) -> str:
    """Validate CSS-like margin values accepted by Playwright page.pdf()."""
    normalized = str(raw_value or default).strip().lower()
    if not normalized:
        return default
    if not _MARGIN_VALUE_RE.match(normalized):
        raise ValueError(
            "Margins must be non-negative values using px, in, cm, or mm units."
        )
    return normalized


def _normalize_entry_html(raw_value: object) -> str:
    """Normalize an archive entry path while rejecting traversal or non-HTML targets."""
    normalized = str(raw_value or "").strip().replace("\\", "/")
    if not normalized:
        raise ValueError("entry_html cannot be empty.")

    entry_path = PurePosixPath(normalized)
    if entry_path.is_absolute() or ".." in entry_path.parts:
        raise ValueError("entry_html must stay inside the uploaded ZIP bundle.")
    if entry_path.suffix.lower() not in {".html", ".htm"}:
        raise ValueError("entry_html must point to an HTML file inside the ZIP bundle.")
    return entry_path.as_posix()


def _get_config_value(name: str, default):
    """Read a config value with a fallback outside Flask app contexts."""
    try:
        from flask import current_app

        return current_app.config.get(name, default)
    except RuntimeError:
        return default


def _make_safe_url_fetcher():
    """
    Return a URLFetcher that blocks file:// access to prevent local file leaks.
    Returns None if the WeasyPrint URLFetcher API is unavailable (older installs).
    """
    try:
        from weasyprint.urls import FatalURLFetchingError, URLFetcher

        class _SafeURLFetcher(URLFetcher):
            def fetch(self, url, headers=None):
                if url.startswith("file://"):
                    raise FatalURLFetchingError(
                        f"Access to local filesystem URLs is not allowed: {url}"
                    )
                return super().fetch(url, headers)

        return _SafeURLFetcher()
    except (ImportError, AttributeError):
        return None


class _WeasyPrintWarningCapture(logging.Handler):
    """Collect WeasyPrint PROGRESS_LOGGER messages during conversion."""

    def __init__(self):
        super().__init__()
        self.messages: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.messages.append(record.getMessage())


class _StaticSourceHandler(SimpleHTTPRequestHandler):
    """Quiet HTTP handler used to serve prepared HTML bundles to Chromium."""

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        logger.debug("html-to-pdf source server: " + format, *args)


@contextmanager
def _serve_directory(source_root: Path):
    """Serve a task-local directory over an ephemeral localhost HTTP server."""
    handler = partial(_StaticSourceHandler, directory=str(source_root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def _sanitize_archive_member(member_name: str) -> Path:
    """Return a safe relative path for one ZIP member or raise on traversal."""
    relative = PurePosixPath(str(member_name or "").replace("\\", "/"))
    if relative.is_absolute() or ".." in relative.parts:
        raise HtmlToPdfError("Uploaded ZIP bundle contains unsafe file paths.")

    cleaned_parts = [part for part in relative.parts if part not in {"", "."}]
    if not cleaned_parts:
        raise HtmlToPdfError("Uploaded ZIP bundle contains invalid file entries.")

    return Path(*cleaned_parts)


def _extract_archive_bundle(archive_path: Path, destination_dir: Path) -> None:
    """Extract a ZIP bundle safely into a task-local directory."""
    max_entries = int(_get_config_value("HTML_TO_PDF_ARCHIVE_MAX_ENTRIES", 512))
    max_uncompressed_bytes = int(
        _get_config_value(
            "HTML_TO_PDF_ARCHIVE_MAX_UNCOMPRESSED_BYTES",
            100 * 1024 * 1024,
        )
    )

    try:
        with zipfile.ZipFile(archive_path) as archive:
            members = [member for member in archive.infolist() if not member.is_dir()]
            if len(members) > max_entries:
                raise HtmlToPdfError("Uploaded ZIP bundle contains too many files.")

            total_uncompressed_bytes = 0
            destination_root = destination_dir.resolve()
            for member in members:
                safe_relative_path = _sanitize_archive_member(member.filename)
                total_uncompressed_bytes += member.file_size
                if total_uncompressed_bytes > max_uncompressed_bytes:
                    raise HtmlToPdfError(
                        "Uploaded ZIP bundle is too large after extraction."
                    )

                target_path = (destination_root / safe_relative_path).resolve()
                if destination_root not in target_path.parents:
                    raise HtmlToPdfError(
                        "Uploaded ZIP bundle contains unsafe file paths."
                    )

                target_path.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(member) as source_file, target_path.open("wb") as target_file:
                    shutil.copyfileobj(source_file, target_file)
    except zipfile.BadZipFile as exc:
        raise HtmlToPdfError("Uploaded ZIP bundle is invalid.") from exc


def _prepare_render_source(
    input_path: str,
    render_options: HtmlToPdfRenderOptions,
) -> _PreparedRenderSource:
    """Prepare an uploaded HTML file or ZIP bundle for rendering."""
    input_file = Path(input_path).resolve()
    if not input_file.exists():
        raise HtmlToPdfError("Uploaded HTML source could not be found.")

    if render_options.source_kind == "archive":
        bundle_root = input_file.parent / "bundle"
        if bundle_root.exists():
            shutil.rmtree(bundle_root, ignore_errors=True)
        bundle_root.mkdir(parents=True, exist_ok=True)
        _extract_archive_bundle(input_file, bundle_root)

        entry_html = render_options.entry_html or "index.html"
        entry_relative = Path(*PurePosixPath(entry_html).parts)
        entry_path = (bundle_root / entry_relative).resolve()

        if bundle_root.resolve() not in entry_path.parents and entry_path != bundle_root.resolve():
            raise HtmlToPdfError("entry_html must stay inside the uploaded ZIP bundle.")
        if not entry_path.exists():
            raise HtmlToPdfError(
                f"The requested entry HTML '{entry_html}' was not found in the ZIP bundle."
            )
        if entry_path.suffix.lower() not in {".html", ".htm"}:
            raise HtmlToPdfError("The ZIP bundle entry point must be an HTML file.")

        return _PreparedRenderSource(
            entry_path=entry_path,
            source_root=bundle_root.resolve(),
            source_kind="archive",
        )

    return _PreparedRenderSource(
        entry_path=input_file,
        source_root=input_file.parent,
        source_kind="html",
    )


def _collect_renderer_warning_messages(
    console_messages: list[str],
    page_errors: list[str],
    request_failures: list[str],
) -> None:
    """Emit renderer warnings in a compact, searchable format."""
    if console_messages:
        logger.warning(
            "Browser console warnings during HTML-to-PDF conversion: %s",
            "; ".join(console_messages),
        )
    if page_errors:
        logger.warning(
            "Browser page errors during HTML-to-PDF conversion: %s",
            "; ".join(page_errors),
        )
    if request_failures:
        logger.warning(
            "Browser request failures during HTML-to-PDF conversion: %s",
            "; ".join(request_failures),
        )


def _render_with_weasyprint(input_path: Path, output_path: str) -> dict:
    """Render HTML to PDF through WeasyPrint for fallback or compatibility mode."""
    dependency_error = _get_dependency_mismatch_error()
    if dependency_error:
        raise HtmlToPdfError(dependency_error)

    try:
        from weasyprint import HTML
        from weasyprint.logger import PROGRESS_LOGGER

        base_url = str(input_path.parent.resolve())
        url_fetcher = _make_safe_url_fetcher()

        wp_handler = _WeasyPrintWarningCapture()
        PROGRESS_LOGGER.addHandler(wp_handler)
        try:
            kwargs: dict[str, object] = {"base_url": base_url}
            if url_fetcher is not None:
                kwargs["url_fetcher"] = url_fetcher
            HTML(filename=str(input_path), **kwargs).write_pdf(output_path)
        finally:
            PROGRESS_LOGGER.removeHandler(wp_handler)

        if wp_handler.messages:
            logger.warning(
                "WeasyPrint warnings during conversion: %s",
                "; ".join(wp_handler.messages),
            )

        output_size = os.path.getsize(output_path)
        logger.info("HTML→PDF conversion completed via WeasyPrint (%d bytes)", output_size)

        return {"output_size": output_size, "renderer": "weasyprint"}

    except ImportError as exc:
        raise HtmlToPdfError("weasyprint library is not installed.") from exc


def _render_with_playwright(
    prepared_source: _PreparedRenderSource,
    output_path: str,
    render_options: HtmlToPdfRenderOptions,
) -> dict:
    """Render HTML to PDF through headless Chromium using Playwright."""
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise HtmlToPdfError(
            "Playwright is not installed. Reinstall backend dependencies and run "
            "'python -m playwright install chromium'."
        ) from exc

    browser_timeout_ms = int(_get_config_value("HTML_TO_PDF_BROWSER_TIMEOUT_MS", 45000))
    disable_sandbox = bool(
        _get_config_value("HTML_TO_PDF_BROWSER_DISABLE_SANDBOX", True)
    )
    allow_remote_assets = bool(
        _get_config_value("HTML_TO_PDF_ALLOW_REMOTE_ASSETS", False)
    )

    launch_args = ["--disable-dev-shm-usage"]
    if disable_sandbox:
        launch_args.append("--no-sandbox")

    console_messages: list[str] = []
    page_errors: list[str] = []
    request_failures: list[str] = []

    try:
        with _serve_directory(prepared_source.source_root) as base_url:
            entry_relative = prepared_source.entry_path.relative_to(
                prepared_source.source_root
            ).as_posix()
            entry_url = base_url + quote(entry_relative, safe="/")

            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True, args=launch_args)
                try:
                    context = browser.new_context(
                        viewport={"width": 1440, "height": 900},
                        device_scale_factor=1,
                        service_workers="block",
                        java_script_enabled=True,
                    )
                    try:
                        if not allow_remote_assets:
                            def _route_request(route, request):
                                if request.url.startswith(base_url):
                                    route.continue_()
                                    return
                                logger.warning(
                                    "Blocked non-local asset during HTML-to-PDF rendering: %s",
                                    request.url,
                                )
                                route.abort()

                            context.route("**/*", _route_request)

                        page = context.new_page()
                        page.set_default_timeout(browser_timeout_ms)
                        page.set_default_navigation_timeout(browser_timeout_ms)
                        page.on("console", lambda message: console_messages.append(message.text))
                        page.on("pageerror", lambda error: page_errors.append(str(error)))
                        page.on(
                            "requestfailed",
                            lambda request: request_failures.append(
                                f"{request.method} {request.url}"
                            ),
                        )

                        page.goto(entry_url, wait_until="load")
                        page.wait_for_function(
                            "() => document.readyState === 'complete'",
                            timeout=browser_timeout_ms,
                        )
                        page.wait_for_function(
                            "() => !document.fonts || document.fonts.status === 'loaded'",
                            timeout=browser_timeout_ms,
                        )
                        page.emulate_media(media="screen")
                        page.pdf(
                            path=output_path,
                            format=render_options.page_format,
                            landscape=render_options.landscape,
                            print_background=render_options.print_background,
                            prefer_css_page_size=render_options.prefer_css_page_size,
                            margin={
                                "top": render_options.margin_top,
                                "right": render_options.margin_right,
                                "bottom": render_options.margin_bottom,
                                "left": render_options.margin_left,
                            },
                        )
                    finally:
                        context.close()
                finally:
                    browser.close()
    except PlaywrightError as exc:
        raise HtmlToPdfError(f"Playwright failed to render HTML to PDF: {exc}") from exc

    _collect_renderer_warning_messages(console_messages, page_errors, request_failures)

    output_size = os.path.getsize(output_path)
    logger.info("HTML→PDF conversion completed via Playwright (%d bytes)", output_size)
    return {"output_size": output_size, "renderer": "playwright"}


def _select_renderer() -> str:
    """Choose the configured renderer while keeping invalid config values harmless."""
    configured = str(_get_config_value("HTML_TO_PDF_RENDERER", "auto")).strip().lower()
    if configured in {"playwright", "weasyprint", "auto"}:
        return configured
    logger.warning("Unknown HTML_TO_PDF_RENDERER '%s'; using auto.", configured)
    return "auto"


def _can_fallback_to_weasyprint(render_options: HtmlToPdfRenderOptions) -> bool:
    """Limit WeasyPrint fallback to simple HTML flows or explicit rollback mode."""
    if not bool(_get_config_value("HTML_TO_PDF_ENABLE_WEASYPRINT_FALLBACK", True)):
        return False
    return render_options.source_kind == "html"


def html_to_pdf(
    input_path: str,
    output_path: str,
    render_options: HtmlToPdfRenderOptions | Mapping[str, object] | None = None,
) -> dict:
    """Convert an uploaded HTML file or ZIP bundle to PDF."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    options = HtmlToPdfRenderOptions.from_payload(render_options)
    prepared_source = _prepare_render_source(input_path, options)
    renderer = _select_renderer()

    try:
        if renderer == "weasyprint":
            return _render_with_weasyprint(prepared_source.entry_path, output_path)

        try:
            return _render_with_playwright(prepared_source, output_path, options)
        except HtmlToPdfError as exc:
            if not _can_fallback_to_weasyprint(options):
                raise
            logger.warning(
                "Playwright HTML-to-PDF rendering failed; falling back to WeasyPrint: %s",
                exc,
            )
            return _render_with_weasyprint(prepared_source.entry_path, output_path)
    except HtmlToPdfError:
        raise
    except Exception as exc:
        raise HtmlToPdfError(f"Failed to convert HTML to PDF: {exc}") from exc


def html_string_to_pdf(
    html_content: str,
    output_path: str,
) -> dict:
    """Convert an HTML string to PDF using the compatibility renderer."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    dependency_error = _get_dependency_mismatch_error()
    if dependency_error:
        raise HtmlToPdfError(dependency_error)

    try:
        from weasyprint import HTML
        from weasyprint.logger import PROGRESS_LOGGER

        url_fetcher = _make_safe_url_fetcher()

        wp_handler = _WeasyPrintWarningCapture()
        PROGRESS_LOGGER.addHandler(wp_handler)
        try:
            kwargs: dict[str, object] = {}
            if url_fetcher is not None:
                kwargs["url_fetcher"] = url_fetcher
            HTML(string=html_content, **kwargs).write_pdf(output_path)
        finally:
            PROGRESS_LOGGER.removeHandler(wp_handler)

        if wp_handler.messages:
            logger.warning(
                "WeasyPrint warnings during conversion: %s",
                "; ".join(wp_handler.messages),
            )

        output_size = os.path.getsize(output_path)
        logger.info("HTML string→PDF conversion completed (%d bytes)", output_size)

        return {"output_size": output_size, "renderer": "weasyprint"}

    except ImportError as exc:
        raise HtmlToPdfError("weasyprint library is not installed.") from exc
    except HtmlToPdfError:
        raise
    except Exception as exc:
        raise HtmlToPdfError(f"Failed to convert HTML to PDF: {exc}") from exc
