'use strict';
// Écoute vocale simulée : km, parades, attaques avec dialogue, correction dans l'historique.
const { assert, startGame, stateOf, turnName } = require('./helpers');

module.exports = async function voice(page) {
  await startGame(page, { names: ['Léo', 'Papa', 'Maman'], rules: 'full' });
  const hear = async (text, ms = 1600) => { await page.evaluate((t) => window.__hear(t), text); await page.waitForTimeout(ms); };

  // La première fois, le jeu explique où part le son avant d'écouter
  await page.click('#btn-listen');
  assert.match(await page.textContent('#dialog-body'), /reconnaissance vocale/);
  await page.click('#dialog-buttons .big-btn:has-text("Activer")');
  assert.ok(await page.isVisible('#listen-dot'), 'le voyant 🎤 s\'allume dans la barre du haut');
  await hear('Léo pose un feu vert');
  await hear('Papa met un feu vert');
  await hear('Maman pose un feu vert');
  await hear('Léo pose 75');
  let s = await stateOf(page);
  assert.deepEqual(s.players.map((p) => p.battle), ['green', 'green', 'green']);
  assert.equal(s.players[0].km, 75);
  assert.equal(await turnName(page), 'Papa');

  // Attaque : le jeu demande s'il y a coup fourré, on répond « non » à voix haute
  await hear('Papa met un feu rouge à Maman', 1800);
  assert.match(await page.textContent('#dialog-title'), /Coup fourré/);
  await hear('non', 900);
  s = await stateOf(page);
  assert.equal(s.players[2].battle, 'red');
  assert.equal(await turnName(page), 'Maman');

  // Carte impossible : refusée avec une explication
  await hear('Maman pose 100', 900);
  assert.equal((await stateOf(page)).players[2].km, 0);

  // L'historique garde la trace du micro et permet de corriger
  const rows = await page.$$eval('.log-row', (r) => r.map((x) => x.textContent));
  assert.ok(rows.some((t) => t.includes('🎤')), 'les coups entendus sont marqués 🎤');

  await page.click('#btn-listen');
  assert.ok(await page.isHidden('#listen-dot'));
};
