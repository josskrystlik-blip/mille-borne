'use strict';
// Mode Enfant (par défaut) : écran simplifié ; appui long pour passer en mode Parent.
const { assert, startGame, stateOf, noHorizontalScroll } = require('./helpers');

module.exports = async function child(page) {
  await startGame(page, { names: ['Léo', 'Papa'], rules: 'full', mode: 'child' });
  assert.equal((await stateOf(page)).uiMode, 'child');
  for (const sel of ['#btn-mode', '#btn-play', '#btn-ask', '.widget[data-widget="track"]', '.widget[data-widget="table"]', '.widget[data-widget="board"]']) {
    assert.ok(await page.isVisible(sel), `${sel} visible en mode Enfant`);
  }
  for (const sel of ['#btn-listen', '#btn-end', '#btn-home', '#btn-scan', '.widget[data-widget="log"]', '.widget-btn', '.widget-grip']) {
    assert.ok(await page.isHidden(sel), `${sel} masqué en mode Enfant`);
  }
  await noHorizontalScroll(page);

  // Un simple appui ne suffit pas
  await page.click('#btn-mode');
  assert.equal((await stateOf(page)).uiMode, 'child');
  assert.match(await page.textContent('#toast-text'), /appuyé/);

  // Appui long d'une seconde → mode Parent
  const box = await page.locator('#btn-mode').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  assert.equal((await stateOf(page)).uiMode, 'parent');
  for (const sel of ['#btn-listen', '#btn-end', '#btn-home', '#btn-scan', '.widget[data-widget="log"]']) {
    assert.ok(await page.isVisible(sel), `${sel} visible en mode Parent`);
  }

  // Le mode est mémorisé
  await page.reload();
  assert.ok(await page.isVisible('#btn-listen'));

  // Retour au mode Enfant d'un simple appui
  await page.click('#btn-mode');
  assert.equal((await stateOf(page)).uiMode, 'child');
  assert.ok(await page.isHidden('#btn-listen'));

  // Des cartes apprises : le bouton 📷 réapparaît en mode Enfant
  await page.evaluate(() => localStorage.setItem('mille-bornes-scan-v1', '{}'));
  await page.reload();
  assert.ok(await page.isVisible('#btn-scan'));

  // En mode Enfant, la barre des widgets ne déplace rien
  const before = await page.$$eval('#widgets > .widget', (w) => w.map((x) => x.dataset.widget));
  const bar = await page.locator('.widget[data-widget="board"] .widget-bar').boundingBox();
  await page.mouse.move(bar.x + 30, bar.y + 10);
  await page.mouse.down();
  await page.mouse.move(bar.x + 30, 5, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual(await page.$$eval('#widgets > .widget', (w) => w.map((x) => x.dataset.widget)), before);
};
