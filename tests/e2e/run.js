'use strict';
// Lance tous les scénarios Playwright sur téléphone et tablette :  npm run test:e2e
// Démarre son propre petit serveur web : aucune autre installation que Playwright.
const http = require('http');
const fs = require('fs');
const path = require('path');

const { chromium } = require(process.env.PW || 'playwright');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const VIEWPORTS = [['téléphone', { width: 390, height: 844 }], ['tablette', { width: 1024, height: 768 }]];
const SCENARIOS = ['race', 'rules', 'voice', 'scan', 'child', 'display', 'learn'];

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const only = process.argv.slice(2);
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const { openPage } = require('./helpers');
  let failed = 0;
  for (const name of SCENARIOS.filter((s) => !only.length || only.includes(s))) {
    const scenario = require(`./${name}.e2e.js`);
    for (const [label, viewport] of VIEWPORTS) {
      const page = await openPage(browser, base, viewport);
      const t0 = Date.now();
      try {
        await scenario(page);
        if (page.errors.length) throw new Error(`erreurs dans la page : ${page.errors.join(' | ')}`);
        console.log(`✔ ${name} (${label}) ${Date.now() - t0} ms`);
      } catch (e) {
        failed++;
        console.log(`✘ ${name} (${label})\n  ${String(e.stack || e).split('\n').slice(0, 6).join('\n  ')}`);
        if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, `fail-${name}-${viewport.width}.png`), fullPage: true });
      }
      await page.close();
    }
  }
  await browser.close();
  server.close();
  console.log(failed ? `\n${failed} scénario(s) en échec` : '\nTous les scénarios sont verts');
  process.exit(failed ? 1 : 0);
})();
