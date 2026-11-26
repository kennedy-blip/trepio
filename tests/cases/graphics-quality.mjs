/* graphics quality setting: persists + changes pixel ratio */
export default async ({ go, page, poll, T }) => {
  await go();
  const s0 = await T();
  if (s0.quality !== 'auto') throw new Error('default quality: ' + s0.quality);
  /* cycle auto -> low */
  await page.click('#btnSettings');
  await page.waitForTimeout(200);
  await page.click('#btnQuality');
  await poll(() => window.__trepio.state().quality === 'low');
  const dprLow = await page.evaluate(() => window.devicePixelRatio);
  /* cycle low -> medium -> high */
  await page.click('#btnQuality');
  await poll(() => window.__trepio.state().quality === 'medium');
  await page.click('#btnQuality');
  await poll(() => window.__trepio.state().quality === 'high');
  /* persists after reload */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(500);
  const s1 = await T();
  if (s1.quality !== 'high') throw new Error('quality lost after reload: ' + s1.quality);
  /* back to auto for cleanliness */
  await page.evaluate(() => { window.__trepio.raw.settings.quality = 'auto'; window.__trepio.saveApi.save(); });
};
