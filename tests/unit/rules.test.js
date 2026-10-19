'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, km, card, attack, plain } = require('./load');

const g = loadGame();

test('il faut un feu vert pour rouler (règles complètes)', () => {
  g.newGame();
  assert.equal(g.canPlay(0, 100).ok, false);
  assert.equal(g.canPlay(0, 'green').ok, true);
  g.newGame({ log: [card(0, 'green')] });
  assert.equal(g.rolling(g.state.players[0]), true);
  assert.equal(g.canPlay(0, 100).ok, true);
  assert.equal(g.canPlay(0, 'green').ok, false, 'déjà au vert');
});

test('règles « seulement les km » : on roule tout de suite', () => {
  g.newGame({ rules: 'km' });
  assert.equal(g.canPlay(0, 200).ok, true);
});

test('les km s\'additionnent et il faut arriver pile', () => {
  const s = g.newGame({ log: [card(0, 'green'), km(0, 200), ...Array(7).fill(0).map(() => km(0, 100))] });
  assert.equal(s.players[0].km, 900);
  assert.equal(s.players[0].n200, 1);
  assert.equal(g.canPlay(0, 100).ok, true);
  assert.equal(g.canPlay(0, 200).ok, false);
  assert.match(g.canPlay(0, 200).reason, /pile/);
});

test('deux cartes 200 au maximum (sauf mode Découverte)', () => {
  const log = [card(0, 'green'), km(0, 200), km(0, 200)];
  g.newGame({ log });
  assert.equal(g.canPlay(0, 200).ok, false);
  g.newGame({ rules: 'discovery', log });
  assert.equal(g.canPlay(0, 200).ok, true);
});

test('limitation de vitesse : 25 et 50 seulement, levée par Fin de limitation', () => {
  const s = g.newGame({ log: [card(0, 'green'), card(1, 'green'), attack(1, 'limit', 0)] });
  assert.equal(s.players[0].limited, true);
  assert.equal(g.canPlay(0, 50).ok, true);
  assert.equal(g.canPlay(0, 75).ok, false);
  assert.equal(g.canPlay(0, 'end').ok, true);
  g.newGame({ log: [...s.log, card(0, 'end')] });
  assert.equal(g.state.players[0].limited, false);
  assert.equal(g.canPlay(0, 100).ok, true);
});

test('attaque puis parade puis feu vert', () => {
  let s = g.newGame({ log: [card(0, 'green'), card(1, 'green'), attack(1, 'flat', 0)] });
  assert.equal(s.players[0].battle, 'flat');
  assert.equal(g.rolling(s.players[0]), false);
  assert.equal(g.canPlay(0, 'repair').ok, false, 'mauvaise parade');
  assert.equal(g.canPlay(0, 'green').ok, false, 'il faut d\'abord réparer');
  assert.equal(g.canPlay(0, 'spare').ok, true);
  s = g.newGame({ log: [...s.log, card(0, 'spare')] });
  assert.equal(s.players[0].battle, 'fixed');
  assert.equal(g.rolling(s.players[0]), false);
  s = g.newGame({ log: [...s.log, card(0, 'green')] });
  assert.equal(g.rolling(s.players[0]), true);
});

test('mode Découverte : réparé = on repart sans feu vert', () => {
  const s = g.newGame({ rules: 'discovery', log: [card(0, 'green'), card(1, 'green'), attack(1, 'fuel', 0), card(0, 'gas')] });
  assert.equal(g.rolling(s.players[0]), true);
});

test('cibles d\'attaque : seulement les pilotes qui roulent et non protégés', () => {
  g.newGame({ names: ['A', 'B', 'C'], log: [card(0, 'green'), card(1, 'green')] });
  assert.deepEqual(plain(g.attackTargets(0, 'accident')), [1]);
  assert.deepEqual(plain(g.attackTargets(0, 'limit')), [1, 2], 'la limitation se pose même à l\'arrêt');
  g.newGame({ names: ['A', 'B', 'C'], log: [card(0, 'green'), card(1, 'green'), card(1, 'ace')] });
  assert.deepEqual(plain(g.attackTargets(0, 'accident')), []);
  assert.equal(g.canPlay(0, 'accident').ok, false);
});

test('botte : protège, et le Véhicule prioritaire dispense du feu vert', () => {
  const s = g.newGame({ log: [card(0, 'priority')] });
  assert.equal(g.rolling(s.players[0]), true);
  assert.equal(g.canPlay(0, 'priority').ok, false, 'déjà posée');
  assert.equal(g.canPlay(0, 'green').ok, false);
});

test('coup fourré : l\'attaque est annulée et retirée de la pile', () => {
  const s = g.newGame({ log: [card(0, 'green'), card(1, 'green'), attack(1, 'accident', 0), card(0, 'ace', { cf: true })] });
  const p = s.players[0];
  assert.equal(p.battle, 'green');
  assert.equal(g.rolling(p), true);
  assert.deepEqual(plain(p.battlePile.map((c) => c.card)), ['green']);
  assert.deepEqual(plain(p.safetyCards), [{ card: 'ace', cf: true }]);
});

test('botte posée sans coup fourré : réparé mais feu vert nécessaire', () => {
  const s = g.newGame({ log: [card(0, 'green'), card(1, 'green'), attack(1, 'accident', 0), card(0, 'ace')] });
  assert.equal(s.players[0].battle, 'fixed');
  assert.equal(g.rolling(s.players[0]), false);
});

test('combinaisons pour finir : les plus courtes d\'abord', () => {
  const c = plain(g.combos(150));
  assert.deepEqual(c[0], [100, 50]);
  c.forEach((hand) => assert.equal(hand.reduce((a, b) => a + b, 0), 150));
  assert.ok(c.length <= g.HELP_MAX_COMBOS);
  assert.deepEqual(plain(g.combos(25)), [[25]]);
  assert.deepEqual(plain(g.combos(0)), [[]]);
});

test('une seule botte de chaque dans le jeu', () => {
  g.newGame({ log: [card(0, 'ace')] });
  assert.equal(g.canPlay(0, 'ace').ok, false);
  const other = g.canPlay(1, 'ace');
  assert.equal(other.ok, false);
  assert.match(other.reason, /qu'une carte As du volant.*Léo/);
  assert.equal(g.canPlay(1, 'tank').ok, true, 'les autres bottes restent libres');
  const s = g.newGame({ log: [card(0, 'ace'), card(1, 'ace')] });
  assert.deepEqual(plain(s.players[1].safeties), [], 'un doublon dans l\'historique est ignoré');
});
