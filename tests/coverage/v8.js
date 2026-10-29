'use strict';
// Couverture de code à partir des mesures du moteur V8 (Node et Chromium donnent le même format :
// des fonctions avec des plages d'octets et un nombre d'exécutions). Sans dépendance.

// Ajoute une mesure pour un fichier : chaque octet exécuté au moins une fois est marqué
function addEntry(acc, file, source, functions) {
  const f = acc[file] || (acc[file] = { source, bytes: new Uint8Array(source.length), funcs: {} });
  if (f.source.length !== source.length) return; // autre version du fichier : on ignore
  // Les plages internes (blocs jamais exécutés) précisent les plages englobantes : on peint
  // des plus grandes aux plus petites
  const ranges = functions.flatMap((fn) => fn.ranges).sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
  const painted = new Uint8Array(source.length);
  for (const r of ranges) painted.fill(r.count > 0 ? 1 : 0, r.startOffset, Math.min(r.endOffset, source.length));
  for (let i = 0; i < painted.length; i++) f.bytes[i] |= painted[i];
  for (const fn of functions) {
    const r = fn.ranges[0];
    if (r.startOffset === 0 && r.endOffset >= source.length) continue; // le script lui-même
    const key = r.startOffset;
    const name = fn.functionName || `(anonyme, ligne ${lineOf(source, key)})`;
    f.funcs[key] = { name, line: lineOf(source, key), covered: (f.funcs[key] && f.funcs[key].covered) || r.count > 0 };
  }
}

function lineOf(source, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) if (source.charCodeAt(i) === 10) n++;
  return n;
}

// Lignes de code (sans les lignes vides ni les commentaires) : couverte si un caractère l'est
function summarize(f) {
  const lines = [];
  let start = 0;
  f.source.split('\n').forEach((text, k) => {
    const t = text.trim();
    const code = t && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*') && t !== "'use strict';";
    let covered = false;
    if (code) {
      for (let i = 0; i < text.length; i++) if (text[i].trim() && f.bytes[start + i]) { covered = true; break; }
    }
    lines.push({ n: k + 1, text, code, covered });
    start += text.length + 1;
  });
  const code = lines.filter((l) => l.code);
  const funcs = Object.values(f.funcs);
  return {
    lines, linesTotal: code.length, linesCovered: code.filter((l) => l.covered).length,
    funcsTotal: funcs.length, funcsCovered: funcs.filter((x) => x.covered).length,
    uncoveredFuncs: funcs.filter((x) => !x.covered).sort((a, b) => a.line - b.line),
  };
}

// Union de plusieurs mesures (ex. tests unitaires + scénarios)
function merge(...accs) {
  const out = {};
  for (const acc of accs) {
    for (const [file, f] of Object.entries(acc)) {
      const o = out[file] || (out[file] = { source: f.source, bytes: new Uint8Array(f.source.length), funcs: {} });
      if (o.source.length !== f.source.length) continue;
      for (let i = 0; i < f.bytes.length; i++) o.bytes[i] |= f.bytes[i];
      for (const [k, fn] of Object.entries(f.funcs)) o.funcs[k] = { ...fn, covered: (o.funcs[k] && o.funcs[k].covered) || fn.covered };
    }
  }
  return out;
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

module.exports = { addEntry, summarize, merge, pct };
