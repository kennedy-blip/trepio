/* economy: new pets purchasable, prices/balance math, daily bonus rewards */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await page.evaluate(() => window.__trepio.progress.addCandies(200));

  /* the two new unlockables: Gummy Bear (60) + Candy Unicorn (100) */
  await page.evaluate(() => window.__trepio.buy('pet_gumbear'));
  await poll(() => window.__trepio.state().purchases.pet_gumbear === true);
  let s = await T();
  if (s.balance !== 140) throw new Error('gumbear balance: ' + s.balance);
  if (s.pet !== 'gumbear') throw new Error('gumbear not auto-equipped: ' + s.pet);
  await page.evaluate(() => window.__trepio.buy('pet_unicorn'));
  await poll(() => window.__trepio.state().purchases.pet_unicorn === true);
  s = await T();
  if (s.balance !== 40) throw new Error('unicorn balance: ' + s.balance);
  if (s.pet !== 'gumbear') throw new Error('second pet should not auto-equip: ' + s.pet);
  /* the unicorn follows once equipped */
  await page.evaluate(() => window.__trepio.setPet('unicorn'));
  await poll(() => window.__trepio.state().pet === 'unicorn');
  await enterWorld();
  const seen = await poll(() => {
    const p = window.__trepio.state().petPos;
    return !!p;
  }, null, 15000);
  if (!seen) throw new Error('unicorn pet object missing');

  /* mini-game reward math — deterministic (fresh save, fresh session):
     catch score 4, first-ever win pays min(20, max(2, 4)) = 4 → daily bonus ×2 = 8 */
  const c0 = s.candyCount;
  await page.evaluate(() => window.__trepio.startMini('catch'));
  await poll(() => window.__trepio.state().mini && window.__trepio.state().mini.kind === 'catch');
  await page.evaluate(() => { const m = window.__trepio.game.mini; m.score = 4; m.t = 0.05; });
  await poll(() => window.__trepio.state().mini === null, null, 20000);
  const c1 = await T();
  if (c1.candyCount !== c0 + 8) throw new Error('daily-bonus catch reward: ' + (c1.candyCount - c0));

  /* second round same session: repeat reward = min(8, floor(4/2)) = 2, no bonus */
  await page.evaluate(() => window.__trepio.startMini('catch'));
  await poll(() => window.__trepio.state().mini && window.__trepio.state().mini.kind === 'catch');
  await page.evaluate(() => { const m = window.__trepio.game.mini; m.score = 4; m.t = 0.05; });
  await poll(() => window.__trepio.state().mini === null, null, 20000);
  const c2 = await T();
  if (c2.candyCount !== c1.candyCount + 2) throw new Error('repeat catch reward: ' + (c2.candyCount - c1.candyCount));
};
