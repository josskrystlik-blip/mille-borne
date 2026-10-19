'use strict';

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

// Bruit blanc (pour le moteur, la foule, les chocs…)
let noiseBuffer = null;
function noise(ac) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  return src;
}

// Petit bruit filtré avec une enveloppe : la base des effets sonores
function noiseBurst({ start = 0, dur = 0.3, type = 'bandpass', freq = 1000, q = 1, vol = 0.2, attack = 0.01 }) {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime + start;
  const src = noise(ac); const f = ac.createBiquadFilter(); const g = ac.createGain();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(ac.destination); src.start(t); src.stop(t + dur + 0.05);
}

// Moteur : deux oscillateurs désaccordés + grondement, le régime monte avec la carte
function vroom(power = 1) {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  const dur = 0.6 + power * 0.6;
  const out = ac.createGain(); const f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1400 + power * 800, t + dur * 0.6);
  out.gain.setValueAtTime(0.001, t); out.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
  out.gain.setValueAtTime(0.22, t + dur * 0.7); out.gain.exponentialRampToValueAtTime(0.001, t + dur);
  [0, 7].forEach((detune) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth'; o.detune.value = detune * 10;
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(120 + power * 180, t + dur * 0.6);
    o.frequency.exponentialRampToValueAtTime(90, t + dur);
    o.connect(f); o.start(t); o.stop(t + dur);
  });
  f.connect(out).connect(ac.destination);
  noiseBurst({ dur, type: 'lowpass', freq: 300, vol: 0.12, attack: 0.05 });
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
  // Klaxon « pouet-pouet » quand on attaque
  horn: () => { [0, 0.22].forEach((st) => { tone(392, st, 0.18, 'square', 0.09); tone(494, st, 0.18, 'square', 0.07); }); },
  // Choc de l'accident
  crash: () => { noiseBurst({ dur: 0.6, type: 'lowpass', freq: 900, vol: 0.4 }); tone(90, 0, 0.4, 'sawtooth', 0.12); noiseBurst({ start: 0.15, dur: 0.5, freq: 3000, q: 0.5, vol: 0.15 }); },
  // Pneu qui se dégonfle
  hiss: () => noiseBurst({ dur: 1.1, type: 'highpass', freq: 4000, vol: 0.18, attack: 0.05 }),
  // Moteur qui toussote (panne d'essence)
  cough: () => [0, 0.25, 0.55].forEach((st) => { tone(70, st, 0.12, 'sawtooth', 0.12); noiseBurst({ start: st, dur: 0.12, type: 'lowpass', freq: 400, vol: 0.18 }); }),
  // Petit « ding » de réparation
  ding: () => { tone(1319, 0, 0.35, 'sine', 0.12); tone(1760, 0.08, 0.4, 'sine', 0.08); },
  // Fanfare de botte
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, i === 3 ? 0.5 : 0.12, 'square', 0.1)),
  // La foule qui applaudit
  crowd: (dur = 2.2) => {
    noiseBurst({ dur, freq: 1500, q: 0.4, vol: 0.18, attack: 0.25 });
    for (let k = 0; k < 18; k++) noiseBurst({ start: Math.random() * (dur - 0.3), dur: 0.07, type: 'highpass', freq: 2500, vol: 0.12 });
  },
};

// Le son qui va avec chaque carte attaque / parade / botte
function cardSound(card) {
  const a = ACTIONS[card];
  if (a.kind === 'safety') { sfx.fanfare(); return; }
  if (a.kind === 'remedy') { if (card === 'green') vroom(0.4); else sfx.ding(); return; }
  sfx.horn();
  if (card === 'accident') setTimeout(sfx.crash, 350);
  if (card === 'flat') setTimeout(sfx.hiss, 350);
  if (card === 'fuel') setTimeout(sfx.cough, 350);
  if (card === 'red') setTimeout(() => tone(220, 0, 0.4, 'square', 0.08), 350);
}

/* ---------- Musique de course (petite boucle synthétisée) ---------- */

const MUSIC_NOTES = [
  // mélodie (notes MIDI, 0 = silence) sur 32 croches, basse sur 8 temps
  [72, 0, 76, 79, 81, 79, 76, 0, 74, 0, 77, 81, 79, 77, 74, 0, 72, 0, 76, 79, 84, 83, 81, 79, 77, 76, 74, 72, 74, 0, 72, 0],
  [48, 48, 53, 53, 55, 55, 48, 43],
];
let musicTimer = 0;
let musicStep = 0;

function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function musicTick() {
  if (!state.music || state.muted) return;
  const mel = MUSIC_NOTES[0][musicStep % 32];
  if (mel) tone(midi(mel), 0, 0.16, 'square', 0.025);
  if (musicStep % 4 === 0) tone(midi(MUSIC_NOTES[1][(musicStep / 4) % 8]), 0, 0.35, 'triangle', 0.05);
  if (musicStep % 2 === 0) noiseBurst({ dur: 0.04, type: 'highpass', freq: 7000, vol: 0.03 });
  musicStep += 1;
}

function renderMusic() {
  clearInterval(musicTimer);
  if (state.music && !state.muted) musicTimer = setInterval(musicTick, 170);
  $('#btn-music').classList.toggle('off', !state.music);
  $('#btn-music').setAttribute('aria-label', state.music ? 'Couper la musique' : 'Mettre la musique');
}
