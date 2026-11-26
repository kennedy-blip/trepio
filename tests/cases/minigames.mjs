/* Candy Catch + Gummy Rush: play, score, records persist */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();
  const s0 = await T();

  /* --- Candy Catch --- */
  await page.evaluate(() => window.__trepio.teleport(7, 18));
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mini && window.__trepio.state().mini.kind === 'catch');
  /* let a couple of candies fall onto the player (deterministic) */
  /* nudge the spawner so a few candies exist, then drop them onto the player */
  for (let k = 0; k < 4; k++) {
    await page.evaluate(() => { if (window.__trepio.game.mini) window.__trepio.game.mini.spawn = 0; });
    await page.waitForTimeout(900);
  }
  await poll(() => window.__trepio.game.mini && window.__trepio.game.mini.items.length >= 3, null, 30000);
  await page.evaluate(() => {
    const m = window.__trepio.game.mini;
    const pp = window.__trepio.player.group.position;
    for (const it of m.items) it.position.set(pp.x + 0.1, 1.0, pp.z);
  });
  await poll(() => window.__trepio.game.mini && window.__trepio.game.mini.score >= 3, null, 25000);
  /* end the round */
  await page.evaluate(() => { if (window.__trepio.game.mini) window.__trepio.game.mini.t = 0.05; });
  await poll(() => window.__trepio.state().mini === null, null, 20000);
  const s1 = await T();
  if (!s1.games.catchBest || s1.games.catchBest < 1) throw new Error('catch best not recorded: ' + s1.games.catchBest);
  if (s1.candyCount <= s0.candyCount) throw new Error('catch paid no candies');

  /* --- Gummy Rush --- */
  await page.evaluate(() => window.__trepio.teleport(-16, 25));
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mini && window.__trepio.state().mini.kind === 'race');
  const ringsVisible = await page.evaluate(() => window.__trepio.world.raceRings.every((r) => r.visible));
  if (!ringsVisible) throw new Error('race rings not visible');
  for (let i = 0; i < 6; i++) {
    await page.evaluate((i) => {
      const wp = window.__trepio.world.racePath[i];
      window.__trepio.teleport(wp.x, wp.z);
    }, i);
    const ok = await poll(
      (i) => !window.__trepio.game.mini || window.__trepio.game.mini.idx > i,
      i, 15000
    );
    if (!ok) throw new Error('ring ' + i + ' missed');
  }
  await poll(() => window.__trepio.state().mini === null, null, 20000);
  const s2 = await T();
  if (s2.games.raceBest === null || s2.games.raceBest === undefined) throw new Error('race time not recorded');

  /* records survive a reload */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(600);
  const s3 = await T();
  if (s3.games.catchBest !== s2.games.catchBest) throw new Error('catchBest lost after reload');
  if (s3.games.raceBest !== s2.games.raceBest) throw new Error('raceBest lost after reload');
};
