'use strict';
// L'appli installable : rien ne doit manquer dans la liste des fichiers gardés hors-ligne.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const cached = JSON.parse(read('sw.js').match(/const APP_FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

test('chaque fichier du jeu est gardé pour le hors-ligne', () => {
  const local = (src) => !/^https?:/.test(src);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter(local);
  const links = [...html.matchAll(/<link [^>]*href="([^"]+)"/g)].map((m) => m[1]).filter(local);
  assert.ok(scripts.length >= 10);
  [...scripts, ...links, ...manifest.icons.map((i) => i.src)].forEach((f) => {
    assert.ok(cached.includes(f), `${f} manque dans APP_FILES de sw.js`);
  });
  cached.filter((f) => f !== './').forEach((f) => assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} n'existe pas`));
});

test('manifeste installable', () => {
  for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) assert.ok(manifest[key], key);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './', 'chemin relatif : marche aussi sous /mille-borne/');
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
});
