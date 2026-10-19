'use strict';
// Scanner caméra (modèle simulé) : apprentissage puis reconnaissance d'une carte.
const { assert, startGame, stateOf, playCard } = require('./helpers');

module.exports = async function scan(page) {
  await startGame(page, { names: ['Léo', 'Papa'], rules: 'full' });
  await page.click('#btn-scan');
  await page.waitForTimeout(600);
  assert.ok(await page.isVisible('.scan-tile[data-label="green"]'), 'rien d\'appris : on commence par l\'apprentissage');
  await page.click('.scan-tile[data-label="green"]');
  await page.click('.scan-tile[data-label="green"]');
  await page.click('.scan-tile[data-label="none"]');
  assert.deepEqual(await page.evaluate(() => window.__added), ['green', 'green', 'none']);

  await page.click('.scan-tab[data-mode="play"]');
  await page.evaluate(() => { window.__guess = { label: 'green', confidence: 0.93 }; });
  await page.waitForSelector('#btn-scan-yes', { state: 'visible', timeout: 5000 });
  await page.click('#btn-scan-yes');
  await page.waitForTimeout(800);
  const s = await stateOf(page);
  assert.equal(s.players[0].battle, 'green');
  assert.equal(s.log[0].source, 'camera');
  assert.ok(await page.isHidden('#scan'));
  void playCard;
};
