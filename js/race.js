'use strict';

/* ---------- Course ---------- */

function startRace() {
  state.screen = 'race'; state.phase = 'draw'; state.scored = false; state.delayed = false; cardTab = autoTab(state.current); save();
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
  setTimeout(() => {
    overlay.hidden = true;
    announceTurn(comment(`Et c'est parti pour ${state.goal} kilomètres de course !`));
  }, steps.length * 800 + 300);
}

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
    // État visible sur la voiture : fumée, roue à plat, moteur qui toussote, feu rouge
    const battle = fullRules() && p.km < goal && ACTIONS[p.battle] && ACTIONS[p.battle].kind === 'hazard' ? p.battle : '';
    ['accident', 'flat', 'fuel', 'red'].forEach((h) => {
      road.querySelector(`.car[data-index="${i}"]`).classList.toggle(`st-${h}`, battle === h);
      road.querySelector(`.car-fx[data-index="${i}"]`).classList.toggle(`st-${h}`, battle === h);
    });
    road.querySelector(`.car[data-index="${i}"]`).classList.toggle('st-limit', fullRules() && p.limited);
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
      <span class="board-name">${escapeHtml(p.name)}${state.stars[i] ? ` <span class="board-stars">⭐${state.stars[i]}</span>` : ''}</span>
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
  renderTable();
}

/* ---------- Vue « Cartes posées » : la table de chaque pilote ---------- */

function miniAct(id, extra = '') {
  return `<span class="mini-act ${extra}" title="${ACTIONS[id].name}">${actFace(id)}</span>`;
}

// Une pile : les cartes précédentes en petit, puis la carte du dessus
function pileHtml(pile, empty) {
  if (!pile.length) return `<span class="pile-empty">${empty}</span>`;
  const top = pile[pile.length - 1];
  const older = pile.slice(-4, -1);
  const from = top.from !== undefined ? `<span class="pile-from">posée par ${escapeHtml(state.players[top.from].name)}</span>` : '';
  return `
    ${older.length ? `<span class="pile-older">${older.map((c) => `<span class="older-chip" style="--card:${KINDS[ACTIONS[c.card].kind].color}" title="${ACTIONS[c.card].name}">${actionIcon(c.card)}</span>`).join('<i>›</i>')}<i>›</i></span>` : ''}
    <span class="pile-top">${miniAct(top.card)}${from}</span>`;
}

function zoneState(p) {
  if (p.km >= state.goal) return { cls: 'ok', text: '🏁 Arrivé !' };
  const need = needed(p);
  if (need) return { cls: 'stop', text: `Arrêté : il lui faut ${ACTIONS[need].name}` };
  if (p.limited) return { cls: 'slow', text: 'Roule, limité à 50' };
  return { cls: 'ok', text: 'Roule' };
}

function renderTable() {
  const box = $('#table');
  if (!fullRules()) {
    box.innerHTML = '<p class="table-empty">En mode « Km seulement », les cartes posées ne sont pas suivies.</p>';
    return;
  }
  box.innerHTML = state.players.map((p, i) => {
    const st = zoneState(p);
    return `
    <div class="zone ${i === state.current ? 'active' : ''}" data-index="${i}" style="--car:${p.color}" role="button" tabindex="0">
      <div class="zone-head">
        <span class="zone-car">${carSvg(p.color, p.number)}</span>
        <span class="zone-name">${escapeHtml(p.name)}</span>
        <span class="zone-state ${st.cls}">${st.text}</span>
      </div>
      <div class="zone-piles">
        <div class="pile"><span class="pile-label">Bataille</span>${pileHtml(p.battlePile, 'Pas encore de feu vert')}</div>
        <div class="pile"><span class="pile-label">Vitesse</span>${pileHtml(p.speedPile, 'Pas de limitation')}</div>
        <div class="pile pile-safeties"><span class="pile-label">Bottes</span>
          ${p.safetyCards.length ? `<span class="safety-row">${p.safetyCards.map((c) => `<span class="safety-card ${c.cf ? 'cf' : ''}">${miniAct(c.card)}${c.cf ? '<span class="cf-badge">Coup fourré !</span>' : ''}</span>`).join('')}</span>`
            : '<span class="pile-empty">Aucune botte</span>'}
        </div>
      </div>
    </div>`;
  }).join('');
}

$('#table').addEventListener('click', (e) => {
  const zone = e.target.closest('.zone'); if (zone) select(Number(zone.dataset.index));
});

let cardTab = 'km';

function kmCardHtml(c, blocked) {
  return `
    <button class="card ${blocked ? 'blocked' : ''}" data-km="${c.km}" style="--card:${c.color}"
            aria-label="${c.km} kilomètres, ${c.name}">${kmFace(c.km)}</button>`;
}

function actionCardHtml(id, blocked, wanted = false) {
  const kind = ACTIONS[id].kind;
  return `
    <button class="card act-card ${blocked ? 'blocked' : ''} ${wanted ? 'wanted' : ''}" data-card="${id}"
            style="--card:${KINDS[kind].color}" aria-label="${ACTIONS[id].name}">${actFace(id)}</button>`;
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
  const beforeKm = state.players.map((q) => q.km);
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

  const said = meta.source === 'voice' ? `${p.name} avance de ${km} kilomètres. ` : '';
  // Pilote apprenti : la voix compte les bornes passées
  const passed = p.learner && Math.floor(p.km / 100) > Math.floor(beforeKm[i] / 100) ? `${Math.floor(p.km / 100) * 100} ! ` : '';
  const before = passed + said + comment(kmComment(i, km, beforeKm));
  const nextTurn = (i + 1) % state.players.length;
  const next = (prefix = '') => {
    state.awaitTurn = null;
    giveTurn(nextTurn);
    sfx.turn();
    setTimeout(() => announceTurn(prefix || before), prefix ? 300 : 1000);
  };

  if (p.learner && state.learn.on) {
    if (shouldChallenge(state.learn)) {
      state.learn = { ...state.learn, skipped: 0 };
      state.awaitTurn = nextTurn;
      state.phase = 'draw';
      save();
      renderRace();
      setTimeout(() => runChallenge(i, km, beforeKm[i], passed, next), 1300);
      return true;
    }
    state.learn = { ...state.learn, skipped: (state.learn.skipped || 0) + 1 };
  }
  next();
  return true;
}

/* ---------- Apprendre en jouant : le défi du pilote apprenti ---------- */

function challengeVisual(ch, i) {
  if (!ch.visual) return '';
  if (ch.visual.type === 'bornes') {
    return `<div class="learn-bornes">${Array.from({ length: ch.visual.count }, (_, k) => borneSvg((k + 1) * 100, 'KM', 'learn-borne')).join('')}</div>`;
  }
  if (ch.visual.type === 'blocks') {
    const color = CARDS.find((c) => c.km === ch.visual.km).color;
    return `<div class="learn-blocks">
      <span class="learn-card">${kmFace(ch.visual.km)}</span>
      <span class="learn-block-row">${Array.from({ length: ch.visual.count }, () => `<span class="learn-block" style="--block:${color}"></span>`).join('')}</span>
    </div>`;
  }
  // Mini course : chaque voiture sur sa ligne, sans les chiffres
  return `<div class="learn-race">${state.players.map((q) => `
    <div class="learn-lane"><span class="learn-lane-car" style="left:calc((100% - 72px) * ${(q.km / state.goal).toFixed(3)})">${carSvg(q.color, q.number)}</span></div>`).join('')}
    <span class="learn-flag" aria-hidden="true">🏁</span></div>`;
}

function choiceHtml(c) {
  if (c.kind === 'player') {
    const q = state.players[c.value];
    return `<span class="answer-car">${carSvg(q.color, q.number)}</span><span>${escapeHtml(q.name)}</span>`;
  }
  if (c.kind === 'card') return `<span class="answer-card">${kmFace(c.value)}</span>`;
  return `<span class="answer-num">${c.label}</span>`;
}

function runChallenge(i, km, before, passed, next) {
  const p = state.players[i];
  const ch = makeChallenge(state.learn.level, {
    km, before, after: p.km, goal: state.goal, current: i,
    players: state.players.map((q) => ({ name: q.name, km: q.km })),
  });
  const answer = (k) => {
    const ok = k === ch.answer;
    state.learn = nextLevel(state.learn, ok);
    if (ok) {
      state.stars[i] = (state.stars[i] || 0) + 1;
      save();
      sfx.ding();
      starBurst();
      next(`Bravo ${p.name} ! ${ch.explain} Tu gagnes une étoile ! `);
      return;
    }
    save();
    dialog('Presque !',
      `<p class="dialog-text">${escapeHtml(ch.text)}</p>${challengeVisual(ch, i)}
       <div class="answer-grid">${ch.choices.map((c, n) => `<span class="answer-btn ${n === ch.answer ? 'right' : 'faded'}">${choiceHtml(c)}</span>`).join('')}</div>
       <p class="dialog-text learn-explain">${escapeHtml(ch.explain)}</p>`,
      [{ label: 'On continue ▶', cls: 'go', onClick: () => next() }],
      (t) => (/continue|suivant|d accord|ok/.test(t) ? 0 : -1));
    say(`Presque ! ${ch.explain}`);
  };
  dialog(`🎓 ${escapeHtml(p.name)}, petit défi !`,
    `<p class="dialog-text challenge-q">${escapeHtml(ch.text)}</p>${challengeVisual(ch, i)}`,
    ch.choices.map((c, k) => ({ label: choiceHtml(c), cls: 'answer-btn', onClick: () => answer(k) })),
    (t) => heardChoice(ch, t));
  $('#dialog-buttons').classList.add('answer-grid');
  say(`${passed}${p.name}, petit défi ! ${ch.say}`);
}

// Une étoile qui s'envole vers le tableau des positions
function starBurst() {
  const s = document.createElement('div');
  s.className = 'star-burst';
  s.textContent = '⭐';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 1400);
}

function playAction(card, target, meta = {}) {
  const i = state.current;
  const p = state.players[i];
  const a = ACTIONS[card];
  if (a.kind === 'hazard' && target === undefined) { chooseTarget(card, meta); return; }
  state.log.push({ player: i, card, target, source: meta.source || 'tap', heard: meta.heard || '' });
  if (meta.source === 'voice' || meta.source === 'camera') {
    toast(`${meta.source === 'camera' ? '📷' : '🎤'} ${p.name} : ${a.name}${a.kind === 'hazard' ? ` → ${state.players[target].name}` : ''}`, true);
  }
  recomputeKm();
  save();
  if (a.kind === 'hazard') {
    const t = state.players[target];
    cardSound(card);
    renderRace();
    say(`${p.name} met ${a.name} à ${t.name} ! ${comment(HAZARD_COMMENTS[card](t.name))}`);
    if (discovery()) {
      // Pas de coup fourré en mode Découverte : on passe au pilote suivant
      giveTurn((i + 1) % state.players.length);
      sfx.turn();
      setTimeout(() => announceTurn(), 1400);
    } else {
      askCoupFourre(i, target, card);
    }
    return;
  }
  if (a.kind === 'safety') {
    cardSound(card);
    flash();
    state.phase = 'draw';
    renderRace();
    shield(i);
    toast(`⭐ ${p.name} pose la botte ${a.name} et rejoue !`);
    const extra = comment(pick([`Quelle botte pour ${p.name} !`, `${p.name} est protégé pour toute la course !`]));
    setTimeout(() => say(`${extra}${a.name}. ${p.name}, tu rejoues : pioche une carte.`), 300);
    return;
  }
  cardSound(card);
  giveTurn((i + 1) % state.players.length);
  sfx.turn();
  setTimeout(() => announceTurn(`${a.name} pour ${p.name}. ${comment(remedyComment(p, card))}`), 900);
}

let dialogVoice = null;

// voice : (phrase normalisée) => numéro du bouton à « appuyer », ou -1
function dialog(title, body, buttons, voice = null) {
  dialogVoice = voice;
  $('#dialog-title').innerHTML = title;
  $('#dialog-body').innerHTML = body;
  $('#dialog-buttons').innerHTML = '';
  $('#dialog-buttons').classList.remove('answer-grid');
  buttons.forEach(({ label, cls = '', disabled = false, onClick }) => {
    const b = document.createElement('button');
    b.className = `big-btn ${cls}`;
    b.innerHTML = label;
    b.disabled = disabled;
    b.addEventListener('click', () => { $('#dialog').hidden = true; dialogVoice = null; if (onClick) onClick(); });
    $('#dialog-buttons').appendChild(b);
  });
  $('#dialog').hidden = false;
}

function chooseTarget(card, meta = {}) {
  const i = state.current;
  const ok = attackTargets(i, card);
  const others = state.players.map((t, k) => k).filter((k) => k !== i);
  dialog(`Qui attaques-tu avec <b>${ACTIONS[card].name}</b> ?`, `<div class="dialog-card">${actFace(card)}</div>`, [
    ...others.map((k) => {
      const t = state.players[k];
      const why = ok.includes(k) ? '' : has(t, ACTIONS[card].safety) ? ' (protégé par sa botte)'
        : card === 'limit' ? ' (déjà limité)' : ' (ne roule pas)';
      return { label: `<span class="dot" style="background:${t.color}"></span>${escapeHtml(t.name)}<small>${why}</small>`,
        cls: 'target-btn', disabled: !ok.includes(k), onClick: () => playAction(card, k, meta) };
    }),
    { label: 'Annuler', cls: 'cancel-btn' },
  ], (t) => {
    const words = ` ${t} `;
    const n = others.findIndex((k) => ok.includes(k) && words.includes(` ${normalize(state.players[k].name)} `));
    if (n >= 0) return n;
    return /\bannule/.test(t) ? others.length : -1;
  });
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
  // La seule carte qui permettrait le coup fourré est déjà posée : pas de question
  if (safetyOwner(safety) >= 0) { setTimeout(next, 1300); return; }
  setTimeout(() => {
    dialog(`Coup fourré ?`,
      `<div class="dialog-card">${actFace(safety)}</div>
       <p class="dialog-text"><b>${escapeHtml(t.name)}</b>, as-tu la botte <b>${ACTIONS[safety].name}</b> dans ta main ?
       Si oui, pose-la tout de suite et crie « Coup fourré ! »</p>`, [
        { label: '⭐ Oui, coup fourré !', cls: 'go', onClick: () => {
          state.log.push({ player: target, card: safety, cf: true, source: 'tap' });
          recomputeKm();
          sfx.fanfare(); sfx.crowd(); flash(); confetti();
          state.current = target;
          state.phase = 'draw';
          cardTab = autoTab(target);
          save();
          renderRace();
          shield(target);
          say(`Coup fourré ! ${comment(pick([`Incroyable ! Quel réflexe de ${t.name} !`, `La foule est debout pour ${t.name} !`]))}${t.name} est protégé et rejoue. Pioche une carte !`);
        } },
        { label: 'Non, on continue', onClick: next },
      ], (t) => {
        if (/pas de coup|\bnon\b|on continue|\bcontinue/.test(t)) return 1;
        if (/coup fourre|\boui\b/.test(t)) return 0;
        return -1;
      });
    say(`${t.name}, as-tu la botte ${ACTIONS[safety].name} ? Coup fourré ?`);
  }, 1300);
}

function finish(i) {
  renderRace();
  fireworks();
  sfx.crowd(3);
  comment(`${state.players[i].name} franchit la ligne d'arrivée !`);
  $('#turn-banner').innerHTML = `<span class="turn-text"><b>${escapeHtml(state.players[i].name)}</b> passe la ligne !</span>`;
  save();
  stopListening();
  setTimeout(() => showWinner(i), 1600);
}

/* ---------- Commentateur de course ---------- */

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function showCommentary(text) {
  const el = $('#commentary');
  el.textContent = `🎙️ ${text}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

// Renvoie la phrase à dire (vide si le commentateur est coupé)
function comment(text) {
  if (!text || !state.commentator) return '';
  showCommentary(text);
  return `${text} `;
}

const listNames = (ps) => ps.map((q) => q.name).join(' et ');

// Ce qui vient de se passer après une carte km
function kmComment(i, km, beforeKm) {
  const p = state.players[i];
  const left = state.goal - p.km;
  const others = state.players.filter((q, k) => k !== i);
  const passed = others.filter((q) => q.km >= beforeKm[i] && q.km < p.km);
  const leaderNow = others.every((q) => q.km < p.km);
  const wasLeader = others.every((q) => q.km < beforeKm[i]);
  if (leaderNow && !wasLeader && others.length) {
    return pick([`${p.name} prend la tête de la course !`, `Et ${p.name} passe en tête !`, `Nouveau leader : ${p.name} !`]);
  }
  if (passed.length) {
    return pick([`${p.name} double ${listNames(passed)} !`, `Quel dépassement de ${p.name} sur ${listNames(passed)} !`]);
  }
  if (left > 0 && left <= 100 && state.goal - beforeKm[i] > 100) return `Plus que ${left} kilomètres pour ${p.name}, l'arrivée est en vue !`;
  if (left > 0 && left <= 200 && state.goal - beforeKm[i] > 200) return `${p.name} entre dans la dernière ligne droite !`;
  if (km === 200) return pick([`Une hirondelle ! ${p.name} file à toute vitesse !`, `Deux cents kilomètres d'un coup, quelle fusée !`]);
  const sorted = [...state.players].sort((a, b) => b.km - a.km);
  if (sorted.length > 1 && sorted[0].km - sorted[1].km < 75 && Math.random() < 0.4) {
    return `Course très serrée entre ${sorted[0].name} et ${sorted[1].name} !`;
  }
  return Math.random() < 0.3 ? pick([`${p.name} avance tranquillement.`, `Belle carte de ${p.name} !`]) : '';
}

const HAZARD_COMMENTS = {
  red: (t) => pick([`${t} est arrêté au feu rouge !`, `Stop ! ${t} doit s'arrêter !`]),
  limit: (t) => `${t} doit ralentir : limitation à cinquante !`,
  fuel: (t) => pick([`Panne sèche pour ${t} !`, `Oh là là, ${t} n'a plus d'essence !`]),
  flat: (t) => pick([`Aïe ! ${t} a crevé !`, `Pschhh… le pneu de ${t} est à plat !`]),
  accident: (t) => pick([`Oh non, accident pour ${t} !`, `Badaboum ! ${t} est accidenté !`]),
};

function remedyComment(p, card) {
  if (card === 'green') return pick([`${p.name} repart !`, `Feu vert, ${p.name} redémarre !`]);
  if (card === 'end') return `${p.name} peut de nouveau rouler vite !`;
  return pick([`${p.name} est réparé !`, `Les mécaniciens ont fait du bon travail pour ${p.name} !`]);
}

/* ---------- Historique : correction des coups ---------- */

function renderLog() {
  const list = $('#log');
  if (!state.log.length) {
    list.innerHTML = '<li class="log-empty">Aucun coup pour l\'instant.</li>';
    return;
  }
  list.innerHTML = state.log.map((e, n) => ({ e, n })).reverse().map(({ e, n }) => (ACTIONS[e.card] ? `
    <li class="log-row log-action" style="--car:${state.players[e.player].color}">
      <span class="log-icon">${e.source === 'voice' ? '🎤' : e.source === 'camera' ? '📷' : ACTIONS[e.card].kind === 'hazard' ? '⚔️' : ACTIONS[e.card].kind === 'remedy' ? '🔧' : '⭐'}</span>
      <span class="log-text">${escapeHtml(state.players[e.player].name)} : ${ACTIONS[e.card].name}${
        ACTIONS[e.card].kind === 'hazard' ? ` → ${escapeHtml(state.players[e.target].name)}` : ''}${e.cf ? ' — coup fourré !' : ''}</span>
      <button class="log-del" data-entry="${n}" aria-label="Supprimer ce coup">✖</button>
      ${e.heard ? `<span class="log-heard">« ${escapeHtml(e.heard)} »</span>` : ''}
    </li>` : `
    <li class="log-row" style="--car:${state.players[e.player].color}">
      <span class="log-icon" title="${{ voice: 'Entendu', camera: 'Vu à la caméra' }[e.source] || 'Touché'}">${{ voice: '🎤', camera: '📷' }[e.source] || '👆'}</span>
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

/* ---------- Les règles en 1 minute ---------- */

const RULE_MODES = { discovery: 'Découverte', full: 'Règles complètes', km: 'Km seulement' };

function ruleCards(ids) {
  return `<div class="rule-cards">${ids.map((id) => `<span class="rule-card">${typeof id === 'number' ? kmFace(id) : actFace(id)}</span>`).join('')}</div>`;
}

function rulePair(attack, fix, note = '') {
  return `<div class="rule-pair">
    <span class="rule-card">${actFace(attack)}</span><span class="rule-arrow">→</span><span class="rule-card">${actFace(fix)}</span>
    <span class="rule-pair-text"><b>${ACTIONS[attack].name}</b> se répare avec <b>${ACTIONS[fix].name}</b>${note}</span>
  </div>`;
}

// Chaque section : titre, contenu illustré, et texte lu à voix haute
function ruleSections() {
  const goal = state.goal;
  return [
    { title: '🏁 Le but', speak: `Le but : arriver pile à ${goal} kilomètres avant les autres.`,
      html: `<p>Être le premier à arriver <b>pile</b> à <b>${goal} km</b>.</p>` },
    { title: '🃏 À ton tour', speak: 'À ton tour : tu pioches une carte. Puis tu poses une carte, ou tu en jettes une.',
      html: `<p>Chacun a <b>6 cartes</b> en main. À ton tour : <b>1.</b> tu <b>pioches</b> une carte,
        <b>2.</b> tu <b>poses</b> une carte… <b>3.</b> … ou, si tu ne peux pas, tu en <b>jettes</b> une. Puis c'est au suivant.</p>` },
    { title: '🛣️ Les kilomètres', speak: 'Les cartes kilomètres font avancer ta voiture. Il faut arriver pile. Pas plus de deux cartes deux cents.',
      html: `${ruleCards([25, 50, 75, 100, 200])}<p>Elles font avancer ta voiture. Il faut arriver <b>pile</b> :
        une carte qui dépasse ne se pose pas. <b>Deux cartes 200 maximum</b> par partie.</p>` },
    { title: '🚦 Pour rouler', speak: 'Pour rouler, il faut un feu vert : au départ, et après une réparation.',
      html: `${ruleCards(['green'])}<p>Pour poser des kilomètres, il faut <b>rouler</b> : un <b>Feu vert</b> au départ,
        et de nouveau après une réparation.</p>` },
    { title: '⚔️ Attaques et parades', speak: 'Les attaques arrêtent les autres voitures. Chaque attaque se répare avec sa parade. On attaque seulement un pilote qui roule.',
      html: `<p>Une <b>attaque</b> se pose devant un <b>autre pilote qui roule</b>. Il doit la réparer avec la bonne <b>parade</b> :</p>
        ${rulePair('red', 'green')}
        ${rulePair('limit', 'end', ' (en attendant, seulement les cartes 25 et 50)')}
        ${rulePair('fuel', 'gas')}
        ${rulePair('flat', 'spare')}
        ${rulePair('accident', 'repair')}` },
    { title: '⭐ Les bottes', speak: 'Les bottes te protègent pour toute la partie, et tu rejoues. Coup fourré : si on t\'attaque et que tu as la bonne botte, pose-la tout de suite en criant coup fourré !',
      html: `${ruleCards(['priority', 'tank', 'puncture', 'ace'])}
        <p>Une botte te <b>protège pour toute la partie</b> et tu <b>rejoues</b> :
        Véhicule prioritaire contre feu rouge et limitation, Citerne contre la panne, Increvable contre la crevaison,
        As du volant contre l'accident.</p>
        <p class="rule-highlight"><b>Coup fourré !</b> Si on t'attaque et que tu as la botte qui protège de cette attaque,
        pose-la <b>tout de suite</b> (même si ce n'est pas ton tour) en criant « Coup fourré ! » : l'attaque est annulée et c'est toi qui rejoues.</p>` },
    { title: '🏆 Fin de la partie', speak: 'La partie s\'arrête quand un pilote arrive pile. Si la pioche est vide, on continue avec ses cartes.',
      html: `<p>Dès qu'un pilote arrive <b>pile</b> à ${goal} km, il gagne. Si la pioche est vide, on continue avec les cartes
        qu'on a en main jusqu'à ce que plus personne ne puisse jouer.</p>` },
    { title: '🧮 Les points', speak: 'À la fin de la manche, chaque kilomètre vaut un point. Chaque botte cent points, chaque coup fourré trois cents de plus. Celui qui termine gagne quatre cents points. On joue plusieurs manches : le premier à cinq mille points a gagné.',
      html: `<ul class="points-list">
        <li>Chaque km parcouru : <b>1 point</b></li>
        <li>Chaque botte : <b>100</b> — les 4 bottes : <b>+300</b></li>
        <li>Chaque coup fourré : <b>+300</b></li>
        <li>Manche terminée : <b>400</b> — sans carte 200 : <b>+300</b></li>
        <li>Capot (les autres n'ont posé aucun km) : <b>+500</b></li>
        <li>Retardement (arrivé avec la pioche vide) : <b>+300</b></li>
      </ul><p>On enchaîne les manches avec <b>Revanche</b> : le premier à <b>${GOAL_POINTS} points</b> gagne la partie.
      Le jeu fait les comptes à l'arrivée.</p>` },
    { title: '🧒 Mode Découverte', speak: 'En mode Découverte, pas besoin de feu vert, pas de coup fourré, et autant de cartes deux cents que tu veux.',
      html: `<p class="rule-highlight">Pour les plus jeunes : <b>pas besoin de feu vert</b> pour démarrer ni après une réparation,
        <b>pas de coup fourré</b>, et <b>pas de limite</b> de cartes 200. Le reste ne change pas.</p>` },
    { title: '❓ Les questions qui font débattre', speak: '',
      html: `<dl class="faq">
        <dt>Je peux poser une parade si on ne m'a pas attaqué ?</dt><dd>Non. Sauf le <b>Feu vert</b>, pour démarrer.</dd>
        <dt>Je peux attaquer un pilote déjà arrêté ?</dt><dd>Non, pas avec une deuxième attaque qui arrête. Mais on peut lui mettre une <b>limitation de vitesse</b>.</dd>
        <dt>Je peux attaquer quelqu'un qui a la botte ?</dt><dd>Non : il est protégé contre cette attaque pour toute la partie.</dd>
        <dt>Après une réparation, je repars tout de suite ?</dt><dd>Non, il faut un <b>Feu vert</b> (sauf avec le Véhicule prioritaire, et en mode Découverte).</dd>
        <dt>On peut être limité et arrêté en même temps ?</dt><dd>Oui : la limitation se pose à part. Il faudra réparer, puis Feu vert, et Fin de limitation pour rouler vite.</dd>
        <dt>Combien de cartes 200 ?</dt><dd>Deux maximum par pilote (pas de limite en mode Découverte).</dd>
        <dt>Une botte, ça fait rejouer ?</dt><dd>Oui, on pioche une carte et on rejoue.</dd>
        <dt>Et si la pioche est vide ?</dt><dd>On continue avec ses cartes en main, sans piocher.</dd>
      </dl>` },
  ];
}

function openRules() {
  $('#rules-mode').textContent = `Vous jouez en mode : ${RULE_MODES[state.rules] || 'Règles complètes'}`;
  $('#rules-body').innerHTML = ruleSections().map((r, n) => `
    <section class="rule-section">
      <h3 class="rule-title">${r.title}${r.speak ? `<button class="rule-say" data-section="${n}" aria-label="Écouter">🔊</button>` : ''}</h3>
      ${r.html}
    </section>`).join('');
  $('#rules').hidden = false;
  $('#rules-body').scrollTop = 0;
}

$('#btn-rules').addEventListener('click', () => { sfx.click(); openRules(); });
$('#btn-rules-setup').addEventListener('click', () => { sfx.click(); openRules(); });
$('#btn-rules-close').addEventListener('click', () => { $('#rules').hidden = true; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); });
$('#rules').addEventListener('click', (e) => {
  const b = e.target.closest('.rule-say');
  if (b) { if (state.muted) { state.muted = false; save(); renderSound(); } say(ruleSections()[Number(b.dataset.section)].speak); }
  if (e.target.id === 'rules') $('#rules').hidden = true;
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
  const icon = typeof card === 'number' ? kmFace(card) : actFace(card);
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
  const car = e.target.closest('.car, .car3d'); if (car) select(Number(car.dataset.index));
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

function miniCard(km) {
  return `<span class="mini-card">${kmFace(km)}</span>`;
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
