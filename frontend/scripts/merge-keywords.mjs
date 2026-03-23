import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const seoDir = path.join(root, 'src', 'seo');
const seoDataPath = path.join(seoDir, 'seoData.json');
const keywordsPath = path.join(seoDir, 'keywords.json');
const outPath = path.join(seoDir, 'seoData.generated.json');

async function loadJson(p) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (err) {
    return null;
  }
}

function makeToolSeedFromKeyword(k) {
  const en = k.language === 'ar' ? k.mainKeyword : k.mainKeyword;
  const ar = k.language === 'ar' ? k.mainKeyword : '';
  // minimal seed matching existing schema
  return {
    slug: k.slug,
    toolSlug: k.slug.startsWith('pdf') ? k.slug : k.slug,
    category: 'PDF',
    focusKeyword: { en: en, ar: ar || en },
    supportingKeywords: { en: [], ar: [] },
    benefit: { en: `Use Dociva to ${k.mainKeyword}.`, ar: '' },
    useCase: { en: 'Quick online processing without signup.', ar: '' },
    relatedCollectionSlugs: [],
  };
}

async function run() {
  const seoData = await loadJson(seoDataPath);
  const keywords = await loadJson(keywordsPath);

  if (!seoData) {
    console.error('Missing seoData.json — aborting');
    process.exit(1);
  }

  if (!keywords) {
    console.error('No keywords.json found — nothing to merge');
    process.exit(0);
  }

  const existingSlugs = new Set(seoData.toolPageSeeds.map((s) => s.slug));
  const newSeeds = [];
  for (const k of keywords.keywords || []) {
    if (existingSlugs.has(k.slug)) continue; // safety: skip existing
    newSeeds.push(makeToolSeedFromKeyword(k));
  }

  const merged = {
    toolPageSeeds: [...seoData.toolPageSeeds, ...newSeeds],
    collectionPageSeeds: seoData.collectionPageSeeds || [],
  };

  await writeFile(outPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`Wrote ${outPath} with ${newSeeds.length} added seeds (skipped ${keywords.keywords.length - newSeeds.length}).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
