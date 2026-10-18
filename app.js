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
// les yeux dans le pare-brise, un sourire sur le pare-chocs et un éclair sur le flanc
function carSvg(color, number, cls = 'car-svg', attrs = '') {
  const blink = `${(number % 5) * 0.7}s`;
  return `
  <svg class="${cls}" viewBox="0 0 140 56" ${attrs} style="--car:${color}; --blink-delay:${blink}">
    <ellipse cx="70" cy="52" rx="62" ry="3.5" fill="rgba(0,0,0,.35)"/>
    <path d="M5 26 L2 12 Q2 9 6 9 L22 9 L24 24" fill="var(--car)" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M8 43 Q4 29 20 27 L42 25 Q54 9 80 9 Q101 10 111 25 L126 29 Q137 33 136 43 L132 47 L11 47 Z"
          fill="var(--car)" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M20 30 Q60 27 128 32" stroke="rgba(255,255,255,.45)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M50 25 Q60 13 75 12 L75 25 Z" fill="#2b3f5c" stroke="#1a1a1a" stroke-width="1.8"/>
    <path d="M79 12 Q100 12 109 26 L79 26 Z" fill="#fff" stroke="#1a1a1a" stroke-width="2"/>
    <g class="eyes">
      <ellipse cx="88" cy="19.5" rx="5" ry="5.6" fill="#fff"/>
      <ellipse cx="99.5" cy="20.5" rx="4.4" ry="5" fill="#fff"/>
      <circle cx="90" cy="20" r="3.3" fill="#3d7be0"/><circle cx="90.6" cy="20" r="1.7" fill="#111"/><circle cx="91.4" cy="18.8" r=".8" fill="#fff"/>
      <circle cx="101.2" cy="21" r="3" fill="#3d7be0"/><circle cx="101.8" cy="21" r="1.5" fill="#111"/><circle cx="102.5" cy="19.9" r=".7" fill="#fff"/>
      <g class="lids">
        <rect x="80" y="12.5" width="28" height="13.5" fill="var(--car)"/>
      </g>
    </g>
    <path d="M121 39 Q128 43 134 38" stroke="#1a1a1a" stroke-width="1.8" fill="#fff" stroke-linecap="round"/>
    <path d="M124 31 Q129 31 131 34 L125 35 Z" fill="#ffe35a" stroke="#1a1a1a" stroke-width="1.2"/>
    <path d="M16 33 L44 32 L38 36.5 L64 35 L28 45 L34 39.5 L13 40 Z" fill="#ffd31a" stroke="#c0392b" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="76" cy="37" r="8.5" fill="#fff" stroke="#1a1a1a" stroke-width="1.8"/>
    <text x="76" y="41.3" text-anchor="middle" font-family="'Russo One', Impact, sans-serif" font-size="11.5" fill="#1a1a1a">${number}</text>
    <g class="wheel"><circle cx="33" cy="46" r="9.5" fill="#1a1a1a"/><circle cx="33" cy="46" r="5" fill="var(--car)" stroke="#ddd" stroke-width="1.5"/><circle cx="33" cy="46" r="1.6" fill="#ddd"/><path d="M33 41.5 V43.5 M33 48.5 V50.5 M28.5 46 H30.5 M35.5 46 H37.5" stroke="#ddd" stroke-width="1.4"/></g>
    <g class="wheel"><circle cx="111" cy="46" r="9.5" fill="#1a1a1a"/><circle cx="111" cy="46" r="5" fill="var(--car)" stroke="#ddd" stroke-width="1.5"/><circle cx="111" cy="46" r="1.6" fill="#ddd"/><path d="M111 41.5 V43.5 M111 48.5 V50.5 M106.5 46 H108.5 M113.5 46 H115.5" stroke="#ddd" stroke-width="1.4"/></g>
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

function say(text) {
  if (state.muted || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 1;
    u.pitch = 1.1;
    const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
    if (voice) u.voice = voice;
    synth.speak(u);
  } catch (e) { /* pas de voix disponible */ }
}

function announceTurn() {
  const p = state.players[state.current];
  if (!p || state.screen !== 'race') return;
  const left = state.goal - p.km;
  const hint = left <= HELP_FROM ? ` Plus que ${left} kilomètres !` : '';
  say(`C'est au tour de ${p.name} ! Pioche une carte.${hint}`);
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
}

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
  startRace();
});

/* ---------- Course ---------- */

function startRace() {
  state.screen = 'race'; state.phase = 'draw'; save();
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
    n, laneW, half, r, a, portrait, carW, carH: carW * 0.4,
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
    if (i === state.current) {
      const halo = road.querySelector('.halo');
      halo.setAttribute('transform', `translate(${c.x} ${c.y}) rotate(${c.angle})`);
      const tag = road.querySelector('.tag-text');
      tag.setAttribute('x', c.x);
      tag.setAttribute('y', c.y - carH / 2 - 14);
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
      <span class="board-left">${p.km >= goal ? 'Arrivé' : `reste ${goal - p.km}`}</span>
    </button>`;
  }).join('');

  const cur = state.players[state.current];
  const remaining = goal - cur.km;
  const banner = $('#turn-banner');
  banner.style.setProperty('--car', cur.color);
  banner.innerHTML = `
    <div class="turn-who">
      <span class="turn-car">${carSvg(cur.color, cur.number)}</span>
      <span class="turn-text">À toi,<br><b>${escapeHtml(cur.name)}</b> !</span>
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

  $('#cards').innerHTML = CARDS.map((c) => `
    <button class="card" data-km="${c.km}" style="--card:${c.color}" ${c.km > remaining ? 'disabled' : ''}
            aria-label="${c.km} kilomètres, ${c.name}">
      <span class="card-corner">${c.km}</span>
      <span class="card-borne">${borneSvg(c.km, 'KM')}</span>
      <span class="card-animal">${c.emoji}</span>
      <span class="card-name">${c.name}</span>
    </button>`).join('');

  const drawing = state.phase !== 'play';
  $('#draw-zone').hidden = !drawing;
  $('#play-zone').hidden = drawing;
  $('.draw-title').textContent = `${cur.name}, pioche une carte !`;
  $('#btn-undo').disabled = state.log.length === 0;
}

function addKm(km) {
  const i = state.current;
  const p = state.players[i];
  if (p.km + km > state.goal) { sfx.nope(); return; }
  p.km += km;
  state.log.push({ player: i, km });

  const car = $('#road').querySelector(`.car[data-index="${i}"]`);
  car.classList.remove('boost'); void car.getBoundingClientRect(); car.classList.add('boost');
  trackEffects(i, km);
  vroom(km / 200);
  if (km === 200) flash();

  if (p.km >= state.goal) {
    renderRace();
    $('#turn-banner').innerHTML = `<span class="turn-text"><b>${escapeHtml(p.name)}</b> passe la ligne !</span>`;
    save();
    setTimeout(() => showWinner(i), 1600);
    return;
  }

  giveTurn((i + 1) % state.players.length);
  sfx.turn();
  setTimeout(announceTurn, 1000);
}

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
  save();
  renderRace();
}

function select(i) {
  if (state.players[i].km >= state.goal || i === state.current) return;
  sfx.click(); giveTurn(i); announceTurn();
}

$('#cards').addEventListener('click', (e) => {
  const b = e.target.closest('.card'); if (!b || b.disabled) return;
  addKm(Number(b.dataset.km));
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
  state.players[last.player].km -= last.km;
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
  state.players.forEach((p) => { p.km = 0; });
  state.current = 0; state.log = [];
  startRace();
});

$('#btn-new').addEventListener('click', newGame);

/* ---------- Navigation ---------- */

function show(screen) {
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

/* ---------- Démarrage ---------- */

renderSound();
if (state.screen === 'race' && state.players.length) { show('race'); renderRace(true); }
else if (state.screen === 'win' && state.players.length) { show('win'); renderWinner(); }
else { state.screen = 'setup'; show('setup'); renderSetup(); }
