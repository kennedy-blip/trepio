/* boots cleanly with zero console errors; core UI intact */
export default async ({ go, page, T }) => {
  await go();
  const s = await T();
  if (s.royals !== 6) throw new Error('royals missing: ' + s.royals);
  if (s.npcs !== 7) throw new Error('npcs missing: ' + s.npcs);
  /* journal: 12 quests + arcade records */
  await page.click('#btnJournal2');
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => document.querySelectorAll('.quest-row').length);
  if (rows !== 13) throw new Error('journal rows: ' + rows);
  await page.click('#btnCloseJournal');
  /* shop: 7 cosmetics + 3 pets */
  await page.click('#btnShop2');
  await page.waitForTimeout(300);
  const shopRows = await page.evaluate(() => document.querySelectorAll('.shop-row').length);
  if (shopRows !== 10) throw new Error('shop rows: ' + shopRows);
  await page.click('#btnCloseShop');
};
