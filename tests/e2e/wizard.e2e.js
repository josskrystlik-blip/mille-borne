'use strict';
// Prise en main au premier lancement : étapes, choix appliqués, une seule fois, à revoir.
const { assert, stateOf } = require('./helpers');

module.exports = async function wizard(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.ok(await page.isVisible('#wizard'), 'la présentation s\'ouvre au premier lancement');
  assert.match(await page.textContent('#wizard-step'), /Étape 1 sur 6/);
  assert.ok(await page.isHidden('#btn-wizard-back'));

  await page.click('#btn-wizard-next');
  await page.click('[data-wizard-display="adult"]');
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-adult')), 'l\'affichage change tout de suite');
  await page.click('#btn-wizard-back');
  assert.match(await page.textContent('#wizard-step'), /Étape 1/);
  await page.click('#btn-wizard-next');
  await page.click('[data-wizard-display="family"]');
  await page.click('#btn-wizard-next');
  await page.click('[data-wizard-rules="discovery"]');
  assert.equal((await stateOf(page)).rules, 'discovery');
  for (let k = 0; k < 3; k++) await page.click('#btn-wizard-next');
  assert.equal(await page.textContent('#btn-wizard-next'), 'Commencer ▶');
  assert.ok(await page.isHidden('#btn-wizard-skip'));
  await page.click('#btn-wizard-next');
  assert.ok(await page.isHidden('#wizard'));
  assert.match(await page.getAttribute('[data-rules="discovery"]', 'class'), /active/, 'le choix se retrouve sur l\'écran de départ');

  // Une seule fois…
  await page.reload();
  assert.ok(await page.isHidden('#wizard'));
  const s = await stateOf(page);
  assert.equal(s.onboarded, true);
  assert.equal(s.uiMode, 'family');

  // … mais on peut la revoir
  await page.click('#btn-wizard-again');
  assert.ok(await page.isVisible('#wizard'));
  await page.click('#btn-wizard-skip');
  assert.ok(await page.isHidden('#wizard'));
};
