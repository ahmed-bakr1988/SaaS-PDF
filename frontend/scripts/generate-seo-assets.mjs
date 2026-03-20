import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const publicDir = path.join(frontendRoot, 'public');
const siteOrigin = String(process.env.VITE_SITE_DOMAIN || 'https://dociva.io').trim().replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

const seoConfig = JSON.parse(
  await readFile(path.join(frontendRoot, 'src', 'config', 'seo-tools.json'), 'utf8')
);

const staticPages = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.4' },
  { path: '/contact', changefreq: 'monthly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog', changefreq: 'weekly', priority: '0.6' },
  { path: '/developers', changefreq: 'monthly', priority: '0.5' },
];

const toolRoutePriorities = new Map([
  ['pdf-to-word', '0.9'],
  ['word-to-pdf', '0.9'],
  ['compress-pdf', '0.9'],
  ['merge-pdf', '0.9'],
  ['split-pdf', '0.8'],
  ['rotate-pdf', '0.7'],
  ['pdf-to-images', '0.8'],
  ['images-to-pdf', '0.8'],
  ['watermark-pdf', '0.7'],
  ['remove-watermark-pdf', '0.7'],
  ['protect-pdf', '0.8'],
  ['unlock-pdf', '0.8'],
  ['page-numbers', '0.7'],
  ['reorder-pdf', '0.7'],
  ['extract-pages', '0.7'],
  ['pdf-editor', '0.8'],
  ['pdf-flowchart', '0.7'],
  ['pdf-to-excel', '0.8'],
  ['sign-pdf', '0.8'],
  ['crop-pdf', '0.7'],
  ['flatten-pdf', '0.7'],
  ['repair-pdf', '0.7'],
  ['pdf-metadata', '0.6'],
  ['image-converter', '0.8'],
  ['image-resize', '0.8'],
  ['compress-image', '0.8'],
  ['remove-background', '0.8'],
  ['image-crop', '0.7'],
  ['image-rotate-flip', '0.7'],
  ['ocr', '0.8'],
  ['chat-pdf', '0.8'],
  ['summarize-pdf', '0.8'],
  ['translate-pdf', '0.8'],
  ['extract-tables', '0.8'],
  ['html-to-pdf', '0.7'],
  ['qr-code', '0.7'],
  ['video-to-gif', '0.7'],
  ['word-counter', '0.6'],
  ['text-cleaner', '0.6'],
  ['pdf-to-pptx', '0.8'],
  ['excel-to-pdf', '0.8'],
  ['pptx-to-pdf', '0.8'],
  ['barcode-generator', '0.7'],
]);

function extractBlogSlugs(source) {
  return [...source.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
}

function makeUrlTag({ loc, changefreq, priority }) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

const blogSource = await readFile(path.join(frontendRoot, 'src', 'content', 'blogArticles.ts'), 'utf8');
const blogSlugs = extractBlogSlugs(blogSource);

const sitemapEntries = [
  ...staticPages.map((page) =>
    makeUrlTag({ loc: `${siteOrigin}${page.path}`, changefreq: page.changefreq, priority: page.priority })
  ),
  ...blogSlugs.map((slug) =>
    makeUrlTag({ loc: `${siteOrigin}/blog/${slug}`, changefreq: 'monthly', priority: '0.6' })
  ),
  ...[...toolRoutePriorities.entries()].map(([slug, priority]) =>
    makeUrlTag({ loc: `${siteOrigin}/tools/${slug}`, changefreq: 'weekly', priority })
  ),
  ...seoConfig.toolPages.map((page) =>
    makeUrlTag({ loc: `${siteOrigin}/${page.slug}`, changefreq: 'weekly', priority: '0.88' })
  ),
  ...seoConfig.collectionPages.map((page) =>
    makeUrlTag({ loc: `${siteOrigin}/${page.slug}`, changefreq: 'weekly', priority: '0.82' })
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>\n`;

const robots = [
  '# robots.txt — Dociva',
  'User-agent: *',
  'Allow: /',
  'Disallow: /api/',
  'Disallow: /internal/',
  'Disallow: /account',
  'Disallow: /forgot-password',
  'Disallow: /reset-password',
  'Disallow: /internal/admin',
  '',
  `Sitemap: ${siteOrigin}/sitemap.xml`,
  '',
  '# AI/LLM discoverability',
  '# See also: /llms.txt',
  '',
].join('\n');

await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');

console.log(`Generated SEO assets for ${siteOrigin}`);