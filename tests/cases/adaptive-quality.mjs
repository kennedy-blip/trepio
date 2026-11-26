/* adaptive Auto quality: drops tier under low fps, recovers under high fps,
   and stays put when the user picked a tier manually */
export default async ({ go, page, T }) => {
  await go();
  const s0 = await T();
  if (s0.quality !== 'auto') throw new Error('default not auto: ' + s0.quality);
  if (s0.qualityTier !== 'high') throw new Error('desktop Auto tier should start high: ' + s0.qualityTier);

  /* sustained low fps (debug override) — Auto steps down with cooldown between steps */
  await page.evaluate(() => window.__trepio.simulateFps(20));
  await page.evaluate(() => window.__trepio.qualityTick(40));
  const s1 = await T();
  if (s1.qualityTier !== 'low') throw new Error('did not drop to low: ' + s1.qualityTier);

  /* sustained high fps — climbs back to the device target */
  await page.evaluate(() => window.__trepio.simulateFps(60));
  await page.evaluate(() => window.__trepio.qualityTick(90));
  const s2 = await T();
  if (s2.qualityTier !== 'high') throw new Error('did not recover to high: ' + s2.qualityTier);

  /* manual selection disables adaptation entirely */
  await page.evaluate(() => { window.__trepio.raw.settings.quality = 'low'; });
  await page.evaluate(() => window.__trepio.qualityTick(20));
  const s3 = await T();
  if (s3.qualityTier !== 'low') throw new Error('manual tier not respected: ' + s3.qualityTier);

  /* the button label reflects the live tier while Auto */
  await page.evaluate(() => { window.__trepio.raw.settings.quality = 'auto'; window.__trepio.saveApi.save(); });
  const label = await page.evaluate(() => document.getElementById('btnQuality').textContent);
  if (!/Auto \(High\)/i.test(label)) throw new Error('quality label wrong: ' + label);
};
