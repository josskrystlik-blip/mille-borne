'use strict';

// Classement : position de chaque joueur (les ex æquo partagent la même place)
function positions() {
  return state.players.map((p) => 1 + state.players.filter((q) => q.km > p.km).length);
}

/* ---------- Règles : état de chaque voiture ---------- */

const fullRules = () => state.rules !== 'km';
// Mode Découverte : pas de feu vert pour démarrer ni après une réparation, pas de coup fourré,
// pas de limite de deux cartes 200
const discovery = () => state.rules === 'discovery';
const has = (p, safety) => (p.safeties || []).includes(safety);
const HAZARD_WORDS = { red: 'arrêté au feu rouge', fuel: 'en panne d\'essence', flat: 'crevé', accident: 'accidenté' };

// Peut-il avancer ? (sans feu vert au départ ou après une réparation, on est arrêté)
function rolling(p) {
  if (!fullRules()) return true;
  if (ACTIONS[p.battle] && ACTIONS[p.battle].kind === 'hazard') return false;
  return discovery() || has(p, 'priority') || p.battle === 'green';
}

// La carte qu'il lui faut pour repartir (ou null s'il roule)
function needed(p) {
  if (rolling(p)) return null;
  if (ACTIONS[p.battle] && ACTIONS[p.battle].kind === 'hazard') return ACTIONS[p.battle].fix;
  return 'green';
}

function whyStopped(p) {
  if (p.battle === 'none') return 'Pour démarrer, il te faut d\'abord un Feu vert.';
  if (p.battle === 'fixed') return 'C\'est réparé ! Il te faut maintenant un Feu vert pour repartir.';
  const fix = ACTIONS[ACTIONS[p.battle].fix].name;
  return `Tu es ${HAZARD_WORDS[p.battle]} : il te faut d'abord ${fix === 'Essence' ? 'de l\'Essence' : `la carte ${fix}`}.`;
}

// Pilotes que l'on peut attaquer avec cette carte
function attackTargets(i, card) {
  const a = ACTIONS[card];
  return state.players.map((t, k) => ({ t, k })).filter(({ t, k }) => {
    if (k === i || t.km >= state.goal || has(t, a.safety)) return false;
    if (card === 'limit') return !t.limited;
    return rolling(t);
  }).map(({ k }) => k);
}

// Le pilote i peut-il jouer cette carte ? → { ok, reason }
function canPlay(i, card) {
  const p = state.players[i];
  if (typeof card === 'number') {
    const left = state.goal - p.km;
    if (fullRules() && !rolling(p)) return { ok: false, reason: whyStopped(p) };
    if (fullRules() && p.limited && card > 50) return { ok: false, reason: 'Tu es limité à 50 : seulement les cartes 25 et 50.' };
    if (fullRules() && !discovery() && card === 200 && p.n200 >= 2) return { ok: false, reason: 'Tu as déjà posé deux cartes 200 : c\'est le maximum.' };
    if (card > left) return { ok: false, reason: `Trop loin : il te reste ${left} km, il faut arriver pile.` };
    return { ok: true, reason: `Oui ! Tu avances de ${card} km.` };
  }
  const a = ACTIONS[card];
  if (a.kind === 'safety') {
    if (has(p, card)) return { ok: false, reason: 'Tu as déjà cette botte.' };
    return { ok: true, reason: 'Oui ! Une botte se pose quand tu veux, elle te protège pour toute la partie, et tu rejoues.' };
  }
  if (a.kind === 'hazard') {
    const targets = attackTargets(i, card);
    if (!targets.length) {
      return { ok: false, reason: card === 'limit'
        ? 'Personne ne peut recevoir cette limitation : ils sont déjà limités ou protégés.'
        : 'Personne ne peut recevoir cette attaque : il faut attaquer un pilote qui roule et qui n\'a pas la botte.' };
    }
    return { ok: true, reason: `Oui ! Tu peux attaquer ${targets.map((k) => state.players[k].name).join(' ou ')}.` };
  }
  // Parades
  if (card === 'end') return p.limited ? { ok: true, reason: 'Oui ! Fini la limitation, tu peux rouler vite.' } : { ok: false, reason: 'Tu n\'es pas limité : garde cette carte pour plus tard.' };
  if (card === 'green') {
    if (has(p, 'priority')) return { ok: false, reason: 'Pas besoin : avec le Véhicule prioritaire, tu roules sans feu vert.' };
    if (p.battle === 'green' || (discovery() && rolling(p))) return { ok: false, reason: 'Tu roules déjà : garde ton feu vert pour plus tard.' };
    if (['fuel', 'flat', 'accident'].includes(p.battle)) return { ok: false, reason: whyStopped(p) };
    return { ok: true, reason: 'Oui ! Feu vert : tu peux rouler.' };
  }
  if (p.battle === a.cures) {
    return { ok: true, reason: discovery() || has(p, 'priority')
      ? `Oui ! ${a.name} : c'est réparé, tu peux repartir.`
      : `Oui ! ${a.name} : c'est réparé. Ensuite il te faudra un Feu vert.` };
  }
  return { ok: false, reason: `Tu n'en as pas besoin : tu n'es pas ${HAZARD_WORDS[a.cures]}. Garde cette carte.` };
}

// L'état de chaque pilote est rejoué à partir de l'historique des coups
function recomputeKm() {
  state.players.forEach((p) => {
    p.km = 0; p.n200 = 0; p.battle = 'none'; p.before = 'none'; p.limited = false; p.safeties = [];
    p.battlePile = []; p.speedPile = []; p.safetyCards = [];
  });
  state.log.forEach((e) => {
    const p = state.players[e.player];
    const a = ACTIONS[e.card];
    if (!a) { p.km += e.km; if (e.km === 200) p.n200 += 1; return; }
    if (a.kind === 'hazard') {
      const t = state.players[e.target];
      if (e.card === 'limit') { t.limited = true; t.speedPile.push({ card: e.card, from: e.player }); }
      else { t.before = t.battle; t.battle = e.card; t.battlePile.push({ card: e.card, from: e.player }); }
    } else if (a.kind === 'remedy') {
      if (e.card === 'end') { p.limited = false; p.speedPile.push({ card: e.card }); return; }
      p.battlePile.push({ card: e.card });
      if (e.card === 'green') p.battle = 'green';
      else if (p.battle === a.cures) p.battle = 'fixed';
    } else {
      p.safeties.push(e.card);
      p.safetyCards.push({ card: e.card, cf: !!e.cf });
      // Coup fourré : la carte d'attaque est mise de côté, elle ne reste pas sur la pile
      if (e.cf) {
        [p.battlePile, p.speedPile].forEach((pile) => {
          const top = pile[pile.length - 1];
          if (top && a.protects.includes(top.card) && top.from !== undefined) pile.pop();
        });
      }
      if (a.protects.includes('limit')) p.limited = false;
      // Coup fourré : l'attaque est annulée, la voiture continue comme avant ;
      // sinon l'attaque est réparée mais il faut un feu vert (sauf Véhicule prioritaire)
      if (a.protects.includes(p.battle)) p.battle = e.cf ? p.before : 'fixed';
    }
  });
}

// Toutes les façons d'atteindre exactement `left` km avec les cartes étape,
// de la plus courte à la plus longue (cartes rangées de la plus grande à la plus petite)
function combos(left) {
  const values = CARDS.map((c) => c.km).sort((a, b) => b - a);
  const found = [];
  (function walk(rest, from, hand) {
    if (rest === 0) { found.push(hand); return; }
    if (hand.length === HELP_MAX_CARDS) return;
    values.slice(from).forEach((v, k) => {
      if (v <= rest) walk(rest - v, from + k, [...hand, v]);
    });
  })(left, 0, []);
  return found.sort((a, b) => a.length - b.length).slice(0, HELP_MAX_COMBOS);
}

const GOAL_POINTS = 5000;

// Points de la manche, ligne par ligne, selon le barème du Mille Bornes
function scoreManche(winner) {
  const others = (i) => state.players.filter((q, k) => k !== i);
  return state.players.map((p, i) => {
    const lines = [];
    const add = (label, pts) => { if (pts) lines.push({ label, pts }); };
    add(`${p.km} km parcourus`, p.km);
    if (fullRules()) {
      const n = p.safetyCards.length;
      add(`${n} botte${n > 1 ? 's' : ''} × 100`, n * 100);
      if (n === 4) add('Les 4 bottes', 300);
      const cf = p.safetyCards.filter((c) => c.cf).length;
      add(`${cf} coup${cf > 1 ? 's' : ''} fourré${cf > 1 ? 's' : ''} × 300`, cf * 300);
    }
    if (i === winner) {
      add('Manche terminée', 400);
      if (fullRules()) {
        if (p.n200 === 0) add('Sans carte 200', 300);
        if (others(i).every((q) => q.km === 0)) add('Capot : les autres n\'ont pas roulé', 500);
        if (state.delayed) add('Retardement : pioche vide', 300);
      }
    }
    return { lines, total: lines.reduce((sum, l) => sum + l.pts, 0) };
  });
}

// Cumul de toutes les manches (la manche en cours comprise une fois comptée)
function totals() {
  return state.players.map((p, i) => state.manches.reduce((sum, m) => sum + (m[i] || 0), 0));
}

// Le film de la course : ce que chacun a fait, tiré de l'historique
function raceStats() {
  const stats = state.players.map(() => ({ kmCards: 0, n200: 0, attacks: 0, received: 0, safeties: 0, cf: 0 }));
  state.log.forEach((e) => {
    const a = ACTIONS[e.card];
    if (!a) { stats[e.player].kmCards += 1; if (e.km === 200) stats[e.player].n200 += 1; return; }
    if (a.kind === 'hazard') { stats[e.player].attacks += 1; stats[e.target].received += 1; }
    if (a.kind === 'safety') { stats[e.player].safeties += 1; if (e.cf) stats[e.player].cf += 1; }
  });
  return stats;
}

// Mots reconnus dans une phrase (sans accents, en minuscules)
const VALUE_WORDS = [
  [['deux', 'cents'], 200], [['deux', 'cent'], 200], [['2', 'cents'], 200], [['2', 'cent'], 200],
  [['soixante', 'quinze'], 75], [['vingt', 'cinq'], 25],
  [['200'], 200], [['hirondelle'], 200, true], [['hirondelles'], 200, true], [['oiseau'], 200, true],
  [['100'], 100], [['cent'], 100], [['cents'], 100], [['lievre'], 100, true], [['lievres'], 100, true],
  [['lapin'], 100, true], [['lapins'], 100, true],
  [['75'], 75], [['papillon'], 75, true], [['papillons'], 75, true],
  [['50'], 50], [['cinquante'], 50], [['canard'], 50, true], [['canards'], 50, true],
  [['25'], 25], [['escargot'], 25, true], [['escargots'], 25, true],
];
// Cartes attaque / parade / botte (les expressions les plus longues d'abord)
const CARD_WORDS = [
  ['fin de limitation de vitesse', 'end'], ['fin de la limitation', 'end'], ['fin de limitation', 'end'],
  ['fin de limite de vitesse', 'end'], ['fin de limite', 'end'],
  ['limitation de vitesse', 'limit'], ['limite de vitesse', 'limit'], ['limitation', 'limit'], ['limite', 'limit'],
  ['panne d essence', 'fuel'], ['panne', 'fuel'],
  ['citerne d essence', 'tank'], ['citerne', 'tank'],
  ['essence', 'gas'],
  ['feu rouge', 'red'], ['stop', 'red'], ['feu vert', 'green'], ['roulez', 'green'],
  ['pneu creve', 'flat'], ['crevaison', 'flat'], ['creve', 'flat'], ['crevee', 'flat'],
  ['roue de secours', 'spare'],
  ['accident', 'accident'],
  ['reparations', 'repair'], ['reparation', 'repair'], ['repare', 'repair'], ['reparer', 'repair'],
  ['vehicule prioritaire', 'priority'], ['prioritaire', 'priority'],
  ['increvable', 'puncture'],
  ['as du volant', 'ace'],
].map(([w, card]) => [w.split(' '), card]);
const ATTACK_VERBS = ['met', 'mets', 'pose', 'poses', 'attaque', 'attaques', 'joue', 'joues', 'donne', 'donnes'];
const SELF_WORDS = ['je', 'j', 'moi'];
const GAME_WORDS = ['pose', 'poses', 'mets', 'met', 'mis', 'joue', 'joues', 'avance', 'avances', 'km', 'kilometre', 'kilometres', 'borne', 'bornes', 'carte', 'plus'];
const SKIP_WORDS = ['reste', 'restent', 'faut', 'manque', 'manquent'];
const NUMBER_WORDS = ['deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'mille'];
const LINK_WORDS = ['pour', 'a', 'au', 'de', 'chez'];

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Transforme une phrase entendue en coups : [{ player, km }]
function parseHeard(text, names, current) {
  const words = normalize(text).split(' ').filter(Boolean);
  if (words.some((w) => SKIP_WORDS.includes(w))) return [];
  const nameWords = names.map((n) => normalize(n).split(' ').filter(Boolean));
  const at = (i, seq) => seq.length && seq.every((w, k) => words[i + k] === w);

  const mentions = [];
  for (let i = 0; i < words.length;) {
    const card = CARD_WORDS.find(([seq]) => at(i, seq));
    if (card) { mentions.push({ type: 'card', card: card[1], pos: i, end: i + card[0].length }); i += card[0].length; continue; }
    const value = VALUE_WORDS.find(([seq]) => at(i, seq));
    if (value) { mentions.push({ type: 'value', km: value[1], animal: !!value[2], pos: i, end: i + value[0].length }); i += value[0].length; continue; }
    const player = nameWords.map((seq, p) => ({ seq, p })).filter(({ seq }) => at(i, seq))
      .sort((x, y) => y.seq.length - x.seq.length)[0];
    if (player) { mentions.push({ type: 'name', player: player.p, pos: i, end: i + player.seq.length }); i += player.seq.length; continue; }
    if (SELF_WORDS.includes(words[i])) mentions.push({ type: 'self', pos: i, end: i + 1 });
    i += 1;
  }

  const values = mentions.filter((m) => m.type === 'value');
  const cards = mentions.filter((m) => m.type === 'card');
  if (!values.length && !cards.length) return [];
  const trigger = cards.length || mentions.some((m) => m.type !== 'value' || m.animal) || words.some((w) => GAME_WORDS.includes(w));
  if (!trigger) return [];

  // « cent cinquante », « trois cents » : ce sont des nombres, pas des cartes
  const skip = new Set();
  values.forEach((v, k) => {
    const next = values[k + 1];
    if (!v.animal && next && !next.animal && next.pos === v.end && v.km >= 100) { skip.add(v); skip.add(next); }
    if (!v.animal && NUMBER_WORDS.includes(words[v.pos - 1]) && v.km === 100) skip.add(v);
    // « limitation à 50 » : le 50 fait partie du nom de la carte
    const before = mentions[mentions.indexOf(v) - 1];
    if (before && before.type === 'card' && ['limit', 'end'].includes(before.card) && v.pos - before.end <= 2) skip.add(v);
  });

  const linked = (from, to) => {
    const gap = words.slice(from, to).filter((w) => !/^\d+$/.test(w) && w !== 'cinquante');
    return gap.length <= 3 && gap.every((w) => LINK_WORDS.includes(w) || ['avec', 'sur', 'un', 'une', 'le', 'la', 'les'].includes(w));
  };
  const moves = [];
  mentions.forEach((m, k) => {
    if (m.type === 'card') { moves.push(cardMove(m, k)); return; }
    if (m.type !== 'value' || skip.has(m)) return;
    let player = current;
    const next = mentions[k + 1];
    const between = next ? words.slice(m.end, next.pos) : [];
    const prev = mentions.slice(0, k).reverse().find((x) => x.type === 'name' || x.type === 'self');
    if (next && next.type === 'name' && between.length <= 2 && between.every((w) => LINK_WORDS.includes(w))) player = next.player;
    else if (prev && prev.type === 'name') player = prev.player;
    moves.push({ player, km: m.km });
  });
  return moves;

  // Qui joue la carte, et pour une attaque, qui la reçoit
  function cardMove(m, k) {
    const start = mentions.slice(0, k).map((x) => x.type).lastIndexOf('card') + 1;
    const before = mentions.slice(start, k).filter((x) => x.type === 'name' || x.type === 'self');
    const next = mentions.slice(k + 1).find((x) => !skip.has(x));
    const after = next && next.type === 'name' && linked(m.end, next.pos) ? next.player : undefined;
    const who = (x) => (x.type === 'self' ? current : x.player);
    if (ACTIONS[m.card].kind !== 'hazard') {
      return { card: m.card, player: after ?? (before.length ? who(before[before.length - 1]) : current) };
    }
    if (after !== undefined) return { card: m.card, player: before.length ? who(before[0]) : current, target: after };
    if (before.length >= 2) return { card: m.card, player: who(before[0]), target: who(before[1]) };
    if (before.length === 1) {
      const x = before[0];
      const verb = words.slice(x.end, m.pos).some((w) => ATTACK_VERBS.includes(w));
      if (x.type === 'self' || who(x) === current || verb) return { card: m.card, player: who(x) };
      return { card: m.card, player: current, target: x.player };
    }
    return { card: m.card, player: current };
  }
}
