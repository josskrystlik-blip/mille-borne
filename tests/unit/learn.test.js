'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, plain } = require('./load');

const g = loadGame();

// Petit générateur pseudo-aléatoire reproductible
const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const contexts = [
  { km: 50, before: 250, after: 300, goal: 1000, current: 0, players: [{ name: 'Léo', km: 300 }, { name: 'Papa', km: 100 }, { name: 'Maman', km: 200 }] },
  { km: 200, before: 600, after: 800, goal: 1000, current: 1, players: [{ name: 'Léo', km: 300 }, { name: 'Papa', km: 800 }] },
  { km: 25, before: 0, after: 25, goal: 700, current: 0, players: [{ name: 'Léo', km: 25 }, { name: 'Papa', km: 25 }] },
];

test('chaque défi a une seule bonne réponse parmi des choix différents', () => {
  for (const level of [1, 2, 3]) {
    for (const ctx of contexts) {
      for (let seed = 1; seed < 60; seed++) {
        const ch = plain(g.makeChallenge(level, ctx, seeded(seed)));
        assert.ok(ch.choices.length >= 2 && ch.choices.length <= 3, `${ch.type} : ${ch.choices.length} choix`);
        const values = ch.choices.map((c) => c.value);
        assert.equal(new Set(values).size, values.length, `${ch.type} : choix en double ${values}`);
        assert.ok(ch.answer >= 0 && ch.answer < ch.choices.length, `${ch.type} : pas de bonne réponse`);
        assert.ok(ch.text && ch.say && ch.explain);
      }
    }
  }
});

test('les bonnes réponses sont justes', () => {
  const ctx = contexts[0];
  const seen = new Set();
  for (let seed = 1; seed < 200; seed++) {
    const ch = plain(g.makeChallenge(1, ctx, seeded(seed)));
    const right = ch.choices[ch.answer].value;
    seen.add(ch.type);
    if (ch.type === 'ahead') assert.equal(right, 0, 'Léo est devant');
    if (ch.type === 'bornes') assert.equal(right, 3);
    if (ch.type === 'blocks') assert.equal(right, 2, '50 = 2 blocs de 25');
    if (ch.type === 'bigCard') assert.equal(right, Math.max(...ch.choices.map((c) => c.value)));
  }
  assert.deepEqual([...seen].sort(), ['ahead', 'bigCard', 'blocks', 'bornes']);
  const add = plain(g.makeChallenge(2, ctx, () => 0.99));
  if (add.type === 'add') assert.equal(add.choices[add.answer].value, 300);
  const left = plain(g.makeChallenge(3, contexts[1], () => 0));
  assert.equal(left.type, 'left');
  assert.equal(left.choices[left.answer].value, 200);
});

test('pas de « qui est devant ? » en cas d\'égalité', () => {
  for (let seed = 1; seed < 80; seed++) {
    assert.notEqual(g.makeChallenge(1, contexts[2], seeded(seed)).type, 'ahead');
  }
});

test('le niveau monte et descend tout seul', () => {
  let learn = { level: 1, history: [] };
  [true, true, true, false, true, true].forEach((ok) => { learn = g.nextLevel(learn, ok); });
  assert.equal(learn.level, 2);
  [false, false, false].forEach((ok) => { learn = g.nextLevel(learn, ok); });
  assert.equal(learn.level, 1);
  [false, false, false].forEach((ok) => { learn = g.nextLevel(learn, ok); });
  assert.equal(learn.level, 1, 'jamais en dessous du niveau 1');
});

test('environ un tour sur deux, jamais deux fois de suite sans défi', () => {
  assert.equal(g.shouldChallenge({ skipped: 1 }, () => 0.99), true);
  assert.equal(g.shouldChallenge({ skipped: 0 }, () => 0.99), false);
  assert.equal(g.shouldChallenge({ skipped: 0 }, () => 0.1), true);
});

test('réponses dites à voix haute', () => {
  assert.equal(g.heardNumber('trois'), 3);
  assert.equal(g.heardNumber('deux cent cinquante'), 250);
  assert.equal(g.heardNumber('c\'est 300'), 300);
  assert.equal(g.heardNumber('mille'), 1000);
  assert.equal(g.heardNumber('je sais pas'), null);
  const ch = { choices: [{ kind: 'player', value: 1, label: 'Papa' }, { kind: 'player', value: 0, label: 'Léo' }] };
  assert.equal(g.heardChoice(ch, 'c\'est Léo'), 1);
  const nums = { choices: [2, 3, 4].map((v) => ({ kind: 'number', value: v, label: String(v) })) };
  assert.equal(g.heardChoice(nums, 'quatre'), 2);
});
