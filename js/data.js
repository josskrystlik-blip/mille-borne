'use strict';

/* ---------- Données du jeu ---------- */

const COLORS = [
  { id: 'rouge',  hex: '#e10600', label: 'Rouge' },
  { id: 'bleu',   hex: '#1e6fe0', label: 'Bleu' },
  { id: 'jaune',  hex: '#ffc400', label: 'Jaune' },
  { id: 'vert',   hex: '#18a558', label: 'Vert' },
  { id: 'violet', hex: '#8a3ffc', label: 'Violet' },
  { id: 'orange', hex: '#ff7a00', label: 'Orange' },
];
const NUMBERS = [7, 12, 23, 31, 58, 86];
const DEFAULT_NAMES = ['Pilote 1', 'Pilote 2', 'Pilote 3', 'Pilote 4', 'Pilote 5', 'Pilote 6'];

// Les cartes « étape » du Mille Bornes, avec leur animal
// (couleurs du grand chiffre, comme sur les cartes du jeu)
const CARDS = [
  { km: 25,  emoji: '🐌', name: 'Escargot',   color: '#1aa3d9' },
  { km: 50,  emoji: '🦆', name: 'Canard',     color: '#e3262b' },
  { km: 75,  emoji: '🦋', name: 'Papillon',   color: '#1a1a1a' },
  { km: 100, emoji: '🐇', name: 'Lièvre',     color: '#1aa3d9' },
  { km: 200, emoji: '🐦', name: 'Hirondelle', color: '#1f5fbf' },
];

// L'aide « comment finir » n'apparaît qu'à partir de 200 km de l'arrivée
const HELP_FROM = 200;
const HELP_MAX_CARDS = 4;
const HELP_MAX_COMBOS = 6;

const WIDGETS = ['play', 'track', 'table', 'board', 'log'];

// Les autres cartes du Mille Bornes : attaques (rouges), parades (vertes), bottes (bleues)
const ACTIONS = {
  red: { kind: 'hazard', name: 'Feu rouge', fix: 'green', safety: 'priority' },
  limit: { kind: 'hazard', name: 'Limitation de vitesse', fix: 'end', safety: 'priority' },
  fuel: { kind: 'hazard', name: 'Panne d\'essence', emoji: '⛽', fix: 'gas', safety: 'tank' },
  flat: { kind: 'hazard', name: 'Crevaison', emoji: '🛞', fix: 'spare', safety: 'puncture' },
  accident: { kind: 'hazard', name: 'Accident', emoji: '💥', fix: 'repair', safety: 'ace' },
  green: { kind: 'remedy', name: 'Feu vert', cures: 'red' },
  end: { kind: 'remedy', name: 'Fin de limitation', cures: 'limit' },
  gas: { kind: 'remedy', name: 'Essence', emoji: '⛽', cures: 'fuel' },
  spare: { kind: 'remedy', name: 'Roue de secours', emoji: '🛞', cures: 'flat' },
  repair: { kind: 'remedy', name: 'Réparations', emoji: '🔧', cures: 'accident' },
  priority: { kind: 'safety', name: 'Véhicule prioritaire', emoji: '🚒', protects: ['red', 'limit'] },
  tank: { kind: 'safety', name: 'Citerne d\'essence', emoji: '🛢️', protects: ['fuel'] },
  puncture: { kind: 'safety', name: 'Increvable', emoji: '🛡️', protects: ['flat'] },
  ace: { kind: 'safety', name: 'As du volant', emoji: '🏎️', protects: ['accident'] },
};
const KINDS = {
  km: { label: '🛣️ Km', title: 'Kilomètres', color: '#e0451b' },
  hazard: { label: '⚔️ Attaquer', title: 'Attaques', color: '#e3262b', corner: 'ATTAQUE' },
  remedy: { label: '🔧 Réparer', title: 'Parades', color: '#5aa51f', corner: 'PARADE' },
  safety: { label: '⭐ Bottes', title: 'Bottes', color: '#2ea836', corner: 'BOTTE' },
};
const actionsOf = (kind) => Object.keys(ACTIONS).filter((id) => ACTIONS[id].kind === kind);

const STORAGE_KEY = 'mille-bornes-turbo-v1';
