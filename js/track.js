'use strict';

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
        <g class="car" data-index="${i}"><g class="car-body">${carSvg(p.color, p.number, 'track-car', `x="${-carW / 2}" y="${-carH / 2}" width="${carW}" height="${carH}"`)}</g></g>`).join('')}</g>
      <g class="car-fxs">${state.players.map((p, i) => `
        <g class="car-fx" data-index="${i}">
          <g class="fx-smoke">${[0, 1, 2, 3].map((k) => `<circle r="${laneW * 0.28}" style="animation-delay:${k * 0.4}s"/>`).join('')}</g>
          <g class="fx-light"><rect x="-7" y="-30" width="14" height="30" rx="4" fill="#1a1a1a"/><rect x="-1.5" y="0" width="3" height="12" fill="#1a1a1a"/>
            <circle cy="-23" r="4.5" fill="#ff2a1a"/><circle cy="-15" r="4.5" fill="#555"/><circle cy="-7" r="4.5" fill="#555"/></g>
          <g class="fx-shield-pos"><circle class="fx-shield" r="${carW * 0.6}"/></g>
        </g>`).join('')}</g>
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
    // Effets : fumée et bouclier sur la voiture, feu rouge sur la piste devant elle
    const fx = road.querySelector(`.car-fx[data-index="${i}"]`);
    const ahead = trackPoint(f + 16 / length, off);
    fx.querySelector('.fx-smoke').setAttribute('transform', `translate(${c.x} ${c.y})`);
    fx.querySelector('.fx-shield-pos').setAttribute('transform', `translate(${c.x} ${c.y})`);
    fx.querySelector('.fx-light').setAttribute('transform', `translate(${ahead.x} ${ahead.y})`);
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

function shield(i) {
  const fx = $('#road').querySelector(`.car-fx[data-index="${i}"]`);
  if (!fx) return;
  fx.classList.remove('shield'); void fx.getBoundingClientRect(); fx.classList.add('shield');
  setTimeout(() => fx.classList.remove('shield'), 2200);
}

// Feu d'artifice au-dessus de la ligne d'arrivée
function fireworks() {
  const fx = $('#road').querySelector('.fx');
  if (!fx || !track) return;
  const colors = ['#ffd31a', '#ff3a3a', '#3fa9f5', '#5be08a', '#ffffff', '#ff8c1a'];
  for (let b = 0; b < 6; b++) {
    const base = trackPoint(0, -track.half - 40 - Math.random() * 80);
    const x = base.x + (Math.random() - 0.5) * 220;
    const y = base.y + (Math.random() - 0.5) * 120;
    // Position sur le groupe extérieur, animation sur le groupe intérieur
    const pos = document.createElementNS(SVG_NS, 'g');
    pos.setAttribute('transform', `translate(${x} ${y})`);
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'firework');
    g.style.animationDelay = `${b * 0.25}s`;
    pos.appendChild(g);
    const color = colors[b % colors.length];
    g.innerHTML = Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2;
      return `<line x1="0" y1="0" x2="${Math.cos(a) * 40}" y2="${Math.sin(a) * 40}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
    }).join('') + `<circle r="7" fill="#fff"/>`;
    fx.appendChild(pos);
    setTimeout(() => pos.remove(), 2600);
  }
}
