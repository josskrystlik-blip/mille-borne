'use strict';
// Audit de contraste exécuté dans la page : renvoie les textes visibles trop peu contrastés
// (WCAG : 4,5:1, ou 3:1 pour les grands textes). Les fonds dégradés comptent par leur pire couleur.
module.exports = function contrastAudit(scope = 'body') {
  const parse = (c) => {
    const srgb = c.match(/color\(srgb ([^)]+)\)/);
    if (srgb) {
      const [r, g, b, a = 1] = srgb[1].split(/[ /]+/).filter(Boolean).map(Number);
      return { r: r * 255, g: g * 255, b: b * 255, a };
    }
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const over = (top, base) => ({
    r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a),
    b: top.b * top.a + base.b * (1 - top.a), a: 1,
  });
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const gradientColors = (img) => (img.match(/(rgba?|color)\([^)]+\)/g) || []).map(parse);

  // Fonds possibles derrière un élément (plusieurs si un ancêtre a un dégradé)
  const backgrounds = (el) => {
    const chain = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n);
    let bases = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (const n of chain) {
      const cs = getComputedStyle(n);
      const img = cs.backgroundImage;
      if (img && img !== 'none') {
        if (img.includes('url(')) return null; // image : on ne sait pas
        const cols = gradientColors(img).filter(Boolean);
        if (cols.length && cols.every((c) => c.a > 0.5)) bases = cols.flatMap((c) => bases.map((b) => over(c, b)));
      }
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) bases = bases.map((b) => over(bg, b));
      if (bases.length > 12) bases = bases.slice(0, 12);
    }
    return bases;
  };
  const opacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };

  const fails = [];
  const root = document.querySelector(scope);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!t.textContent.trim() || seen.has(el) || el.closest('svg, [aria-hidden="true"], .scenery')) continue;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!rect.width || !rect.height || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
    if (opacity(el) < 0.6 || el.closest(':disabled, .blocked')) continue; // éléments volontairement grisés
    if (cs.webkitTextStroke && !/^0px/.test(cs.webkitTextStrokeWidth || '0px')) continue;
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue;
    const fg = parse(cs.color); const bases = backgrounds(el);
    if (!fg || !bases) continue;
    const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const worst = Math.min(...bases.map((b) => ratio(over(fg, b), b)));
    if (worst < need) {
      fails.push({ text: t.textContent.trim().slice(0, 40), ratio: Math.round(worst * 100) / 100, need, color: cs.color,
        where: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} < ${el.parentElement && el.parentElement.className}` });
    }
  }
  return fails;
};
