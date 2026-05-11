import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const distRoot = path.join(frontendRoot, 'dist');
const siteOrigin = String(process.env.VITE_SITE_DOMAIN || 'https://dociva.io').trim().replace(/\/$/, '');
const seoPagesPath = path.join(frontendRoot, 'src', 'config', 'seo-tools.json');
const seoToolsPath = path.join(frontendRoot, 'src', 'config', 'seoData.ts');
const blogPath = path.join(frontendRoot, 'src', 'content', 'blogArticles.ts');
const comparisonPath = path.join(frontendRoot, 'src', 'config', 'comparisonData.ts');
const toolManifestPath = path.join(frontendRoot, 'src', 'config', 'toolManifest.ts');

const baseHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8');
const seoPages = JSON.parse(await readFile(seoPagesPath, 'utf8'));
const seoToolsSource = await readFile(seoToolsPath, 'utf8');
const blogSource = await readFile(blogPath, 'utf8');
const comparisonSource = await readFile(comparisonPath, 'utf8');
const toolManifestSource = await readFile(toolManifestPath, 'utf8');

const defaultTitle = 'Dociva — Free Online File Tools';
const defaultDescription = 'Free online tools for PDF, image, video, and text processing. Merge, split, compress, convert, watermark, protect & more — instantly.';

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractToolMetadata(source) {
  const entries = new Map();
  const pattern = /i18nKey:\s*'([^']+)'[\s\S]*?slug:\s*'([^']+)'[\s\S]*?titleSuffix:\s*'([^']+)'[\s\S]*?metaDescription:\s*'([^']+)'/g;

  for (const match of source.matchAll(pattern)) {
    const [, i18nKey, slug, titleSuffix, metaDescription] = match;
    entries.set(slug, {
      i18nKey,
      title: `${titleSuffix} | Dociva`,
      description: metaDescription,
    });
  }

  return entries;
}

function extractBlogEntries(source) {
  const entries = [];
  const pattern = /slug:\s*'([^']+)'[\s\S]*?title:\s*\{[\s\S]*?en:\s*'([^']+)'[\s\S]*?seoDescription:\s*\{[\s\S]*?en:\s*'([^']+)'/g;

  for (const match of source.matchAll(pattern)) {
    const [, slug, title, description] = match;
    entries.push({ slug, title: `${title} — Dociva`, description });
  }

  return entries;
}

function extractComparisonEntries(source) {
  const entries = [];
  const pattern = /slug:\s*'([^']+)'[\s\S]*?i18nKey:\s*'([^']+)'/g;

  for (const match of source.matchAll(pattern)) {
    const [, slug, i18nKey] = match;
    entries.push({ slug, i18nKey });
  }

  return entries;
}

function extractToolSlugs(source) {
  return [...source.matchAll(/\bslug:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function interpolate(template, values) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => values[key] ?? '');
}

function withMeta(html, { title, description, url, robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeRobots = escapeHtml(robots);

  let result = html
    .replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${safeDescription}" />`)
    .replace(/<meta name="robots"[\s\S]*?\/>/, `<meta name="robots" content="${safeRobots}" />`)
    .replace(/<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${safeDescription}" />`)
    .replace(/<meta name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${safeTitle}" />`)
    .replace(/<meta name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${safeDescription}" />`);

  result = result.replace(
    '</head>',
    `  <link rel="canonical" href="${safeUrl}" />\n  <meta property="og:url" content="${safeUrl}" />\n</head>`,
  );

  return result;
}

async function writeRouteShell(routePath, title, description, options = {}) {
  const normalizedPath = routePath === '/' ? '' : routePath.replace(/^\//, '');
  const targetDir = normalizedPath ? path.join(distRoot, normalizedPath) : distRoot;
  const html = withMeta(baseHtml, {
    title,
    description,
    url: `${siteOrigin}${routePath}`,
    robots: options.robots,
  });

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, 'index.html'), html, 'utf8');
}

const staticPages = [
  { path: '/', title: defaultTitle, description: defaultDescription },
  { path: '/tools', title: 'All Tools — Dociva', description: 'Browse every Dociva tool in one place. Explore PDF, image, AI, conversion, and utility workflows from a single search-friendly directory.' },
  { path: '/about', title: 'About Dociva', description: 'Learn about Dociva — free, fast, and secure online file tools for PDFs, images, video, and text. No registration required.' },
  { path: '/contact', title: 'Contact Dociva', description: 'Contact the Dociva team. Report bugs, request features, or send us a message.' },
  { path: '/privacy', title: 'Privacy Policy — Dociva', description: 'Privacy policy for Dociva. Learn how we handle your files and data with full transparency.' },
  { path: '/terms', title: 'Terms of Service — Dociva', description: 'Terms of service for Dociva. Understand the rules and guidelines for using our free online tools.' },
  { path: '/pricing', title: 'Pricing — Dociva', description: 'Compare free and pro plans for Dociva. Access 30+ tools for free, or upgrade for unlimited processing.' },
  { path: '/pricing-transparency', title: 'How Pricing Works — Dociva', description: 'Understand how Dociva pricing, credits, and workload-based processing work before you upgrade.' },
  { path: '/blog', title: 'Blog — Tips, Tutorials & Updates', description: 'Learn how to compress, convert, edit, and manage PDF files with our expert guides and tutorials.' },
  { path: '/developers', title: 'Developers — Dociva', description: 'Explore the Dociva developer portal, async API flow, and production-ready endpoints for document automation.' },
];

const noindexPages = [
  { path: '/account', title: 'Account — Dociva', description: 'Private account area.', robots: 'noindex,nofollow' },
  { path: '/forgot-password', title: 'Forgot Password — Dociva', description: 'Password recovery page.', robots: 'noindex,nofollow' },
  { path: '/reset-password', title: 'Reset Password — Dociva', description: 'Password reset page.', robots: 'noindex,nofollow' },
  { path: '/internal/admin', title: 'Internal Admin — Dociva', description: 'Internal admin page.', robots: 'noindex,nofollow' },
  { path: '/error/processing', title: 'Processing Error — Dociva', description: 'Processing error page.', robots: 'noindex,nofollow' },
];

const comparisonEntries = extractComparisonEntries(comparisonSource);
const toolEntries = extractToolMetadata(seoToolsSource);
const toolSlugs = extractToolSlugs(toolManifestSource);
const spanishToolSlugs = ['split-pdf', 'merge-pdf', 'compress-pdf', 'pdf-to-word', 'word-to-pdf'];

for (const page of staticPages) {
  await writeRouteShell(page.path, page.title, page.description);
}

for (const page of noindexPages) {
  await writeRouteShell(page.path, page.title, page.description, { robots: page.robots });
}

for (const blog of extractBlogEntries(blogSource)) {
  await writeRouteShell(`/blog/${blog.slug}`, blog.title, blog.description);
}

for (const [slug, tool] of toolEntries) {
  await writeRouteShell(`/tools/${slug}`, tool.title, tool.description);
}

for (const slug of toolSlugs) {
  const tool = toolEntries.get(slug);
  if (!tool) continue;

  await writeRouteShell(`/ar/tools/${slug}`, tool.title, tool.description);
  await writeRouteShell(`/fr/tools/${slug}`, tool.title, tool.description);
}

for (const slug of spanishToolSlugs) {
  const tool = toolEntries.get(slug);
  if (!tool) continue;

  await writeRouteShell(`/es/tools/${slug}`, tool.title, tool.description);
}

for (const page of seoPages.toolPages) {
  const englishTitle = interpolate(page.titleTemplate.en, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.en,
  });
  const arabicTitle = interpolate(page.titleTemplate.ar, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.ar,
  });

  const englishDescription = interpolate(page.descriptionTemplate.en, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.en,
  });
  const arabicDescription = interpolate(page.descriptionTemplate.ar, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.ar,
  });

  await writeRouteShell(`/${page.slug}`, `${englishTitle} — Dociva`, englishDescription);
  await writeRouteShell(`/ar/${page.slug}`, `${arabicTitle} — Dociva`, arabicDescription);
}

for (const page of seoPages.collectionPages) {
  const englishTitle = interpolate(page.titleTemplate.en, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.en,
  });
  const arabicTitle = interpolate(page.titleTemplate.ar, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.ar,
  });

  const englishDescription = interpolate(page.descriptionTemplate.en, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.en,
  });
  const arabicDescription = interpolate(page.descriptionTemplate.ar, {
    brand: 'Dociva',
    focusKeyword: page.focusKeyword.ar,
  });

  await writeRouteShell(`/${page.slug}`, `${englishTitle} — Dociva`, englishDescription);
  await writeRouteShell(`/ar/${page.slug}`, `${arabicTitle} — Dociva`, arabicDescription);
}

for (const comparison of comparisonEntries) {
  await writeRouteShell(
    `/compare/${comparison.slug}`,
    `${comparison.i18nKey} — Dociva`,
    'Compare Dociva with an alternative tool and review features, limits, and workflow differences.',
  );
}

console.log('Rendered route-specific SEO shells.');
