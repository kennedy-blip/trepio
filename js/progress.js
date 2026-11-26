/* =====================================================================
   progress.js — XP, levels, quests, candy inventory, unlockables
   ===================================================================== */
export const LEVEL_XP = [0, 25, 60, 120];

export function levelFromXP(xp) {
  let lv = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lv = i + 1;
  return lv;
}

export function createProgress(saved = {}) {
  const p = {
    xp: saved.xp || 0,
    candies: saved.candies || 0,
    quests: saved.quests || {},
  };
  p.level = levelFromXP(p.xp);

  const listeners = { levelup: [], quest: [], candy: [] };
  p.on = (ev, fn) => { if (listeners[ev]) listeners[ev].push(fn); };

  p.addXP = (n) => {
    const before = p.level;
    p.xp += n;
    p.level = levelFromXP(p.xp);
    if (p.level > before) for (const f of listeners.levelup) f(p.level);
  };
  p.addCandy = () => {
    p.candies++;
    p.addXP(1);
    for (const f of listeners.candy) f(p.candies);
  };
  p.questStage = (id) => (p.quests[id] === undefined ? 0 : p.quests[id]);
  p.setQuestStage = (id, stage) => {
    p.quests[id] = stage;
    for (const f of listeners.quest) f(id, stage);
  };
  p.isQuestDone = (id) => p.quests[id] === 'done';
  p.serialize = () => ({ xp: p.xp, candies: p.candies, quests: p.quests });
  return p;
}
