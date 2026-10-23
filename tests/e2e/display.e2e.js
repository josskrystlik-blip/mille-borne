'use strict';
// Affichage Adulte : choisi au départ, look sobre sur tous les écrans, changeable en course.
const { assert, startGame, stateOf, playKm, setState, noHorizontalScroll } = require('./helpers');

module.exports = async function display(page) {
  // Choix sur l'écran de départ : le thème s'applique tout de suite
  await page.click('[data-display="adult"]');
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-adult')));
  assert.ok(await page.isHidden('.scenery'), 'pas de décor de désert');
  await noHorizontalScroll(page);

  // Palette au choix (visible seulement en Adulte)
  assert.ok(await page.isVisible('#palette-buttons'));
  await page.click('#palette-buttons [data-palette="clair"]');
  assert.equal(await page.evaluate(() => document.body.dataset.palette), 'clair');
  assert.equal(await page.getAttribute('#palette-buttons [data-palette="clair"]', 'aria-pressed'), 'true');

  await startGame(page, { names: ['Anne', 'Marc'], rules: 'km', mode: 'adult' });
  assert.equal((await stateOf(page)).uiMode, 'adult');
  assert.ok(await page.evaluate(() => !document.body.classList.contains('mode-child')));
  for (const sel of ['#btn-listen', '#btn-end', '#btn-home', '.widget[data-widget="log"]', '.widget-btn >> nth=0']) {
    assert.ok(await page.isVisible(sel), `${sel} visible en mode Adulte`);
  }
  assert.equal(await page.textContent('#btn-mode'), '🎩');
  await noHorizontalScroll(page);

  // Circuit en 3D : voitures vues de dessus et caméras
  const has = (cls) => page.evaluate((c) => document.body.classList.contains(c), cls);
  assert.ok(await has('cam-3d'), 'le circuit est en 3D par défaut');
  assert.equal(await page.locator('.car3d').count(), 2);
  assert.equal(await page.locator('.tag3d').count(), 2);
  await page.click('.cam-btn[data-cam="dessus"]');
  assert.equal(await page.evaluate(() => document.querySelector('#road').style.getPropertyValue('--tilt')), '22deg');
  assert.equal(await page.getAttribute('.cam-btn[data-cam="dessus"]', 'aria-pressed'), 'true');
  await page.click('.cam-btn[data-cam="2d"]');
  assert.ok(!(await has('cam-3d')));
  assert.equal(await page.locator('.car3d').count(), 0);
  assert.ok(await page.isVisible('.track-svg .car[data-index="0"]'));
  await page.click('.cam-btn[data-cam="tv"]');
  assert.ok(await has('cam-3d'));
  assert.equal((await stateOf(page)).camera, 'tv');
  await page.click('.car3d[data-index="1"]', { force: true });
  await noHorizontalScroll(page);

  // Mémorisé après rechargement
  await page.reload();
  assert.ok(await page.evaluate(() => document.body.classList.contains('theme-adult')));
  assert.equal(await page.evaluate(() => document.body.dataset.palette), 'clair');

  // Changement de palette pendant la course, depuis le menu Affichage
  await page.click('#btn-mode');
  await page.click('[data-dialog-palette="circuit"]');
  assert.equal(await page.evaluate(() => document.body.dataset.palette), 'circuit');
  assert.ok(await page.isVisible('#dialog'), 'le menu reste ouvert pour comparer');
  await page.click('#dialog-buttons .display-btn:has-text("Adulte")');
  assert.equal((await stateOf(page)).palette, 'circuit');

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
  assert.ok(!(await page.evaluate(() => document.body.classList.contains('cam-3d'))), 'la 3D est réservée à l\'affichage Adulte');
  assert.ok(await page.isHidden('#cam-buttons'));
};
