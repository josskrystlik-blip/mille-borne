'use strict';

/* ---------- Écoute de la partie (reconnaissance vocale du navigateur) ---------- */

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const listen = { on: false, paused: false, rec: null };

function setListenStatus(text) {
  $('#listen-status').textContent = text;
}

function renderListen() {
  const b = $('#btn-listen');
  $('#listen-dot').hidden = !listen.on;
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
    } else if (e.error === 'network') {
      // Sur certains appareils, la reconnaissance vocale passe par Internet
      listen.on = false;
      renderListen();
      setListenStatus('L\'écoute a besoin d\'Internet sur cet appareil : touchez les cartes à l\'écran en attendant.');
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
  // Une fenêtre attend une réponse : « Papa », « coup fourré ! », « non »…
  if (!$('#dialog').hidden && dialogVoice) {
    for (const text of alternatives) {
      const n = dialogVoice(normalize(text));
      const b = $('#dialog-buttons').children[n];
      if (n >= 0 && b && !b.disabled) { setListenStatus(`Compris : « ${text} »`); b.click(); return; }
    }
    setListenStatus(`Entendu : « ${alternatives[0]} »`);
    return;
  }
  for (const text of alternatives) {
    const moves = parseHeard(text, state.players.map((p) => p.name), state.current)
      .filter((m) => m.km || fullRules());
    if (!moves.length) continue;
    setListenStatus(`Compris : « ${text} »`);
    for (const m of moves) {
      if (m.km) applyHeard(m.player, m.km, text);
      else if (applyHeardCard(m, text) === 'wait') break; // une fenêtre s'ouvre : on attend la réponse
    }
    return;
  }
  setListenStatus(`Entendu : « ${alternatives[0]} »`);
}

// Pourquoi ce pilote ne peut pas recevoir cette attaque
function whyNotTarget(target, card) {
  const t = state.players[target];
  if (has(t, ACTIONS[card].safety)) return `${t.name} est protégé par sa botte ${ACTIONS[ACTIONS[card].safety].name}.`;
  if (card === 'limit') return `${t.name} est déjà limité.`;
  if (t.km >= state.goal) return `${t.name} est déjà arrivé.`;
  return `${t.name} ne roule pas : on ne peut attaquer qu'un pilote qui roule.`;
}

function applyHeardCard({ card, player, target }, text, source = 'voice') {
  if (state.players.some((p) => p.km >= state.goal)) return 'done';
  const p = state.players[player];
  const a = ACTIONS[card];
  let reason = null;
  if (target === player) reason = `${p.name} ne peut pas s'attaquer lui-même.`;
  else if (a.kind === 'hazard' && target !== undefined && !attackTargets(player, card).includes(target)) reason = whyNotTarget(target, card);
  else {
    const check = canPlay(player, card);
    if (!check.ok) reason = check.reason;
  }
  if (reason) {
    sfx.nope();
    toast(`${source === 'camera' ? '📷' : '🎤'} ${p.name} : ${a.name} — impossible. ${reason}`);
    say(`Attention ${p.name} : ${reason}`);
    return 'refused';
  }
  // La carte est jouée par celui qui l'annonce, même si ce n'était pas son tour
  state.current = player;
  state.phase = 'play';
  playAction(card, target, { source, heard: text });
  return a.kind === 'hazard' ? 'wait' : 'done';
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
