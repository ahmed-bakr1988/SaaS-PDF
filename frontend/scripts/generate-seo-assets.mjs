import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const publicDir = path.join(frontendRoot, 'public');
const sitemapDir = path.join(publicDir, 'sitemaps');
const siteOrigin = String(process.env.VITE_SITE_DOMAIN || 'https://dociva.io').trim().replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

// Prefer a generated SEO file if present (created by merge-keywords.mjs). This is opt-in and safe.
const generatedSeoPath = path.join(frontendRoot, 'src', 'seo', 'seoData.generated.json');
const baseSeoPath = path.join(frontendRoot, 'src', 'seo', 'seoData.json');
const seoConfigPath = (await (async () => {
  try {
    await readFile(generatedSeoPath, 'utf8');
    return generatedSeoPath;
  } catch (e) {
    return baseSeoPath;
  }
})());

const seoConfig = JSON.parse(await readFile(seoConfigPath, 'utf8'));
const routeRegistrySource = await readFile(path.join(frontendRoot, 'src', 'config', 'routes.ts'), 'utf8');

const staticPages = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/tools', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.4' },
  { path: '/contact', changefreq: 'monthly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.7' },
  { path: '/pricing-transparency', changefreq: 'monthly', priority: '0.7' },
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
  ['image-to-svg', '0.8'],
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

function extractToolSlugs(source) {
  return [...source.matchAll(/'\/tools\/([^']+)'/g)].map((match) => match[1]);
}

function extractBlogSlugs(source) {
  return [...source.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
}

function makeUrlTag({ loc, changefreq, priority }) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function makeSitemapUrlSet(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

function makeSitemapIndex(entries) {
  const items = entries
    .map((entry) => `  <sitemap>\n    <loc>${entry.loc}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (seen.has(entry.loc)) {
      return false;
    }

    seen.add(entry.loc);
    return true;
  });
}

const blogSource = await readFile(path.join(frontendRoot, 'src', 'content', 'blogArticles.ts'), 'utf8');
const blogSlugs = extractBlogSlugs(blogSource);
const toolSlugs = extractToolSlugs(routeRegistrySource);

await mkdir(sitemapDir, { recursive: true });

const staticEntries = dedupeEntries(
  staticPages.map((page) => ({
    loc: `${siteOrigin}${page.path}`,
    changefreq: page.changefreq,
    priority: page.priority,
  })),
).map((entry) => makeUrlTag(entry));

const blogEntries = dedupeEntries(
  blogSlugs.map((slug) => ({
    loc: `${siteOrigin}/blog/${slug}`,
    changefreq: 'monthly',
    priority: '0.6',
  })),
).map((entry) => makeUrlTag(entry));

const toolEntries = dedupeEntries(
  toolSlugs.map((slug) => ({
    loc: `${siteOrigin}/tools/${slug}`,
    changefreq: 'weekly',
    priority: toolRoutePriorities.get(slug) || '0.6',
  })),
).map((entry) => makeUrlTag(entry));

const comparisonSlugs = [
  'compress-pdf-vs-ilovepdf',
  'merge-pdf-vs-smallpdf',
  'pdf-to-word-vs-adobe-acrobat',
  'compress-image-vs-tinypng',
  'ocr-vs-adobe-scan',
];

const comparisonEntries = dedupeEntries(
  comparisonSlugs.map((slug) => ({
    loc: `${siteOrigin}/compare/${slug}`,
    changefreq: 'monthly',
    priority: '0.7',
  })),
).map((entry) => makeUrlTag(entry));

const seoEntries = dedupeEntries([
  ...seoConfig.toolPageSeeds.flatMap((page) => ([
    { loc: `${siteOrigin}/${page.slug}`, changefreq: 'weekly', priority: '0.88' },
    { loc: `${siteOrigin}/ar/${page.slug}`, changefreq: 'weekly', priority: '0.8' },
  ])),
  ...seoConfig.collectionPageSeeds.flatMap((page) => ([
    { loc: `${siteOrigin}/${page.slug}`, changefreq: 'weekly', priority: '0.82' },
    { loc: `${siteOrigin}/ar/${page.slug}`, changefreq: 'weekly', priority: '0.74' },
  ])),
]).map((entry) => makeUrlTag(entry));

const sitemapIndex = makeSitemapIndex([
  { loc: `${siteOrigin}/sitemaps/static.xml` },
  { loc: `${siteOrigin}/sitemaps/blog.xml` },
  { loc: `${siteOrigin}/sitemaps/tools.xml` },
  { loc: `${siteOrigin}/sitemaps/seo.xml` },
  { loc: `${siteOrigin}/sitemaps/comparisons.xml` },
]);

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

await writeFile(path.join(publicDir, 'sitemap.xml'), sitemapIndex, 'utf8');
await writeFile(path.join(sitemapDir, 'static.xml'), makeSitemapUrlSet(staticEntries), 'utf8');
await writeFile(path.join(sitemapDir, 'blog.xml'), makeSitemapUrlSet(blogEntries), 'utf8');
await writeFile(path.join(sitemapDir, 'tools.xml'), makeSitemapUrlSet(toolEntries), 'utf8');
await writeFile(path.join(sitemapDir, 'seo.xml'), makeSitemapUrlSet(seoEntries), 'utf8');
await writeFile(path.join(sitemapDir, 'comparisons.xml'), makeSitemapUrlSet(comparisonEntries), 'utf8');
await writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');

console.log(`Generated SEO assets for ${siteOrigin}`);
