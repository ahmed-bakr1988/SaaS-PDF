import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const distRoot = path.join(frontendRoot, 'dist');

async function getRoutes(dir, baseDir, routes = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await getRoutes(fullPath, baseDir, routes);
      } else if (entry.name === 'index.html' && dir !== baseDir) {
        // It's a generated route shell
        let routePath = fullPath.replace(baseDir, '').replace(/\\/g, '/').replace(/\/index\.html$/, '');
        if (!routePath.startsWith('/')) routePath = '/' + routePath;
        routes.push(routePath);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return routes;
}

async function main() {
  console.log('Starting full HTML prerendering with Puppeteer...');
  
  // Start local server for the built files
  const app = express();
  app.use(express.static(distRoot));
  // SPA fallback
  app.get('*', (req, res) => {
      res.sendFile(path.join(distRoot, 'index.html'));
  });
  
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  console.log(`Local server listening on port ${port}`);

  const routes = await getRoutes(distRoot, distRoot);
  routes.push('/'); // include root
  console.log(`Found ${routes.length} routes to prerender.`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Disable external resources to speed up prerendering and avoid errors
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'media', 'font', 'stylesheet', 'other'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  for (const route of routes) {
    try {
      console.log(`Prerendering ${route}...`);
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle0', timeout: 15000 });
      
      // Wait a bit to ensure React has mounted
      await page.waitForSelector('#root > *', { timeout: 3000 }).catch(() => {});
      
      let html = await page.content();
      
      const targetPath = route === '/' ? path.join(distRoot, 'index.html') : path.join(distRoot, route, 'index.html');
      await fs.writeFile(targetPath, html, 'utf8');
      
    } catch (err) {
      console.error(`Failed to prerender ${route}:`, err.message);
    }
  }

  await browser.close();
  server.close();
  console.log('Full HTML prerendering complete.');
}

main().catch(console.error);
