#!/usr/bin/env python3
"""
generate_sitemap.py
Generates sitemap.xml for SEO from the full route inventory.

Usage:
  python scripts/generate_sitemap.py --domain https://yourdomain.com
  python scripts/generate_sitemap.py --domain https://yourdomain.com --output frontend/public/sitemap.xml
"""

import argparse
from datetime import datetime

# ─── Route definitions with priority and changefreq ──────────────────────────

PAGES = [
    {'path': '/',        'changefreq': 'daily',   'priority': '1.0'},
    {'path': '/about',   'changefreq': 'monthly', 'priority': '0.4'},
    {'path': '/contact', 'changefreq': 'monthly', 'priority': '0.4'},
    {'path': '/privacy', 'changefreq': 'yearly',  'priority': '0.3'},
    {'path': '/terms',   'changefreq': 'yearly',  'priority': '0.3'},
]

# PDF Tools
PDF_TOOLS = [
    'pdf-to-word', 'word-to-pdf', 'compress-pdf', 'merge-pdf',
    'split-pdf', 'rotate-pdf', 'pdf-to-images', 'images-to-pdf',
    'watermark-pdf', 'remove-watermark-pdf', 'protect-pdf', 'unlock-pdf',
    'page-numbers', 'reorder-pdf', 'extract-pages', 'pdf-editor',
    'pdf-flowchart', 'pdf-to-excel',
]

# Image Tools
IMAGE_TOOLS = [
    'image-converter', 'image-resize', 'compress-image', 'remove-background',
]

# AI Tools
AI_TOOLS = [
    'ocr', 'chat-pdf', 'summarize-pdf', 'translate-pdf', 'extract-tables',
]

# Convert / Utility Tools
UTILITY_TOOLS = [
    'html-to-pdf', 'qr-code', 'video-to-gif', 'word-counter', 'text-cleaner',
]

TOOL_GROUPS = [
    ('PDF Tools',     PDF_TOOLS,     '0.9'),
    ('Image Tools',   IMAGE_TOOLS,   '0.8'),
    ('AI Tools',      AI_TOOLS,      '0.8'),
    ('Utility Tools', UTILITY_TOOLS, '0.7'),
]


def generate_sitemap(domain: str) -> str:
    today = datetime.now().strftime('%Y-%m-%d')
    urls = []

    # Static pages
    for page in PAGES:
        urls.append(f'''  <url>
    <loc>{domain}{page["path"]}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>''')

    # Tool pages by category
    for label, slugs, priority in TOOL_GROUPS:
        urls.append(f'\n  <!-- {label} -->')
        for slug in slugs:
            urls.append(f'''  <url>
    <loc>{domain}/tools/{slug}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{priority}</priority>
  </url>''')

    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>'''

    return sitemap


def main():
    parser = argparse.ArgumentParser(description='Generate sitemap.xml')
    parser.add_argument('--domain', type=str, required=True, help='Site domain (e.g. https://yourdomain.com)')
    parser.add_argument('--output', type=str, default='frontend/public/sitemap.xml', help='Output file path')
    args = parser.parse_args()

    domain = args.domain.rstrip('/')
    sitemap = generate_sitemap(domain)

    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(sitemap)

    total = len(PAGES) + sum(len(slugs) for _, slugs, _ in TOOL_GROUPS)
    print(f"Sitemap generated: {args.output}")
    print(f"Total URLs: {total}")


if __name__ == '__main__':
    main()
