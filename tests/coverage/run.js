'use strict';
// Couverture de tests :  npm run coverage
// Lance les tests unitaires et les scénarios de bout en bout en mesurant le code exécuté,
// puis écrit un tableau dans le terminal et un rapport détaillé dans coverage/index.html.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const v8 = require('./v8');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'coverage');
const RAW = path.join(OUT, 'v8-unit');
const onlyUnit = process.argv.includes('--unit');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });

// 1. Tests unitaires : Node écrit les mesures de V8 (y compris les scripts chargés via vm)
const unitFiles = fs.readdirSync(path.join(ROOT, 'tests', 'unit')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('tests', 'unit', f));
console.log('▶ Tests unitaires…');
const unit = spawnSync(process.execPath, ['--test', ...unitFiles], { cwd: ROOT, env: { ...process.env, NODE_V8_COVERAGE: RAW }, stdio: ['ignore', 'pipe', 'inherit'] });
if (unit.status !== 0) { process.stdout.write(unit.stdout); console.error('✘ Tests unitaires en échec'); process.exit(1); }
const unitAcc = {};
for (const file of fs.readdirSync(RAW)) {
  for (const s of JSON.parse(fs.readFileSync(path.join(RAW, file), 'utf8')).result) {
    const m = s.url.match(/^(js\/[\w-]+\.js)$/);
    if (m) v8.addEntry(unitAcc, m[1], fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), s.functions);
  }
}

// 2. Scénarios de bout en bout : Chromium mesure le code exécuté dans les pages
let e2eAcc = {};
if (!onlyUnit) {
  console.log('▶ Scénarios de bout en bout (quelques minutes)…');
  const e2eFile = path.join(OUT, 'e2e.json');
  const e2e = spawnSync(process.execPath, [path.join('tests', 'e2e', 'run.js')], { cwd: ROOT, env: { ...process.env, COVERAGE_OUT: e2eFile }, stdio: 'inherit' });
  if (e2e.status !== 0) { console.error('✘ Scénarios en échec'); process.exit(1); }
  e2eAcc = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(e2eFile, 'utf8')))
    .map(([f, c]) => [f, { ...c, bytes: new Uint8Array(Buffer.from(c.bytes, 'base64')) }]));
}

// 3. Rapport : tous les fichiers du jeu, même ceux qu'aucun test ne charge
const files = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).sort().map((f) => `js/${f}`)
  .filter((f) => !onlyUnit || unitAcc[f]); // --unit : seulement la logique pure chargée par les tests unitaires
const total = v8.merge(unitAcc, e2eAcc);
const empty = (file) => ({ source: fs.readFileSync(path.join(ROOT, file), 'utf8'), bytes: new Uint8Array(0), funcs: {} });
const sum = (acc, file) => {
  const f = acc[file] || empty(file);
  if (!f.bytes.length) f.bytes = new Uint8Array(f.source.length);
  return v8.summarize(f);
};
const rows = files.map((file) => ({ file, unit: sum(unitAcc, file), e2e: sum(e2eAcc, file), total: sum(total, file) }));
const all = rows.reduce((a, r) => ({
  lt: a.lt + r.total.linesTotal, lc: a.lc + r.total.linesCovered, ft: a.ft + r.total.funcsTotal, fc: a.fc + r.total.funcsCovered,
}), { lt: 0, lc: 0, ft: 0, fc: 0 });

const col = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);
console.log(`\n${col('Fichier', 16)}${num('Unitaires', 11)}${num('Scénarios', 11)}${num('Lignes', 9)}${num('Fonctions', 11)}`);
console.log('-'.repeat(58));
for (const r of rows) {
  const u = r.unit.linesCovered ? `${v8.pct(r.unit.linesCovered, r.unit.linesTotal)} %` : '–';
  const e = onlyUnit ? '–' : `${v8.pct(r.e2e.linesCovered, r.e2e.linesTotal)} %`;
  console.log(`${col(r.file, 16)}${num(u, 11)}${num(e, 11)}${num(`${v8.pct(r.total.linesCovered, r.total.linesTotal)} %`, 9)}${num(`${r.total.funcsCovered}/${r.total.funcsTotal}`, 11)}`);
}
console.log('-'.repeat(58));
console.log(`${col('Total', 38)}${num(`${v8.pct(all.lc, all.lt)} %`, 9)}${num(`${all.fc}/${all.ft}`, 11)}`);

// Rapport HTML : un tableau, puis chaque fichier avec ses lignes jamais exécutées en rouge
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bar = (p) => `<span class="bar"><span style="width:${p}%"></span></span> ${p} %`;
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Couverture des tests – Bornes Turbo</title>
<style>
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #1d2733; background: #f6f7f9; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 24px; margin: 8px 0 4px; } h2 { font-size: 18px; margin: 28px 0 6px; }
  .lead { color: #4f5b69; margin: 0 0 16px; }
  table.sum { width: 100%; border-collapse: collapse; background: #fff; }
  .sum th, .sum td { padding: 8px 10px; border-bottom: 1px solid #e3e7ec; text-align: left; }
  .sum td.n { text-align: right; white-space: nowrap; }
  .bar { display: inline-block; width: 80px; height: 8px; border-radius: 4px; background: #f3c9c9; vertical-align: middle; }
  .bar span { display: block; height: 100%; border-radius: 4px; background: #1b7a3a; }
  details { background: #fff; border: 1px solid #e3e7ec; border-radius: 8px; margin: 10px 0; }
  summary { padding: 10px 12px; cursor: pointer; font-weight: 700; }
  .funcs { padding: 0 12px 8px; color: #4f5b69; }
  pre { margin: 0; padding: 8px 0; overflow-x: auto; font: 12.5px/1.45 ui-monospace, monospace; }
  .l { display: block; padding: 0 12px; white-space: pre; }
  .l i { display: inline-block; width: 44px; color: #8a96a3; font-style: normal; user-select: none; }
  .no { background: #fde2e2; } .yes { background: #e7f5ea; }
</style></head><body><main>
<h1>Couverture des tests</h1>
<p class="lead">Part du code du jeu exécutée par les tests unitaires et les scénarios de bout en bout
(téléphone et tablette). Lignes vertes : exécutées ; rouges : jamais exécutées par un test.</p>
<table class="sum"><thead><tr><th>Fichier</th><th>Unitaires</th><th>Scénarios</th><th>Total des lignes</th><th>Fonctions</th></tr></thead><tbody>
${rows.map((r) => `<tr><td><a href="#${r.file}">${r.file}</a></td>
  <td class="n">${r.unit.linesCovered ? `${v8.pct(r.unit.linesCovered, r.unit.linesTotal)} %` : '–'}</td>
  <td class="n">${onlyUnit ? '–' : `${v8.pct(r.e2e.linesCovered, r.e2e.linesTotal)} %`}</td>
  <td class="n">${bar(v8.pct(r.total.linesCovered, r.total.linesTotal))}</td>
  <td class="n">${r.total.funcsCovered}/${r.total.funcsTotal}</td></tr>`).join('')}
<tr><th>Total</th><td></td><td></td><td class="n"><b>${bar(v8.pct(all.lc, all.lt))}</b></td><td class="n"><b>${all.fc}/${all.ft}</b></td></tr>
</tbody></table>
${rows.map((r) => `<details id="${r.file}"><summary>${r.file} – ${v8.pct(r.total.linesCovered, r.total.linesTotal)} % des lignes</summary>
  ${r.total.uncoveredFuncs.length ? `<p class="funcs">Fonctions jamais appelées : ${r.total.uncoveredFuncs.map((f) => `<code>${esc(f.name)}</code> (l. ${f.line})`).join(', ')}</p>` : ''}
  <pre>${r.total.lines.map((l) => `<span class="l ${l.code ? (l.covered ? 'yes' : 'no') : ''}"><i>${l.n}</i>${esc(l.text)}</span>`).join('')}</pre></details>`).join('\n')}
</main></body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.rmSync(RAW, { recursive: true, force: true });
console.log(`\nRapport détaillé : ${path.relative(ROOT, path.join(OUT, 'index.html'))}`);
