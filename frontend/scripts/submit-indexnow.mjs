import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const publicDir = path.join(frontendRoot, 'public');
const distDir = path.join(frontendRoot, 'dist');
const stateDir = path.resolve(process.env.INDEXNOW_STATE_DIR || path.join(frontendRoot, '.indexnow'));
const stateFile = path.join(stateDir, 'last-submission.json');
const defaultEndpoint = 'https://www.bing.com/indexnow';
const keyPattern = /^[A-Za-z0-9-]{8,128}$/;
const dryRun = process.argv.includes('--dry-run') || process.env.INDEXNOW_DRY_RUN === 'true';
const forceFullSubmit = process.argv.includes('--full') || process.env.INDEXNOW_FULL_SUBMIT === 'true';
const strictMode = process.env.INDEXNOW_STRICT === 'true';
const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;

function normalizeOrigin(rawOrigin) {
  const normalized = String(rawOrigin || 'https://dociva.io').trim().replace(/\/$/, '');
  return new URL(normalized);
}

function normalizeEndpoint(rawEndpoint) {
  const endpointUrl = new URL(String(rawEndpoint || defaultEndpoint).trim());

  if (endpointUrl.pathname === '/' || !endpointUrl.pathname) {
    endpointUrl.pathname = '/indexnow';
  }

  return endpointUrl.toString();
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function ensureKeyFile(key) {
  const keyFileName = `${key}.txt`;
  const targets = [publicDir, distDir];

  for (const targetDir of targets) {
    if (!(await pathExists(targetDir))) {
      continue;
    }

    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, keyFileName), key, 'utf8');
  }
}

async function resolveKey() {
  const envKey = String(process.env.INDEXNOW_KEY || '').trim();
  if (envKey) {
    if (!keyPattern.test(envKey)) {
      throw new Error('INDEXNOW_KEY is not a valid IndexNow key.');
    }

    await ensureKeyFile(envKey);
    return envKey;
  }

  for (const baseDir of [distDir, publicDir]) {
    if (!(await pathExists(baseDir))) {
      continue;
    }

    const entries = await readdir(baseDir);
    for (const entry of entries.sort()) {
      if (!entry.endsWith('.txt')) {
        continue;
      }

      const candidateKey = entry.slice(0, -4);
      if (!keyPattern.test(candidateKey)) {
        continue;
      }

      const contents = (await readFile(path.join(baseDir, entry), 'utf8')).trim();
      if (contents === candidateKey) {
        return candidateKey;
      }
    }
  }

  return '';
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

async function collectSitemapFiles() {
  const sitemapFiles = [];

  for (const baseDir of [distDir, publicDir]) {
    const nestedSitemapDir = path.join(baseDir, 'sitemaps');
    if (await pathExists(nestedSitemapDir)) {
      const entries = await readdir(nestedSitemapDir);
      for (const entry of entries.sort()) {
        if (entry.endsWith('.xml')) {
          sitemapFiles.push(path.join(nestedSitemapDir, entry));
        }
      }
    }

    const rootSitemap = path.join(baseDir, 'sitemap.xml');
    if (await pathExists(rootSitemap)) {
      sitemapFiles.push(rootSitemap);
    }

    if (sitemapFiles.length > 0) {
      break;
    }
  }

  return sitemapFiles;
}

async function collectUrls(siteOrigin) {
  const urls = new Set();
  const sitemapFiles = await collectSitemapFiles();

  for (const sitemapFile of sitemapFiles) {
    const xml = await readFile(sitemapFile, 'utf8');

    for (const loc of extractLocs(xml)) {
      let parsedUrl;

      try {
        parsedUrl = new URL(loc);
      } catch {
        continue;
      }

      if (parsedUrl.host !== siteOrigin.host) {
        continue;
      }

      if (parsedUrl.pathname.endsWith('.xml')) {
        continue;
      }

      urls.add(parsedUrl.toString());
    }
  }

  return [...urls].sort();
}

function chunkUrls(urlList, chunkSize) {
  const chunks = [];

  for (let index = 0; index < urlList.length; index += chunkSize) {
    chunks.push(urlList.slice(index, index + chunkSize));
  }

  return chunks;
}

async function loadPreviousUrls() {
  if (!(await pathExists(stateFile))) {
    return [];
  }

  try {
    const payload = JSON.parse(await readFile(stateFile, 'utf8'));
    if (!Array.isArray(payload.urls)) {
      return [];
    }

    return payload.urls.filter((url) => typeof url === 'string');
  } catch {
    return [];
  }
}

function diffUrlLists(currentUrls, previousUrls, submitAll = false) {
  if (submitAll || previousUrls.length === 0) {
    return [...new Set(currentUrls)].sort();
  }

  const currentSet = new Set(currentUrls);
  const previousSet = new Set(previousUrls);
  const changedUrls = new Set();

  for (const url of currentSet) {
    if (!previousSet.has(url)) {
      changedUrls.add(url);
    }
  }

  for (const url of previousSet) {
    if (!currentSet.has(url)) {
      changedUrls.add(url);
    }
  }

  return [...changedUrls].sort();
}

async function persistSubmittedUrls(currentUrls) {
  if (dryRun) {
    return false;
  }

  await writeJsonFile(stateFile, {
    updatedAt: new Date().toISOString(),
    urls: [...new Set(currentUrls)].sort(),
  });

  return true;
}

async function submitBatch(endpoint, payload, batchIndex, totalBatches) {
  if (dryRun) {
    console.log(`Dry run: batch ${batchIndex}/${totalBatches} -> ${payload.urlList.length} URLs`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const responseText = (await response.text()).trim();
  if (!response.ok) {
    throw new Error(
      `IndexNow request failed with ${response.status}${responseText ? `: ${responseText}` : ''}`,
    );
  }

  console.log(
    `Submitted IndexNow batch ${batchIndex}/${totalBatches} with ${payload.urlList.length} URLs (${response.status}).`,
  );
}

async function main() {
  const siteOrigin = normalizeOrigin(process.env.VITE_SITE_DOMAIN || process.env.SITE_DOMAIN);
  const endpoint = normalizeEndpoint(process.env.INDEXNOW_ENDPOINT);
  const key = await resolveKey();

  if (!key) {
    console.log('Skipping IndexNow submission: no verification key was found.');
    return;
  }

  const currentUrls = await collectUrls(siteOrigin);
  if (currentUrls.length === 0) {
    console.log('Skipping IndexNow submission: no sitemap URLs were found.');
    return;
  }

  const previousUrls = await loadPreviousUrls();
  const urlList = diffUrlLists(currentUrls, previousUrls, forceFullSubmit);
  if (urlList.length === 0) {
    console.log('Skipping IndexNow submission: no changed URLs were detected since the previous successful submission.');
    return;
  }

  const keyLocation = `${siteOrigin.origin}/${key}.txt`;
  const payloads = chunkUrls(urlList, 10000).map((chunk) => ({
    host: siteOrigin.host,
    key,
    keyLocation,
    urlList: chunk,
  }));

  console.log(
    `${dryRun ? 'Preparing' : 'Submitting'} ${urlList.length} URLs to ${endpoint} using ${keyLocation}.`,
  );

  for (const [index, payload] of payloads.entries()) {
    await submitBatch(endpoint, payload, index + 1, payloads.length);
  }

  if (await persistSubmittedUrls(currentUrls)) {
    console.log(`Saved IndexNow state snapshot to ${stateFile}.`);
  }
}

if (isDirectRun) {
  main().catch((error) => {
    console.error(`IndexNow submission failed: ${error.message}`);
    if (strictMode) {
      process.exitCode = 1;
    }
  });
}

export {
  diffUrlLists,
  extractLocs,
  main,
  normalizeEndpoint,
  normalizeOrigin,
};