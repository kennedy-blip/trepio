/* four family homes: full families inside (babies included), talkable, rare outings */
export default async ({ go, page, poll, T, enterWorld }) => {
  await go();
  await enterWorld();
  const s0 = await T();
  if (s0.familyHomes !== 4) throw new Error('family homes: ' + s0.familyHomes);
  const expected = { berrywhistle: 3, gumdropp: 4, mintwhisk: 3, cocoabean: 3 };
  for (const f of s0.families) {
    if (f.members.length !== expected[f.home]) throw new Error(f.home + ' members: ' + f.members.length);
    if (!f.members.some((m) => m.kind === 'baby')) throw new Error(f.home + ' has no baby');
  }

  const talkNear = async (pos) => {
    await page.evaluate((p) => {
      window.__trepio.teleport(p[0], p[1]);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }, pos);
    return poll(() => document.getElementById('dialogue').classList.contains('show'));
  };

  for (const homeId of Object.keys(expected)) {
    /* enter through the front door */
    await page.evaluate((id) => {
      const h = window.__trepio.world.homes.find((x) => x.id === id);
      window.__trepio.teleport(h.door.x, h.door.z);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }, homeId);
    const inside = await poll((id) => window.__trepio.state().mode === 'house' && window.__trepio.state().home === id, homeId, 12000);
    if (!inside) throw new Error('could not enter ' + homeId);

    /* the whole family is home (fresh boot: nobody out yet) */
    const st = await T();
    const fam = st.families.find((f) => f.home === homeId);
    if (fam.members.some((m) => m.where !== 'in')) throw new Error(homeId + ': member out at boot');

    /* talk to a parent */
    const parent = fam.members.find((m) => m.kind === 'parent');
    if (!(await talkNear([parent.pos[0] + 0.7, parent.pos[2]]))) throw new Error(homeId + ': parent dialogue failed');
    let txt = await page.evaluate(() => document.getElementById('dialogue').textContent);
    if (!txt.includes(parent.name)) throw new Error(homeId + ': wrong parent speaker: ' + txt.slice(0, 40));
    await page.click('#dialogue .dchoice >> nth=0'); /* about the little one */
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await poll(() => !document.getElementById('dialogue').classList.contains('show'));

    /* talk to a baby (full interaction incl. peek-a-boo) */
    const baby = fam.members.find((m) => m.kind === 'baby');
    if (!(await talkNear([baby.pos[0], baby.pos[2] + 0.5]))) throw new Error(homeId + ': baby dialogue failed');
    txt = await page.evaluate(() => document.getElementById('dialogue').textContent);
    if (!txt.includes(baby.name)) throw new Error(homeId + ': wrong baby speaker: ' + txt.slice(0, 40));
    await page.click('#dialogue .dchoice >> nth=0'); /* peek-a-boo */
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await poll(() => !document.getElementById('dialogue').classList.contains('show'));

    /* leave */
    await page.evaluate(() => { window.__trepio.teleport(0, 4.8); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); });
    const out = await poll(() => window.__trepio.state().mode === 'world', null, 12000);
    if (!out) throw new Error('could not leave ' + homeId);
  }

  /* parents take rare strolls and are talkable outside */
  await page.evaluate(() => {
    const fam = window.__trepio.families.find((f) => f.home.id === 'mintwhisk');
    const dad = fam.members.find((m) => m.ch.id === 'milo');
    dad.outingT = 0.01; /* send him out on his stroll */
  });
  const dadOut = await poll(() => {
    const s = window.__trepio.state();
    const fam = s.families.find((f) => f.home === 'mintwhisk');
    return fam.members.some((m) => m.id === 'milo' && m.where === 'out');
  }, null, 20000);
  if (!dadOut) throw new Error('parent never went out');
  const st2 = await T();
  const dad = st2.families.find((f) => f.home === 'mintwhisk').members.find((m) => m.id === 'milo');
  if (!(await talkNear([dad.pos[0] + 0.8, dad.pos[2]]))) throw new Error('outside parent not talkable');
  const txt2 = await page.evaluate(() => document.getElementById('dialogue').textContent);
  if (!txt2.includes('Milo')) throw new Error('wrong outside speaker: ' + txt2.slice(0, 40));
  await page.keyboard.press('Escape');

  /* babies NEVER go out */
  const s3 = await T();
  for (const f of s3.families) {
    for (const m of f.members) {
      if (m.kind === 'baby' && m.where !== 'in') throw new Error('baby left home: ' + m.id);
    }
  }
};
