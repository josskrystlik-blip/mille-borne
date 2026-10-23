'use strict';
// Appli installable : service worker, démarrage sans Internet, bouton d'installation.
const { assert, startGame } = require('./helpers');

module.exports = async function offline(page) {
  // Le service worker s'installe et prend la main sur la page
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 });
  assert.equal(await page.evaluate(() => document.querySelector('link[rel="manifest"]').getAttribute('href')), 'manifest.webmanifest');

  // Bouton d'installation (invite du navigateur simulée)
  assert.ok(await page.isHidden('#btn-install'));
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    e.prompt = () => { window.__prompted = true; };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  assert.ok(await page.isVisible('#btn-install'));
  await page.click('#btn-install');
  assert.equal(await page.evaluate(() => window.__prompted), true);
  assert.ok(await page.isHidden('#btn-install'));

  // Plus d'Internet : le jeu démarre quand même et une course se lance
  await page.context().setOffline(true);
  try {
    await page.reload();
    assert.ok(await page.isVisible('#screen-setup'), 'le jeu s\'affiche hors-ligne');
    assert.ok(await page.isVisible('#offline-dot'), 'voyant « pas d\'Internet »');
    await startGame(page, { names: ['Léo', 'Papa'], rules: 'km' });
    assert.ok(await page.isVisible('#screen-race'));
    assert.equal(await page.locator('.track-svg .car').count(), 2);
  } finally {
    await page.context().setOffline(false);
  }
};
