/* collect candies, refresh — they stay collected (no re-collect farming) */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();
  for (let k = 0; k < 5; k++) {
    await page.evaluate(() => {
      const c = window.__trepio.world.candies.find((c) => c.active);
      window.__trepio.teleport(c.x, c.z);
    });
    const ok = await poll((k) => window.__trepio.state().collected === k + 1, k, 20000);
    if (!ok) throw new Error('candy ' + k + ' did not register');
  }
  const s = await T();
  if (s.candyCount < 5) throw new Error('candy count: ' + s.candyCount);
  if (s.quests.sweetTooth !== 'done') throw new Error('sweetTooth not done');
  const collected = s.collected;
  const activeBefore = s.candiesActive;

  /* reload — nothing respawns */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(600);
  const s2 = await T();
  if (s2.collected !== collected) throw new Error(`collected changed after reload: ${collected} -> ${s2.collected}`);
  if (s2.candiesActive !== activeBefore) throw new Error('candies respawned after reload');
  if (s2.quests.sweetTooth !== 'done') throw new Error('sweetTooth lost after reload');
};
