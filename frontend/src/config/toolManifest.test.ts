import { describe, it, expect } from 'vitest';
import { TOOL_MANIFEST, getManifestSlugs } from '@/config/toolManifest';
import { getAllToolSlugs, getToolSEO } from '@/config/seoData';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * DRIFT-DETECTION TESTS
 *
 * Ensures toolManifest.ts stays in sync with seoData.ts and HomePage.tsx.
 * If any test fails it means someone added a tool in one place but forgot
 * the other — fix by updating both files.
 */
describe('Tool Manifest ↔ SEO Data sync', () => {
  const manifestSlugs = new Set(getManifestSlugs());
  const seoSlugs = new Set(getAllToolSlugs());

  it('every manifest tool has an seoData entry', () => {
    const missing = [...manifestSlugs].filter((s) => !seoSlugs.has(s));
    expect(missing, `Manifest tools missing seoData: ${missing.join(', ')}`).toEqual(
      []
    );
  });

  it('every seoData tool has a manifest entry', () => {
    const missing = [...seoSlugs].filter((s) => !manifestSlugs.has(s));
    expect(missing, `seoData tools missing manifest: ${missing.join(', ')}`).toEqual(
      []
    );
  });

  it('no duplicate slugs in the manifest', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const tool of TOOL_MANIFEST) {
      if (seen.has(tool.slug)) dupes.push(tool.slug);
      seen.add(tool.slug);
    }
    expect(dupes, `Duplicate manifest slugs: ${dupes.join(', ')}`).toEqual([]);
  });

  it('no duplicate slugs in seoData', () => {
    const all = getAllToolSlugs();
    expect(new Set(all).size).toBe(all.length);
  });

  it('each seoData entry has required fields populated', () => {
    for (const slug of seoSlugs) {
      const seo = getToolSEO(slug);
      expect(seo, `seoData missing entry for slug: ${slug}`).toBeDefined();
      expect(seo!.titleSuffix?.length).toBeGreaterThan(0);
      expect(seo!.metaDescription?.length).toBeGreaterThan(0);
    }
  });
});

describe('Tool Manifest ↔ ManifestToolIcon ICON_MAP sync', () => {
  const iconSource = readFileSync(
    resolve(__dirname, '../components/shared/ManifestToolIcon.tsx'),
    'utf-8'
  );

  // Extract icon names from the ICON_MAP object literal
  // Match from "= {" to "};" to skip the type annotation that also contains braces
  const iconMapMatch = iconSource.match(/ICON_MAP[^=]+=\s*\{([\s\S]+?)\}\s*as\s+const/);
  const iconMapKeys = new Set(
    iconMapMatch
      ? iconMapMatch[1]
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );

  it('every homepage-visible manifest tool has its icon in ICON_MAP', () => {
    const missing: string[] = [];
    for (const tool of TOOL_MANIFEST) {
      if (tool.homepage && !iconMapKeys.has(tool.iconName)) {
        missing.push(`${tool.slug} (icon: ${tool.iconName})`);
      }
    }
    expect(
      missing,
      `Homepage tools with missing ICON_MAP entries: ${missing.join(', ')}`
    ).toEqual([]);
  });
});

describe('Tool Manifest internal consistency', () => {
  it('all manifest entries have non-empty slugs and i18nKeys', () => {
    for (const tool of TOOL_MANIFEST) {
      expect(tool.slug.length).toBeGreaterThan(0);
      expect(tool.i18nKey.length).toBeGreaterThan(0);
    }
  });

  it('all manifest slugs follow kebab-case pattern', () => {
    const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const tool of TOOL_MANIFEST) {
      expect(
        kebab.test(tool.slug),
        `Slug "${tool.slug}" is not kebab-case`
      ).toBe(true);
    }
  });

  it('manifest has at least 40 tools', () => {
    expect(TOOL_MANIFEST.length).toBeGreaterThanOrEqual(40);
  });
});
