import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const I18N_DIR = join(ROOT, 'src', 'i18n');
const EN_JSON = join(I18N_DIR, 'en.json');

const enData = JSON.parse(readFileSync(EN_JSON, 'utf8'));

// Function to recursively merge objects
function mergeMissing(target, source) {
  let isModified = false;
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (!target[key]) {
        target[key] = {};
        isModified = true;
      }
      const childModified = mergeMissing(target[key], source[key]);
      if (childModified) isModified = true;
    } else {
      if (target[key] === undefined) {
        target[key] = source[key];
        isModified = true;
      }
    }
  }
  return isModified;
}

const files = readdirSync(I18N_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

for (const file of files) {
  const filePath = join(I18N_DIR, file);
  try {
    const targetData = JSON.parse(readFileSync(filePath, 'utf8'));
    const modified = mergeMissing(targetData, enData);
    if (modified) {
      writeFileSync(filePath, JSON.stringify(targetData, null, 2) + '\n', 'utf8');
      console.log(`Synced missing keys in: ${file}`);
    } else {
      console.log(`No missing keys in: ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}

console.log('i18n sync complete.');
