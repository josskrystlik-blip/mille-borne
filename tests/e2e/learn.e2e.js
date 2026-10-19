'use strict';
// Apprendre en jouant : défis du pilote apprenti (hasard forcé pour que le défi tombe à coup sûr).
const { assert, startGame, stateOf, turnName, playKm } = require('./helpers');

module.exports = async function learn(page) {
  await page.evaluate(() => { Math.random = () => 0.1; });
  await page.click('.learner-btn[data-index="0"]');
  assert.equal(await page.getAttribute('.learner-btn[data-index="0"]', 'aria-pressed'), 'true');
  await startGame(page, { names: ['Léo', 'Papa'], rules: 'km' });
  await page.evaluate(() => { Math.random = () => 0.1; });
  assert.equal((await stateOf(page)).players[0].learner, true);

  // Léo pose 100 : défi « Qui est devant ? », le tour attend la réponse
  await playKm(page, 100);
  await page.waitForSelector('#dialog-title:has-text("petit défi")', { timeout: 4000 });
  assert.match(await page.textContent('#dialog-body'), /Qui est devant/);
  assert.equal(await page.locator('#dialog-buttons .answer-btn').count(), 2);
  assert.equal((await stateOf(page)).awaitTurn, 1, 'le tour est mis en attente');
  await page.click('#dialog-buttons .answer-btn:has-text("Léo")');
  await page.waitForTimeout(400);
  let s = await stateOf(page);
  assert.equal(s.stars[0], 1, 'une étoile gagnée');
  assert.equal(await turnName(page), 'Papa');
  assert.match(await page.textContent('#board'), /⭐1/);

  // Papa n'est pas apprenti : pas de défi
  await playKm(page, 50);
  assert.ok(await page.isHidden('#dialog'));
  assert.equal(await turnName(page), 'Léo');

  // Mauvaise réponse : la bonne s'allume, puis on continue
  await playKm(page, 50);
  await page.waitForSelector('#dialog-title:has-text("petit défi")', { timeout: 4000 });
  await page.click('#dialog-buttons .answer-btn:has-text("Papa")');
  await page.waitForSelector('#dialog-title:has-text("Presque")');
  assert.match(await page.textContent('.answer-btn.right'), /Léo/);
  await page.click('#dialog-buttons .big-btn:has-text("On continue")');
  s = await stateOf(page);
  assert.equal(s.stars[0], 1, 'pas d\'étoile pour une erreur');
  assert.equal(await turnName(page), 'Papa');

  // Réponse dite à voix haute
  await page.click('#btn-listen');
  await playKm(page, 25);
  await playKm(page, 25);
  await page.waitForSelector('#dialog-title:has-text("petit défi")', { timeout: 4000 });
  await page.waitForTimeout(800); // le micro se rallume après la question
  await page.evaluate(() => window.__hear('c\'est Léo'));
  await page.waitForTimeout(400);
  assert.equal((await stateOf(page)).stars[0], 2);

  // Rechargement pendant un défi : la partie reprend au pilote suivant
  await playKm(page, 25);           // Papa
  await playKm(page, 25);           // Léo → défi
  await page.waitForSelector('#dialog-title:has-text("petit défi")', { timeout: 4000 });
  await page.reload();
  assert.equal(await turnName(page), 'Papa');
  assert.ok(await page.isHidden('#dialog'));
};
