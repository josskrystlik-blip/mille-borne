'use strict';
// Service worker : le jeu s'installe comme une appli et démarre sans Internet.

const CACHE = 'mille-bornes-app';      // fichiers du jeu (toujours rafraîchis quand on est en ligne)
const EXTRA = 'mille-bornes-extra';    // polices et modèle de la caméra (téléchargés une fois)

const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'a-propos.html',
  'confidentialite.html',
  'pages.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/data.js',
  'js/state.js',
  'js/faces.js',
  'js/rules.js',
  'js/learn.js',
  'js/audio.js',
  'js/track.js',
  'js/race.js',
  'js/listen.js',
  'js/scan.js',
  'js/wizard.js',
  'js/screens.js',
  'js/pwa.js',
];

// Polices Google, bibliothèques TF.js et poids du modèle MobileNet de la caméra
const EXTRA_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'storage.googleapis.com', 'tfhub.dev', 'www.kaggle.com'];
const NETWORK_TIMEOUT = 2500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => ![CACHE, EXTRA].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réseau d'abord (avec un délai max), sinon la copie en cache : toujours la dernière version en ligne
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('lent')), NETWORK_TIMEOUT)),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true })
      || (request.mode === 'navigate' && await cache.match('index.html'));
    if (cached) return cached;
    throw err;
  }
}

// Cache d'abord : ces fichiers ne changent pas (versions figées)
async function cacheFirst(request) {
  const cache = await caches.open(EXTRA);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(request));
  else if (EXTRA_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(request));
});
