/* camera: tilt (pitch) drags + wall-aware pull-in near interior walls */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();
  const s0 = await T();
  const p0 = s0.camPitch;

  /* drag down on the canvas -> pitch increases (camera rises / looks down) */
  await page.mouse.move(320, 200);
  await page.mouse.down();
  await page.mouse.move(320, 320, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const p1 = await T();
  if (!(p1.camPitch > p0 + 0.1)) throw new Error('tilt down did not raise pitch: ' + p0 + ' -> ' + p1.camPitch);

  /* drag up hard -> pitch clamps at the floor (-0.12), never below */
  await page.mouse.move(320, 300);
  await page.mouse.down();
  await page.mouse.move(320, 20, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const p2 = await T();
  if (p2.camPitch < -0.13 || p2.camPitch > 0.05) throw new Error('pitch floor wrong: ' + p2.camPitch);

  /* wall pull-in: enter zuri's home, stand near the back wall; the camera must
     never sit inside the north wall (interior box z <= -2.7) */
  await page.evaluate(() => {
    const h = window.__trepio.world.homes.find((x) => x.id === 'zuri');
    window.__trepio.teleport(h.door.x, h.door.z);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  });
  const inside = await poll(() => window.__trepio.state().mode === 'house' && window.__trepio.state().home === 'zuri');
  if (!inside) throw new Error('could not enter home for camera test');
  await page.evaluate(() => window.__trepio.teleport(0, -1.6));
  const ok = await poll(() => {
    const s = window.__trepio.state();
    return s.camPos && s.camPos[2] > -2.9 && s.camPos[1] > 0.5;
  }, null, 25000);
  if (!ok) throw new Error('camera clipped into the wall: ' + JSON.stringify((await T()).camPos));
};
