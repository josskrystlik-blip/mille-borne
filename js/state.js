'use strict';

/* ---------- État ---------- */

function defaultState() {
  return {
    screen: 'setup',
    count: 2,
    goal: 1000,
    setup: DEFAULT_NAMES.map((name, i) => ({ name: '', color: COLORS[i].id })),
    players: [],
    current: 0,
    phase: 'draw', // 'draw' : le pilote doit piocher, 'play' : il pose sa carte
    log: [],
    muted: false,
    voice: '',
    music: false,         // petite musique de course
    commentator: true,    // le commentateur de course
    uiMode: 'child',  // 'child' : écran simplifié ; 'family' : tout, look course ; 'adult' : tout, look sobre
    camera: 'tv',     // affichage Adulte : '2d' ou une caméra 3D ('tv', 'dessus', 'virage')
    rules: 'full', // 'full' : attaques, parades et bottes ; 'km' : seulement les kilomètres
    layout: { order: [...WIDGETS], collapsed: {} },
    manches: [],      // points de chaque manche jouée : [[points du pilote 0, 1, …], …]
    scored: false,    // la manche en cours est-elle déjà comptée ?
    delayed: false,   // retardement : le gagnant est arrivé après que la pioche s'est vidée
  };
}

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.setup)) {
      if (saved.uiMode === 'parent') saved.uiMode = 'family'; // ancien nom du mode complet
      return Object.assign(defaultState(), saved);
    }
  } catch (e) { /* stockage indisponible */ }
  return defaultState();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ }
}

/* ---------- Utilitaires ---------- */

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function colorHex(id) {
  return (COLORS.find((c) => c.id === id) || COLORS[0]).hex;
}
