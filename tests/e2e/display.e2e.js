'use strict';
// Affichage Adulte : choisi au départ, look sobre sur tous les écrans, changeable en course.
const { assert, startGame, stateOf, playKm, setState, noHorizontalScroll } = require('./helpers');

module.exports = async function display(page) {
  // Choix sur l'écran de départ : le thème s'applique tout de suite
  await page.click('[data-display="adult"]');
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-adult')));
  assert.ok(await page.isHidden('.scenery'), 'pas de décor de désert');
  await noHorizontalScroll(page);

  await startGame(page, { names: ['Anne', 'Marc'], rules: 'km', mode: 'adult' });
  assert.equal((await stateOf(page)).uiMode, 'adult');
  assert.ok(await page.evaluate(() => !document.body.classList.contains('mode-child')));
  for (const sel of ['#btn-listen', '#btn-end', '#btn-home', '.widget[data-widget="log"]', '.widget-btn >> nth=0']) {
    assert.ok(await page.isVisible(sel), `${sel} visible en mode Adulte`);
  }
  assert.equal(await page.textContent('#btn-mode'), '🎩');
  await noHorizontalScroll(page);

  // Mémorisé après rechargement
  await page.reload();
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-adult')));

  // Arrivée : le thème reste, sans confettis
  await setState(page, `s.log = [200, 200, 100, 100, 100, 100, 100].map((km) => ({ player: 0, km })); s.current = 0; s.phase = 'draw';`);
  await playKm(page, 100);
  await page.waitForSelector('#screen-win', { state: 'visible', timeout: 6000 });
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-adult')));
  assert.ok(await page.isHidden('#confetti'));
  await noHorizontalScroll(page);

  // Retour en course puis passage en Famille d'un simple appui
  await page.click('#btn-rematch');
  await page.waitForSelector('#countdown', { state: 'hidden', timeout: 8000 });
  await page.click('#btn-mode');
  await page.click('#dialog-buttons .display-btn:has-text("Famille")');
  assert.equal((await stateOf(page)).uiMode, 'family');
  assert.ok(await page.evaluate(() => !document.body.classList.contains('theme-adult')));
  assert.ok(await page.isVisible('.scenery'));
};
