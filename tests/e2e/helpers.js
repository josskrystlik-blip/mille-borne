'use strict';
// Outils communs aux scénarios de bout en bout (Playwright).
const assert = require('node:assert/strict');

const STORAGE_KEY = 'mille-bornes-turbo-v1';

// Simule la voix, le micro et la caméra : rien ne sort réellement du navigateur de test.
function installFakes() {
  window.__said = [];
  window.speechSynthesis.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 5); };
  window.speechSynthesis.cancel = () => {};
  class FakeRecognition { constructor() { window.__rec = this; } start() {} abort() {} stop() {} }
  window.SpeechRecognition = FakeRecognition;
  window.__hear = (text) => {
    const res = [{ transcript: text }]; res.isFinal = true;
    window.__rec.onresult({ resultIndex: 0, results: [res] });
  };
  window.__added = []; window.__counts = {}; window.__guess = null;
  window.__scanModels = {
    embed: () => ({}),
    add: (e, l) => { window.__added.push(l); window.__counts[l] = (window.__counts[l] || 0) + 1; },
    predict: async () => window.__guess,
    counts: () => window.__counts,
    clear: () => { window.__counts = {}; },
    dump: () => ({ learned: true }),
    restore: () => {},
  };
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = async () => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 48;
      c.getContext('2d').fillRect(0, 0, 64, 48);
      return c.captureStream(5);
    };
  }
}

async function openPage(browser, base, viewport, coverage = false) {
  const page = await browser.newPage({ viewport });
  if (coverage) await page.coverage.startJSCoverage({ resetOnNavigation: false });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.addInitScript(installFakes);
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // La prise en main s'ouvre au premier lancement : les scénarios la passent (sauf le sien)
  await page.click('#btn-wizard-skip');
  return page;
}

// Prépare une partie depuis l'écran de départ. mode : 'child' (défaut du jeu), 'family' ou 'adult'.
async function startGame(page, { names = ['Léo', 'Papa'], rules = 'full', mode = 'family' } = {}) {
  await page.click(`[data-count="${names.length}"]`);
  for (const [i, n] of names.entries()) await page.fill(`.name-input[data-index="${i}"]`, n);
  await page.click(`[data-rules="${rules}"]`);
  await page.click(`[data-display="${mode}"]`);
  await page.click('#btn-start');
  await page.waitForSelector('#countdown', { state: 'hidden', timeout: 8000 });
}

const stateOf = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);

// Réécrit l'état sauvegardé puis recharge la page (pour partir d'une situation précise)
async function setState(page, change) {
  await page.evaluate(([key, fn]) => {
    const s = JSON.parse(localStorage.getItem(key));
    // eslint-disable-next-line no-new-func
    new Function('s', fn)(s);
    localStorage.setItem(key, JSON.stringify(s));
  }, [STORAGE_KEY, change]);
  await page.reload();
}

const turnName = (page) => page.textContent('.turn-text b');
const draw = (page) => page.click('#btn-play', { force: true });

async function playKm(page, km) {
  await draw(page);
  if (await page.isVisible('#card-tabs')) await page.click('.card-tab[data-tab="km"]'); // pas d'onglets en mode « km »
  await page.click(`#cards .card[data-km="${km}"]`);
  await page.waitForTimeout(1300);
}

async function playCard(page, id, tab) {
  await draw(page);
  await page.click(`.card-tab[data-tab="${tab}"]`);
  await page.click(`#cards .card[data-card="${id}"]`);
}

async function noHorizontalScroll(page) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(sw <= w, `la page déborde en largeur (${sw} > ${w})`);
}

module.exports = { assert, STORAGE_KEY, openPage, startGame, stateOf, setState, turnName, draw, playKm, playCard, noHorizontalScroll };
