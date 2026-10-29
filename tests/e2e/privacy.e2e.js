'use strict';
// Partage public : mention « non officiel », pages À propos / Confidentialité, tout effacer.
const { assert, startGame, stateOf, STORAGE_KEY } = require('./helpers');

module.exports = async function privacy(page) {
  assert.equal(await page.title(), 'Bornes Turbo');
  assert.match(await page.textContent('.legal-note'), /non officiel/);

  // Des données : une partie, une carte apprise par la caméra
  await startGame(page, { names: ['Léo', 'Papa'], rules: 'km' });
  await page.evaluate(() => localStorage.setItem('mille-bornes-scan-v1', '{}'));
  await page.click('#btn-home');
  assert.ok(await page.isVisible('#screen-setup'));
  assert.equal((await stateOf(page)).setup[0].name, 'Léo');

  // Tout effacer : on confirme, tout disparaît et la prise en main revient
  await page.click('#btn-wipe');
  assert.match(await page.textContent('#dialog-title'), /Effacer/);
  await page.click('#dialog-buttons .big-btn:has-text("Annuler")');
  assert.ok(await page.evaluate((k) => !!localStorage.getItem(k), STORAGE_KEY), 'annuler ne supprime rien');
  await page.click('#btn-wipe');
  await Promise.all([page.waitForEvent('load'), page.click('#dialog-buttons .big-btn:has-text("tout effacer")')]);
  assert.equal(await page.evaluate(() => localStorage.getItem('mille-bornes-scan-v1')), null);
  assert.ok(await page.isVisible('#wizard'), 'comme au premier lancement');
  await page.click('#btn-wizard-skip');
  assert.equal(await page.inputValue('.name-input[data-index="0"]'), '');

  // Les pages d'information
  await page.click('.legal-note a[href="confidentialite.html"]');
  assert.match(await page.textContent('body'), /Google pour Chrome/);
  await page.click('a[href="a-propos.html"]');
  assert.match(await page.textContent('h1'), /Bornes Turbo/);
  assert.match(await page.textContent('body'), /non officiel/);
};
