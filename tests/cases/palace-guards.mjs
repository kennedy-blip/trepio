/* candy palace: two guards flank the gate, talkable, palace still enterable */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();
  const s = await T();
  if (s.guards !== 2) throw new Error('guards missing: ' + s.guards);
  const [gl, gr] = s.guardPos;
  if (!gl || !gr) throw new Error('guard positions missing');
  if (!(gl[0] < 0 && gr[0] > 0)) throw new Error('guards not flanking: ' + JSON.stringify(s.guardPos));
  if (Math.abs(gl[2] - -42.3) > 0.5 || Math.abs(gr[2] - -42.3) > 0.5) throw new Error('guards not at the gate');

  /* talk to the left guard: teleport beside + E */
  await page.evaluate(() => {
    const g = window.__trepio.raw ? null : null;
    window.__trepio.teleport(-1.6, -42.3);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  });
  const open = await poll(() => document.getElementById('dialogue').classList.contains('show'));
  if (!open) throw new Error('guard dialogue did not open');
  const txt = await page.evaluate(() => document.getElementById('dialogue').textContent);
  if (!/Guard (Gumdrop|Taffy)/.test(txt)) throw new Error('wrong speaker: ' + txt.slice(0, 40));
  /* chat choice works */
  await page.click('#dialogue .dchoice >> nth=0');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await poll(() => !document.getElementById('dialogue').classList.contains('show'));

  /* the palace gate still works: walk between the guards */
  await page.evaluate(() => { window.__trepio.teleport(0, -41.8); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); });
  const inCastle = await poll(() => window.__trepio.state().mode === 'castle');
  if (!inCastle) throw new Error('could not enter palace with guards present');
  /* leave again */
  await page.evaluate(() => { window.__trepio.teleport(0, 8.4); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); });
  const out = await poll(() => window.__trepio.state().mode === 'world');
  if (!out) throw new Error('could not leave palace');

  /* guards persist after reload */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(600);
  const s2 = await T();
  if (s2.guards !== 2) throw new Error('guards lost after reload: ' + s2.guards);
};
