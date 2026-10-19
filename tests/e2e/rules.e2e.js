'use strict';
// Règles complètes : feu vert, attaque, coup fourré, « Puis-je jouer cette carte ? », cartes posées.
const { assert, startGame, stateOf, turnName, playCard, playKm } = require('./helpers');

module.exports = async function rules(page) {
  await startGame(page, { names: ['Léo', 'Papa'], rules: 'full' });

  // Sans feu vert, la carte km est refusée
  await page.click('#btn-ask');
  await page.click('#ask-grid .card[data-km="100"]');
  assert.match(await page.textContent('#ask-verdict'), /Pas maintenant/);
  await page.click('#ask-grid .card[data-card="green"]');
  assert.match(await page.textContent('#ask-verdict'), /Oui/);
  await page.click('#btn-ask-play');
  await page.waitForTimeout(1300);
  assert.equal(await turnName(page), 'Papa');

  await playCard(page, 'green', 'remedy');
  await page.waitForTimeout(1300);
  await playKm(page, 100);

  // Papa attaque Léo : accident, pas de coup fourré
  await attack(page, 'accident');
  await page.click('#dialog-buttons .big-btn:nth-child(2)');
  await page.waitForTimeout(800);
  let s = await stateOf(page);
  assert.equal(s.players[0].battle, 'accident');
  assert.equal(await turnName(page), 'Léo');

  // La vue « Cartes posées » montre l'accident chez Léo
  assert.match(await page.innerHTML('#table'), /accident|Accident/);

  // Léo ne peut pas rouler, il répare
  await page.click('#btn-ask');
  await page.click('#ask-grid .card[data-km="100"]');
  assert.match(await page.textContent('#ask-verdict'), /Pas maintenant/);
  await page.click('#btn-ask-close');
  await playCard(page, 'repair', 'remedy');
  await page.waitForTimeout(1300);
  assert.equal((await stateOf(page)).players[0].battle, 'fixed');
  await playKm(page, 50);                       // Papa
  await playCard(page, 'green', 'remedy');      // Léo repart
  await page.waitForTimeout(1300);

  // Papa attaque encore : Léo répond « Coup fourré ! »
  await attack(page, 'flat');
  await page.click('#dialog-buttons .big-btn:nth-child(1)');
  await page.waitForTimeout(800);
  s = await stateOf(page);
  assert.equal(s.players[0].battle, 'green', 'le coup fourré annule l\'attaque');
  assert.deepEqual(s.players[0].safetyCards, [{ card: 'puncture', cf: true }]);
  assert.equal(await turnName(page), 'Léo', 'après un coup fourré, c\'est à lui de jouer');
};

async function attack(page, id) {
  await playCard(page, id, 'hazard');
  await page.waitForTimeout(300);
  if (await page.isVisible('#dialog-buttons .target-btn')) await page.click('#dialog-buttons .target-btn:not([disabled])');
  await page.waitForSelector('#dialog-title:has-text("Coup fourré")', { timeout: 4000 });
}
