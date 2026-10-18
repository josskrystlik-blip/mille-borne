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
  { km: 25,  emoji: '🐌', name: 'Escargot',   color: '#43a047' },
  { km: 50,  emoji: '🦆', name: 'Canard',     color: '#00897b' },
  { km: 75,  emoji: '🦋', name: 'Papillon',   color: '#8e24aa' },
  { km: 100, emoji: '🐇', name: 'Lièvre',     color: '#1e88e5' },
  { km: 200, emoji: '🐦', name: 'Hirondelle', color: '#f4511e' },
];

const CHEERS = ['Vroum !', 'Turbo !', 'Fonce !', 'Trop fort !', 'En avant !', 'Super !', 'Pleins gaz !', 'Waouh !'];

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

function carSvg(color, number) {
  return `
  <svg class="car-svg" viewBox="0 0 124 66" style="--car:${color}">
    <ellipse cx="62" cy="61" rx="52" ry="4" fill="rgba(0,0,0,.28)"/>
    <path d="M6 31 L3 17 L19 17 L22 29" fill="var(--car)" stroke="#222" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M8 46 Q5 31 22 29 L40 27 Q52 10 73 12 Q89 14 97 28 L111 32 Q120 36 118 47 L114 52 L10 52 Z"
          fill="var(--car)" stroke="#222" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M46 28 Q55 15 70 15 L70 28 Z" fill="#9fd8ff" stroke="#222" stroke-width="2"/>
    <path d="M74 15 Q89 17 95 29 L74 29 Z" fill="#fff" stroke="#222" stroke-width="2"/>
    <circle class="eye" cx="80" cy="23" r="3.6" fill="#3a6fd8"/><circle cx="80.8" cy="22.4" r="1.6" fill="#111"/>
    <circle class="eye" cx="89" cy="24.5" r="3.2" fill="#3a6fd8"/><circle cx="89.6" cy="24" r="1.4" fill="#111"/>
    <path d="M20 35 L42 35 L37 39 L56 39 L30 48 L34 43 L16 43 Z" fill="#ffd400" stroke="#222" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="70" cy="40" r="9" fill="#fff" stroke="#222" stroke-width="2"/>
    <text x="70" y="44.5" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="13" fill="#222">${number}</text>
    <path d="M104 40 Q112 40 115 44" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g class="wheel"><circle cx="32" cy="52" r="10" fill="#1b1b1b"/><circle cx="32" cy="52" r="5" fill="#c9c9c9"/><path d="M27 52 H37 M32 47 V57" stroke="#777" stroke-width="1.5"/></g>
    <g class="wheel"><circle cx="94" cy="52" r="10" fill="#1b1b1b"/><circle cx="94" cy="52" r="5" fill="#c9c9c9"/><path d="M89 52 H99 M94 47 V57" stroke="#777" stroke-width="1.5"/></g>
  </svg>`;
}

function borneSvg(label) {
  return `
  <svg class="borne-svg" viewBox="0 0 30 38">
    <path d="M3 37 L3 14 Q3 3 15 3 Q27 3 27 14 L27 37 Z" fill="#fff" stroke="#333" stroke-width="2"/>
    <path d="M3 14 Q3 3 15 3 Q27 3 27 14 Z" fill="#e10600" stroke="#333" stroke-width="2"/>
    <text x="15" y="29" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="${label >= 1000 ? 8 : 10}" fill="#222">${label}</text>
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
    <button class="count-btn ${n === state.count ? 'active' : ''}" data-count="${n}">
      <span class="count-num">${n}</span>
      <span class="count-cars">${'🏎️'.repeat(n)}</span>
    </button>`).join('');

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
      <span class="goal-sub">${g === 700 ? 'Course courte' : 'Grande course'}</span>
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

function laneLayout() {
  return state.players.length > 4 ? 'compact' : '';
}

function renderRace(initial = false) {
  const goal = state.goal;
  const leaderKm = Math.max(...state.players.map((p) => p.km));
  const leaders = state.players.filter((p) => p.km === leaderKm);
  const lanes = $('#lanes');
  lanes.className = `lanes ${laneLayout()}`;

  if (initial || lanes.children.length !== state.players.length) {
    const bornes = [];
    for (let k = 100; k < goal; k += 100) bornes.push(k);
    lanes.innerHTML = state.players.map((p, i) => `
      <div class="lane" data-index="${i}" style="--car:${p.color}">
        <div class="lane-head">
          <span class="lane-name"><span class="lane-dot"></span><span class="name"></span><span class="crown">🏆</span></span>
          <span class="lane-km"><b class="km"></b> km <small class="left"></small></span>
        </div>
        <div class="road">
          <div class="trail"></div>
          <div class="start-line"></div>
          ${bornes.map((k) => `<div class="borne" style="--b:${k / goal}">${borneSvg(k)}</div>`).join('')}
          <div class="finish"><div class="flag">🏁</div></div>
          <div class="car">${carSvg(p.color, p.number)}<span class="bubble"></span></div>
        </div>
      </div>`).join('');
  }

  state.players.forEach((p, i) => {
    const lane = lanes.children[i];
    lane.classList.toggle('active', i === state.current);
    lane.classList.toggle('done', p.km >= goal);
    lane.querySelector('.name').textContent = p.name;
    lane.querySelector('.crown').hidden = !(p.km > 0 && leaders.length === 1 && leaders[0] === p);
    lane.querySelector('.km').textContent = p.km;
    lane.querySelector('.left').textContent = p.km >= goal ? '🎉 Arrivé !' : `encore ${goal - p.km}`;
    lane.style.setProperty('--p', Math.min(p.km / goal, 1));
  });

  const cur = state.players[state.current];
  const remaining = goal - cur.km;
  $('#turn-banner').innerHTML = `
    <span class="turn-car" style="--car:${cur.color}">${carSvg(cur.color, cur.number)}</span>
    <span>C'est à <b>${escapeHtml(cur.name)}</b> !</span>`;
  $('#turn-banner').style.setProperty('--car', cur.color);

  $('#cards').innerHTML = CARDS.map((c) => `
    <button class="card" data-km="${c.km}" style="--card:${c.color}" ${c.km > remaining ? 'disabled' : ''}
            aria-label="${c.km} kilomètres, ${c.name}">
      <span class="card-km">${c.km}</span>
      <span class="card-emoji">${c.emoji}</span>
      <span class="card-blocks">${'<i></i>'.repeat(c.km / 25)}</span>
    </button>`).join('');

  $('#btn-undo').disabled = state.log.length === 0;
}

function addKm(km) {
  const i = state.current;
  const p = state.players[i];
  if (p.km + km > state.goal) { sfx.nope(); return; }
  p.km += km;
  state.log.push({ player: i, km });

  const lane = $('#lanes').children[i];
  const car = lane.querySelector('.car');
  const bubble = car.querySelector('.bubble');
  bubble.textContent = `+${km}`;
  car.classList.remove('boost'); bubble.classList.remove('show');
  void car.offsetWidth;
  car.classList.add('boost'); bubble.classList.add('show');
  puffs(lane.querySelector('.road'), car);
  vroom(km / 200);
  if (km === 200) flash();

  if (p.km >= state.goal) {
    renderRace();
    $('#turn-banner').innerHTML = `<span class="cheer">🏁 ${escapeHtml(p.name)} a gagné !</span>`;
    document.body.classList.add('finishing');
    save();
    setTimeout(() => { document.body.classList.remove('finishing'); showWinner(i); }, 1600);
    return;
  }

  state.current = (i + 1) % state.players.length;
  save();
  renderRace();
  const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  const banner = $('#turn-banner');
  banner.insertAdjacentHTML('afterbegin', `<span class="cheer-pop">${cheer}</span>`);
}

function puffs(road, car) {
  const rect = car.getBoundingClientRect(); const rr = road.getBoundingClientRect();
  for (let n = 0; n < 6; n++) {
    const s = document.createElement('span');
    s.className = 'puff';
    s.style.left = `${rect.left - rr.left + 4}px`;
    s.style.top = `${rect.top - rr.top + rect.height * 0.6}px`;
    s.style.setProperty('--dx', `${-20 - Math.random() * 40}px`);
    s.style.setProperty('--dy', `${-10 - Math.random() * 20}px`);
    s.style.animationDelay = `${n * 60}ms`;
    road.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function flash() {
  const f = $('#flash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}

$('#cards').addEventListener('click', (e) => {
  const b = e.target.closest('.card'); if (!b || b.disabled) return;
  addKm(Number(b.dataset.km));
});

$('#lanes').addEventListener('click', (e) => {
  const lane = e.target.closest('.lane'); if (!lane) return;
  const i = Number(lane.dataset.index);
  if (state.players[i].km >= state.goal) return;
  state.current = i; sfx.click(); save(); renderRace();
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
  $('#win-title').innerHTML = `🏆 Bravo ${escapeHtml(w.name)} ! 🏆`;
  $('#win-car').innerHTML = carSvg(w.color, w.number);
  const medals = ['🥇', '🥈', '🥉'];
  $('#ranking').innerHTML = [...state.players]
    .sort((a, b) => b.km - a.km)
    .map((p, i) => `
      <li style="--car:${p.color}">
        <span class="medal">${medals[i] || '🏎️'}</span>
        <span class="mini-car">${carSvg(p.color, p.number)}</span>
        <span class="rank-name">${escapeHtml(p.name)}</span>
        <span class="rank-km">${p.km} km</span>
      </li>`).join('');
}

function confetti() {
  const box = $('#confetti');
  box.innerHTML = '';
  const colors = ['#e10600', '#ffc400', '#1e6fe0', '#18a558', '#fff', '#111'];
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
