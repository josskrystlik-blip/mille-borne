'use strict';

/* ---------- Prise en main au premier lancement ---------- */

const wizard = { step: 0 };

const WIZARD_STEPS = [
  {
    title: 'Bienvenue sur Mille Bornes Turbo !',
    say: 'Bienvenue ! Je vais vous montrer comment jouer avec l\'appli.',
    body: () => `
      <div class="wizard-hero">${carSvg('#d7141a', 7)}</div>
      <p class="dialog-text">Gardez votre vrai jeu de cartes : l'appli fait avancer les voitures,
        compte les kilomètres et vérifie les règles.</p>`,
  },
  {
    title: 'Qui regarde l\'écran ?',
    say: 'Choisissez l\'affichage. Vous pourrez le changer à tout moment.',
    body: () => `
      <div class="wizard-choices">${DISPLAYS.map(([id, icon, t, sub]) => `
        <button class="goal-btn ${state.uiMode === id ? 'active' : ''}" data-wizard-display="${id}">
          <span class="goal-km">${icon} ${t}</span><span class="goal-sub">${sub}</span>
        </button>`).join('')}</div>
      <p class="wizard-hint">On peut changer plus tard avec le bouton en haut à droite pendant la course.</p>`,
  },
  {
    title: 'Quelles règles ?',
    say: 'Avec un petit, commencez par le mode Découverte.',
    body: () => `
      <div class="wizard-choices">${[
        ['discovery', 'Découverte', 'Attaques et parades, en plus simple'],
        ['full', 'Règles complètes', 'Comme le vrai jeu, coup fourré compris'],
        ['km', 'Km seulement', 'On ne pose que les kilomètres'],
      ].map(([id, t, sub]) => `
        <button class="goal-btn ${state.rules === id ? 'active' : ''}" data-wizard-rules="${id}">
          <span class="goal-km">${t}</span><span class="goal-sub">${sub}</span>
        </button>`).join('')}</div>`,
  },
  {
    title: 'Un tour de jeu',
    say: 'À chaque tour : piochez une vraie carte, touchez Jouer, puis touchez la carte que vous posez.',
    body: () => `
      <ol class="wizard-turn">
        <li><span class="wizard-ico">🂠</span><span>Piochez une <b>vraie</b> carte dans le paquet.</span></li>
        <li><span class="wizard-ico wizard-play">Jouer ▶</span><span>Touchez <b>Jouer</b> sur l'écran.</span></li>
        <li><span class="wizard-ico wizard-card">${kmFace(50)}</span><span>Touchez la carte que vous posez : la voiture avance.</span></li>
      </ol>
      <p class="wizard-hint">Pas de carte utile ? « Je jette ». Une erreur ? « Annuler ».</p>`,
  },
  {
    title: 'Des aides pour les petits',
    say: 'Plein d\'aides sont là pour les enfants.',
    body: () => `
      <ul class="wizard-aids">
        <li><b>🎓 Apprenti</b> : à cocher à côté du prénom de l'enfant, pour de petits défis de calcul.</li>
        <li><b>❓ Puis-je jouer cette carte ?</b> : l'appli répond oui ou non, et pourquoi.</li>
        <li><b>💡 Comment finir ?</b> : près de l'arrivée, les cartes qu'il faut pour arriver pile.</li>
        <li><b>📖 Les règles</b> : expliquées en 1 minute, avec les vraies cartes.</li>
      </ul>`,
  },
  {
    title: 'C\'est parti !',
    say: 'C\'est parti ! Choisissez le nombre de pilotes, vos prénoms, puis Départ.',
    body: () => `
      <div class="wizard-hero">${borneSvg(1000, 'KM', 'wizard-borne')}</div>
      <p class="dialog-text">Choisissez le nombre de pilotes, écrivez vos prénoms, puis touchez <b>Départ</b>.</p>`,
  },
];

function renderWizard() {
  const step = WIZARD_STEPS[wizard.step];
  const last = wizard.step === WIZARD_STEPS.length - 1;
  $('#wizard-step').textContent = `Étape ${wizard.step + 1} sur ${WIZARD_STEPS.length}`;
  $('#wizard-title').textContent = step.title;
  $('#wizard-body').innerHTML = step.body();
  $('.wizard-dots').innerHTML = WIZARD_STEPS.map((s, k) => `<span class="${k === wizard.step ? 'on' : ''}"></span>`).join('');
  $('#btn-wizard-back').hidden = wizard.step === 0;
  $('#btn-wizard-next').textContent = last ? 'Commencer ▶' : 'Suivant ▶';
  $('#btn-wizard-skip').hidden = last;
}

function openWizard() {
  wizard.step = 0;
  $('#wizard').hidden = false;
  renderWizard();
  $('#btn-wizard-next').focus();
}

function closeWizard() {
  $('#wizard').hidden = true;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.onboarded = true;
  save();
  renderSetup();
}

function wizardGo(delta) {
  sfx.click();
  if (wizard.step + delta >= WIZARD_STEPS.length) { closeWizard(); return; }
  wizard.step = Math.max(0, wizard.step + delta);
  renderWizard();
  say(WIZARD_STEPS[wizard.step].say);
}

$('#btn-wizard-next').addEventListener('click', () => wizardGo(1));
$('#btn-wizard-back').addEventListener('click', () => wizardGo(-1));
$('#btn-wizard-skip').addEventListener('click', () => { sfx.click(); closeWizard(); });
$('#btn-wizard-again').addEventListener('click', openWizard);

// Les choix faits dans la présentation s'appliquent tout de suite
$('#wizard-body').addEventListener('click', (e) => {
  const d = e.target.closest('[data-wizard-display]');
  const r = e.target.closest('[data-wizard-rules]');
  if (d) setMode(d.dataset.wizardDisplay);
  else if (r) { state.rules = r.dataset.wizardRules; save(); sfx.click(); }
  else return;
  renderWizard();
});
