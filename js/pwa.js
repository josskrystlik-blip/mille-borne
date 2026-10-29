'use strict';

/* ---------- Appli installable, hors-ligne, écran allumé ---------- */

const pwa = { prompt: null, wakeLock: null };
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Le service worker n'existe qu'en http(s) : en ouvrant index.html directement, rien ne change
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

function renderInstall() {
  const b = $('#btn-install');
  b.hidden = isStandalone() || !(pwa.prompt || isIOS());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pwa.prompt = e;
  renderInstall();
});

window.addEventListener('appinstalled', () => { pwa.prompt = null; renderInstall(); toast('📲 Bornes Turbo est installé sur l\'écran d\'accueil !'); });

$('#btn-install').addEventListener('click', async () => {
  sfx.click();
  if (pwa.prompt) {
    pwa.prompt.prompt();
    await pwa.prompt.userChoice.catch(() => {});
    pwa.prompt = null;
    renderInstall();
    return;
  }
  dialog('📲 Installer sur l\'iPad ou l\'iPhone',
    `<ol class="install-steps">
       <li>Touchez le bouton <b>Partager</b> <span class="share-ico" aria-hidden="true">⬆︎</span> de Safari.</li>
       <li>Choisissez <b>Sur l'écran d'accueil</b>.</li>
       <li>Touchez <b>Ajouter</b> : l'icône Bornes Turbo apparaît, le jeu s'ouvre en plein écran.</li>
     </ol>`,
    [{ label: 'J\'ai compris', cls: 'go' }]);
});

// Petit voyant quand il n'y a pas de réseau
function renderOnline() { $('#offline-dot').hidden = navigator.onLine; }
window.addEventListener('online', renderOnline);
window.addEventListener('offline', renderOnline);

// L'écran reste allumé pendant la course
async function keepAwake() {
  const want = state.screen === 'race' && document.visibilityState === 'visible';
  try {
    if (want && !pwa.wakeLock && 'wakeLock' in navigator) {
      pwa.wakeLock = await navigator.wakeLock.request('screen');
      pwa.wakeLock.addEventListener('release', () => { pwa.wakeLock = null; });
    } else if (!want && pwa.wakeLock) {
      await pwa.wakeLock.release();
      pwa.wakeLock = null;
    }
  } catch (e) { /* refusé (batterie faible…) : tant pis */ }
}
document.addEventListener('visibilitychange', keepAwake);

renderInstall();
renderOnline();
keepAwake();
