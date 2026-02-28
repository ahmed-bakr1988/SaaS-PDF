#!/usr/bin/env python3
"""
generate_sitemap.py
Generates sitemap.xml for SEO.

Usage:
  python scripts/generate_sitemap.py --domain https://yourdomain.com
"""

import argparse
from datetime import datetime


TOOLS = [
    '/tools/pdf-to-word',
    '/tools/word-to-pdf',
    '/tools/compress-pdf',
    '/tools/image-converter',
    '/tools/video-to-gif',
    '/tools/word-counter',
    '/tools/text-cleaner',
]

PAGES = [
    '/',
    '/about',
    '/privacy',
]


def generate_sitemap(domain: str) -> str:
    today = datetime.now().strftime('%Y-%m-%d')
    urls = []

    # Home page — highest priority
    urls.append(f'''  <url>
    <loc>{domain}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>''')

    # Tool pages — high priority
    for tool in TOOLS:
        urls.append(f'''  <url>
    <loc>{domain}{tool}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>''')

    # Static pages — lower priority
    for page in PAGES[1:]:
        urls.append(f'''  <url>
    <loc>{domain}{page}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
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

    print(f"Sitemap generated: {args.output}")
    print(f"URLs: {len(TOOLS) + len(PAGES)}")


if __name__ == '__main__':
    main()
