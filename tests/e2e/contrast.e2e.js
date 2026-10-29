'use strict';
// Lisibilité : aucun texte visible sous le contraste minimal (WCAG AA), dans chaque affichage
// et chaque palette, sur l'écran de départ, la course, les fenêtres d'aide et l'arrivée.
const { assert, STORAGE_KEY } = require('./helpers');
const contrastAudit = require('./contrast-audit');

// Une tâche par affichage/palette : le lanceur les fait tourner en parallèle
const VARIANTS = ['child', 'family', 'adult/nuit', 'adult/clair', 'adult/circuit', 'adult/contraste'];

module.exports = async function contrast(page, variant = 'adult/nuit') {
  const problems = [];
  const check = async (label, scope) => {
    (await page.evaluate(contrastAudit, scope)).forEach((f) => problems.push(`${label} : « ${f.text} » ${f.ratio}:1 (${f.where})`));
  };
  const seed = (mode, palette, log, current) => page.evaluate(([key, m, pal, l, c]) => {
    const s = JSON.parse(localStorage.getItem(key));
    Object.assign(s, { uiMode: m, palette: pal || 'nuit', log: l, current: c, phase: 'play', screen: 'race', scored: false, awaitTurn: null });
    localStorage.setItem(key, JSON.stringify(s));
  }, [STORAGE_KEY, mode, palette, log, current]);

  // Une partie à deux, règles complètes
  await page.fill('.name-input[data-index="0"]', 'Léo');
  await page.fill('.name-input[data-index="1"]', 'Papa');
  await page.click('[data-rules="full"]');
  await page.click('#btn-start');
  await page.waitForSelector('#countdown', { state: 'hidden', timeout: 8000 });

  {
    const [mode, palette] = variant.split('/');
    const label = variant;
    // Léo attend son feu vert (le cas du bug signalé) ; Papa est presque arrivé
    const log = [{ player: 1, card: 'green' }, ...[200, 200, 100, 100, 100, 100, 100].map((km) => ({ player: 1, km })),
      { player: 1, card: 'limit', target: 0 }, { player: 0, card: 'ace' }];
    await seed(mode, palette, log, 0);
    await page.goto(page.url().replace(/#.*/, ''));
    await page.waitForSelector('#screen-race:not([hidden])');
    await check(`${label} course`, 'main');
    await check(`${label} barre du haut`, '.topbar');
    await page.click('#btn-rules');
    await check(`${label} règles`, '#rules');
    await page.click('#btn-rules-close');
    await page.click('#btn-ask');
    await page.click('#ask-grid .card[data-km="100"]');
    await check(`${label} puis-je jouer`, '#ask');
    await page.click('#btn-ask-close');
    // Papa termine : écran d'arrivée
    await seed(mode, palette, log, 1);
    await page.reload();
    if (await page.isVisible('.card-tab[data-tab="km"]')) await page.click('.card-tab[data-tab="km"]');
    await page.click('#cards .card[data-km="100"]');
    await page.waitForSelector('#screen-win:not([hidden])', { timeout: 6000 });
    await check(`${label} arrivée`, '#screen-win');
    // Écran de départ
    await page.click('#btn-new');
    await check(`${label} départ`, '#screen-setup');
    await page.click('#btn-start');
    await page.waitForSelector('#countdown', { state: 'hidden', timeout: 8000 });
  }
  assert.deepEqual(problems, [], `textes peu lisibles :\n${problems.join('\n')}`);
};
module.exports.variants = VARIANTS;
