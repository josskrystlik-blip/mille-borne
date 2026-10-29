'use strict';
// Lance tous les scénarios Playwright sur téléphone et tablette :  npm run test:e2e
// Démarre son propre petit serveur web : aucune autre installation que Playwright.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { chromium } = require(process.env.PW || 'playwright');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const VIEWPORTS = [['téléphone', { width: 390, height: 844 }], ['tablette', { width: 1024, height: 768 }]];
// Les plus longs d'abord : les voies parallèles se remplissent mieux
const SCENARIOS = ['rules', 'learn', 'contrast', 'voice', 'display', 'race', 'child', 'scan', 'privacy', 'offline', 'wizard'];

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
  // npm run coverage : on mesure quelles lignes du jeu les scénarios exécutent
  const coverageOut = process.env.COVERAGE_OUT;
  const v8 = coverageOut && require('../coverage/v8');
  const coverage = {};
  // Une tâche par scénario, taille d'écran et variante ; plusieurs tâches tournent en même temps,
  // chacune dans son propre navigateur isolé (E2E_WORKERS pour changer le nombre)
  const jobs = [];
  for (const name of SCENARIOS.filter((s) => !only.length || only.includes(s))) {
    const scenario = require(`./${name}.e2e.js`);
    for (const variant of scenario.variants || [null]) {
      for (const [label, viewport] of VIEWPORTS) jobs.push({ name, scenario, variant, label, viewport });
    }
  }
  const workers = Number(process.env.E2E_WORKERS) || Math.max(2, Math.min(4, os.cpus().length));
  const t0All = Date.now();
  let failed = 0;
  let next = 0;
  const runJob = async ({ name, scenario, variant, label, viewport }) => {
    const title = `${name}${variant ? ` ${variant}` : ''} (${label})`;
    const page = await openPage(browser, base, viewport, !!coverageOut);
    const t0 = Date.now();
    try {
      await scenario(page, variant);
      if (page.errors.length) throw new Error(`erreurs dans la page : ${page.errors.join(' | ')}`);
      console.log(`✔ ${title} ${Date.now() - t0} ms`);
    } catch (e) {
      failed++;
      console.log(`✘ ${title}\n  ${String(e.stack || e).split('\n').slice(0, 6).join('\n  ')}`);
      if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, `fail-${name}${variant ? `-${variant}` : ''}-${viewport.width}.png`), fullPage: true });
    }
    if (coverageOut) {
      for (const e of await page.coverage.stopJSCoverage()) {
        const m = e.url.match(/\/(js\/[\w-]+\.js)$/);
        if (m) v8.addEntry(coverage, m[1], e.source, e.functions);
      }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < jobs.length) await runJob(jobs[next++]);
  }));
  console.log(`\n${jobs.length} tâches, ${workers} en parallèle, ${Math.round((Date.now() - t0All) / 1000)} s`);
  await browser.close();
  server.close();
  if (coverageOut) {
    const plain = Object.fromEntries(Object.entries(coverage).map(([f, c]) => [f, { ...c, bytes: Buffer.from(c.bytes).toString('base64') }]));
    fs.writeFileSync(coverageOut, JSON.stringify(plain));
  }
  console.log(failed ? `\n${failed} scénario(s) en échec` : '\nTous les scénarios sont verts');
  process.exit(failed ? 1 : 0);
})();
