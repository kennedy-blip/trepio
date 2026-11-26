/* pets: buy, follow, swap, unequip, persist */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await page.evaluate(() => window.__trepio.progress.addCandies(100));
  await page.evaluate(() => window.__trepio.buy('pet_gummycat'));
  await poll(() => window.__trepio.state().pet === 'gummycat');
  await enterWorld();

  /* follows the player */
  await page.evaluate(() => window.__trepio.teleport(6, 22));
  const follows = await poll(() => {
    const p = window.__trepio.state().petPos;
    return p && Math.hypot(p[0] - 6, p[2] - 22) < 4;
  }, null, 25000);
  if (!follows) throw new Error('pet does not follow');

  /* swap to bunny via setPet after buying it */
  await page.evaluate(() => window.__trepio.buy('pet_cocobunny'));
  await page.evaluate(() => window.__trepio.setPet('cocobunny'));
  await poll(() => window.__trepio.state().pet === 'cocobunny');
  /* unequip */
  await page.evaluate(() => window.__trepio.setPet(null));
  await poll(() => window.__trepio.state().pet === null);
  /* re-equip */
  await page.evaluate(() => window.__trepio.setPet('gummycat'));
  await poll(() => window.__trepio.state().pet === 'gummycat');

  /* persists across reload */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(700);
  const s = await T();
  if (s.pet !== 'gummycat') throw new Error('pet lost after reload: ' + s.pet);
};
