/* save versioning + export/import round-trip */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();
  /* make some progress */
  await page.evaluate(() => {
    window.__trepio.progress.addCandies(100);
    window.__trepio.buy('candycane');
    window.__trepio.progress.setQuestStage('sweetTooth', 'done');
  });
  await poll(() => window.__trepio.state().purchases.candycane === true);

  /* export: versioned json containing the progress */
  const json = await page.evaluate(() => window.__trepio.saveApi.exportSave());
  const data = JSON.parse(json);
  if (data.v !== 3) throw new Error('export missing version: ' + data.v);
  if (!data.progress || data.progress.candies < 100) throw new Error('export missing progress');
  if (!data.purchases || !data.purchases.candycane) throw new Error('export missing purchases');

  /* wipe and import back */
  await page.evaluate(() => localStorage.clear());
  const res = await page.evaluate((j) => window.__trepio.saveApi.importSave(j), json);
  if (!res.ok) throw new Error('import failed: ' + res.error);
  const committed = await page.evaluate((st) => window.__trepio.saveApi.commitImport(st), res.state);
  if (!committed) throw new Error('commitImport failed');

  /* reload — the imported save is live */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(600);
  const s = await T();
  if (!s.purchases.candycane) throw new Error('imported purchases missing');
  if (s.candyCount < 100) throw new Error('imported candies missing: ' + s.candyCount);
  if (s.quests.sweetTooth !== 'done') throw new Error('imported quest missing');

  /* garbage import is rejected cleanly */
  const bad = await page.evaluate(() => window.__trepio.saveApi.importSave('{"hello": "world"}'));
  if (bad.ok) throw new Error('garbage import accepted');
  const bad2 = await page.evaluate(() => window.__trepio.saveApi.importSave('not json at all'));
  if (bad2.ok) throw new Error('non-json import accepted');

  /* an old (v2-era, unversioned) save migrates in */
  await page.evaluate(() => {
    localStorage.setItem(window.__trepio.saveApi.STORE_KEY, JSON.stringify({
      character: 'momo', cfgs: {}, mode: 'studio',
      progress: { xp: 30, candies: 4, quests: { sweetTooth: 'done' } },
      purchases: {}, spent: 0,
      settings: { music: false },
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(600);
  const s2 = await T();
  if (s2.candyCount !== 4) throw new Error('migration lost candies: ' + s2.candyCount);
  if (s2.quests.sweetTooth !== 'done') throw new Error('migration lost quests');
  const stamped = await page.evaluate(() => JSON.parse(localStorage.getItem(window.__trepio.saveApi.STORE_KEY)).v);
  if (stamped !== 3) throw new Error('save not stamped v3: ' + stamped);

  /* the export UI buttons exist and the version label renders */
  const ui = await page.evaluate(() => ({
    q: !!document.getElementById('btnQuality'),
    ex: !!document.getElementById('btnExportSave'),
    im: !!document.getElementById('btnImportSave'),
    ver: document.getElementById('saveVersion')?.textContent,
  }));
  if (!ui.q || !ui.ex || !ui.im) throw new Error('save management UI missing');
  if (ui.ver !== 'v3') throw new Error('version label: ' + ui.ver);
};
