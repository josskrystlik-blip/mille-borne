'use strict';
// Génère les icônes PNG de l'appli à partir d'un dessin SVG :  node tests/tools/make-icons.js
// (à relancer seulement si le dessin change ; les PNG sont commités dans icons/)
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');

// safe : part du dessin gardée loin des bords (les icônes « maskable » peuvent être rognées en rond)
const icon = (safe) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0262c"/><stop offset=".6" stop-color="#d7141a"/><stop offset="1" stop-color="#8c0a0e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${safe}) translate(-256 -256)">
    <rect x="0" y="420" width="512" height="44" fill="#fff"/>
    ${Array.from({ length: 16 }, (_, k) => `<rect x="${k * 32}" y="${k % 2 ? 442 : 420}" width="32" height="22" fill="#111"/>`).join('')}
    <g transform="translate(250 88)">
      <path d="M40 0 Q120 0 120 80 L120 300 L-40 300 L-40 80 Q-40 0 40 0 Z" fill="#fff" stroke="#111" stroke-width="12"/>
      <path d="M-40 80 Q-40 0 40 0 Q120 0 120 80 Z" fill="#c8102e" stroke="#111" stroke-width="12"/>
      <text x="40" y="62" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" fill="#fff">KM</text>
      <text x="40" y="196" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="58" fill="#111">1000</text>
    </g>
    <path d="M176 70 L84 262 L156 262 L120 420 L246 196 L172 196 Z" fill="#ffd31a" stroke="#5c0508" stroke-width="12" stroke-linejoin="round"/>
  </g>
</svg>`;

(async () => {
  const out = path.join(__dirname, '..', '..', 'icons');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, size, safe] of [['icon-192.png', 192, 0.92], ['icon-512.png', 512, 0.92], ['icon-maskable-512.png', 512, 0.72], ['apple-touch-icon.png', 180, 0.86]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${icon(safe)}`);
    await page.screenshot({ path: path.join(out, file) });
    console.log('icône', file);
  }
  await browser.close();
})();
