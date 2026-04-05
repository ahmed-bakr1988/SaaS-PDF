/**
 * check-hardcoded-text.mjs
 * Scans shared/layout components for hardcoded English UI strings that should
 * be replaced with t() calls.
 *
 * Heuristic: a JSX text node is flagged when it:
 *   - contains at least one space (multi-word)
 *   - is longer than 3 characters
 *   - starts with an uppercase letter or common English word
 *   - is NOT already wrapped in {t(...)}
 *   - is NOT a CSS class, URL, comment, code attribute, or aria-label value
 *
 * Usage: node scripts/check-hardcoded-text.mjs
 * Exit code 1 if any potential hardcoded strings are found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

/** Directories to scan */
const SCAN_DIRS = [
  join(ROOT, 'src', 'components', 'shared'),
  join(ROOT, 'src', 'components', 'layout'),
];

// Collect .tsx files
function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkFiles(full);
    } else if (/\.tsx$/.test(entry)) {
      yield full;
    }
  }
}

/**
 * Patterns that indicate the string is NOT a hardcoded UI label:
 *  - Only digits/punctuation
 *  - Looks like a URL, path, class name, CSS value
 *  - Already inside {t(…)}
 *  - Attribute values like className, href, src, id, type, etc.
 */
const SKIP_RE = [
  /^[\d\s.,/:%-]+$/,          // pure numbers/punctuation
  /^https?:\/\//,             // URLs
  /^\/[a-z]/,                 // paths
  /^[a-z][-a-z0-9]*$/,        // single lowercase word (CSS class, attr value)
  /^[a-z][a-zA-Z0-9]*=[a-z]/, // key=value attrs
];

function shouldSkip(str) {
  const trimmed = str.trim();
  if (trimmed.length <= 3) return true;
  if (!/\s/.test(trimmed)) return true;  // single word
  if (!/[A-Z]/.test(trimmed[0])) return true; // doesn't start with uppercase
  for (const re of SKIP_RE) if (re.test(trimmed)) return true;
  return false;
}

/**
 * Find JSX text content that is hardcoded English.
 * Strategy: look for lines where text appears between JSX tags but is NOT
 * wrapped in a {…} expression.
 *
 * Pattern: >  Some Text Here   <  (with optional leading whitespace)
 */
const JSX_TEXT_RE = />\s*([A-Z][^<{}\n]{3,}?)\s*</g;

/**
 * Also catch string literals used directly as prop values that look like
 * display text: title="Some English Text" (but not className, id, etc.)
 */
const DISPLAY_PROP_RE = /(?:title|label|placeholder|aria-label|alt)="([^"]{4,})"/g;

const findings = [];

for (const dir of SCAN_DIRS) {
  for (const file of walkFiles(dir)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (const [lineIdx, line] of lines.entries()) {
      // Skip comment lines
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
      // Skip lines that are already pure t() calls
      if (/\{t\(/.test(line)) continue;

      // JSX text between tags
      let m;
      JSX_TEXT_RE.lastIndex = 0;
      while ((m = JSX_TEXT_RE.exec(line)) !== null) {
        const text = m[1].trim();
        if (!shouldSkip(text)) {
          findings.push({ file: rel, line: lineIdx + 1, text });
        }
      }

      // Display props with raw English strings
      DISPLAY_PROP_RE.lastIndex = 0;
      while ((m = DISPLAY_PROP_RE.exec(line)) !== null) {
        const text = m[1].trim();
        if (!shouldSkip(text)) {
          findings.push({ file: rel, line: lineIdx + 1, text: `[prop] ${text}` });
        }
      }
    }
  }
}

if (findings.length === 0) {
  console.log('✓ No hardcoded UI text found in shared/layout components');
  process.exit(0);
} else {
  console.warn(`⚠ Found ${findings.length} potential hardcoded string(s):\n`);
  for (const { file, line, text } of findings) {
    console.warn(`  ${file}:${line}  →  "${text}"`);
  }
  // Exit 1 to allow failing CI; change to process.exit(0) to make it advisory only
  process.exit(1);
}
