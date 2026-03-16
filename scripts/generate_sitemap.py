#!/usr/bin/env python3
"""
generate_sitemap.py
Generates sitemap.xml for SEO from the full route inventory.

Usage:
  python scripts/generate_sitemap.py --domain https://saas-pdf.com
  python scripts/generate_sitemap.py --domain https://saas-pdf.com --output frontend/public/sitemap.xml
  # Or set SITE_DOMAIN env var and omit --domain
"""

import argparse
import os
from datetime import datetime

# ─── Route definitions with priority and changefreq ──────────────────────────

PAGES = [
    {'path': '/',         'changefreq': 'daily',   'priority': '1.0'},
    {'path': '/about',    'changefreq': 'monthly', 'priority': '0.4'},
    {'path': '/contact',  'changefreq': 'monthly', 'priority': '0.4'},
    {'path': '/privacy',  'changefreq': 'yearly',  'priority': '0.3'},
    {'path': '/terms',    'changefreq': 'yearly',  'priority': '0.3'},
    {'path': '/pricing',  'changefreq': 'monthly', 'priority': '0.7'},
    {'path': '/blog',     'changefreq': 'weekly',  'priority': '0.6'},
]

# PDF Tools
PDF_TOOLS = [
    {'slug': 'pdf-to-word',         'priority': '0.9'},
    {'slug': 'word-to-pdf',         'priority': '0.9'},
    {'slug': 'compress-pdf',        'priority': '0.9'},
    {'slug': 'merge-pdf',           'priority': '0.9'},
    {'slug': 'split-pdf',           'priority': '0.8'},
    {'slug': 'rotate-pdf',          'priority': '0.7'},
    {'slug': 'pdf-to-images',       'priority': '0.8'},
    {'slug': 'images-to-pdf',       'priority': '0.8'},
    {'slug': 'watermark-pdf',       'priority': '0.7'},
    {'slug': 'remove-watermark-pdf','priority': '0.7'},
    {'slug': 'protect-pdf',         'priority': '0.8'},
    {'slug': 'unlock-pdf',          'priority': '0.8'},
    {'slug': 'page-numbers',        'priority': '0.7'},
    {'slug': 'reorder-pdf',         'priority': '0.7'},
    {'slug': 'extract-pages',       'priority': '0.7'},
    {'slug': 'pdf-editor',          'priority': '0.8'},
    {'slug': 'pdf-flowchart',       'priority': '0.7'},
    {'slug': 'pdf-to-excel',        'priority': '0.8'},
    # Phase 2
    {'slug': 'sign-pdf',            'priority': '0.8'},
    {'slug': 'crop-pdf',            'priority': '0.7'},
    {'slug': 'flatten-pdf',         'priority': '0.7'},
    {'slug': 'repair-pdf',          'priority': '0.7'},
    {'slug': 'pdf-metadata',        'priority': '0.6'},
]

# Image Tools
IMAGE_TOOLS = [
    {'slug': 'image-converter',   'priority': '0.8'},
    {'slug': 'image-resize',      'priority': '0.8'},
    {'slug': 'compress-image',    'priority': '0.8'},
    {'slug': 'remove-background', 'priority': '0.8'},
    # Phase 2
    {'slug': 'image-crop',        'priority': '0.7'},
    {'slug': 'image-rotate-flip', 'priority': '0.7'},
]

# AI Tools
AI_TOOLS = [
    {'slug': 'ocr',             'priority': '0.8'},
    {'slug': 'chat-pdf',        'priority': '0.8'},
    {'slug': 'summarize-pdf',   'priority': '0.8'},
    {'slug': 'translate-pdf',   'priority': '0.8'},
    {'slug': 'extract-tables',  'priority': '0.8'},
]

# Convert / Utility Tools
UTILITY_TOOLS = [
    {'slug': 'html-to-pdf',   'priority': '0.7'},
    {'slug': 'qr-code',       'priority': '0.7'},
    {'slug': 'video-to-gif',  'priority': '0.7'},
    {'slug': 'word-counter',  'priority': '0.6'},
    {'slug': 'text-cleaner',  'priority': '0.6'},
    # Phase 2
    {'slug': 'pdf-to-pptx',       'priority': '0.8'},
    {'slug': 'excel-to-pdf',      'priority': '0.8'},
    {'slug': 'pptx-to-pdf',       'priority': '0.8'},
    {'slug': 'barcode-generator', 'priority': '0.7'},
]

TOOL_GROUPS = [
    ('PDF Tools', PDF_TOOLS),
    ('Image Tools', IMAGE_TOOLS),
    ('AI Tools', AI_TOOLS),
    ('Utility Tools', UTILITY_TOOLS),
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
    for label, routes in TOOL_GROUPS:
        urls.append(f'\n  <!-- {label} -->')
        for route in routes:
            urls.append(f'''  <url>
    <loc>{domain}/tools/{route["slug"]}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{route["priority"]}</priority>
  </url>''')

    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>'''

    return sitemap


def main():
    parser = argparse.ArgumentParser(description='Generate sitemap.xml')
    parser.add_argument('--domain', type=str, default=os.environ.get('SITE_DOMAIN', ''),
                        help='Site domain (e.g. https://saas-pdf.com). Falls back to SITE_DOMAIN env var.')
    parser.add_argument('--output', type=str, default='frontend/public/sitemap.xml', help='Output file path')
    args = parser.parse_args()

    if not args.domain:
        parser.error('--domain is required (or set SITE_DOMAIN env var)')

    domain = args.domain.rstrip('/')
    sitemap = generate_sitemap(domain)

    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(sitemap)

    total = len(PAGES) + sum(len(routes) for _, routes in TOOL_GROUPS)
    print(f"Sitemap generated: {args.output}")
    print(f"Total URLs: {total}")


if __name__ == '__main__':
    main()
