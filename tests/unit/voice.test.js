'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, plain } = require('./load');

const g = loadGame();
const NAMES = ['Léo', 'Papa', 'Maman'];
const heard = (text, current = 0) => plain(g.parseHeard(text, NAMES, current));

test('kilomètres dits à voix haute', () => {
  assert.deepEqual(heard('Léo pose 50'), [{ km: 50, player: 0 }]);
  assert.deepEqual(heard('Papa met cent', 0), [{ km: 100, player: 1 }]);
  assert.deepEqual(heard('deux cents pour Maman'), [{ km: 200, player: 2 }]);
});

test('sans prénom : c\'est le pilote dont c\'est le tour', () => {
  assert.deepEqual(heard('je mets 75', 1), [{ km: 75, player: 1 }]);
});

test('parades et bottes', () => {
  assert.deepEqual(heard('Léo pose un feu vert'), [{ card: 'green', player: 0 }]);
  assert.equal(heard('je mets la roue de secours', 2)[0].card, 'spare');
  assert.equal(heard('Maman pose l\'as du volant')[0].card, 'ace');
  assert.equal(heard('citerne d\'essence', 1)[0].card, 'tank');
});

test('attaques avec une cible', () => {
  assert.deepEqual(heard('Maman met un feu rouge à Léo')[0], { card: 'red', player: 2, target: 0 });
  assert.deepEqual(heard('limitation à 50 pour Papa')[0], { card: 'limit', player: 0, target: 1 });
  // Cible pas comprise : le jeu demandera ensuite « sur qui ? »
  assert.deepEqual(heard('Papa me met un feu rouge', 0)[0], { card: 'red', player: 1 });
});

test('les phrases sans rapport sont ignorées', () => {
  assert.deepEqual(heard('il fait beau'), []);
});
