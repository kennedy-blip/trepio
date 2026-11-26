/* palace + all 7 NPC homes: enter, interact, leave */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();

  /* --- palace --- */
  await page.evaluate(() => window.__trepio.teleport(0, -41.8));
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mode === 'castle');
  const inBounds = await page.evaluate(() => {
    const b = window.__trepio.world.castle.bounds;
    return window.__trepio.royals.every((r) =>
      r.doll.group.position.x > b.minX - 1 && r.doll.group.position.x < b.maxX + 1 &&
      r.doll.group.position.z > b.minZ - 1 && r.doll.group.position.z < b.maxZ + 1);
  });
  if (!inBounds) throw new Error('a royal escaped the palace bounds');
  /* sit on the west-wing sofa, then stand up by moving */
  await page.evaluate(() => window.__trepio.teleport(-9.5, 3.3));
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(300);
  if (!(await page.evaluate(() => window.__trepio.player.sitting()))) throw new Error('sofa sit failed');
  await page.keyboard.down('KeyW');
  const stood = await poll(() => !window.__trepio.player.sitting(), null, 20000);
  await page.keyboard.up('KeyW');
  if (!stood) throw new Error('did not stand up');
  /* the vault chest works */
  await page.evaluate(() => window.__trepio.teleport(3.8, -7.2));
  await page.evaluate(() => window.__trepio.openChest());
  await poll(() => window.__trepio.state().chestOpened === true);
  /* leave */
  await page.evaluate(() => window.__trepio.teleport(0, 8.4));
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mode === 'world');

  /* --- every NPC home --- */
  const homes = ['zuri', 'theo', 'amani', 'momo', 'lulu', 'kiki', 'dex'];
  for (const id of homes) {
    await page.evaluate((id) => {
      const h = window.__trepio.world.homes.find((x) => x.id === id);
      window.__trepio.teleport(h.door.x, h.door.z);
    }, id);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })));
    const entered = await poll((id) => window.__trepio.state().mode === 'house' && window.__trepio.state().home === id, id, 12000);
    if (!entered) throw new Error('could not enter ' + id + "'s home");
    /* sit on a chair (atomic teleport + interact, slow headless frames) */
    await page.evaluate((id) => {
      const s = window.__trepio.world.homes.find((x) => x.id === id).interior.sits[0];
      window.__trepio.teleport(s.x, s.z);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }, id);
    const sat = await poll(() => window.__trepio.player.sitting(), null, 15000);
    if (!sat) throw new Error('chair sit failed in ' + id + "'s home");
    /* stand up (W) — E while seated only stands — then step outside.
       The door strip is z>1.6 & |x|<1, but a home owner within 2.6m intercepts E
       with chatter, so we go deep into the strip (z=5) where owners never idle. */
    await page.keyboard.down('KeyW');
    await poll(() => !window.__trepio.player.sitting(), null, 15000);
    await page.keyboard.up('KeyW');
    await page.evaluate(() => { window.__trepio.teleport(0, 5.0); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); });
    let left = await poll(() => window.__trepio.state().mode === 'world', null, 12000);
    if (!left) {
      /* owner chat opened? close it and retry once */
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.evaluate(() => { window.__trepio.teleport(0, 5.6); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); });
      left = await poll(() => window.__trepio.state().mode === 'world', null, 12000);
    }
    if (!left) throw new Error('could not leave ' + id + "'s home");
  }

  /* owner schedules: force a villager home and visit them */
  await page.evaluate(() => window.__trepio.forceNpcHome('zuri', true));
  await poll(() => window.__trepio.npcs.find((n) => n.ch.id === 'zuri').homeState === 'home');
  await page.evaluate(() => {
    const h = window.__trepio.world.homes.find((x) => x.id === 'zuri');
    window.__trepio.teleport(h.door.x, h.door.z);
  });
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mode === 'house');
  const s = await T();
  if (s.ownerHome !== 'home') throw new Error('zuri not home when visited');
  /* she can leave while we watch */
  await page.evaluate(() => { window.__trepio.npcs.find((n) => n.ch.id === 'zuri').homeTimer = 0.01; });
  await poll(() => window.__trepio.state().ownerHome === 'out', null, 15000);
  await page.evaluate(() => window.__trepio.teleport(0, 2.4));
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mode === 'world');
};
