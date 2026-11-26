/* =====================================================================
   quests.js — quest definitions, tracking, journal & completion
   ===================================================================== */
import { ctx, $ } from './ctx.js';

export const RACE_PAR = 75;
const ROYAL_FAMILY = ['dama', 'ken', 'fay', 'whitney', 'bleso'];
const royalsMet = () => ROYAL_FAMILY.filter((id) => ctx.state.progress.met[id]).length;

export const QUESTS = [
  { id: 'sweetTooth', icon: '🍬', title: 'Sweet Tooth', reward: 15, auto: true,
    desc: () => 'Collect 5 candies',
    prog: () => `${Math.min(ctx.progress.candies, 5)}/5 candies` },
  { id: 'royalVisit', icon: '🏰', title: 'Royal Visit', reward: 20, auto: true,
    desc: () => 'Visit the candy castle beyond the maze',
    prog: () => 'Visit the castle',
    target: () => ctx.world.castleDoor },
  { id: 'rainbowCross', icon: '🌈', title: 'Over the Rainbow', reward: 15, auto: true,
    desc: () => 'Cross the chocolate river on a donut',
    prog: () => 'Cross at a donut' },
  { id: 'goldenBear', icon: '🧸', title: 'The Lost Gummy', reward: 25, auto: true,
    desc: () => 'Find the golden gummy bear behind the cream hills',
    prog: () => 'Find the golden bear' },
  { id: 'homeSweet', icon: '🏡', title: 'Home Sweet Home', reward: 30, auto: true,
    desc: () => (ctx.progress.questStage('homeSweet') === 1
      ? 'Meet your friend at the gumdrop village'
      : 'Talk to a friend, then meet them at the village'),
    prog: () => (ctx.progress.questStage('homeSweet') === 1 ? 'Go to the village' : 'Talk to a friend (E)'),
    target: () => (ctx.progress.questStage('homeSweet') === 1 ? ctx.world.villagePos : null) },
  { id: 'forestRamble', icon: '🌳', title: "Zuri's Forest Ramble", reward: 20, giver: 'zuri',
    desc: () => 'Meet Zuri by the giant lollipop in the north-west forest',
    prog: () => 'Reach the giant lollipop',
    target: () => ctx.world.bigLollipop },
  { id: 'princeFavor', icon: '👑', title: "A Prince's Favor", reward: 25, giver: 'theo',
    desc: () => 'Gather 8 candies and present them to Theo',
    prog: () => `${Math.min(ctx.inventory.candyBalance(), 8)}/8 candies, then talk to Theo`,
    target: () => npcById('theo') },
  { id: 'peakSightseer', icon: '🍦', title: "Amani's Peak Challenge", reward: 20, giver: 'amani',
    desc: () => 'Cross the river and gaze upon the ice cream peaks',
    prog: () => 'Travel beyond the mountains\' foothills (far north)',
    target: () => ctx.world.peaks },
  { id: 'royalTreasure', icon: '🗝️', title: 'The Royal Vault', reward: 30, auto: true,
    desc: () => 'Open the treasure chest inside the candy castle',
    prog: () => 'Open the chest in the castle',
    target: () => ctx.world.castleDoor },
  { id: 'royalDecree', icon: '👑', title: "The King's Decree", reward: 30, giver: 'jamoh',
    desc: () => 'Meet the royal family inside the palace (Dama, Ken, Fay, Whitney, Bleso)',
    prog: () => `Met ${royalsMet()} of 5 family members`,
    target: () => ctx.world.castleDoor },
  { id: 'queensGame', icon: '🎮', title: "The Queen's Arcade", reward: 30, giver: 'dama',
    desc: () => 'Score 10 or better at the Candy Catch arcade (village kiosk)',
    prog: () => `Best score: ${ctx.state.progress.games.catchBest} / 10`,
    target: () => ctx.world.arcades[0].pos },
  { id: 'ringChampion', icon: '🏁', title: "Ken's Gummy Rush", reward: 30, giver: 'ken',
    desc: () => `Finish the Gummy Rush race in under ${RACE_PAR} seconds`,
    prog: () => ctx.state.progress.games.raceBest !== null && ctx.state.progress.games.raceBest !== undefined
      ? `Best time: ${ctx.state.progress.games.raceBest.toFixed(1)}s · par ${RACE_PAR}s`
      : `Run the race at the blue kiosk · par ${RACE_PAR}s`,
    target: () => ctx.world.arcades[1].pos },
];

export const questGiven = (q) => q.auto || ctx.progress.questStage(q.id) !== 0;

export function npcById(id) {
  const n = ctx.npcs.find((x) => x.ch.id === id);
  if (!n) return null;
  if (n.homeState === 'home' && n.home) return n.home.door;
  return n.doll.group.position;
}

export function nameOf(id) {
  const c = ctx.CHARACTERS.find((x) => x.id === id);
  return c ? c.name : id;
}

export function activeQuest() {
  return QUESTS.find((q) => !ctx.progress.isQuestDone(q.id) && questGiven(q)) || null;
}

export function completeQuest(id) {
  if (ctx.progress.isQuestDone(id)) return;
  const q = QUESTS.find((x) => x.id === id);
  ctx.progress.setQuestStage(id, 'done');
  ctx.progress.addXP(q.reward);
  ctx.ui.toast(`✅ Quest complete: <b>${q.title}</b> (+${q.reward} XP)`, 3400);
  if (ctx.ui.effectsOn()) {
    ctx.effects.spawnConfetti(30, ctx.player.group.position);
    ctx.effects.spawnHearts(4, ctx.player.group.position);
  }
  ctx.ui.updateStats();
  updateTracker();
  renderJournal();
  ctx.save();
}

export function updateTracker() {
  const trackerEl = $('tracker');
  if (ctx.game.mode !== 'world') { trackerEl.innerHTML = ''; ctx.world.setBeacon(null); return; }
  if (ctx.game.mini) {
    trackerEl.innerHTML = ctx.game.mini.kind === 'catch'
      ? `🍭 <b>Candy Catch</b><br><span class="tprog">score <b>${ctx.game.mini.score}</b> · ${Math.ceil(Math.max(0, ctx.game.mini.t))}s left</span>`
      : `🏁 <b>Gummy Rush</b> — ring <b>${Math.min(ctx.game.mini.idx + 1, ctx.world.racePath.length)}/${ctx.world.racePath.length}</b><br><span class="tprog">${ctx.game.mini.t.toFixed(1)}s · par ${RACE_PAR}s</span>`;
    ctx.world.setBeacon(null);
    return;
  }
  const q = activeQuest();
  if (!q) {
    trackerEl.innerHTML = '✨ <b>All quests complete!</b>';
    ctx.world.setBeacon(null);
    return;
  }
  let dist = '';
  if (q.target) {
    const tp = q.target();
    if (tp) {
      const d = Math.round(Math.hypot(ctx.player.group.position.x - tp.x, ctx.player.group.position.z - tp.z));
      dist = ` · ${d}m`;
      ctx.world.setBeacon(tp.x, tp.z);
    } else {
      ctx.world.setBeacon(null);
    }
  } else {
    ctx.world.setBeacon(null);
  }
  trackerEl.innerHTML = `${q.icon} <b>${q.title}</b><br><span class="tprog">${q.prog()}${dist}</span>`;
}

export function renderJournal() {
  const list = $('journalList');
  if (!list) return;
  list.innerHTML = '';
  for (const q of QUESTS) {
    const done = ctx.progress.isQuestDone(q.id);
    const given = questGiven(q);
    const row = document.createElement('div');
    row.className = 'quest-row' + (done ? ' done' : '');
    const st = done
      ? '<div class="qr-state complete">✅ COMPLETE</div>'
      : given
        ? '<div class="qr-state active">🔄 IN PROGRESS</div>'
        : `<div class="qr-state hint">💡 TALK TO ${nameOf(q.giver).toUpperCase()}</div>`;
    row.innerHTML = `
      <div class="qr-head"><span>${q.icon} ${q.title}</span><span class="qr-reward">+${q.reward} XP</span></div>
      <div class="qr-desc">${q.desc()}</div>
      ${given ? `<div class="qr-desc"><b>${q.prog()}</b></div>` : ''}
      ${st}`;
    list.appendChild(row);
  }
  /* arcade records */
  const games = ctx.state.progress.games;
  const sec = document.createElement('div');
  sec.className = 'quest-row games-row';
  sec.innerHTML = `
    <div class="qr-head"><span>🎮 Arcade Records</span></div>
    <div class="qr-desc">🍭 Candy Catch — best score: <b>${games.catchBest}</b> (kiosk in the village)</div>
    <div class="qr-desc">🏁 Gummy Rush — best time: <b>${games.raceBest !== null && games.raceBest !== undefined ? games.raceBest.toFixed(1) + 's' : '—'}</b> · par ${RACE_PAR}s (blue kiosk)</div>`;
  list.appendChild(sec);
}

export function updateQuests() {
  const p = ctx.player.group.position;
  if (!ctx.progress.isQuestDone('sweetTooth') && ctx.progress.candies >= 5) completeQuest('sweetTooth');
  if (!ctx.progress.isQuestDone('royalVisit') && p.distanceTo(ctx.world.castleDoor) < 6) completeQuest('royalVisit');
  if (!ctx.progress.isQuestDone('rainbowCross')) {
    for (const d of ctx.world.donuts) {
      if (Math.hypot(p.x - d.x, p.z - d.z) < 2.8) { completeQuest('rainbowCross'); break; }
    }
  }
  if (!ctx.progress.isQuestDone('goldenBear') && !ctx.world.goldenBear.active) completeQuest('goldenBear');
  if (!ctx.progress.isQuestDone('homeSweet') && ctx.progress.questStage('homeSweet') === 1 && p.distanceTo(ctx.world.villagePos) < 5) {
    completeQuest('homeSweet');
  }
  if (!ctx.progress.isQuestDone('forestRamble') && ctx.progress.questStage('forestRamble') === 1 && p.distanceTo(ctx.world.bigLollipop) < 6) {
    completeQuest('forestRamble');
  }
  if (!ctx.progress.isQuestDone('peakSightseer') && ctx.progress.questStage('peakSightseer') === 1 && p.z > 45) {
    completeQuest('peakSightseer');
  }
  if (!ctx.progress.isQuestDone('royalTreasure') && ctx.world.castle.chest.opened) completeQuest('royalTreasure');
  if (!ctx.progress.isQuestDone('royalDecree') && ctx.progress.questStage('royalDecree') === 1 && royalsMet() >= 5) {
    completeQuest('royalDecree');
  }
}

export { royalsMet, ROYAL_FAMILY };
