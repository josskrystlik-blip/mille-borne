'use strict';
// Charge la logique pure du jeu (js/data.js + js/rules.js) dans un bac à sable Node,
// sans navigateur : ces fichiers n'utilisent pas le DOM.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

function loadGame() {
  const ctx = vm.createContext({ console });
  vm.runInContext('let state = null;', ctx);
  ['js/data.js', 'js/rules.js'].forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  // Petit utilitaire : nouvelle partie avec des pilotes et un historique de coups
  vm.runInContext(`
    function newGame({ names = ['Léo', 'Papa'], rules = 'full', goal = 1000, log = [] } = {}) {
      state = {
        goal, rules, log, current: 0, manches: [], delayed: false,
        players: names.map((name, i) => ({ name, color: COLORS[i].id })),
      };
      recomputeKm();
      return state;
    }
  `, ctx);
  // Les fonctions sont visibles directement ; les constantes et « state » (let/const)
  // sont lues dans le bac à sable à la demande.
  return new Proxy(ctx, { get: (t, k) => (k in t ? t[k] : vm.runInContext(String(k), ctx)) });
}

// Raccourcis pour écrire l'historique : km(0, 100), card(1, 'green'), attack(0, 'red', 1)
const km = (player, value) => ({ player, km: value });
const card = (player, id, extra = {}) => ({ player, card: id, ...extra });
const attack = (player, id, target) => ({ player, card: id, target });

// Copie « normale » d'un objet du bac à sable (pour deepStrictEqual)
const plain = (x) => JSON.parse(JSON.stringify(x));

module.exports = { loadGame, km, card, attack, plain };
