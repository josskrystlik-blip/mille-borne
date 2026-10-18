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
const NUMBERS = [7, 12, 23, 31, 58, 88];
const DEFAULT_NAMES = ['Pilote 1', 'Pilote 2', 'Pilote 3', 'Pilote 4', 'Pilote 5', 'Pilote 6'];

// Les cartes « étape » du Mille Bornes, avec leur animal
const CARDS = [
  { km: 25,  emoji: '🐌', name: 'Escargot',   color: '#2e9d4a' },
  { km: 50,  emoji: '🦆', name: 'Canard',     color: '#0b8a8a' },
  { km: 75,  emoji: '🦋', name: 'Papillon',   color: '#7b3fbf' },
  { km: 100, emoji: '🐇', name: 'Lièvre',     color: '#1d63c8' },
  { km: 200, emoji: '🐦', name: 'Hirondelle', color: '#e0451b' },
];

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

// Voiture de course vue de profil, tournée vers la droite
function carSvg(color, number) {
  return `
  <svg class="car-svg" viewBox="0 0 140 50" style="--car:${color}">
    <ellipse cx="70" cy="46" rx="62" ry="3.5" fill="rgba(0,0,0,.45)"/>
    <path d="M4 22 L4 12 L20 12 L22 21" fill="#111" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
    <path d="M6 36 L6 26 Q8 21 22 20 L46 18 Q58 7 78 7 Q94 7 104 18 L126 22 Q136 25 136 33 L134 38 L8 38 Z"
          fill="var(--car)" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
    <path d="M54 18 Q63 10 77 10 L77 18 Z M81 10 Q93 10 100 18 L81 18 Z" fill="#1b2633"/>
    <path d="M57 15 L62 11" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round"/>
    <path d="M10 28 L132 28" stroke="rgba(255,255,255,.85)" stroke-width="3"/>
    <path d="M10 32 L132 32" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <path d="M126 24 L134 26" stroke="#ffe680" stroke-width="3" stroke-linecap="round"/>
    <rect x="66" y="21" width="22" height="14" rx="3" fill="#fff" stroke="#111" stroke-width="1.5"/>
    <text x="77" y="32.5" text-anchor="middle" font-family="'Russo One', Impact, sans-serif" font-size="12" fill="#111">${number}</text>
    <g class="wheel"><circle cx="34" cy="38" r="9" fill="#111"/><circle cx="34" cy="38" r="4.5" fill="#bbb"/><path d="M29.5 38 H38.5 M34 33.5 V42.5" stroke="#666" stroke-width="1.5"/></g>
    <g class="wheel"><circle cx="112" cy="38" r="9" fill="#111"/><circle cx="112" cy="38" r="4.5" fill="#bbb"/><path d="M107.5 38 H116.5 M112 33.5 V42.5" stroke="#666" stroke-width="1.5"/></g>
  </svg>`;
}

// Borne kilométrique française : corps blanc, tête rouge
function borneSvg(label, cap = '') {
  const size = String(label).length >= 4 ? 10 : 12;
  return `
  <svg class="borne-svg" viewBox="0 0 30 40">
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

const sfx = {
  click: () => tone(660, 0, 0.08, 'triangle', 0.1),
  beep: () => tone(440, 0, 0.25, 'square', 0.1),
  go: () => tone(880, 0, 0.5, 'square', 0.12),
  undo: () => { tone(500, 0, 0.1, 'triangle'); tone(350, 0.1, 0.15, 'triangle'); },
  nope: () => { tone(200, 0, 0.15, 'square', 0.08); tone(150, 0.15, 0.2, 'square', 0.08); },
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
  state.screen = 'race'; save();
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
  setTimeout(() => { overlay.hidden = true; }, steps.length * 800 + 300);
}

// Classement : position de chaque joueur (les ex æquo partagent la même place)
function positions() {
  return state.players.map((p) => 1 + state.players.filter((q) => q.km > p.km).length);
}

function buildRoad() {
  const goal = state.goal;
  const marks = [];
  for (let k = 100; k < goal; k += 100) marks.push(k);
  const road = $('#road');
  road.style.setProperty('--n', state.players.length);
  road.classList.toggle('many', state.players.length > 4);
  road.innerHTML = `
    <div class="bornes">
      <div class="borne start-borne" style="--b:0">${borneSvg(0, 'KM')}</div>
      ${marks.map((k) => `<div class="borne" style="--b:${k / goal}">${borneSvg(k, 'KM')}</div>`).join('')}
      <div class="borne goal-borne" style="--b:1">${borneSvg(goal, 'KM')}</div>
    </div>
    <div class="asphalt">
      ${marks.map((k) => `<div class="gridline ${k % 500 === 0 ? 'half' : ''}" style="--b:${k / goal}"></div>`).join('')}
      <div class="start-line"></div>
      <div class="finish-line"></div>
      ${state.players.map((p, i) => `
        <div class="lane" data-index="${i}" style="--car:${p.color}">
          <div class="trail"></div>
          <div class="car">${carSvg(p.color, p.number)}<span class="tag"></span><span class="bubble"></span></div>
        </div>`).join('')}
    </div>`;
}

function renderRace(initial = false) {
  const goal = state.goal;
  const road = $('#road');
  if (initial || road.querySelectorAll('.lane').length !== state.players.length) buildRoad();

  const pos = positions();
  road.querySelectorAll('.lane').forEach((lane, i) => {
    const p = state.players[i];
    const progress = Math.min(p.km / goal, 1);
    lane.style.setProperty('--p', progress);
    lane.classList.toggle('active', i === state.current);
    lane.classList.toggle('done', p.km >= goal);
    // L'étiquette du prénom passe devant la voiture tant qu'il n'y a pas la place derrière
    lane.classList.toggle('tag-front', progress < 0.18);
    lane.querySelector('.tag').textContent = p.name;
  });

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
    <span class="turn-car">${carSvg(cur.color, cur.number)}</span>
    <span class="turn-text">Au tour de <b>${escapeHtml(cur.name)}</b></span>`;

  $('#cards').innerHTML = CARDS.map((c) => `
    <button class="card" data-km="${c.km}" style="--card:${c.color}" ${c.km > remaining ? 'disabled' : ''}
            aria-label="${c.km} kilomètres, ${c.name}">
      <span class="card-corner">${c.km}</span>
      <span class="card-borne">${borneSvg(c.km, 'KM')}</span>
      <span class="card-animal">${c.emoji}</span>
      <span class="card-name">${c.name}</span>
    </button>`).join('');

  $('#btn-undo').disabled = state.log.length === 0;
}

function addKm(km) {
  const i = state.current;
  const p = state.players[i];
  if (p.km + km > state.goal) { sfx.nope(); return; }
  p.km += km;
  state.log.push({ player: i, km });

  const lane = $('#road').querySelectorAll('.lane')[i];
  const car = lane.querySelector('.car');
  const bubble = car.querySelector('.bubble');
  bubble.textContent = `+${km}`;
  car.classList.remove('boost'); bubble.classList.remove('show');
  void car.offsetWidth;
  car.classList.add('boost'); bubble.classList.add('show');
  smoke(lane, car);
  vroom(km / 200);
  if (km === 200) flash();

  if (p.km >= state.goal) {
    renderRace();
    $('#turn-banner').innerHTML = `<span class="turn-text"><b>${escapeHtml(p.name)}</b> passe la ligne !</span>`;
    save();
    setTimeout(() => showWinner(i), 1600);
    return;
  }

  state.current = (i + 1) % state.players.length;
  save();
  renderRace();
}

function smoke(lane, car) {
  const rect = car.getBoundingClientRect(); const lr = lane.getBoundingClientRect();
  for (let n = 0; n < 5; n++) {
    const s = document.createElement('span');
    s.className = 'puff';
    s.style.left = `${rect.left - lr.left}px`;
    s.style.top = `${rect.top - lr.top + rect.height * 0.55}px`;
    s.style.setProperty('--dx', `${-20 - Math.random() * 40}px`);
    s.style.setProperty('--dy', `${-6 - Math.random() * 12}px`);
    s.style.animationDelay = `${n * 60}ms`;
    lane.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function flash() {
  const f = $('#flash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}

function select(i) {
  if (state.players[i].km >= state.goal) return;
  state.current = i; sfx.click(); save(); renderRace();
}

$('#cards').addEventListener('click', (e) => {
  const b = e.target.closest('.card'); if (!b || b.disabled) return;
  addKm(Number(b.dataset.km));
});

$('#road').addEventListener('click', (e) => {
  const lane = e.target.closest('.lane'); if (lane) select(Number(lane.dataset.index));
});

$('#board').addEventListener('click', (e) => {
  const row = e.target.closest('.board-row'); if (row) select(Number(row.dataset.index));
});

$('#btn-next').addEventListener('click', () => {
  state.current = (state.current + 1) % state.players.length;
  sfx.click(); save(); renderRace();
});

$('#btn-undo').addEventListener('click', () => {
  const last = state.log.pop(); if (!last) return;
  state.players[last.player].km -= last.km;
  state.current = last.player;
  sfx.undo(); save(); renderRace();
});

/* ---------- Arrivée ---------- */

function showWinner(index) {
  state.screen = 'win';
  state.winner = index;
  save();
  show('win');
  renderWinner();
  sfx.win();
  confetti();
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
  const colors = ['#e10600', '#ffcc00', '#fff', '#111'];
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
});

/* ---------- Démarrage ---------- */

renderSound();
if (state.screen === 'race' && state.players.length) { show('race'); renderRace(true); }
else if (state.screen === 'win' && state.players.length) { show('win'); renderWinner(); }
else { state.screen = 'setup'; show('setup'); renderSetup(); }
