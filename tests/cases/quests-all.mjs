/* all 12 quests can be completed and stay completed after reload */
export default async ({ go, page, poll, T, enterWorld, talkTo }) => {
  await go();
  await enterWorld();

  /* --- auto quests --- */
  /* sweetTooth: collect 5 candies */
  for (let k = 0; k < 5; k++) {
    await page.evaluate(() => {
      const c = window.__trepio.world.candies.find((c) => c.active);
      window.__trepio.teleport(c.x, c.z);
    });
    await poll((k) => window.__trepio.state().candyCount === k + 1, k, 20000);
  }
  /* royalVisit: approach the castle */
  await page.evaluate(() => window.__trepio.teleport(0, -40));
  await poll(() => window.__trepio.state().quests.royalVisit === 'done', null, 20000);
  /* rainbowCross: stand on a donut crossing */
  await page.evaluate(() => window.__trepio.teleport(0, 32));
  await poll(() => window.__trepio.state().quests.rainbowCross === 'done', null, 20000);
  /* goldenBear: find the bear */
  await page.evaluate(() => window.__trepio.teleport(43, -25));
  await poll(() => window.__trepio.state().quests.goldenBear === 'done', null, 20000);

  /* --- NPC quests --- */
  /* homeSweet: talk to a friend, then go to the village */
  await talkTo('momo');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.homeSweet === 1);
  await page.evaluate(() => window.__trepio.teleport(15.5, 21));
  await poll(() => window.__trepio.state().quests.homeSweet === 'done', null, 20000);
  /* forestRamble: Zuri offers, reach the lollipop */
  await talkTo('zuri');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.forestRamble === 1);
  await page.evaluate(() => window.__trepio.teleport(-30, -14));
  await poll(() => window.__trepio.state().quests.forestRamble === 'done', null, 20000);
  /* princeFavor: Theo, candies in hand */
  await page.evaluate(() => window.__trepio.progress.addCandies(30));
  await talkTo('theo');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.princeFavor === 1);
  await talkTo('theo');
  await poll(() => window.__trepio.state().quests.princeFavor === 'done', null, 12000);
  /* peakSightseer: Amani, then far north */
  await talkTo('amani');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.peakSightseer === 1);
  await page.evaluate(() => window.__trepio.teleport(0, 46));
  await poll(() => window.__trepio.state().quests.peakSightseer === 'done', null, 20000);

  /* --- palace: vault + royals --- */
  await page.evaluate(() => window.__trepio.teleport(0, -41.8));
  await page.keyboard.press('KeyE');
  await poll(() => window.__trepio.state().mode === 'castle');
  /* royalTreasure: open the vault */
  await page.evaluate(() => window.__trepio.teleport(3.8, -7.2));
  await page.evaluate(() => window.__trepio.openChest());
  await poll(() => window.__trepio.state().chestOpened === true);
  await poll(() => window.__trepio.state().quests.royalTreasure === 'done', null, 12000);
  /* royalDecree: meet the family, then the king */
  await talkTo('jamoh');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.royalDecree === 1);
  for (const id of ['dama', 'ken', 'fay', 'whitney', 'bleso']) {
    await talkTo(id);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await talkTo('jamoh');
  await poll(() => window.__trepio.state().quests.royalDecree === 'done', null, 12000);
  /* queensGame: set an arcade record, then turn in */
  await page.evaluate(() => { window.__trepio.raw.progress.games.catchBest = 12; });
  await talkTo('dama');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.queensGame === 1);
  await talkTo('dama');
  await poll(() => window.__trepio.state().quests.queensGame === 'done', null, 12000);
  /* ringChampion: set a winning race time, then turn in */
  await page.evaluate(() => { window.__trepio.raw.progress.games.raceBest = 42.5; });
  await talkTo('ken');
  await page.keyboard.press('Escape');
  await poll(() => window.__trepio.state().quests.ringChampion === 1);
  await talkTo('ken');
  await poll(() => window.__trepio.state().quests.ringChampion === 'done', null, 12000);

  /* all 12 done, and it survives a reload */
  const ids = ['sweetTooth', 'royalVisit', 'rainbowCross', 'goldenBear', 'homeSweet', 'forestRamble',
    'princeFavor', 'peakSightseer', 'royalTreasure', 'royalDecree', 'queensGame', 'ringChampion'];
  const s = await T();
  const missing = ids.filter((id) => s.quests[id] !== 'done');
  if (missing.length) throw new Error('incomplete: ' + missing.join(','));
  await page.reload({ waitUntil: 'networkidle' });
  await poll(() => !!window.__trepio, null, 15000);
  await page.waitForTimeout(600);
  const s2 = await T();
  const missing2 = ids.filter((id) => s2.quests[id] !== 'done');
  if (missing2.length) throw new Error('lost after reload: ' + missing2.join(','));
};
