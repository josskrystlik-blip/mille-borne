'use strict';

/* ---------- Scanner de cartes : caméra + apprentissage sur la tablette ---------- */
// MobileNet transforme l'image en « empreinte », un classifieur KNN la compare aux
// exemples appris avec les vraies cartes de la famille. Rien n'est envoyé sur Internet.

const SCAN_CLASSES = [...CARDS.map((c) => `km${c.km}`), ...Object.keys(ACTIONS), 'none'];
const SCAN_KEY = 'mille-bornes-scan-v1';
const SCAN_LIBS = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier@1.2.6/dist/knn-classifier.min.js',
];
const SCAN_MIN_CONFIDENCE = 0.75;
const SCAN_STABLE_FRAMES = 3;
const scan = { models: null, loading: null, stream: null, timer: 0, mode: 'play', streak: { label: null, n: 0 }, paused: false };

const scanName = (label) => (label.startsWith('km') ? `${label.slice(2)} km` : label === 'none' ? 'Rien (la table)' : ACTIONS[label].name);
const scanFace = (label) => (label.startsWith('km') ? kmFace(Number(label.slice(2))) : label === 'none'
  ? '<svg class="face" viewBox="0 0 100 140"><rect x="1" y="1" width="98" height="138" rx="9" fill="#c98a4b"/><text x="50" y="80" text-anchor="middle" font-size="34">🚫</text></svg>'
  : actFace(label));

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.onload = resolve; el.onerror = () => reject(new Error(`Chargement impossible : ${src}`));
    document.head.appendChild(el);
  });
}

// Chargement à la demande (≈ 20 Mo la première fois, ensuite en cache du navigateur)
async function loadScanModels() {
  if (scan.models) return scan.models;
  if (window.__scanModels) { scan.models = window.__scanModels; return scan.models; } // tests
  if (!scan.loading) {
    scan.loading = (async () => {
      for (const src of SCAN_LIBS) await loadScript(src);
      const net = await window.mobilenet.load({ version: 2, alpha: 1.0 });
      const knn = window.knnClassifier.create();
      const tf = window.tf;
      const models = {
        embed: (video) => net.infer(video, true),
        add: (emb, label) => knn.addExample(emb, label),
        predict: async (emb) => {
          if (!knn.getNumClasses()) return null;
          const r = await knn.predictClass(emb, 5);
          emb.dispose();
          return { label: r.label, confidence: r.confidences[r.label] || 0 };
        },
        counts: () => knn.getClassExampleCount(),
        clear: () => knn.clearAllClasses(),
        dump: () => {
          const data = knn.getClassifierDataset();
          return Object.fromEntries(Object.entries(data).map(([label, t]) => {
            const bytes = new Uint8Array(t.dataSync().buffer);
            let bin = '';
            bytes.forEach((b) => { bin += String.fromCharCode(b); });
            return [label, { shape: t.shape, data: btoa(bin) }];
          }));
        },
        restore: (saved) => {
          knn.setClassifierDataset(Object.fromEntries(Object.entries(saved).map(([label, { shape, data }]) => {
            const bin = atob(data);
            const bytes = new Uint8Array(bin.length);
            for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
            return [label, tf.tensor2d(new Float32Array(bytes.buffer), shape)];
          })));
        },
      };
      try { const saved = JSON.parse(localStorage.getItem(SCAN_KEY)); if (saved) models.restore(saved); } catch (e) { /* rien d'appris */ }
      scan.models = models;
      return models;
    })();
    scan.loading.catch(() => { scan.loading = null; });
  }
  return scan.loading;
}

function saveScanExamples() {
  try { localStorage.setItem(SCAN_KEY, JSON.stringify(scan.models.dump())); } catch (e) {
    toast('Impossible d\'enregistrer les exemples sur cet appareil (mémoire pleine ?).');
  }
}

const scanStatus = (text) => { $('#scan-status').textContent = text; };

async function startCamera() {
  if (scan.stream) return true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    scanStatus('La caméra n\'est pas disponible ici : il faut ouvrir le jeu par une adresse https (par exemple GitHub Pages).');
    return false;
  }
  try {
    scan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
    const video = $('#scan-video');
    video.srcObject = scan.stream;
    await video.play().catch(() => {});
    return true;
  } catch (e) {
    scanStatus('La caméra est refusée : autorisez-la dans les réglages du navigateur.');
    return false;
  }
}

function stopCamera() {
  clearInterval(scan.timer);
  if (scan.stream) scan.stream.getTracks().forEach((t) => t.stop());
  scan.stream = null;
}

async function openScan(mode = 'play') {
  $('#scan').hidden = false;
  $('#scan-result').innerHTML = '';
  scanStatus('Préparation de la caméra…');
  if (!(await startCamera())) return;
  scanStatus('Chargement de la reconnaissance (la première fois, ça peut prendre un moment)…');
  try {
    await loadScanModels();
  } catch (e) {
    scanStatus(navigator.onLine
      ? 'Impossible de charger la reconnaissance : réessayez dans un instant.'
      : 'Pas d\'Internet : ouvrez la caméra une première fois avec Internet, elle marchera ensuite hors-ligne.');
    return;
  }
  const total = Object.values(scan.models.counts()).reduce((a, b) => a + b, 0);
  setScanMode(total ? mode : 'learn');
  if (!total) toast('Le jeu ne connaît pas encore tes cartes : apprends-les une fois, c\'est rapide !');
}

function closeScan() {
  stopCamera();
  $('#scan').hidden = true;
  renderMode();
}

function setScanMode(mode) {
  scan.mode = mode;
  document.querySelectorAll('.scan-tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#scan-title').textContent = mode === 'learn' ? '🧠 Apprendre mes cartes' : '📷 Montre ta carte';
  $('#scan-learn').hidden = mode !== 'learn';
  $('#scan-result').hidden = mode !== 'play';
  clearInterval(scan.timer);
  if (mode === 'learn') {
    renderScanGrid();
    scanStatus('Touche la vignette de la carte que tu montres à la caméra.');
  } else {
    scan.paused = false;
    scan.streak = { label: null, n: 0 };
    $('#scan-result').innerHTML = '';
    scanStatus('Montre une carte devant la caméra…');
    scan.timer = setInterval(scanTick, 350);
  }
}

function renderScanGrid() {
  const counts = scan.models ? scan.models.counts() : {};
  $('#scan-grid').innerHTML = SCAN_CLASSES.map((label) => `
    <button class="scan-tile ${counts[label] ? 'learned' : ''}" data-label="${label}">
      <span class="scan-tile-face">${scanFace(label)}</span>
      <span class="scan-tile-name">${scanName(label)}</span>
      <span class="scan-count">${counts[label] || 0}</span>
    </button>`).join('');
}

// Reconnaissance en continu : une carte reconnue plusieurs fois de suite est proposée
async function scanTick() {
  if (scan.paused || scan.mode !== 'play' || !scan.models) return;
  const video = $('#scan-video');
  if (!video.videoWidth && !window.__scanModels) return;
  const guess = await scan.models.predict(scan.models.embed(video));
  if (!guess) return;
  const sure = guess.label !== 'none' && guess.confidence >= SCAN_MIN_CONFIDENCE;
  scan.streak = sure && scan.streak.label === guess.label ? { label: guess.label, n: scan.streak.n + 1 } : { label: sure ? guess.label : null, n: sure ? 1 : 0 };
  scanStatus(guess.label === 'none' ? 'Montre une carte devant la caméra…'
    : `Je vois : ${scanName(guess.label)} (${Math.round(guess.confidence * 100)} %)`);
  if (scan.streak.n >= SCAN_STABLE_FRAMES) confirmScan(scan.streak.label);
}

function confirmScan(label) {
  scan.paused = true;
  sfx.ding();
  $('#scan-result').innerHTML = `
    <div class="scan-card">${scanFace(label)}</div>
    <p class="scan-question">C'est bien <b>${scanName(label)}</b> ?</p>
    <div class="scan-actions">
      <button id="btn-scan-yes" class="big-btn go">✅ Jouer</button>
      <button id="btn-scan-no" class="big-btn">❌ Non</button>
    </div>`;
  say(`C'est bien ${scanName(label)} ?`);
  $('#btn-scan-yes').addEventListener('click', () => { closeScan(); playScanned(label); });
  $('#btn-scan-no').addEventListener('click', () => {
    $('#scan-result').innerHTML = '';
    scan.streak = { label: null, n: 0 };
    scan.paused = false;
  });
}

// La carte reconnue passe par les mêmes règles que si on l'avait touchée
function playScanned(label) {
  const i = state.current;
  const p = state.players[i];
  if (label.startsWith('km')) {
    const km = Number(label.slice(2));
    const check = canPlay(i, km);
    if (!check.ok) { explain(check.reason); return; }
    addKm(km, i, { source: 'camera' });
    toast(`📷 ${p.name} +${km} km`, true);
    return;
  }
  applyHeardCard({ card: label, player: i }, '', 'camera');
}

$('#btn-scan').addEventListener('click', () => { sfx.click(); openScan('play'); });
$('#btn-scan-close').addEventListener('click', closeScan);
document.querySelectorAll('.scan-tab').forEach((b) => b.addEventListener('click', () => { if (scan.models) setScanMode(b.dataset.mode); }));
$('#scan-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.scan-tile');
  if (!tile || !scan.models) return;
  scan.models.add(scan.models.embed($('#scan-video')), tile.dataset.label);
  saveScanExamples();
  sfx.click();
  renderScanGrid();
  scanStatus(`Appris : ${scanName(tile.dataset.label)}. Encore une ou deux fois en bougeant un peu la carte !`);
});
$('#btn-scan-reset').addEventListener('click', () => {
  if (!scan.models || !confirm('Oublier toutes les cartes apprises ?')) return;
  scan.models.clear();
  try { localStorage.removeItem(SCAN_KEY); } catch (e) { /* rien */ }
  renderScanGrid();
});
