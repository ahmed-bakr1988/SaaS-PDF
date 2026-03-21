"""XML sitemap endpoint for runtime and direct backend access."""
from flask import Blueprint, Response, current_app

from app.extensions import limiter

sitemap_bp = Blueprint("sitemap", __name__)

STATIC_PAGES = [
    ("/", "daily", "1.0"),
    ("/about", "monthly", "0.4"),
    ("/contact", "monthly", "0.4"),
    ("/privacy", "yearly", "0.3"),
    ("/terms", "yearly", "0.3"),
    ("/pricing", "monthly", "0.7"),
    ("/blog", "weekly", "0.6"),
    ("/developers", "monthly", "0.5"),
]

BLOG_SLUGS = [
    "how-to-compress-pdf-online",
    "convert-images-without-losing-quality",
    "ocr-extract-text-from-images",
    "merge-split-pdf-files",
    "ai-chat-with-pdf-documents",
]

TOOL_SLUGS = [
    "pdf-to-word",
    "word-to-pdf",
    "compress-pdf",
    "merge-pdf",
    "split-pdf",
    "rotate-pdf",
    "pdf-to-images",
    "images-to-pdf",
    "watermark-pdf",
    "remove-watermark-pdf",
    "protect-pdf",
    "unlock-pdf",
    "page-numbers",
    "reorder-pdf",
    "extract-pages",
    "pdf-editor",
    "pdf-flowchart",
    "pdf-to-excel",
    "sign-pdf",
    "crop-pdf",
    "flatten-pdf",
    "repair-pdf",
    "pdf-metadata",
    "image-converter",
    "image-resize",
    "compress-image",
    "remove-background",
    "image-crop",
    "image-rotate-flip",
    "ocr",
    "chat-pdf",
    "summarize-pdf",
    "translate-pdf",
    "extract-tables",
    "html-to-pdf",
    "qr-code",
    "video-to-gif",
    "word-counter",
    "text-cleaner",
    "pdf-to-pptx",
    "excel-to-pdf",
    "pptx-to-pdf",
    "barcode-generator",
]

SEO_TOOL_SLUGS = [
    "pdf-to-word",
    "word-to-pdf",
    "compress-pdf-online",
    "convert-jpg-to-pdf",
    "merge-pdf-files",
    "remove-pdf-password",
    "pdf-to-word-editable",
    "convert-pdf-to-text",
    "split-pdf-online",
    "jpg-to-pdf",
    "png-to-pdf",
    "images-to-pdf-online",
    "pdf-to-jpg",
    "pdf-to-png",
    "compress-pdf-for-email",
    "compress-scanned-pdf",
    "merge-pdf-online-free",
    "combine-pdf-files",
    "extract-pages-from-pdf",
    "reorder-pdf-pages",
    "rotate-pdf-pages",
    "add-page-numbers-to-pdf",
    "protect-pdf-with-password",
    "unlock-pdf-online",
    "watermark-pdf-online",
    "remove-watermark-from-pdf",
    "edit-pdf-online-free",
    "pdf-to-excel-online",
    "extract-tables-from-pdf",
    "html-to-pdf-online",
    "scan-pdf-to-text",
    "chat-with-pdf",
    "summarize-pdf-online",
    "translate-pdf-online",
    "convert-image-to-pdf",
    "convert-webp-to-jpg",
    "resize-image-online",
    "compress-image-online",
    "remove-image-background",
]

SEO_COLLECTION_SLUGS = [
    "best-pdf-tools",
    "free-pdf-tools-online",
    "convert-files-online",
    "pdf-converter-tools",
    "secure-pdf-tools",
    "ai-document-tools",
    "image-to-pdf-tools",
    "online-image-tools",
    "office-to-pdf-tools",
    "scanned-document-tools",
    "arabic-pdf-tools",
]


def _site_origin() -> str:
    return str(current_app.config.get("SITE_DOMAIN", "https://dociva.io")).strip().rstrip("/")


def _url_tag(loc: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{loc}</loc>\n"
        "    <lastmod>2026-03-21</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>"
    )


@sitemap_bp.route("/sitemap.xml", methods=["GET"])
@limiter.exempt
def sitemap_xml() -> Response:
    """Return an XML sitemap for direct backend access."""
    origin = _site_origin()
    entries = []

    entries.extend(_url_tag(f"{origin}{path}", changefreq, priority) for path, changefreq, priority in STATIC_PAGES)
    entries.extend(_url_tag(f"{origin}/blog/{slug}", "monthly", "0.6") for slug in BLOG_SLUGS)
    entries.extend(_url_tag(f"{origin}/tools/{slug}", "weekly", "0.8") for slug in TOOL_SLUGS)
    entries.extend(_url_tag(f"{origin}/{slug}", "weekly", "0.88") for slug in SEO_TOOL_SLUGS)
    entries.extend(_url_tag(f"{origin}/ar/{slug}", "weekly", "0.8") for slug in SEO_TOOL_SLUGS)
    entries.extend(_url_tag(f"{origin}/{slug}", "weekly", "0.82") for slug in SEO_COLLECTION_SLUGS)
    entries.extend(_url_tag(f"{origin}/ar/{slug}", "weekly", "0.74") for slug in SEO_COLLECTION_SLUGS)

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(xml, mimetype="application/xml")
