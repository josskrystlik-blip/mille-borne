'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, km, card, attack, plain } = require('./load');

const g = loadGame();
const total = (r) => r.total;

test('points : km, bottes, coup fourré, manche terminée, sans 200', () => {
  g.newGame({
    log: [
      card(0, 'green'), card(1, 'green'), card(0, 'tank'),
      attack(1, 'accident', 0), card(0, 'ace', { cf: true }),
      ...[100, 100, 100, 100, 100, 100, 100, 100, 100, 100].map((v) => km(0, v)),
      km(1, 200),
    ],
  });
  const r = g.scoreManche(0);
  // 1000 km + 2 bottes (200) + 1 coup fourré (300) + manche (400) + sans 200 (300)
  assert.equal(r[0].total, 2200);
  assert.equal(r[1].total, 200);
});

test('capot et retardement', () => {
  g.newGame({ log: [card(0, 'green'), km(0, 200), km(0, 200), ...Array(6).fill(0).map(() => km(0, 100))] });
  g.state.delayed = true;
  const r = g.scoreManche(0);
  // 1000 + manche 400 + capot 500 + retardement 300 (pas « sans 200 »)
  assert.equal(r[0].total, 2200);
  assert.ok(r[0].lines.some((l) => /Capot/.test(l.label)));
});

test('les 4 bottes rapportent 300 de plus', () => {
  g.newGame({ log: ['priority', 'tank', 'puncture', 'ace'].map((id) => card(0, id)) });
  assert.equal(g.scoreManche(-1)[0].total, 700);
});

test('mode « seulement les km » : pas de bonus de bottes ni de capot', () => {
  g.newGame({ rules: 'km', log: [km(0, 200), km(0, 200), ...Array(6).fill(0).map(() => km(0, 100))] });
  assert.deepEqual(plain(g.scoreManche(0).map(total)), [1400, 0]);
});

test('cumul des manches jusqu\'à 5000', () => {
  g.newGame();
  g.state.manches = [[3200, 1200], [300, 3500]];
  assert.deepEqual(plain(g.totals()), [3500, 4700]);
  assert.equal(g.GOAL_POINTS, 5000);
});
