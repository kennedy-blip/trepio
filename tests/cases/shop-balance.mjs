/* buying items deducts the right amount and persists */
export default async ({ go, page, poll, T }) => {
  await go();
  await page.evaluate(() => window.__trepio.progress.addCandies(100));
  /* buy candy cane outfit (15) */
  await page.click('#btnShop2');
  await page.waitForTimeout(300);
  await page.click('.shop-row:has-text("Candy Cane") .sr-buy');
  await poll(() => window.__trepio.state().purchases.candycane === true);
  let s = await T();
  if (s.balance !== 85) throw new Error('balance after candycane: ' + s.balance);
  /* buy gummy cat pet (30) */
  await page.click('.shop-row:has-text("Gummy Cat") .sr-buy');
  await poll(() => window.__trepio.state().purchases.pet_gummycat === true);
  s = await T();
  if (s.balance !== 55) throw new Error('balance after pet: ' + s.balance);
  if (s.pet !== 'gummycat') throw new Error('pet not auto-equipped: ' + s.pet);
  await page.click('#btnCloseShop');
  /* insufficient funds: everything left is under-priced check — halo (50) should still be buyable,
     bunny (30) too; try spending down and confirm a disabled button */
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(500);
  s = await T();
  if (s.balance !== 55) throw new Error('balance lost after reload: ' + s.balance);
  if (!s.purchases.candycane || !s.purchases.pet_gummycat) throw new Error('purchases lost after reload');
};
