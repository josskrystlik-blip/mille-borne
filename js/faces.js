'use strict';

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

// Voiture de course vue de dessus (circuit en 3D), l'avant vers la droite
function topCarSvg(color) {
  return `
  <svg class="top-car" viewBox="0 0 54 26" aria-hidden="true">
    <rect x="6" y="1" width="9" height="5" rx="1.5" fill="#15181c"/><rect x="6" y="20" width="9" height="5" rx="1.5" fill="#15181c"/>
    <rect x="37" y="1" width="9" height="5" rx="1.5" fill="#15181c"/><rect x="37" y="20" width="9" height="5" rx="1.5" fill="#15181c"/>
    <path d="M3 8 Q3 4 8 4 L44 5 Q52 6 53 13 Q52 20 44 21 L8 22 Q3 22 3 18 Z" fill="${color}"/>
    <rect x="0" y="5" width="4" height="16" rx="1" fill="${color}"/>
    <path d="M20 8 L33 8 Q37 13 33 18 L20 18 Q18 13 20 8 Z" fill="#0f1317" opacity=".85"/>
    <rect x="9" y="12" width="36" height="2" fill="#fff" opacity=".55"/>
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

/* ---------- Faces des cartes, dans le style des cartes du jeu ---------- */
// Cartes blanches, illustration à plat, titre en couleur repris à l'envers en bas

const LIME = '#a6ce39';
const FACE_TITLES = {
  red: ['Stop'], green: ['Roulez'], limit: ['LIMITE DE', 'VITESSE'], end: ['FIN DE LIMITE', 'DE VITESSE'],
  fuel: ['PANNE', 'D\'ESSENCE'], flat: ['CREVÉ !'], accident: ['ACCIDENT'],
  gas: ['ESSENCE'], spare: ['ROUE DE', 'SECOURS'], repair: ['RÉPARATIONS'],
  priority: ['véhicule', 'prioritaire'], tank: ['citerne', 'd\'essence'], puncture: ['increvable'], ace: ['as du', 'volant'],
};
const FACE_COLORS = { hazard: '#e3262b', remedy: '#1597c9', safety: '#1a1a1a' };

function faceTitle(lines, color, size) {
  const text = (y0) => lines.map((l, k) => `<text x="9" y="${y0 + k * (size + 1)}" class="face-title" font-size="${size}" fill="${color}">${l}</text>`).join('');
  // Le titre en haut à gauche, et le même à l'envers en bas à droite
  return `${text(16)}<g transform="rotate(180 50 70)">${text(16)}</g>`;
}

function kmFace(km) {
  const c = CARDS.find((x) => x.km === km);
  const size = km >= 100 ? 10 : 12;
  return `
  <svg class="face" viewBox="0 0 100 140" aria-hidden="true">
    <rect x="1" y="1" width="98" height="138" rx="9" fill="#fff"/>
    <text x="8" y="14" class="face-num" font-size="9" fill="#555">${km}</text>
    <path d="M10 62 Q28 44 52 52 T90 46 V70 H10 Z" fill="${LIME}"/>
    <path d="M10 70 Q44 56 90 66 V74 H10 Z" fill="#3aa04a"/>
    <path d="M30 68 V42 Q30 25 48 25 Q66 25 66 42 V68 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.6"/>
    <path d="M30 42 Q30 25 48 25 Q66 25 66 42 Z" fill="#e3262b" stroke="#1a1a1a" stroke-width="1.6"/>
    <rect x="34" y="45" width="28" height="15" rx="1" fill="#fff" stroke="#1a1a1a" stroke-width="1.2"/>
    <text x="48" y="56.5" text-anchor="middle" class="face-num" font-size="${size}" fill="#1a1a1a">${km}</text>
    <text x="79" y="44" text-anchor="middle" font-size="17">${c.emoji}</text>
    <g transform="rotate(180 50 106)">
      <text x="50" y="124" text-anchor="middle" class="face-big" font-size="${km >= 100 ? 34 : 44}" fill="${c.color}">${km}</text>
    </g>
    <g transform="rotate(180 88 131)"><text x="88" y="134" text-anchor="middle" class="face-num" font-size="8" fill="#555">${km}</text></g>
  </svg>`;
}

function trafficLight(on) {
  return `<rect x="38" y="42" width="24" height="54" rx="6" fill="#1a1a1a"/><rect x="47.5" y="96" width="5" height="16" fill="#1a1a1a"/>
    <circle cx="50" cy="55" r="7" fill="${on === 'red' ? '#e3262b' : '#555'}"/><circle cx="50" cy="69" r="7" fill="#555"/>
    <circle cx="50" cy="83" r="7" fill="${on === 'green' ? LIME : '#555'}"/>`;
}

function faceArt(id) {
  const a = ACTIONS[id];
  const emoji = (e, size = 40) => `<text x="50" y="${80 + size * 0.35}" text-anchor="middle" font-size="${size}">${e}</text>`;
  if (id === 'red') return `<circle cx="66" cy="88" r="20" fill="#e3262b"/>${trafficLight('red')}`;
  if (id === 'green') return `<circle cx="66" cy="88" r="20" fill="${LIME}"/>${trafficLight('green')}`;
  if (id === 'limit') return `<rect x="47" y="70" width="6" height="42" fill="#1a1a1a"/>
    <circle cx="50" cy="66" r="24" fill="#fff" stroke="#e3262b" stroke-width="7"/><text x="50" y="74" text-anchor="middle" class="face-num" font-size="20" fill="#1a1a1a">50</text>`;
  if (id === 'end') return `<rect x="47" y="70" width="6" height="42" fill="#1a1a1a"/>
    <circle cx="50" cy="66" r="24" fill="#fff" stroke="#1597c9" stroke-width="4"/><text x="50" y="74" text-anchor="middle" class="face-num" font-size="20" fill="#9aa">50</text>
    <path d="M28 92 L72 40" stroke="#1597c9" stroke-width="9" stroke-linecap="round"/>`;
  if (a.kind === 'hazard') return `<path d="M8 104 L92 46 L92 64 L8 122 Z" fill="#e3262b"/>${emoji(a.emoji)}`;
  if (a.kind === 'remedy') return `<path d="M8 46 L92 104 L92 122 L8 64 Z" fill="${LIME}"/>${emoji(a.emoji)}`;
  // Bottes : le grand « V » vert des cartes du jeu
  return `<path d="M12 32 L50 116 L88 32 L72 32 L50 82 L28 32 Z" fill="#2ea836"/>${emoji(a.emoji, 36)}`;
}

function actFace(id) {
  const kind = ACTIONS[id].kind;
  return `
  <svg class="face" viewBox="0 0 100 140" aria-hidden="true">
    <rect x="1" y="1" width="98" height="138" rx="9" fill="#fff"/>
    ${faceArt(id)}
    ${faceTitle(FACE_TITLES[id], FACE_COLORS[kind], FACE_TITLES[id].some((l) => l.length > 10) ? 9 : 11)}
  </svg>`;
}
