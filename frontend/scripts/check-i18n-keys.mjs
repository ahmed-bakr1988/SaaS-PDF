/**
 * check-i18n-keys.mjs
 * Scans all .ts/.tsx files in src/ and verifies every static t('key') call
 * exists as a dot-path entry in src/i18n/en.json.
 *
 * Usage: node scripts/check-i18n-keys.mjs
 * Exit code 1 if any missing keys are found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const EN_JSON = join(ROOT, 'src', 'i18n', 'en.json');

// Load en.json and build a flat Set of all dot-paths
function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const nested of flattenKeys(v, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

const enJson = JSON.parse(readFileSync(EN_JSON, 'utf8'));
const definedKeys = flattenKeys(enJson);

// Collect all .ts/.tsx files under src/
function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkFiles(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith('.d.ts')) {
      yield full;
    }
  }
}

// Extract static string arguments from t('...') or t("...") calls.
// Matches: t('key'), t("key"), t(`key`), useTranslation().t('key'),
// as well as i18n.t('key') patterns.
const T_CALL_RE = /\bt\(\s*(['"`])([^'"`\s]+)\1/g;

const missing = [];

for (const file of walkFiles(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (const [lineIdx, line] of lines.entries()) {
    let match;
    T_CALL_RE.lastIndex = 0;
    while ((match = T_CALL_RE.exec(line)) !== null) {
      const key = match[2];
      // Skip dynamic keys (contain ${) or non-string patterns
      if (key.includes('${') || key.includes('(')) continue;
      if (!definedKeys.has(key)) {
        missing.push({ file: rel, line: lineIdx + 1, key });
      }
    }
  }
}

if (missing.length === 0) {
  console.log('✓ All t() keys are present in en.json');
  process.exit(0);
} else {
  console.error(`✗ Found ${missing.length} missing i18n key(s):\n`);
  for (const { file, line, key } of missing) {
    console.error(`  ${file}:${line}  →  "${key}"`);
  }
  process.exit(1);
}
