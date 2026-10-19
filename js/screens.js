'use strict';

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
  $('#rules-buttons').innerHTML = [
    ['discovery', 'Découverte', 'Règles simplifiées'],
    ['full', 'Règles complètes', 'Comme le vrai jeu'],
    ['km', 'Km seulement', 'Partie rapide'],
  ].map(([id, t, sub]) => `
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
  state.manches = [];
  recomputeKm();
  startRace();
});

/* ---------- Arrivée ---------- */

function showWinner(index) {
  state.screen = 'win';
  state.winner = index;
  // La manche n'est ajoutée au cumul qu'une seule fois (même si on recharge la page)
  if (!state.scored) {
    state.manches.push(scoreManche(index).map((x) => x.total));
    state.scored = true;
  }
  save();
  show('win');
  renderWinner();
  sfx.win();
  confetti();
  const scores = scoreManche(index);
  const best = index >= 0 ? index : scores.map((x, i) => i).sort((x, y) => scores[y].total - scores[x].total)[0];
  const p = state.players[best];
  setTimeout(() => say(index >= 0
    ? `Bravo ${p.name} ! Tu as gagné la course, et tu marques ${scores[best].total} points !`
    : scores[best].total > 0
      ? `Fin de la manche ! ${p.name} marque le plus de points : ${scores[best].total}.`
      : 'Fin de la manche ! Personne ne marque de points cette fois.'), 900);
}

function renderWinner() {
  const index = state.winner;
  const scores = scoreManche(index);
  const tot = totals();
  const order = state.players.map((p, i) => i).sort((x, y) => scores[y].total - scores[x].total || state.players[y].km - state.players[x].km);
  const hero = state.players[index >= 0 ? index : order[0]] || state.players[0];
  $('.win-kicker').textContent = index >= 0 ? 'Champion de la course' : 'Fin de la manche – le plus de points';
  $('#win-title').textContent = hero.name;
  $('#win-car').innerHTML = carSvg(hero.color, hero.number);

  // Grand champion : le premier à 5000 points
  const leader = tot.indexOf(Math.max(...tot));
  const champ = $('#grand-champion');
  champ.hidden = tot[leader] < GOAL_POINTS;
  champ.textContent = `🏆 ${state.players[leader].name} dépasse ${GOAL_POINTS} points : grand champion de la partie !`;

  $('#score-board').innerHTML = order.map((i, n) => {
    const p = state.players[i];
    return `
      <div class="score-row ${i === index ? 'winner' : ''}" style="--car:${p.color}">
        <div class="score-head">
          <span class="pos">P${n + 1}</span>
          <span class="mini-car">${carSvg(p.color, p.number)}</span>
          <span class="rank-name">${escapeHtml(p.name)}</span>
          <span class="score-total">${scores[i].total}<small> pts</small></span>
        </div>
        <ul class="score-lines">${scores[i].lines.map((l) => `<li><span>${l.label}</span><b>+${l.pts}</b></li>`).join('') || '<li><span>Pas de points cette manche</span><b>0</b></li>'}</ul>
        <div class="score-cumul">
          <span>Total de la partie : <b>${tot[i]}</b> / ${GOAL_POINTS}</span>
          <span class="cumul-gauge"><span style="width:${Math.min(100, (tot[i] / GOAL_POINTS) * 100)}%"></span></span>
          ${state.manches.length > 1 ? `<small>${state.manches.length} manches jouées</small>` : ''}
        </div>
      </div>`;
  }).join('');

  // Retardement : seul le jeu réel sait si la pioche était vide
  const delayRow = $('#delay-row');
  delayRow.hidden = !(index >= 0 && fullRules());
  $('#chk-delayed').checked = state.delayed;
  if (index >= 0) $('#delay-text').textContent = `La pioche était déjà vide quand ${hero.name} est arrivé (retardement, +300)`;

  const stats = raceStats();
  const champion = (key) => {
    const max = Math.max(...stats.map((x) => x[key]));
    return max > 0 ? stats.map((x, i) => (x[key] === max ? state.players[i].name : null)).filter(Boolean).join(' et ') : null;
  };
  const badges = [
    ['🏹', 'Le plus taquin', champion('attacks'), 'a posé le plus d\'attaques'],
    ['🛡️', 'Le plus protégé', champion('safeties'), 'a posé le plus de bottes'],
    ['🐦', 'Le plus rapide', champion('n200'), 'a posé le plus de cartes 200'],
  ].filter((b) => b[2]);
  $('#race-film').innerHTML = `
    <p class="film-intro">${state.log.length} coups joués pendant cette manche.</p>
    ${badges.length ? `<div class="badges">${badges.map(([icon, title, who, why]) => `
      <div class="badge"><span class="badge-icon">${icon}</span><b>${title}</b><span>${escapeHtml(who)}</span><small>${why}</small></div>`).join('')}</div>` : ''}
    <div class="film-table ${fullRules() ? '' : 'km'}">
      <div class="film-row film-header"><span>Pilote</span><span>Cartes km</span>${fullRules() ? '<span>Attaques posées</span><span>Attaques reçues</span><span>Bottes</span>' : ''}</div>
      ${state.players.map((p, i) => `
        <div class="film-row" style="--car:${p.color}"><span class="film-name">${escapeHtml(p.name)}</span><span>${stats[i].kmCards}</span>
        ${fullRules() ? `<span>${stats[i].attacks}</span><span>${stats[i].received}</span><span>${stats[i].safeties}${stats[i].cf ? ` (${stats[i].cf} c. fourré)` : ''}</span>` : ''}</div>`).join('')}
    </div>`;
}

$('#chk-delayed').addEventListener('change', (e) => {
  state.delayed = e.target.checked;
  // On remplace les points de la manche en cours dans le cumul
  state.manches[state.manches.length - 1] = scoreManche(state.winner).map((x) => x.total);
  save();
  sfx.click();
  renderWinner();
});

// Fin de manche sans gagnant : la pioche est vide et plus personne ne peut jouer
$('#btn-end').addEventListener('click', () => {
  dialog('Fin de la manche ?', '<p class="dialog-text">La pioche est vide et plus personne ne peut jouer ? On compte les points.</p>', [
    { label: '🏁 Oui, on compte les points', cls: 'go', onClick: () => { stopListening(); showWinner(-1); } },
    { label: 'Non, on continue' },
  ]);
});

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
  if (screen !== 'race') { stopListening(); if (!$('#scan').hidden) closeScan(); }
  ['setup', 'race', 'win'].forEach((s) => { $(`#screen-${s}`).hidden = s !== screen; });
  $('#btn-home').hidden = screen === 'setup';
  $('#btn-mode').hidden = screen !== 'race';
  renderMode(screen);
  window.scrollTo(0, 0);
}

function newGame() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.screen = 'setup'; state.players = []; state.log = []; state.manches = [];
  save(); show('setup'); renderSetup();
}

$('#btn-home').addEventListener('click', () => {
  if (state.screen === 'race' && state.log.length && !confirm('Arrêter la course et revenir au menu ?')) return;
  newGame();
});

$('#btn-music').addEventListener('click', () => {
  state.music = !state.music;
  if (state.music && state.muted) { state.muted = false; renderSound(); }
  save(); renderMusic(); sfx.click();
});

$('#chk-commentator').addEventListener('change', (e) => { state.commentator = e.target.checked; save(); });

function renderSound() {
  $('#btn-sound').textContent = state.muted ? '🔇' : '🔊';
  $('#btn-sound').setAttribute('aria-label', state.muted ? 'Activer le son' : 'Couper le son');
}

$('#btn-sound').addEventListener('click', () => {
  state.muted = !state.muted; save(); renderSound(); renderMusic(); sfx.click();
  if (state.muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

/* ---------- Mode Enfant / Mode Parent ---------- */

const HOLD_MS = 1000; // appui long pour passer en mode Parent
let holdTimer = null;
let holdDone = false;

function renderMode(screen = state.screen) {
  const child = state.uiMode !== 'parent';
  const b = $('#btn-mode');
  document.body.classList.toggle('mode-child', child && screen === 'race');
  let learned = false;
  try { learned = !!localStorage.getItem(SCAN_KEY); } catch (e) { /* stockage indisponible */ }
  document.body.classList.toggle('has-scan', learned);
  b.textContent = child ? '🧒' : '🧑‍🔧';
  b.setAttribute('aria-label', child ? 'Mode parent : garder le doigt appuyé' : 'Revenir au mode enfant');
  if (child) document.querySelectorAll('.widget.expanded').forEach((w) => toggleExpand(w.dataset.widget));
  refitTrack();
}

function setMode(mode) {
  state.uiMode = mode; save(); renderMode(); sfx.click();
}

function cancelHold() {
  clearTimeout(holdTimer); holdTimer = null;
  $('#btn-mode').classList.remove('holding');
}

$('#btn-mode').addEventListener('pointerdown', () => {
  holdDone = false;
  if (state.uiMode === 'parent') return;
  $('#btn-mode').classList.add('holding');
  holdTimer = setTimeout(() => { cancelHold(); holdDone = true; setMode('parent'); toast('Mode parent : toutes les options sont visibles.'); }, HOLD_MS);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('#btn-mode').addEventListener(ev, cancelHold));
$('#btn-mode').addEventListener('contextmenu', (e) => e.preventDefault());

$('#btn-mode').addEventListener('click', () => {
  if (holdDone) { holdDone = false; return; }
  if (state.uiMode === 'parent') setMode('child');
  else toast('Pour le mode parent, garde le doigt appuyé 1 seconde sur 🧒.');
});

/* ---------- Widgets : réduire, agrandir, déplacer ---------- */

const widget = (name) => document.querySelector(`.widget[data-widget="${name}"]`);

function applyLayout() {
  const box = $('#widgets');
  const order = (state.layout.order || []).filter((w) => WIDGETS.includes(w));
  WIDGETS.forEach((w, k) => {
    if (order.includes(w)) return;
    const after = order.indexOf(WIDGETS[k - 1]);
    order.splice(after + 1, 0, w);
  });
  order.forEach((name) => box.appendChild(widget(name)));
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
  if (!bar || e.target.closest('button') || document.body.classList.contains('mode-child')) return;
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
renderMusic();
$('#chk-commentator').checked = state.commentator;
applyLayout();
if (state.players.length) { recomputeKm(); cardTab = autoTab(state.current); }
renderListen();
if (state.screen === 'race' && state.players.length) { show('race'); renderRace(true); }
else if (state.screen === 'win' && state.players.length) { show('win'); renderWinner(); }
else { state.screen = 'setup'; show('setup'); renderSetup(); }
