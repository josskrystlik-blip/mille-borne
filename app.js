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
const CARDS = [
  { km: 25,  emoji: '🐌', name: 'Escargot',   color: '#2e9d4a' },
  { km: 50,  emoji: '🦆', name: 'Canard',     color: '#0b8a8a' },
  { km: 75,  emoji: '🦋', name: 'Papillon',   color: '#7b3fbf' },
  { km: 100, emoji: '🐇', name: 'Lièvre',     color: '#1d63c8' },
  { km: 200, emoji: '🐦', name: 'Hirondelle', color: '#e0451b' },
];

// L'aide « comment finir » n'apparaît qu'à partir de 200 km de l'arrivée
const HELP_FROM = 200;
const HELP_MAX_CARDS = 4;
const HELP_MAX_COMBOS = 6;

const WIDGETS = ['play', 'track', 'board', 'log'];

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
  hazard: { label: '⚔️ Attaquer', title: 'Attaques', color: '#d7141a', corner: 'ATTAQUE' },
  remedy: { label: '🔧 Réparer', title: 'Parades', color: '#1f9d48', corner: 'PARADE' },
  safety: { label: '⭐ Bottes', title: 'Bottes', color: '#1d63c8', corner: 'BOTTE' },
};
const actionsOf = (kind) => Object.keys(ACTIONS).filter((id) => ACTIONS[id].kind === kind);

const STORAGE_KEY = 'mille-bornes-turbo-v1';

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
    rules: 'full', // 'full' : attaques, parades et bottes ; 'km' : seulement les kilomètres
    layout: { order: [...WIDGETS], collapsed: {} },
  };
}

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.setup)) return Object.assign(defaultState(), saved);
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

// Voiture de course façon dessin animé, vue de profil, tournée vers la droite :
// carrosserie basse, gros aileron, slicks, numéro et éclair sur le flanc,
// et comme dans les dessins animés, des yeux dans le pare-brise et un sourire
function carSvg(color, number, cls = 'car-svg', attrs = '') {
  const blink = `${(number % 5) * 0.7}s`;
  const wheel = (x) => `
    <g class="wheel">
      <circle cx="${x}" cy="44" r="10.5" fill="#151515"/>
      <circle cx="${x}" cy="44" r="8.2" fill="none" stroke="#ffd31a" stroke-width="1.2" stroke-dasharray="4 3"/>
      <circle cx="${x}" cy="44" r="5.6" fill="var(--car)" stroke="#e6e6e6" stroke-width="1.6"/>
      <path d="M${x} 39.6 V41.6 M${x} 46.4 V48.4 M${x - 4.4} 44 H${x - 2.4} M${x + 2.4} 44 H${x + 4.4}" stroke="#e6e6e6" stroke-width="1.4"/>
      <circle cx="${x}" cy="44" r="1.8" fill="#e6e6e6"/>
    </g>`;
  return `
  <svg class="${cls}" viewBox="0 0 160 56" ${attrs} style="--car:${color}; --blink-delay:${blink}">
    <ellipse cx="80" cy="52.5" rx="74" ry="3.5" fill="rgba(0,0,0,.35)"/>
    <path d="M15 26 L12 11 M25 25 L22 11" stroke="#1a1a1a" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M1 7 L36 7 L33 14 L3 14 Z" fill="var(--car)" stroke="#1a1a1a" stroke-width="2" stroke-linejoin="round"/>
    <rect x="0" y="4" width="5" height="13" rx="1.5" fill="#1a1a1a"/>
    <path d="M6 42 L6 31 Q7 26 16 25 L52 22 Q62 10 86 9 Q104 9 114 21 L140 26 Q153 28 156 36 L157 42 Q157 46 152 46 L10 46 Q6 46 6 42 Z"
          fill="var(--car)" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M16 30 Q80 26 150 31" stroke="rgba(255,255,255,.5)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M24 45 L138 45" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M133 46 L159 46 L157 49.5 L136 49.5 Z" fill="#1a1a1a"/>
    <rect x="16" y="40" width="9" height="3.2" rx="1.6" fill="#9a9a9a" stroke="#1a1a1a" stroke-width=".8"/>
    <path d="M58 22 Q66 12 82 12 L82 22 Z" fill="#2b3f5c" stroke="#1a1a1a" stroke-width="1.8"/>
    <path d="M62 19 L67 14" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round"/>
    <path d="M86 12 Q104 12 112 22 L86 22 Z" fill="#fff" stroke="#1a1a1a" stroke-width="2"/>
    <g class="eyes">
      <ellipse cx="94" cy="17.4" rx="4.6" ry="4.9" fill="#fff"/>
      <ellipse cx="104.5" cy="18.4" rx="4" ry="4.4" fill="#fff"/>
      <circle cx="95.8" cy="17.8" r="3.1" fill="#3d7be0"/><circle cx="96.4" cy="17.8" r="1.6" fill="#111"/><circle cx="97.1" cy="16.7" r=".8" fill="#fff"/>
      <circle cx="106" cy="18.8" r="2.8" fill="#3d7be0"/><circle cx="106.6" cy="18.8" r="1.4" fill="#111"/><circle cx="107.2" cy="17.8" r=".7" fill="#fff"/>
      <g class="lids"><rect x="87" y="12.4" width="25" height="10.6" fill="var(--car)"/></g>
    </g>
    <path d="M14 34 L48 32 L42 37 L78 35 L30 45 L37 40 L12 41 Z" fill="#ffd31a" stroke="#c0392b" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="90" cy="34" r="9" fill="#fff" stroke="#1a1a1a" stroke-width="1.8"/>
    <text x="90" y="38.3" text-anchor="middle" font-family="'Russo One', Impact, sans-serif" font-size="11.5" fill="#1a1a1a">${number}</text>
    <rect x="103" y="29" width="23" height="7.5" rx="2" fill="#fff" stroke="#1a1a1a" stroke-width="1"/>
    <text x="114.5" y="34.9" text-anchor="middle" font-family="'Russo One', Impact, sans-serif" font-size="5.6" fill="#d7141a">TURBO</text>
    <path d="M124 30 L133 31.5 M123 33.5 L132 35" stroke="rgba(0,0,0,.35)" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M143 30 Q150 30 153.5 33.5 L145 34.5 Z" fill="#ffe35a" stroke="#1a1a1a" stroke-width="1.1"/>
    <path d="M140 39.5 Q147 43.5 154 38.5" stroke="#1a1a1a" stroke-width="1.8" fill="#fff" stroke-linecap="round"/>
    ${wheel(38)}${wheel(126)}
  </svg>`;
}

// Borne kilométrique française : corps blanc, tête rouge
function borneSvg(label, cap = '', cls = 'borne-svg', attrs = '') {
  const size = String(label).length >= 4 ? 10 : 12;
  return `
  <svg class="${cls}" viewBox="0 0 30 40" ${attrs}>
    <path d="M3 39 L3 15 Q3 3 15 3 Q27 3 27 15 L27 39 Z" fill="#fff" stroke="#222" stroke-width="2"/>
    <path d="M3 15 Q3 3 15 3 Q27 3 27 15 Z" fill="#d81e05" stroke="#222" stroke-width="2"/>
    ${cap ? `<text x="15" y="12.5" text-anchor="middle" font-family="Barlow, sans-serif" font-weight="700" font-size="7" fill="#fff">${cap}</text>` : ''}
    <text x="15" y="31" text-anchor="middle" font-family="'Russo One', sans-serif" font-size="${size}" fill="#111">${label}</text>
  </svg>`;
}

// Dessin d'une carte attaque / parade / botte
function actionIcon(id) {
  const light = (on) => `<svg class="act-svg" viewBox="0 0 26 52"><rect x="2" y="2" width="22" height="48" rx="7" fill="#222"/>
    <circle cx="13" cy="14" r="7" fill="${on === 'red' ? '#ff2a1a' : '#555'}"/><circle cx="13" cy="26" r="7" fill="#555"/>
    <circle cx="13" cy="38" r="7" fill="${on === 'green' ? '#2bd65a' : '#555'}"/></svg>`;
  if (id === 'red') return light('red');
  if (id === 'green') return light('green');
  if (id === 'limit') return `<svg class="act-svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="#d7141a" stroke-width="5"/>
    <text x="20" y="25.5" text-anchor="middle" font-family="'Russo One', sans-serif" font-size="15" fill="#111">50</text></svg>`;
  if (id === 'end') return `<svg class="act-svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="#888" stroke-width="3"/>
    <text x="20" y="25.5" text-anchor="middle" font-family="'Russo One', sans-serif" font-size="15" fill="#999">50</text>
    <path d="M9 31 L31 9 M12 34 L34 12 M6 28 L28 6" stroke="#111" stroke-width="2"/></svg>`;
  return `<span class="act-emoji">${ACTIONS[id].emoji}</span>`;
}

/* ---------- Sons (synthétisés, aucun fichier) ---------- */

let audioCtx = null;
function ctx() {
  if (state.muted) return null;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (e) { return null; }
}

function tone(freq, start, dur, type = 'square', vol = 0.12) {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime + start;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}

function vroom(power = 1) {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  const dur = 0.5 + power * 0.35;
  const o = ac.createOscillator(); const f = ac.createBiquadFilter(); const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(70, t);
  o.frequency.exponentialRampToValueAtTime(160 + power * 140, t + dur * 0.55);
  o.frequency.exponentialRampToValueAtTime(110, t + dur);
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(f).connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}

/* ---------- Voix (synthèse vocale du navigateur) ---------- */

// Les voix « naturelles » des navigateurs récents sont bien moins robotiques
const GOOD_VOICE = /natural|neural|online|premium|enhanced|google|am[eé]lie|audrey|aur[eé]lie|thomas|marie|denise|henri|eloise|vivienne|remy|siri/i;

function frenchVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'))
    .map((v) => ({ v, score: (GOOD_VOICE.test(v.name) ? 10 : 0) + (v.localService ? 0 : 3) + (/fr[-_]fr/i.test(v.lang) ? 2 : 0) }))
    .sort((x, y) => y.score - x.score);
}

function pickVoice() {
  const voices = frenchVoices();
  return (voices.find((x) => x.v.voiceURI === state.voice) || voices[0] || {}).v || null;
}

let sayId = 0;

function say(text) {
  if (state.muted || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 1;
    u.pitch = 1;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    // Le micro ne doit pas entendre le jeu parler (« plus que 200 kilomètres »…)
    const id = ++sayId;
    pauseListening();
    u.onend = u.onerror = () => { if (id === sayId) resumeListening(); };
    synth.speak(u);
  } catch (e) { /* pas de voix disponible */ }
}

function announceTurn(before = '') {
  const p = state.players[state.current];
  if (!p || state.screen !== 'race') return;
  const left = state.goal - p.km;
  const need = fullRules() && needed(p);
  const hint = need ? ` Il te faut ${ACTIONS[need].name}.`
    : left <= HELP_FROM ? ` Plus que ${left} kilomètres !` : '';
  say(`${before}C'est au tour de ${p.name} ! Pioche une carte.${hint}`);
}

const sfx = {
  click: () => tone(660, 0, 0.08, 'triangle', 0.1),
  beep: () => tone(440, 0, 0.25, 'square', 0.1),
  go: () => tone(880, 0, 0.5, 'square', 0.12),
  undo: () => { tone(500, 0, 0.1, 'triangle'); tone(350, 0.1, 0.15, 'triangle'); },
  nope: () => { tone(200, 0, 0.15, 'square', 0.08); tone(150, 0.15, 0.2, 'square', 0.08); },
  turn: () => { tone(784, 0.7, 0.12, 'triangle', 0.08); tone(1047, 0.82, 0.18, 'triangle', 0.08); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.15, 0.3, 'square', 0.1)),
};

/* ---------- Écran de préparation ---------- */

function renderSetup() {
  $('#count-buttons').innerHTML = [2, 3, 4, 5, 6].map((n) => `
    <button class="count-btn ${n === state.count ? 'active' : ''}" data-count="${n}">${n}</button>`).join('');

  $('#setup-players').innerHTML = state.setup.slice(0, state.count).map((p, i) => `
    <div class="setup-player" style="--car:${colorHex(p.color)}">
      <div class="setup-car">${carSvg(colorHex(p.color), NUMBERS[i])}</div>
      <div class="setup-fields">
        <input class="name-input" data-index="${i}" maxlength="12" placeholder="${DEFAULT_NAMES[i]}"
               value="${escapeHtml(p.name)}" aria-label="Prénom du pilote ${i + 1}">
        <div class="swatches">
          ${COLORS.map((c) => `
            <button class="swatch ${c.id === p.color ? 'active' : ''}" style="background:${c.hex}"
                    data-index="${i}" data-color="${c.id}" aria-label="${c.label}"></button>`).join('')}
        </div>
      </div>
    </div>`).join('');

  $('#goal-buttons').innerHTML = [700, 1000].map((g) => `
    <button class="goal-btn ${g === state.goal ? 'active' : ''}" data-goal="${g}">
      <span class="goal-km">${g} km</span>
      <span class="goal-sub">${g === 700 ? 'Course courte' : 'Course classique'}</span>
    </button>`).join('');
  $('#rules-buttons').innerHTML = [['full', 'Règles complètes', 'Attaques, parades, bottes'], ['km', 'Km seulement', 'Partie rapide']].map(([id, t, sub]) => `
    <button class="goal-btn ${state.rules === id ? 'active' : ''}" data-rules="${id}">
      <span class="goal-km">${t}</span><span class="goal-sub">${sub}</span>
    </button>`).join('');
  renderVoices();
}

$('#rules-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rules]'); if (!b) return;
  state.rules = b.dataset.rules; sfx.click(); save(); renderSetup();
});

function renderVoices() {
  const select = $('#voice-select');
  const voices = frenchVoices();
  if (!voices.length) {
    select.innerHTML = '<option>Voix par défaut de l\'appareil</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  const current = pickVoice();
  select.innerHTML = voices.map(({ v, score }) => `
    <option value="${escapeHtml(v.voiceURI)}" ${current && v.voiceURI === current.voiceURI ? 'selected' : ''}>
      ${score >= 10 ? '★ ' : ''}${escapeHtml(v.name)}
    </option>`).join('');
}

if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', renderVoices);

$('#voice-select').addEventListener('change', (e) => {
  state.voice = e.target.value; save();
  say('Bonjour ! Prêts pour la course ?');
});

$('#btn-voice-test').addEventListener('click', () => {
  if (state.muted) { state.muted = false; save(); renderSound(); }
  say('Bonjour ! Prêts pour la course ? C\'est au tour de Léo, pioche une carte !');
});

$('#count-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('[data-count]'); if (!b) return;
  state.count = Number(b.dataset.count); sfx.click(); save(); renderSetup();
});

$('#goal-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('[data-goal]'); if (!b) return;
  state.goal = Number(b.dataset.goal); sfx.click(); save(); renderSetup();
});

$('#setup-players').addEventListener('click', (e) => {
  const b = e.target.closest('.swatch'); if (!b) return;
  state.setup[b.dataset.index].color = b.dataset.color; sfx.click(); save(); renderSetup();
});

$('#setup-players').addEventListener('input', (e) => {
  if (!e.target.matches('.name-input')) return;
  state.setup[e.target.dataset.index].name = e.target.value; save();
});

$('#btn-start').addEventListener('click', () => {
  state.players = state.setup.slice(0, state.count).map((p, i) => ({
    name: p.name.trim() || DEFAULT_NAMES[i],
    color: colorHex(p.color),
    number: NUMBERS[i],
    km: 0,
  }));
  state.current = 0;
  state.log = [];
  recomputeKm();
  startRace();
});

/* ---------- Course ---------- */

function startRace() {
  state.screen = 'race'; state.phase = 'draw'; cardTab = autoTab(state.current); save();
  show('race');
  renderRace(true);
  countdown();
}

function countdown() {
  const overlay = $('#countdown'); const text = $('#countdown-text');
  const lights = overlay.querySelectorAll('.light');
  overlay.hidden = false;
  lights.forEach((l) => l.className = 'light');
  const steps = ['3', '2', '1', 'Partez !'];
  steps.forEach((s, i) => setTimeout(() => {
    text.textContent = s;
    text.classList.remove('pop'); void text.offsetWidth; text.classList.add('pop');
    if (i < 3) { lights[i].classList.add('red'); sfx.beep(); }
    else { lights.forEach((l) => l.className = 'light green'); sfx.go(); vroom(1); }
  }, i * 800));
  setTimeout(() => { overlay.hidden = true; announceTurn(); }, steps.length * 800 + 300);
}

// Classement : position de chaque joueur (les ex æquo partagent la même place)
function positions() {
  return state.players.map((p) => 1 + state.players.filter((q) => q.km > p.km).length);
}

/* ---------- Circuit ovale ---------- */

// Repère du circuit (horizontal) ; sur un écran étroit on le fait pivoter d'un quart de tour
const TRACK_W = 1000;
const TRACK_H = 660;
const SVG_NS = 'http://www.w3.org/2000/svg';

let track = null;   // géométrie du circuit affiché
let shown = [];     // km affichés pour chaque voiture (animés vers les vrais km)
let animFrame = 0;

function trackGeometry(n, portrait) {
  const laneW = n > 4 ? 30 : 42;
  const half = (n * laneW) / 2;              // demi-largeur de la piste
  const margin = 56;                          // place pour les bornes autour
  const r = TRACK_H / 2 - margin - half;      // rayon des virages (ligne centrale)
  const a = TRACK_W / 2 - margin - half - r;  // demi-longueur des lignes droites
  const carW = laneW * 2.3;
  return {
    n, laneW, half, r, a, portrait, carW, carH: carW * 0.35,
    cx: TRACK_W / 2, cy: TRACK_H / 2,
    length: 4 * a + 2 * Math.PI * r,
  };
}

// Point du circuit à la fraction f du tour (0 = ligne de départ, en bas au milieu),
// décalé de `off` vers l'extérieur ; renvoie les coordonnées à l'écran et la direction
function trackPoint(f, off = 0) {
  const { a, r, cx, cy, length } = track;
  let s = (((f % 1) + 1) % 1) * length;
  let x; let y; let dx; let dy;
  if (s < a) { x = cx + s; y = cy + r; dx = 1; dy = 0; }
  else if ((s -= a) < Math.PI * r) {
    const t = s / r; x = cx + a + r * Math.sin(t); y = cy + r * Math.cos(t); dx = Math.cos(t); dy = -Math.sin(t);
  } else if ((s -= Math.PI * r) < 2 * a) { x = cx + a - s; y = cy - r; dx = -1; dy = 0; }
  else if ((s -= 2 * a) < Math.PI * r) {
    const t = s / r; x = cx - a - r * Math.sin(t); y = cy - r * Math.cos(t); dx = -Math.cos(t); dy = Math.sin(t);
  } else { s -= Math.PI * r; x = cx - a + s; y = cy + r; dx = 1; dy = 0; }
  x += -dy * off; y += dx * off;
  if (track.portrait) [x, y, dx, dy] = [y, TRACK_W - x, dy, -dx];
  return { x, y, angle: Math.atan2(dy, dx) * 180 / Math.PI };
}

// Tracé SVG du circuit entre deux fractions du tour
function trackPath(f0, f1, off = 0) {
  const steps = Math.max(2, Math.ceil((f1 - f0) * 240));
  let d = '';
  for (let k = 0; k <= steps; k++) {
    const pt = trackPoint(f0 + ((f1 - f0) * k) / steps, off);
    d += `${k ? 'L' : 'M'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }
  return d;
}

function isPortrait() {
  return $('#road').clientWidth < 600;
}

function buildRoad() {
  const goal = state.goal;
  const n = state.players.length;
  track = trackGeometry(n, isPortrait());
  const { half, laneW, carW, carH } = track;
  const [vw, vh] = track.portrait ? [TRACK_H, TRACK_W] : [TRACK_W, TRACK_H];
  const loop = (off) => `${trackPath(0, 1, off)}Z`;
  const across = (f) => {
    const p1 = trackPoint(f, -half); const p2 = trackPoint(f, half);
    return `M${p1.x} ${p1.y}L${p2.x} ${p2.y}`;
  };

  const ticks = [];
  for (let k = 100; k < goal; k += 100) {
    ticks.push(`<path class="tick ${k % 500 === 0 ? 'half' : ''}" d="${across(k / goal)}"/>`);
  }
  const bornes = [];
  for (let k = 100; k <= goal; k += 100) {
    const pt = trackPoint(k / goal, half + 34);
    bornes.push(borneSvg(k, 'KM', 'track-borne', `x="${pt.x - 17}" y="${pt.y - 23}" width="34" height="45"`));
  }
  const lanes = [];
  for (let i = 1; i < n; i++) lanes.push(`<path class="lane-line" d="${loop(-half + i * laneW)}"/>`);
  const mid = track.portrait ? { x: TRACK_H / 2, y: TRACK_W / 2 } : { x: TRACK_W / 2, y: TRACK_H / 2 };
  const d = 7 / track.length;

  $('#road').innerHTML = `
    <svg class="track-svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="Circuit de la course">
      <path class="kerb-base" d="${loop(half + 6)}"/>
      <path class="kerb" d="${loop(half + 6)}"/>
      <path class="asphalt" d="${loop(0)}" style="stroke-width:${half * 2}"/>
      <path class="kerb-base" d="${loop(-half - 6)}"/>
      <path class="kerb" d="${loop(-half - 6)}"/>
      <path class="grass" d="${loop(-half - 12)}"/>
      ${lanes.join('')}
      ${ticks.join('')}
      <path class="finish-base" d="${across(0)}"/>
      <path class="finish-a" d="${across(-d)}"/>
      <path class="finish-b" d="${across(d)}"/>
      <g class="infield" transform="translate(${mid.x} ${mid.y})">
        <path d="M5 -58 L-13 -18 L0 -18 L-6 16 L17 -26 L3 -26 Z" fill="#ffd31a" stroke="#8c0a0e" stroke-width="4" stroke-linejoin="round"/>
        <text y="50" class="infield-text">${goal} km</text>
      </g>
      ${bornes.join('')}
      <g class="trails">${state.players.map((p, i) => `<path class="trail" data-index="${i}" style="stroke:${p.color}; stroke-width:${laneW * 0.45}"/>`).join('')}</g>
      <g class="remains">${state.players.map((p, i) => `<path class="remain" data-index="${i}"/>`).join('')}</g>
      <ellipse class="halo" rx="${carW * 0.62}" ry="${laneW * 0.62}"/>
      <g class="cars">${state.players.map((p, i) => `
        <g class="car" data-index="${i}">${carSvg(p.color, p.number, 'track-car', `x="${-carW / 2}" y="${-carH / 2}" width="${carW}" height="${carH}"`)}</g>`).join('')}</g>
      <g class="statuses">${state.players.map((p, i) => `
        <g class="status" data-index="${i}">
          <text class="st-battle" x="0" y="0"></text>
          <g class="st-limit" transform="translate(24 -9)"><circle r="12" fill="#fff" stroke="#d7141a" stroke-width="4"/>
            <text y="5" class="st-limit-text">50</text></g>
        </g>`).join('')}</g>
      <g class="fx"></g>
      <text class="tag-text"></text>
    </svg>`;
}

// Place voitures, traînées, halo et étiquette selon les km affichés
function placeCars() {
  if (!track) return;
  const road = $('#road');
  const { half, laneW, carW, carH, length } = track;
  state.players.forEach((p, i) => {
    const off = -half + laneW * (i + 0.5);
    const f = Math.min(shown[i] / state.goal, 1);
    // L'avant de la voiture touche le point du circuit correspondant à ses km
    const c = trackPoint(f - carW / 2 / length, off);
    const mirror = Math.cos(c.angle * Math.PI / 180) < -0.01;
    const transform = mirror
      ? `translate(${c.x} ${c.y}) rotate(${c.angle - 180}) scale(-1 1)`
      : `translate(${c.x} ${c.y}) rotate(${c.angle})`;
    road.querySelector(`.car[data-index="${i}"]`).setAttribute('transform', transform);
    road.querySelector(`.trail[data-index="${i}"]`).setAttribute('d', f > 0 ? trackPath(0, f, off) : '');
    road.querySelector(`.remain[data-index="${i}"]`).setAttribute('d', f < 1 ? trackPath(f, 1, off) : '');
    road.querySelector(`.status[data-index="${i}"]`).setAttribute('transform', `translate(${c.x} ${c.y - carH / 2 - 12})`);
    if (i === state.current) {
      const halo = road.querySelector('.halo');
      halo.setAttribute('transform', `translate(${c.x} ${c.y}) rotate(${c.angle})`);
      const tag = road.querySelector('.tag-text');
      tag.setAttribute('x', c.x);
      tag.setAttribute('y', c.y - carH / 2 - (statusShown(p) ? 44 : 14));
    }
  });
}

function animateCars() {
  cancelAnimationFrame(animFrame);
  const from = state.players.map((p, i) => (shown[i] ?? p.km));
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / 1100, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    state.players.forEach((p, i) => { shown[i] = from[i] + (p.km - from[i]) * ease; });
    placeCars();
    if (t < 1) animFrame = requestAnimationFrame(step);
  };
  animFrame = requestAnimationFrame(step);
}

window.addEventListener('resize', () => {
  if (state.screen !== 'race' || !track || track.portrait === isPortrait()) return;
  buildRoad(); renderRace();
});

let lastTurn = -1;

function renderRace(initial = false) {
  const goal = state.goal;
  const road = $('#road');
  const rebuild = initial || !track || road.querySelectorAll('.car').length !== state.players.length;
  if (rebuild) buildRoad();

  const pos = positions();
  road.querySelectorAll('.car').forEach((car, i) => {
    const p = state.players[i];
    const active = i === state.current;
    car.classList.toggle('active', active);
    car.classList.toggle('done', p.km >= goal);
    road.querySelector(`.trail[data-index="${i}"]`).classList.toggle('dim', !active);
    road.querySelector(`.remain[data-index="${i}"]`).classList.toggle('dim', !active);
  });
  // Le pilote actif passe au premier plan
  const activeCar = road.querySelector(`.car[data-index="${state.current}"]`);
  activeCar.parentNode.appendChild(activeCar);
  const curP = state.players[state.current];
  road.querySelector('.tag-text').textContent = curP.km >= goal
    ? `${curP.name} 🏁` : `${curP.name} · reste ${goal - curP.km}`;
  state.players.forEach((p, i) => {
    const st = road.querySelector(`.status[data-index="${i}"]`);
    st.querySelector('.st-battle').textContent = statusIcon(p);
    st.querySelector('.st-limit').style.display = fullRules() && p.limited ? '' : 'none';
  });
  if (rebuild) { shown = state.players.map((p) => p.km); placeCars(); } else animateCars();

  // Le tableau est trié par position, le premier en haut
  const order = state.players.map((p, i) => i).sort((a, b) => pos[a] - pos[b] || a - b);
  $('#board').innerHTML = order.map((i) => state.players[i]).map((p, n) => {
    const i = order[n];
    return `
    <button class="board-row ${i === state.current ? 'active' : ''} ${p.km >= goal ? 'done' : ''}"
            data-index="${i}" style="--car:${p.color}">
      <span class="pos">P${pos[i]}</span>
      <span class="board-name">${escapeHtml(p.name)}</span>
      <span class="board-km">${p.km}<small> km</small></span>
      <span class="board-left">${p.km >= goal ? 'Arrivé' : `reste ${goal - p.km}`}${boardStatus(p)}</span>
    </button>`;
  }).join('');

  const cur = state.players[state.current];
  const remaining = goal - cur.km;
  const banner = $('#turn-banner');
  banner.style.setProperty('--car', cur.color);
  banner.innerHTML = `
    <div class="turn-who">
      <span class="turn-car">${carSvg(cur.color, cur.number)}</span>
      <span class="turn-text">À toi,<br><b>${escapeHtml(cur.name)}</b> !${needLine(cur)}</span>
    </div>
    ${remaining <= HELP_FROM ? `
    <button class="turn-left help" aria-label="Voir les cartes pour finir">
      <span class="left-label">Il reste</span>
      <span class="left-num">${remaining}</span>
      <span class="left-unit">km</span>
      <span class="help-badge">💡 Comment finir ?</span>
    </button>` : `
    <div class="turn-left">
      <span class="left-label">Il reste</span>
      <span class="left-num">${remaining}</span>
      <span class="left-unit">km</span>
    </div>`}
    <div class="gauge" aria-hidden="true">
      <div class="gauge-fill" style="width:${(cur.km / goal) * 100}%"></div>
      <span class="gauge-flag">🏁</span>
    </div>`;
  // Petite animation quand c'est au tour d'un autre pilote
  if (lastTurn !== state.current) {
    banner.classList.remove('enter'); void banner.offsetWidth; banner.classList.add('enter');
    lastTurn = state.current;
  }

  if (!fullRules()) cardTab = 'km';
  $('#card-tabs').hidden = !fullRules();
  $('#card-tabs').innerHTML = Object.keys(KINDS).map((k) => `
    <button class="card-tab ${k === cardTab ? 'active' : ''}" data-tab="${k}" role="tab" style="--card:${KINDS[k].color}">${KINDS[k].label}</button>`).join('');
  const need = needed(cur);
  $('#cards').classList.toggle('cards-4', cardTab === 'safety');
  $('#cards').innerHTML = cardTab === 'km'
    ? CARDS.map((c) => kmCardHtml(c, !canPlay(state.current, c.km).ok)).join('')
    : actionsOf(cardTab).map((id) => actionCardHtml(id, !canPlay(state.current, id).ok, id === need)).join('');
  $('#btn-next').textContent = fullRules() ? 'Je jette ▶' : 'Pas de km ▶';

  const drawing = state.phase !== 'play';
  $('#draw-zone').hidden = !drawing;
  $('#play-zone').hidden = drawing;
  $('.draw-title').textContent = `${cur.name}, pioche une carte !`;
  $('#btn-undo').disabled = state.log.length === 0;
  renderLog();
}

let cardTab = 'km';

function kmCardHtml(c, blocked) {
  return `
    <button class="card ${blocked ? 'blocked' : ''}" data-km="${c.km}" style="--card:${c.color}"
            aria-label="${c.km} kilomètres, ${c.name}">
      <span class="card-corner">${c.km}</span>
      <span class="card-borne">${borneSvg(c.km, 'KM')}</span>
      <span class="card-animal">${c.emoji}</span>
      <span class="card-name">${c.name}</span>
    </button>`;
}

function actionCardHtml(id, blocked, wanted = false) {
  const kind = ACTIONS[id].kind;
  return `
    <button class="card act-card ${blocked ? 'blocked' : ''} ${wanted ? 'wanted' : ''}" data-card="${id}"
            style="--card:${KINDS[kind].color}" aria-label="${ACTIONS[id].name}">
      <span class="card-corner">${KINDS[kind].corner}</span>
      <span class="act-icon">${actionIcon(id)}</span>
      <span class="card-name">${ACTIONS[id].name}</span>
    </button>`;
}

// Ce qui s'affiche au-dessus de la voiture : pourquoi elle est arrêtée
function statusIcon(p) {
  if (!fullRules() || rolling(p) || p.km >= state.goal) return '';
  return { none: '🚦', fixed: '🚦', red: '🔴', fuel: '⛽', flat: '🛞', accident: '💥' }[p.battle] || '';
}

function statusShown(p) {
  return !!statusIcon(p) || (fullRules() && p.limited);
}

function boardStatus(p) {
  if (!fullRules()) return '';
  const icons = [statusIcon(p), p.limited ? '🚫50' : '', ...(p.safeties || []).map((x) => ACTIONS[x].emoji)].filter(Boolean);
  return icons.length ? ` · ${icons.join(' ')}` : '';
}

function needLine(p) {
  if (!fullRules() || p.km >= state.goal) return '';
  const need = needed(p);
  if (need) return `<span class="turn-need">Il te faut : <b>${ACTIONS[need].name}</b></span>`;
  if (p.limited) return '<span class="turn-need">Limité à 50 : cartes 25 et 50</span>';
  return '';
}

// Onglet à ouvrir au début du tour : réparer si la voiture est arrêtée
function autoTab(i) {
  return fullRules() && needed(state.players[i]) ? 'remedy' : 'km';
}

function explain(reason) {
  sfx.nope();
  toast(reason);
  say(reason);
}

function addKm(km, i = state.current, meta = {}) {
  const p = state.players[i];
  if (p.km + km > state.goal) { sfx.nope(); return false; }
  p.km += km;
  state.log.push({ player: i, km, source: meta.source || 'tap', heard: meta.heard || '' });

  const car = $('#road').querySelector(`.car[data-index="${i}"]`);
  car.classList.remove('boost'); void car.getBoundingClientRect(); car.classList.add('boost');
  trackEffects(i, km);
  vroom(km / 200);
  if (km === 200) flash();

  if (p.km >= state.goal) {
    finish(i);
    return true;
  }

  giveTurn((i + 1) % state.players.length);
  sfx.turn();
  const before = meta.source === 'voice' ? `${p.name} avance de ${km} kilomètres. ` : '';
  setTimeout(() => announceTurn(before), 1000);
  return true;
}

function playAction(card, target) {
  const i = state.current;
  const p = state.players[i];
  const a = ACTIONS[card];
  if (a.kind === 'hazard' && target === undefined) { chooseTarget(card); return; }
  state.log.push({ player: i, card, target, source: 'tap' });
  recomputeKm();
  save();
  if (a.kind === 'hazard') {
    const t = state.players[target];
    sfx.nope();
    renderRace();
    say(`${p.name} met ${a.name} à ${t.name} !`);
    askCoupFourre(i, target, card);
    return;
  }
  if (a.kind === 'safety') {
    sfx.win();
    flash();
    state.phase = 'draw';
    renderRace();
    toast(`⭐ ${p.name} pose la botte ${a.name} et rejoue !`);
    setTimeout(() => say(`Bravo ! ${a.name}. ${p.name}, tu rejoues : pioche une carte.`), 300);
    return;
  }
  sfx.click();
  vroom(0.3);
  giveTurn((i + 1) % state.players.length);
  sfx.turn();
  setTimeout(() => announceTurn(`${a.name} pour ${p.name}. `), 900);
}

function dialog(title, body, buttons) {
  $('#dialog-title').innerHTML = title;
  $('#dialog-body').innerHTML = body;
  $('#dialog-buttons').innerHTML = '';
  buttons.forEach(({ label, cls = '', disabled = false, onClick }) => {
    const b = document.createElement('button');
    b.className = `big-btn ${cls}`;
    b.innerHTML = label;
    b.disabled = disabled;
    b.addEventListener('click', () => { $('#dialog').hidden = true; if (onClick) onClick(); });
    $('#dialog-buttons').appendChild(b);
  });
  $('#dialog').hidden = false;
}

function chooseTarget(card) {
  const i = state.current;
  const ok = attackTargets(i, card);
  const others = state.players.map((t, k) => k).filter((k) => k !== i);
  dialog(`Qui attaques-tu avec <b>${ACTIONS[card].name}</b> ?`, `<div class="dialog-card">${actionIcon(card)}</div>`, [
    ...others.map((k) => {
      const t = state.players[k];
      const why = ok.includes(k) ? '' : has(t, ACTIONS[card].safety) ? ' (protégé par sa botte)'
        : card === 'limit' ? ' (déjà limité)' : ' (ne roule pas)';
      return { label: `<span class="dot" style="background:${t.color}"></span>${escapeHtml(t.name)}<small>${why}</small>`,
        cls: 'target-btn', disabled: !ok.includes(k), onClick: () => playAction(card, k) };
    }),
    { label: 'Annuler', cls: 'cancel-btn' },
  ]);
  say('Qui attaques-tu ?');
}

// Coup fourré : la victime peut poser tout de suite la botte qui la protège, puis rejoue
function askCoupFourre(i, target, card) {
  const t = state.players[target];
  const safety = ACTIONS[card].safety;
  const next = () => {
    giveTurn((i + 1) % state.players.length);
    sfx.turn();
    setTimeout(() => announceTurn(), 600);
  };
  setTimeout(() => {
    dialog(`Coup fourré ?`,
      `<div class="dialog-card">${actionIcon(safety)}</div>
       <p class="dialog-text"><b>${escapeHtml(t.name)}</b>, as-tu la botte <b>${ACTIONS[safety].name}</b> dans ta main ?
       Si oui, pose-la tout de suite et crie « Coup fourré ! »</p>`, [
        { label: '⭐ Oui, coup fourré !', cls: 'go', onClick: () => {
          state.log.push({ player: target, card: safety, cf: true, source: 'tap' });
          recomputeKm();
          sfx.win(); flash(); confetti();
          state.current = target;
          state.phase = 'draw';
          cardTab = autoTab(target);
          save();
          renderRace();
          say(`Coup fourré ! ${t.name} est protégé et rejoue. Pioche une carte !`);
        } },
        { label: 'Non, on continue', onClick: next },
      ]);
    say(`${t.name}, as-tu la botte ${ACTIONS[safety].name} ? Coup fourré ?`);
  }, 1300);
}

function finish(i) {
  renderRace();
  $('#turn-banner').innerHTML = `<span class="turn-text"><b>${escapeHtml(state.players[i].name)}</b> passe la ligne !</span>`;
  save();
  stopListening();
  setTimeout(() => showWinner(i), 1600);
}

/* ---------- Règles : état de chaque voiture ---------- */

const fullRules = () => state.rules !== 'km';
const has = (p, safety) => (p.safeties || []).includes(safety);
const HAZARD_WORDS = { red: 'arrêté au feu rouge', fuel: 'en panne d\'essence', flat: 'crevé', accident: 'accidenté' };

// Peut-il avancer ? (sans feu vert au départ ou après une réparation, on est arrêté)
function rolling(p) {
  if (!fullRules()) return true;
  if (ACTIONS[p.battle] && ACTIONS[p.battle].kind === 'hazard') return false;
  return has(p, 'priority') || p.battle === 'green';
}

// La carte qu'il lui faut pour repartir (ou null s'il roule)
function needed(p) {
  if (rolling(p)) return null;
  if (ACTIONS[p.battle] && ACTIONS[p.battle].kind === 'hazard') return ACTIONS[p.battle].fix;
  return 'green';
}

function whyStopped(p) {
  if (p.battle === 'none') return 'Pour démarrer, il te faut d\'abord un Feu vert.';
  if (p.battle === 'fixed') return 'C\'est réparé ! Il te faut maintenant un Feu vert pour repartir.';
  const fix = ACTIONS[ACTIONS[p.battle].fix].name;
  return `Tu es ${HAZARD_WORDS[p.battle]} : il te faut d'abord ${fix === 'Essence' ? 'de l\'Essence' : `la carte ${fix}`}.`;
}

// Pilotes que l'on peut attaquer avec cette carte
function attackTargets(i, card) {
  const a = ACTIONS[card];
  return state.players.map((t, k) => ({ t, k })).filter(({ t, k }) => {
    if (k === i || t.km >= state.goal || has(t, a.safety)) return false;
    if (card === 'limit') return !t.limited;
    return rolling(t);
  }).map(({ k }) => k);
}

// Le pilote i peut-il jouer cette carte ? → { ok, reason }
function canPlay(i, card) {
  const p = state.players[i];
  if (typeof card === 'number') {
    const left = state.goal - p.km;
    if (fullRules() && !rolling(p)) return { ok: false, reason: whyStopped(p) };
    if (fullRules() && p.limited && card > 50) return { ok: false, reason: 'Tu es limité à 50 : seulement les cartes 25 et 50.' };
    if (fullRules() && card === 200 && p.n200 >= 2) return { ok: false, reason: 'Tu as déjà posé deux cartes 200 : c\'est le maximum.' };
    if (card > left) return { ok: false, reason: `Trop loin : il te reste ${left} km, il faut arriver pile.` };
    return { ok: true, reason: `Oui ! Tu avances de ${card} km.` };
  }
  const a = ACTIONS[card];
  if (a.kind === 'safety') {
    if (has(p, card)) return { ok: false, reason: 'Tu as déjà cette botte.' };
    return { ok: true, reason: 'Oui ! Une botte se pose quand tu veux, elle te protège pour toute la partie, et tu rejoues.' };
  }
  if (a.kind === 'hazard') {
    const targets = attackTargets(i, card);
    if (!targets.length) {
      return { ok: false, reason: card === 'limit'
        ? 'Personne ne peut recevoir cette limitation : ils sont déjà limités ou protégés.'
        : 'Personne ne peut recevoir cette attaque : il faut attaquer un pilote qui roule et qui n\'a pas la botte.' };
    }
    return { ok: true, reason: `Oui ! Tu peux attaquer ${targets.map((k) => state.players[k].name).join(' ou ')}.` };
  }
  // Parades
  if (card === 'end') return p.limited ? { ok: true, reason: 'Oui ! Fini la limitation, tu peux rouler vite.' } : { ok: false, reason: 'Tu n\'es pas limité : garde cette carte pour plus tard.' };
  if (card === 'green') {
    if (has(p, 'priority')) return { ok: false, reason: 'Pas besoin : avec le Véhicule prioritaire, tu roules sans feu vert.' };
    if (p.battle === 'green') return { ok: false, reason: 'Tu roules déjà : garde ton feu vert pour plus tard.' };
    if (['fuel', 'flat', 'accident'].includes(p.battle)) return { ok: false, reason: whyStopped(p) };
    return { ok: true, reason: 'Oui ! Feu vert : tu peux rouler.' };
  }
  if (p.battle === a.cures) return { ok: true, reason: `Oui ! ${a.name} : c'est réparé. Ensuite il te faudra un Feu vert.` };
  return { ok: false, reason: `Tu n'en as pas besoin : tu n'es pas ${HAZARD_WORDS[a.cures]}. Garde cette carte.` };
}

/* ---------- Historique : correction des coups ---------- */

// L'état de chaque pilote est rejoué à partir de l'historique des coups
function recomputeKm() {
  state.players.forEach((p) => { p.km = 0; p.n200 = 0; p.battle = 'none'; p.before = 'none'; p.limited = false; p.safeties = []; });
  state.log.forEach((e) => {
    const p = state.players[e.player];
    const a = ACTIONS[e.card];
    if (!a) { p.km += e.km; if (e.km === 200) p.n200 += 1; return; }
    if (a.kind === 'hazard') {
      const t = state.players[e.target];
      if (e.card === 'limit') t.limited = true; else { t.before = t.battle; t.battle = e.card; }
    } else if (a.kind === 'remedy') {
      if (e.card === 'green') p.battle = 'green';
      else if (e.card === 'end') p.limited = false;
      else if (p.battle === a.cures) p.battle = 'fixed';
    } else {
      p.safeties.push(e.card);
      if (a.protects.includes('limit')) p.limited = false;
      // Coup fourré : l'attaque est annulée, la voiture continue comme avant ;
      // sinon l'attaque est réparée mais il faut un feu vert (sauf Véhicule prioritaire)
      if (a.protects.includes(p.battle)) p.battle = e.cf ? p.before : 'fixed';
    }
  });
}

function renderLog() {
  const list = $('#log');
  if (!state.log.length) {
    list.innerHTML = '<li class="log-empty">Aucun coup pour l\'instant.</li>';
    return;
  }
  list.innerHTML = state.log.map((e, n) => ({ e, n })).reverse().map(({ e, n }) => (ACTIONS[e.card] ? `
    <li class="log-row log-action" style="--car:${state.players[e.player].color}">
      <span class="log-icon">${ACTIONS[e.card].kind === 'hazard' ? '⚔️' : ACTIONS[e.card].kind === 'remedy' ? '🔧' : '⭐'}</span>
      <span class="log-text">${escapeHtml(state.players[e.player].name)} : ${ACTIONS[e.card].name}${
        ACTIONS[e.card].kind === 'hazard' ? ` → ${escapeHtml(state.players[e.target].name)}` : ''}${e.cf ? ' — coup fourré !' : ''}</span>
      <button class="log-del" data-entry="${n}" aria-label="Supprimer ce coup">✖</button>
    </li>` : `
    <li class="log-row" style="--car:${state.players[e.player].color}">
      <span class="log-icon" title="${e.source === 'voice' ? 'Entendu' : 'Touché'}">${e.source === 'voice' ? '🎤' : '👆'}</span>
      <select class="log-player" data-entry="${n}" aria-label="Pilote">
        ${state.players.map((p, i) => `<option value="${i}" ${i === e.player ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>
      <select class="log-km" data-entry="${n}" aria-label="Kilomètres">
        ${CARDS.map((c) => `<option value="${c.km}" ${c.km === e.km ? 'selected' : ''}>+${c.km} km ${c.emoji}</option>`).join('')}
      </select>
      <button class="log-del" data-entry="${n}" aria-label="Supprimer ce coup">✖</button>
      ${e.heard ? `<span class="log-heard">« ${escapeHtml(e.heard)} »</span>` : ''}
    </li>`)).join('');
}

// Modifie l'historique ; refuse si un pilote dépasserait l'arrivée
function editLog(change) {
  const backup = state.log.map((e) => ({ ...e }));
  change();
  recomputeKm();
  if (state.players.some((p) => p.km > state.goal)) {
    state.log = backup;
    recomputeKm();
    sfx.nope();
    toast('Impossible : ce pilote dépasserait l\'arrivée.');
    renderRace();
    return;
  }
  sfx.click();
  save();
  const winner = state.players.findIndex((p) => p.km >= state.goal);
  if (winner >= 0) { finish(winner); return; }
  if (state.players[state.current].km >= state.goal) state.current = 0;
  renderRace();
}

$('#log').addEventListener('change', (e) => {
  const n = Number(e.target.dataset.entry);
  if (e.target.matches('.log-player')) editLog(() => { state.log[n].player = Number(e.target.value); });
  if (e.target.matches('.log-km')) editLog(() => { state.log[n].km = Number(e.target.value); });
});

$('#log').addEventListener('click', (e) => {
  const del = e.target.closest('.log-del');
  if (del) editLog(() => { state.log.splice(Number(del.dataset.entry), 1); });
});

/* ---------- Bandeau de confirmation ---------- */

let toastTimer = 0;
function toast(text, fixable = false) {
  $('#toast-text').textContent = text;
  $('#btn-toast-fix').hidden = !fixable;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6000);
}

$('#btn-toast-fix').addEventListener('click', () => {
  $('#toast').hidden = true;
  const w = document.querySelector('.widget[data-widget="log"]');
  setCollapsed('log', false);
  w.scrollIntoView({ behavior: 'smooth', block: 'center' });
  w.classList.remove('flash-widget'); void w.offsetWidth; w.classList.add('flash-widget');
});

// « +50 » qui s'envole et petits nuages de fumée derrière la voiture
function trackEffects(i, km) {
  const fx = $('#road').querySelector('.fx');
  if (!fx || !track) return;
  const { half, laneW, carW, carH, length } = track;
  const off = -half + laneW * (i + 0.5);
  const f = Math.min(shown[i] / state.goal, 1);
  const rear = trackPoint(f - carW / length, off);
  const mid = trackPoint(f - carW / 2 / length, off);
  for (let n = 0; n < 5; n++) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('class', 'puff');
    c.setAttribute('cx', rear.x); c.setAttribute('cy', rear.y); c.setAttribute('r', laneW * 0.22);
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
    c.style.setProperty('--dy', `${-10 - Math.random() * 25}px`);
    c.style.animationDelay = `${n * 60}ms`;
    fx.appendChild(c);
    setTimeout(() => c.remove(), 1300);
  }
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('class', 'bubble');
  t.setAttribute('x', mid.x); t.setAttribute('y', mid.y - carH);
  t.textContent = `+${km}`;
  fx.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}

function flash() {
  const f = $('#flash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}

// Passe la main à un pilote : il doit d'abord piocher
function giveTurn(i) {
  state.current = i;
  state.phase = 'draw';
  cardTab = autoTab(i);
  save();
  renderRace();
}

function select(i) {
  if (state.players[i].km >= state.goal || i === state.current) return;
  sfx.click(); giveTurn(i); announceTurn();
}

$('#cards').addEventListener('click', (e) => {
  const b = e.target.closest('.card'); if (!b) return;
  const card = b.dataset.km ? Number(b.dataset.km) : b.dataset.card;
  const check = canPlay(state.current, card);
  if (!check.ok) { explain(check.reason); return; }
  if (typeof card === 'number') addKm(card); else playAction(card);
});

$('#card-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.card-tab'); if (!b) return;
  cardTab = b.dataset.tab;
  sfx.click();
  renderRace();
});

/* ---------- « Puis-je jouer cette carte ? » ---------- */

function openAsk() {
  const cur = state.players[state.current];
  $('#ask-title').innerHTML = `${escapeHtml(cur.name)}, quelle carte as-tu dans la main ?`;
  $('#ask-verdict').hidden = true;
  const groups = fullRules() ? Object.keys(KINDS) : ['km'];
  $('#ask-grid').innerHTML = groups.map((k) => `
    <h3 class="ask-group" style="--card:${KINDS[k].color}">${KINDS[k].title}</h3>
    <div class="ask-cards ${k === 'safety' ? 'cards-4' : ''}">
      ${k === 'km' ? CARDS.map((c) => kmCardHtml(c, false)).join('') : actionsOf(k).map((id) => actionCardHtml(id, false)).join('')}
    </div>`).join('');
  $('#ask').hidden = false;
  say('Montre-moi ta carte !');
}

function judge(card) {
  const i = state.current;
  const check = canPlay(i, card);
  const name = typeof card === 'number' ? `${card} km` : ACTIONS[card].name;
  const icon = typeof card === 'number' ? borneSvg(card, 'KM') : actionIcon(card);
  const v = $('#ask-verdict');
  v.className = `ask-verdict ${check.ok ? 'ok' : 'no'}`;
  v.innerHTML = `
    <div class="ask-card-icon">${icon}</div>
    <div class="ask-text"><b>${check.ok ? '✅ Oui' : '❌ Pas maintenant'}</b> — ${escapeHtml(name)}<br>${escapeHtml(check.reason)}</div>
    ${check.ok ? '<button id="btn-ask-play" class="big-btn go">Jouer cette carte</button>' : ''}`;
  v.hidden = false;
  v.scrollIntoView({ block: 'nearest' });
  if (check.ok) sfx.click(); else sfx.nope();
  say(check.reason);
  const play = $('#btn-ask-play');
  if (play) play.addEventListener('click', () => {
    $('#ask').hidden = true;
    state.phase = 'play';
    if (typeof card === 'number') addKm(card); else playAction(card);
  });
}

$('#btn-ask').addEventListener('click', openAsk);
$('#btn-ask-close').addEventListener('click', () => { $('#ask').hidden = true; });
$('#ask').addEventListener('click', (e) => {
  if (e.target.id === 'ask') { $('#ask').hidden = true; return; }
  const b = e.target.closest('#ask-grid .card'); if (!b) return;
  judge(b.dataset.km ? Number(b.dataset.km) : b.dataset.card);
});

$('#road').addEventListener('click', (e) => {
  const car = e.target.closest('.car'); if (car) select(Number(car.dataset.index));
});

$('#board').addEventListener('click', (e) => {
  const row = e.target.closest('.board-row'); if (row) select(Number(row.dataset.index));
});

$('#btn-play').addEventListener('click', () => {
  state.phase = 'play';
  sfx.click(); save(); renderRace();
  say('Choisis ta carte !');
});

$('#btn-next').addEventListener('click', () => {
  sfx.click();
  giveTurn((state.current + 1) % state.players.length);
  announceTurn();
});

$('#btn-undo').addEventListener('click', () => {
  const last = state.log.pop(); if (!last) return;
  recomputeKm();
  state.current = last.player;
  state.phase = 'play';
  sfx.undo(); save(); renderRace();
});

/* ---------- Aide : comment arriver pile ---------- */

// Toutes les façons d'atteindre exactement `left` km avec les cartes étape,
// de la plus courte à la plus longue (cartes rangées de la plus grande à la plus petite)
function combos(left) {
  const values = CARDS.map((c) => c.km).sort((a, b) => b - a);
  const found = [];
  (function walk(rest, from, hand) {
    if (rest === 0) { found.push(hand); return; }
    if (hand.length === HELP_MAX_CARDS) return;
    values.slice(from).forEach((v, k) => {
      if (v <= rest) walk(rest - v, from + k, [...hand, v]);
    });
  })(left, 0, []);
  return found.sort((a, b) => a.length - b.length).slice(0, HELP_MAX_COMBOS);
}

function miniCard(km) {
  const c = CARDS.find((x) => x.km === km);
  return `<span class="mini-card" style="--card:${c.color}">${borneSvg(km, 'KM')}<span class="mini-animal">${c.emoji}</span></span>`;
}

function showHelp() {
  const p = state.players[state.current];
  const left = state.goal - p.km;
  if (left <= 0 || left > HELP_FROM) return;
  const list = combos(left);
  $('#help-title').innerHTML = `Pour arriver pile, il te faut <b>${left} km</b>`;
  $('#help-list').innerHTML = list.map((hand, n) => `
    <div class="help-row" style="animation-delay:${n * 120}ms">
      ${hand.map(miniCard).join('<span class="help-plus">+</span>')}
      <span class="help-eq">= ${left} 🏁</span>
    </div>`).join('');
  $('#help').hidden = false;
  sfx.click();
  const spoken = list.slice(0, 3).map((hand) => hand.join(' plus ')).join(', ou ');
  say(`Pour arriver pile, il te faut ${left} kilomètres. Par exemple : ${spoken}.`);
}

function hideHelp() {
  $('#help').hidden = true;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

$('#turn-banner').addEventListener('click', (e) => {
  if (e.target.closest('.turn-left.help')) showHelp();
});
$('#btn-help-close').addEventListener('click', hideHelp);
$('#help').addEventListener('click', (e) => { if (e.target.id === 'help') hideHelp(); });

/* ---------- Arrivée ---------- */

function showWinner(index) {
  state.screen = 'win';
  state.winner = index;
  save();
  show('win');
  renderWinner();
  sfx.win();
  confetti();
  setTimeout(() => say(`Bravo ${state.players[index].name} ! Tu as gagné la course !`), 900);
}

function renderWinner() {
  const w = state.players[state.winner] || state.players[0];
  $('#win-title').textContent = w.name;
  $('#win-car').innerHTML = carSvg(w.color, w.number);
  $('#ranking').innerHTML = [...state.players]
    .sort((a, b) => b.km - a.km)
    .map((p, i) => `
      <li style="--car:${p.color}">
        <span class="pos">P${i + 1}</span>
        <span class="mini-car">${carSvg(p.color, p.number)}</span>
        <span class="rank-name">${escapeHtml(p.name)}</span>
        <span class="rank-km">${p.km} km</span>
      </li>`).join('');
}

function confetti() {
  const box = $('#confetti');
  box.innerHTML = '';
  const colors = ['#d7141a', '#ffd31a', '#3fa9f5', '#fff', '#111', '#ff8c1a'];
  for (let n = 0; n < 120; n++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[n % colors.length];
    c.style.animationDelay = `${Math.random() * 1.5}s`;
    c.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    c.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    box.appendChild(c);
  }
  setTimeout(() => { box.innerHTML = ''; }, 5000);
}

$('#btn-rematch').addEventListener('click', () => {
  state.current = 0; state.log = [];
  recomputeKm();
  startRace();
});

$('#btn-new').addEventListener('click', newGame);

/* ---------- Navigation ---------- */

function show(screen) {
  if (screen !== 'race') stopListening();
  ['setup', 'race', 'win'].forEach((s) => { $(`#screen-${s}`).hidden = s !== screen; });
  $('#btn-home').hidden = screen === 'setup';
  window.scrollTo(0, 0);
}

function newGame() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.screen = 'setup'; state.players = []; state.log = [];
  save(); show('setup'); renderSetup();
}

$('#btn-home').addEventListener('click', () => {
  if (state.screen === 'race' && state.log.length && !confirm('Arrêter la course et revenir au menu ?')) return;
  newGame();
});

function renderSound() {
  $('#btn-sound').textContent = state.muted ? '🔇' : '🔊';
  $('#btn-sound').setAttribute('aria-label', state.muted ? 'Activer le son' : 'Couper le son');
}

$('#btn-sound').addEventListener('click', () => {
  state.muted = !state.muted; save(); renderSound(); sfx.click();
  if (state.muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

/* ---------- Écoute de la partie (reconnaissance vocale du navigateur) ---------- */

// Mots reconnus dans une phrase (sans accents, en minuscules)
const VALUE_WORDS = [
  [['deux', 'cents'], 200], [['deux', 'cent'], 200], [['2', 'cents'], 200], [['2', 'cent'], 200],
  [['soixante', 'quinze'], 75], [['vingt', 'cinq'], 25],
  [['200'], 200], [['hirondelle'], 200, true], [['hirondelles'], 200, true], [['oiseau'], 200, true],
  [['100'], 100], [['cent'], 100], [['cents'], 100], [['lievre'], 100, true], [['lievres'], 100, true],
  [['lapin'], 100, true], [['lapins'], 100, true],
  [['75'], 75], [['papillon'], 75, true], [['papillons'], 75, true],
  [['50'], 50], [['cinquante'], 50], [['canard'], 50, true], [['canards'], 50, true],
  [['25'], 25], [['escargot'], 25, true], [['escargots'], 25, true],
];
const SELF_WORDS = ['je', 'j', 'moi'];
const GAME_WORDS = ['pose', 'poses', 'mets', 'met', 'mis', 'joue', 'joues', 'avance', 'avances', 'km', 'kilometre', 'kilometres', 'borne', 'bornes', 'carte', 'plus'];
const SKIP_WORDS = ['reste', 'restent', 'faut', 'manque', 'manquent'];
const NUMBER_WORDS = ['deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'mille'];
const LINK_WORDS = ['pour', 'a', 'au', 'de', 'chez'];

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Transforme une phrase entendue en coups : [{ player, km }]
function parseHeard(text, names, current) {
  const words = normalize(text).split(' ').filter(Boolean);
  if (words.some((w) => SKIP_WORDS.includes(w))) return [];
  const nameWords = names.map((n) => normalize(n).split(' ').filter(Boolean));
  const at = (i, seq) => seq.length && seq.every((w, k) => words[i + k] === w);

  const mentions = [];
  for (let i = 0; i < words.length;) {
    const value = VALUE_WORDS.find(([seq]) => at(i, seq));
    if (value) { mentions.push({ type: 'value', km: value[1], animal: !!value[2], pos: i, end: i + value[0].length }); i += value[0].length; continue; }
    const player = nameWords.map((seq, p) => ({ seq, p })).filter(({ seq }) => at(i, seq))
      .sort((x, y) => y.seq.length - x.seq.length)[0];
    if (player) { mentions.push({ type: 'name', player: player.p, pos: i, end: i + player.seq.length }); i += player.seq.length; continue; }
    if (SELF_WORDS.includes(words[i])) mentions.push({ type: 'self', pos: i, end: i + 1 });
    i += 1;
  }

  const values = mentions.filter((m) => m.type === 'value');
  if (!values.length) return [];
  const trigger = mentions.some((m) => m.type !== 'value' || m.animal) || words.some((w) => GAME_WORDS.includes(w));
  if (!trigger) return [];

  // « cent cinquante », « trois cents » : ce sont des nombres, pas des cartes
  const skip = new Set();
  values.forEach((v, k) => {
    const next = values[k + 1];
    if (!v.animal && next && !next.animal && next.pos === v.end && v.km >= 100) { skip.add(v); skip.add(next); }
    if (!v.animal && NUMBER_WORDS.includes(words[v.pos - 1]) && v.km === 100) skip.add(v);
  });

  const moves = [];
  mentions.forEach((m, k) => {
    if (m.type !== 'value' || skip.has(m)) return;
    let player = current;
    const next = mentions[k + 1];
    const between = next ? words.slice(m.end, next.pos) : [];
    const prev = mentions.slice(0, k).reverse().find((x) => x.type === 'name' || x.type === 'self');
    if (next && next.type === 'name' && between.length <= 2 && between.every((w) => LINK_WORDS.includes(w))) player = next.player;
    else if (prev && prev.type === 'name') player = prev.player;
    moves.push({ player, km: m.km });
  });
  return moves;
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const listen = { on: false, paused: false, rec: null };

function setListenStatus(text) {
  $('#listen-status').textContent = text;
}

function renderListen() {
  const b = $('#btn-listen');
  if (!Recognition) {
    b.disabled = true;
    b.textContent = '🎤 Écoute indisponible';
    setListenStatus('Ce navigateur ne sait pas écouter : essayez Chrome, Edge ou Safari récents.');
    return;
  }
  b.classList.toggle('on', listen.on);
  b.textContent = listen.on ? '⏹ Arrêter l\'écoute' : '🎤 Écouter la partie';
  if (!listen.on) setListenStatus('');
  else if (!$('#listen-status').textContent) setListenStatus('J\'écoute… dites par exemple « Léo pose 50 ».');
}

function makeRecognition() {
  const r = new Recognition();
  r.lang = 'fr-FR';
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 3;
  r.onresult = (e) => {
    for (let k = e.resultIndex; k < e.results.length; k++) {
      const res = e.results[k];
      if (!res.isFinal) { setListenStatus(`J'entends : « ${res[0].transcript} »`); continue; }
      if (!listen.paused) handleHeard(Array.from({ length: res.length }, (_, a) => res[a].transcript));
    }
  };
  // Le navigateur coupe l'écoute après un silence : on la relance tant qu'elle est active
  r.onend = () => { if (listen.on && !listen.paused) setTimeout(startRecognition, 250); };
  r.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      listen.on = false;
      renderListen();
      setListenStatus('Le micro est refusé : autorisez-le dans les réglages du navigateur.');
    }
  };
  return r;
}

function startRecognition() {
  try { listen.rec.start(); } catch (e) { /* déjà en cours */ }
}

function startListening() {
  if (!Recognition) return;
  listen.rec = listen.rec || makeRecognition();
  listen.on = true;
  listen.paused = false;
  setListenStatus('');
  startRecognition();
  renderListen();
}

function stopListening() {
  listen.on = false;
  listen.paused = false;
  if (listen.rec) try { listen.rec.abort(); } catch (e) { /* rien */ }
  renderListen();
}

function pauseListening() {
  if (!listen.on) return;
  listen.paused = true;
  try { listen.rec.abort(); } catch (e) { /* rien */ }
}

function resumeListening() {
  if (!listen.on || !listen.paused) return;
  setTimeout(() => { listen.paused = false; startRecognition(); }, 300);
}

function handleHeard(alternatives) {
  if (state.screen !== 'race') return;
  for (const text of alternatives) {
    const moves = parseHeard(text, state.players.map((p) => p.name), state.current);
    if (!moves.length) continue;
    setListenStatus(`Compris : « ${text} »`);
    moves.forEach(({ player, km }) => applyHeard(player, km, text));
    return;
  }
  setListenStatus(`Entendu : « ${alternatives[0]} »`);
}

function applyHeard(i, km, text) {
  if (state.players.some((p) => p.km >= state.goal)) return;
  const p = state.players[i];
  const check = canPlay(i, km);
  if (!check.ok) {
    sfx.nope();
    toast(`🎤 ${p.name} +${km} : impossible. ${check.reason}`);
    say(`Attention ${p.name} : ${check.reason}`);
    return;
  }
  addKm(km, i, { source: 'voice', heard: text });
  toast(`🎤 ${p.name} +${km} km`, true);
}

$('#btn-listen').addEventListener('click', () => {
  sfx.click();
  if (listen.on) stopListening(); else startListening();
});

/* ---------- Widgets : réduire, agrandir, déplacer ---------- */

const widget = (name) => document.querySelector(`.widget[data-widget="${name}"]`);

function applyLayout() {
  const box = $('#widgets');
  const saved = (state.layout.order || []).filter((w) => WIDGETS.includes(w));
  [...saved, ...WIDGETS.filter((w) => !saved.includes(w))].forEach((name) => box.appendChild(widget(name)));
  WIDGETS.forEach((name) => setCollapsed(name, !!(state.layout.collapsed || {})[name], false));
}

function setCollapsed(name, value, persist = true) {
  const w = widget(name);
  w.classList.toggle('collapsed', value);
  const b = w.querySelector('[data-action="collapse"]');
  b.textContent = value ? '▸' : '▾';
  b.setAttribute('aria-label', value ? 'Déplier' : 'Réduire');
  state.layout.collapsed = { ...(state.layout.collapsed || {}), [name]: value };
  if (persist) save();
  if (!value && name === 'track') refitTrack();
}

// Le circuit change d'orientation selon la place disponible
function refitTrack() {
  if (state.screen === 'race' && track && track.portrait !== isPortrait()) { buildRoad(); renderRace(); }
}

function toggleExpand(name) {
  const w = widget(name);
  const on = !w.classList.contains('expanded');
  document.querySelectorAll('.widget.expanded').forEach((x) => {
    x.classList.remove('expanded');
    x.querySelector('[data-action="expand"]').textContent = '⤢';
  });
  w.classList.toggle('expanded', on);
  w.querySelector('[data-action="expand"]').textContent = on ? '✕' : '⤢';
  document.body.classList.toggle('has-expanded', on);
  if (on) setCollapsed(name, false);
  refitTrack();
}

$('#widgets').addEventListener('click', (e) => {
  const b = e.target.closest('.widget-btn'); if (!b) return;
  const name = b.closest('.widget').dataset.widget;
  sfx.click();
  if (b.dataset.action === 'collapse') setCollapsed(name, !widget(name).classList.contains('collapsed'));
  else toggleExpand(name);
});

// Glisser la barre de titre pour changer l'ordre des widgets
$('#widgets').addEventListener('pointerdown', (e) => {
  const bar = e.target.closest('.widget-bar');
  if (!bar || e.target.closest('button')) return;
  const w = bar.closest('.widget');
  if (w.classList.contains('expanded')) return;
  const box = $('#widgets');
  e.preventDefault();
  bar.setPointerCapture(e.pointerId);
  w.classList.add('dragging');
  const move = (ev) => {
    if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 14);
    else if (ev.clientY < 60) window.scrollBy(0, -14);
    const others = [...box.children].filter((x) => x !== w);
    const before = others.find((o) => { const r = o.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
    if (before) { if (w.nextElementSibling !== before) box.insertBefore(w, before); }
    else if (box.lastElementChild !== w) box.appendChild(w);
  };
  const up = () => {
    bar.removeEventListener('pointermove', move);
    bar.removeEventListener('pointerup', up);
    bar.removeEventListener('pointercancel', up);
    w.classList.remove('dragging');
    state.layout.order = [...box.children].map((x) => x.dataset.widget);
    save();
  };
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', up);
  bar.addEventListener('pointercancel', up);
});

/* ---------- Démarrage ---------- */

renderSound();
applyLayout();
if (state.players.length) { recomputeKm(); cardTab = autoTab(state.current); }
renderListen();
if (state.screen === 'race' && state.players.length) { show('race'); renderRace(true); }
else if (state.screen === 'win' && state.players.length) { show('win'); renderWinner(); }
else { state.screen = 'setup'; show('setup'); renderSetup(); }
