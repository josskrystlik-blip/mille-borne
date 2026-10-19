'use strict';

/* ---------- Apprendre en jouant : petits défis pour le pilote apprenti (logique pure) ---------- */

const LEARN_MAX_LEVEL = 3;
const LEARN_TYPES = {
  1: ['ahead', 'bigCard', 'bornes', 'blocks'], // compter et comparer
  2: ['add', 'bigNumber'],                     // additions simples
  3: ['left', 'add'],                          // combien reste-t-il ?
};

const pickOne = (list, rnd) => list[Math.floor(rnd() * list.length)];

function shuffled(list, rnd) {
  const a = [...list];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

// Trois nombres différents (dont la bonne réponse), proches d'elle, entre min et max
function numberChoices(correct, step, min, max, rnd) {
  const near = [-2, -1, 1, 2].map((d) => correct + d * step).filter((v) => v >= min && v <= max);
  return shuffled([correct, ...shuffled(near, rnd).slice(0, 2)], rnd);
}

function countWords(n) {
  return Array.from({ length: n }, (_, k) => k + 1).join(', ');
}

// ctx : { km, before, after, goal, current, players: [{ name, km }] }
function challengeTypes(level, ctx) {
  const leaders = ctx.players.filter((p) => p.km === Math.max(...ctx.players.map((q) => q.km)));
  return (LEARN_TYPES[level] || LEARN_TYPES[1]).filter((t) => {
    if (t === 'ahead') return ctx.players.length >= 2 && leaders.length === 1;
    if (t === 'bornes') return ctx.after >= 100;
    if (t === 'blocks') return ctx.km <= 200;
    if (t === 'left') return ctx.goal - ctx.after >= 50;
    return true;
  });
}

// Renvoie { type, text, say, choices: [{ kind, value, label }], answer, explain, visual }
function makeChallenge(level, ctx, rnd = Math.random) {
  const types = challengeTypes(level, ctx);
  const type = pickOne(types.length ? types : ['bigCard'], rnd);
  const num = (values, correct) => {
    const choices = values.map((v) => ({ kind: 'number', value: v, label: String(v) }));
    return { choices, answer: values.indexOf(correct) };
  };

  if (type === 'ahead') {
    const lead = ctx.players.findIndex((p) => p.km === Math.max(...ctx.players.map((q) => q.km)));
    const others = shuffled(ctx.players.map((p, i) => i).filter((i) => i !== lead), rnd).slice(0, 2);
    const order = shuffled([lead, ...others], rnd);
    return {
      type, visual: { type: 'race' },
      text: 'Qui est devant dans la course ?',
      say: 'Regarde bien les voitures : qui est devant ?',
      choices: order.map((i) => ({ kind: 'player', value: i, label: ctx.players[i].name })),
      answer: order.indexOf(lead),
      explain: `${ctx.players[lead].name} est devant, avec ${ctx.players[lead].km} kilomètres.`,
    };
  }
  if (type === 'bigCard') {
    const values = shuffled(shuffled(CARDS.map((c) => c.km), rnd).slice(0, 3), rnd);
    const best = Math.max(...values);
    return {
      type, visual: null,
      text: 'Quelle carte fait aller le plus loin ?',
      say: 'Quelle carte fait aller le plus loin ?',
      choices: values.map((v) => ({ kind: 'card', value: v, label: `${v} km` })),
      answer: values.indexOf(best),
      explain: `La carte ${best} fait aller le plus loin : ${best} kilomètres !`,
    };
  }
  if (type === 'bornes') {
    const n = Math.floor(ctx.after / 100);
    return {
      type, visual: { type: 'bornes', count: n },
      text: 'Combien de bornes as-tu passées ?',
      say: 'Compte les bornes que tu as passées !',
      ...num(numberChoices(n, 1, 0, 10, rnd), n),
      explain: `Regarde : ${countWords(n)}. Tu as passé ${n} borne${n > 1 ? 's' : ''} !`,
    };
  }
  if (type === 'blocks') {
    const n = ctx.km / 25;
    return {
      type, visual: { type: 'blocks', count: n, km: ctx.km },
      text: `Ta carte ${ctx.km} : combien de blocs ?`,
      say: `Ta carte ${ctx.km}, c'est combien de blocs ? Compte-les !`,
      ...num(numberChoices(n, 1, 1, 8, rnd), n),
      explain: `${countWords(n)} : ${ctx.km}, c'est ${n} bloc${n > 1 ? 's' : ''} de 25 !`,
    };
  }
  if (type === 'bigNumber') {
    const pool = Array.from({ length: 20 }, (_, k) => (k + 1) * 50);
    const values = shuffled(pool, rnd).slice(0, 3);
    const best = Math.max(...values);
    return {
      type, visual: null,
      text: 'Quel nombre est le plus grand ?',
      say: 'Quel nombre est le plus grand ?',
      ...num(values, best),
      explain: `${best} est le plus grand.`,
    };
  }
  if (type === 'left') {
    const left = ctx.goal - ctx.after;
    return {
      type, visual: null,
      text: `Tu es à ${ctx.after} km. Combien reste-t-il pour arriver à ${ctx.goal} ?`,
      say: `Tu es à ${ctx.after} kilomètres. Combien en reste-t-il pour arriver à ${ctx.goal} ?`,
      ...num(numberChoices(left, left >= 200 ? 100 : 50, 25, ctx.goal, rnd), left),
      explain: `${ctx.goal} moins ${ctx.after}, ça fait ${left}.`,
    };
  }
  // 'add'
  const step = ctx.km >= 100 ? 100 : 50;
  return {
    type, visual: null,
    text: `Tu étais à ${ctx.before} km, tu avances de ${ctx.km}. Ça fait combien ?`,
    say: `Tu étais à ${ctx.before}, tu avances de ${ctx.km}. Ça fait combien ?`,
    ...num(numberChoices(ctx.after, step, 0, Math.max(ctx.goal, ctx.after), rnd), ctx.after),
    explain: `${ctx.before} plus ${ctx.km}, ça fait ${ctx.after}.`,
  };
}

// Niveau automatique : 5 bonnes réponses sur les 6 dernières → on monte ; 3 erreurs de suite → on descend
function nextLevel(learn, correct) {
  const history = [...(learn.history || []), correct].slice(-6);
  let level = learn.level || 1;
  if (history.length === 6 && history.filter(Boolean).length >= 5 && level < LEARN_MAX_LEVEL) {
    return { ...learn, level: level + 1, history: [] };
  }
  if (history.length >= 3 && history.slice(-3).every((x) => !x) && level > 1) {
    level -= 1;
    return { ...learn, level, history: [] };
  }
  return { ...learn, level, history };
}

// Environ un tour sur deux, mais jamais deux cartes km de suite sans défi
function shouldChallenge(learn, rnd = Math.random) {
  return (learn.skipped || 0) >= 1 || rnd() < 0.5;
}

// Nombre dit à voix haute (« trois », « deux cent cinquante », « 300 »)
const NUMBER_VALUES = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
};
function heardNumber(text) {
  const words = normalize(text).split(' ');
  const digits = words.find((w) => /^\d+$/.test(w));
  if (digits) return Number(digits);
  let total = 0; let cur = 0; let seen = false;
  words.forEach((w) => {
    if (w === 'cent' || w === 'cents') { cur = (cur || 1) * 100; seen = true; }
    else if (w === 'mille') { total += (cur || 1) * 1000; cur = 0; seen = true; }
    else if (w in NUMBER_VALUES) { cur += NUMBER_VALUES[w]; seen = true; }
  });
  return seen ? total + cur : null;
}

// Réponse dite à voix haute → numéro du choix, ou -1
function heardChoice(challenge, text) {
  const t = normalize(text);
  if (challenge.choices[0].kind === 'player') {
    return challenge.choices.findIndex((c) => t.split(' ').includes(normalize(c.label)));
  }
  const n = heardNumber(t);
  return n === null ? -1 : challenge.choices.findIndex((c) => c.value === n);
}
