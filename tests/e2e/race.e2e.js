'use strict';
// Course simple (seulement les km) : pioche, carte, tour suivant, annuler, arrivée et points.
const { assert, startGame, stateOf, setState, turnName, draw, playKm, noHorizontalScroll } = require('./helpers');

module.exports = async function race(page) {
  await startGame(page, { names: ['Léo', 'Papa', 'Maman'], rules: 'km' });
  assert.equal(await turnName(page), 'Léo');
  assert.ok(await page.isVisible('#draw-zone'), 'on commence par piocher');
  assert.ok(await page.isHidden('#play-zone'));
  await noHorizontalScroll(page);

  await draw(page);
  assert.ok(await page.isVisible('#play-zone'), 'après « Jouer », les cartes apparaissent');
  await page.click('#cards .card[data-km="100"]');
  await page.waitForTimeout(1300);
  assert.equal(await turnName(page), 'Papa');
  assert.equal((await stateOf(page)).players[0].km, 100);

  await draw(page);
  await page.click('#btn-next'); // pas de km : je jette
  assert.equal(await turnName(page), 'Maman');

  await draw(page);
  await page.click('#btn-undo');
  assert.equal(await turnName(page), 'Léo', 'annuler revient au dernier coup');
  assert.equal((await stateOf(page)).log.length, 0);

  // Le pilote est à 900 km : l'aide « comment finir » est proposée
  await setState(page, `s.log = [200, 200, 100, 100, 100, 100, 100].map((km) => ({ player: 0, km })); s.current = 0; s.phase = 'draw';`);
  await page.click('.turn-left');
  assert.ok(await page.isVisible('#help'), 'l\'aide des combinaisons s\'ouvre');
  await page.click('#btn-help-close');

  await playKm(page, 100);
  await page.waitForSelector('#screen-win', { state: 'visible', timeout: 6000 });
  assert.match(await page.textContent('#win-title'), /Léo/);
  const s = await stateOf(page);
  assert.equal(s.manches.length, 1, 'la manche est comptée une fois');
  assert.equal(s.manches[0][0], 1400, '1000 km + manche terminée');
  await noHorizontalScroll(page);
};
