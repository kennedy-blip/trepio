/* mobile emulation (Pixel 5): boots, touch UI, journal + world entry */
export const mobile = true; /* the runner boots this case in a Pixel 5 context */
export default async ({ page, poll, T, BASE }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE + '/?debug', { waitUntil: 'networkidle' });
  const booted = await poll(() => !!window.__trepio && !document.getElementById('loading'));
  if (!booted) throw new Error('mobile boot failed');
  const s = await T();
  if (s.npcs !== 7 || s.royals !== 6) throw new Error('world incomplete on mobile');

  /* the wardrobe panel (visible in studio) must not be covered on a narrow screen */
  await page.waitForTimeout(300);
  const tabsOK = await page.evaluate(() => {
    const t = document.querySelector('.tab[data-tab="outfit"]');
    if (!t) return false;
    const r = t.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return top === t || (t.contains && t.contains(top));
  });
  if (!tabsOK) throw new Error('wardrobe tabs not tappable on mobile');

  /* enter the world — the touch joystick appears */
  await page.click('#btnEnter');
  await poll(() => window.__trepio.state().mode === 'world');
  const joy = await page.evaluate(() => document.getElementById('joy')?.classList.contains('show'));
  if (!joy) throw new Error('joystick not shown on touch device');

  /* journal opens via the HUD button */
  await page.click('#btnJournal');
  await page.waitForTimeout(300);
  const open = await page.evaluate(() => !document.getElementById('journal').classList.contains('hidden'));
  if (!open) throw new Error('journal did not open on mobile');
  const rows = await page.evaluate(() => document.querySelectorAll('#journal .quest-row').length);
  if (rows !== 13) throw new Error('journal rows on mobile: ' + rows);

  /* quality defaults to medium-tier on touch */
  const q = await T();
  if (q.quality !== 'auto') throw new Error('quality default changed: ' + q.quality);

  if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
};
