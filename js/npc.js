/* =====================================================================
   npc.js — villagers, the royal family, dialogue & daily schedules
   ===================================================================== */
import * as THREE from 'three';
import { ctx, $ } from './ctx.js';
import { createDoll } from './doll.js';
import { resolveWorldCollisions, resolveBoxCircle, resolveCastleCollisions, lerpAngle } from './collide.js';
import { RACE_PAR } from './quests.js';

/* ------------------------------------------------------------------ */
/* Dialogue                                                            */
/* ------------------------------------------------------------------ */
export let dialogueOpen = false;
let dialogueTimer = null;
export function closeDialogue() {
  const el = $('dialogue');
  el.classList.remove('show', 'interactive');
  dialogueOpen = false;
  clearTimeout(dialogueTimer);
}
export function dialogueHtml(name, emoji, text, choices) {
  const el = $('dialogue');
  el.innerHTML = `<b>${emoji} ${name}</b><br>“${text}”` +
    (choices ? `<div class="dchoices">${choices}</div>` : '');
  el.classList.add('show', 'interactive');
  dialogueOpen = true;
  clearTimeout(dialogueTimer);
  /* auto-hide casual chatter, but keep choice dialogs open until answered */
  if (!choices) dialogueTimer = setTimeout(() => closeDialogue(), 7000);
}
export function dchoiceBtn(label, fn, isQuest) {
  const b = document.createElement('button');
  b.className = 'dchoice' + (isQuest ? ' quest' : '');
  b.innerHTML = label;
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

/* ------------------------------------------------------------------ */
/* Villagers (wander the world, go home on their own schedule)         */
/* ------------------------------------------------------------------ */
const _toP = { x: 0, z: 0 };
export const npcs = [];
export function rebuildNpcs() {
  for (const n of npcs) {
    n.doll.group.parent && n.doll.group.parent.remove(n.doll.group);
    n.doll.dispose();
  }
  npcs.length = 0;
  const others = ctx.CHARACTERS.filter((c) => c.id !== ctx.currentChar.id && !c.royal);
  others.forEach((ch, i) => {
    const doll = createDoll(ctx.cfgFor(ch.id));
    const home = ctx.world.homes.find((h) => h.npc === ch.id) || null;
    /* some NPCs start at home */
    const startHome = home && Math.random() < 0.25;
    let p = null;
    for (let k = 0; k < 30 && !p; k++) {
      const a = (i / others.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const r = 24 + Math.random() * 8;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 22.5 && Math.abs(z) < 22.5) continue;
      if (z > 27 && z < 37) continue;
      p = { x, z };
    }
    if (!p) p = { x: 24, z: 24 };
    if (startHome) {
      doll.group.position.copy(home.npcSpot);
      home.interior.group.add(doll.group);
    } else {
      doll.group.position.set(p.x, 0, p.z);
      ctx.world.group.add(doll.group);
    }
    doll.group.rotation.y = Math.random() * Math.PI * 2;
    npcs.push({
      doll, ch, home,
      state: 'idle',
      timer: 1 + Math.random() * 3,
      target: startHome ? home.npcSpot.clone() : new THREE.Vector3(p.x, 0, p.z),
      speed: 2.2 + Math.random() * 1.2,
      waveTimer: 0.5 + Math.random() * 3,
      lastPos: doll.group.position.clone(),
      stuckTimer: 0,
      tick: i,
      homeState: startHome ? 'home' : 'out',
      homeTimer: 30 + Math.random() * 110,
      goingHome: false,
      sitting: false,
    });
  });
}
function pickNpcTarget(n) {
  for (let k = 0; k < 20; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = 23 + Math.random() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 22.5 && Math.abs(z) < 22.5) continue;
    if (z > 27) continue;
    n.target.set(x, 0, z);
    return;
  }
  n.target.set(0, 0, 26);
}
function pickInteriorTarget(n, bounds) {
  n.target.set(
    bounds.minX + Math.random() * (bounds.maxX - bounds.minX), 0,
    bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ));
}

export function enterNpcHome(n) {
  n.home.interior.group.add(n.doll.group);
  n.doll.group.position.copy(n.home.npcSpot);
  n.doll.group.position.y = 0;
  n.doll.group.rotation.y = Math.PI + (Math.random() - 0.5);
  n.homeState = 'home';
  n.goingHome = false;
  n.state = 'idle';
  n.timer = 1;
  n.homeTimer = 40 + Math.random() * 80;
  n.sitting = false;
  n.doll.setPose('stand');
  n.lastPos.copy(n.doll.group.position);
}
export function exitNpcHome(n) {
  ctx.world.group.add(n.doll.group);
  n.doll.group.position.copy(n.home.exit);
  n.doll.group.position.y = 0;
  n.homeState = 'out';
  n.homeTimer = 60 + Math.random() * 140;
  n.state = 'idle';
  n.timer = 0.5;
  n.sitting = false;
  n.doll.setPose('stand');
  n.target.set(0, 0, 26);
  n.lastPos.copy(n.doll.group.position);
}

export function updateNpc(n, dt, t) {
  const p = n.doll.group.position;

  /* ---- inside their own house ---- */
  if (n.homeState === 'home') {
    if (!ctx.homes.getActiveHome() || ctx.homes.getActiveHome() !== n.home) return; /* frozen while nobody watches */
    _toP.x = ctx.player.group.position.x - p.x;
    _toP.z = ctx.player.group.position.z - p.z;
    const distToPlayer = Math.hypot(_toP.x, _toP.z);
    n.homeTimer -= dt;
    if (n.homeTimer <= 0) { exitNpcHome(n); return; }

    if (n.sitting) {
      n.timer -= dt;
      if (n.timer <= 0) {
        n.sitting = false;
        n.doll.setPose('stand');
        n.doll.group.position.y = 0;
        n.state = 'idle';
        n.timer = 1;
      }
    } else if (distToPlayer < 2.5) {
      n.state = 'greet';
      n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(_toP.x, _toP.z), Math.min(1, dt * 6));
      n.waveTimer -= dt;
      if (n.waveTimer <= 0) {
        n.doll.wave();
        n.waveTimer = 4 + Math.random() * 4;
        if (ctx.ui.effectsOn() && Math.random() < 0.4) ctx.effects.spawnHearts(1, p);
      }
    } else if (n.state === 'idle') {
      n.timer -= dt;
      if (n.timer <= 0) {
        if (Math.random() < 0.3 && n.home.interior.sits.length) {
          const spot = n.home.interior.sits[(Math.random() * n.home.interior.sits.length) | 0];
          n.target.set(spot.x, 0, spot.z);
          n.sitSpot = spot;
        } else {
          pickInteriorTarget(n, n.home.interior.bounds);
          n.sitSpot = null;
        }
        n.state = 'walk';
      }
    } else {
      const dx = n.target.x - p.x, dz = n.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) {
        if (n.sitSpot && Math.hypot(p.x - n.sitSpot.x, p.z - n.sitSpot.z) < 0.55) {
          n.sitting = true;
          n.doll.setPose('sit');
          n.doll.group.position.y = 0.12;
          n.doll.group.rotation.y = n.sitSpot.ry;
          n.timer = 8 + Math.random() * 12;
        } else {
          n.state = 'idle';
          n.timer = 1.5 + Math.random() * 3;
        }
      } else {
        p.x += (dx / d) * (n.speed * 0.7 * dt);
        p.z += (dz / d) * (n.speed * 0.7 * dt);
        n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
      }
      resolveBoxCircle(n.home.interior.boxes, n.home.interior.circles, p, 0.3);
    }
    n.doll.update({ walk01: n.state === 'walk' ? 0.55 : 0, dance01: 0, beatPhase: ctx.music.beatPhase() }, dt, t);
    return;
  }

  /* ---- out in the world ---- */
  _toP.x = ctx.player.group.position.x - p.x;
  _toP.z = ctx.player.group.position.z - p.z;
  const distToPlayer = Math.hypot(_toP.x, _toP.z);
  npcTick++;

  if (distToPlayer > 45 && (npcTick + n.tick) % 3 !== 0) return;

  /* homing: head home when the timer fires */
  if (n.home && !n.goingHome && distToPlayer > 12) {
    n.homeTimer -= dt;
    if (n.homeTimer <= 0) {
      n.goingHome = true;
      n.target.copy(n.home.door);
      n.state = 'walk';
      n.sitSpot = null;
    }
  }

  if (distToPlayer < 3 && ctx.game.mode === 'world') {
    n.state = 'greet';
    n.goingHome = false; /* pause to greet the player */
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(_toP.x, _toP.z), Math.min(1, dt * 6));
    n.waveTimer -= dt;
    if (n.waveTimer <= 0) {
      n.doll.wave();
      n.waveTimer = 4 + Math.random() * 4;
      if (ctx.ui.effectsOn() && Math.random() < 0.4) ctx.effects.spawnHearts(1, p);
    }
  } else if (n.goingHome) {
    const door = n.home.door;
    const dx = door.x - p.x, dz = door.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.8) {
      enterNpcHome(n);
      return;
    }
    p.x += (dx / d) * (n.speed * 1.15 * dt);
    p.z += (dz / d) * (n.speed * 1.15 * dt);
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
  } else if (n.state === 'idle') {
    n.timer -= dt;
    if (n.timer <= 0) {
      pickNpcTarget(n);
      n.state = 'walk';
    }
  } else {
    const dx = n.target.x - p.x, dz = n.target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      n.state = 'idle';
      n.timer = 1.5 + Math.random() * 3.5;
    } else {
      p.x += (dx / d) * (n.speed * dt);
      p.z += (dz / d) * (n.speed * dt);
      n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
    }
  }

  n.stuckTimer += dt;
  if (n.stuckTimer > 1.6) {
    if (p.distanceToSquared(n.lastPos) < 0.09) {
      if (n.goingHome) n.target.copy(n.home.door);
      else pickNpcTarget(n);
      if (n.state === 'idle') n.timer = 0.2;
    }
    n.lastPos.copy(p);
    n.stuckTimer = 0;
  }

  resolveWorldCollisions(p, 0.3);
  const bd = Math.hypot(p.x, p.z);
  if (bd > ctx.world.R_BOUND - 1.5) {
    n.target.set(0, 0, 26);
  }
  n.doll.update({ walk01: n.state === 'walk' || n.goingHome ? 0.7 : 0, dance01: 0, beatPhase: ctx.music.beatPhase() }, dt, t);
}
let npcTick = 0;

export function nearestNpc() {
  let best = null, bestD = 25;
  for (const n of npcs) {
    if (n.homeState === 'home') continue; /* inside their house */
    const d2 = n.doll.group.position.distanceToSquared(ctx.player.group.position);
    if (d2 < bestD) { bestD = d2; best = n; }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* The royal family (live inside the palace, never leave)              */
/* ------------------------------------------------------------------ */
export const royals = [];
const ROYAL_SPOTS = {
  jamoh: [2.6, -6.0], dama: [10.6, 2.4], ken: [9.2, -6.2],
  fay: [9.8, 4.4], whitney: [9.5, -7.6], bleso: [-6.5, 6.2],
};
export function buildRoyals() {
  for (const n of royals) {
    n.doll.group.parent && n.doll.group.parent.remove(n.doll.group);
    n.doll.dispose();
  }
  royals.length = 0;
  for (const ch of ctx.CHARACTERS.filter((c) => c.royal)) {
    const doll = createDoll(ctx.cfgFor(ch.id));
    const [hx, hz] = ROYAL_SPOTS[ch.id] || [0, 0];
    doll.group.position.set(hx, 0, hz);
    doll.group.rotation.y = Math.random() * Math.PI * 2;
    ctx.world.castle.group.add(doll.group);
    royals.push({
      doll, ch,
      state: 'idle',
      timer: 1 + Math.random() * 4,
      target: new THREE.Vector3(hx, 0, hz),
      speed: 1.7 + Math.random() * 0.8,
      waveTimer: 0.5 + Math.random() * 3,
      lastPos: new THREE.Vector3(hx, 0, hz),
      stuckTimer: 0,
      tick: Math.random() * 10 | 0,
      sitting: false,
      sitSpot: null,
    });
  }
}
export function nearestRoyal(maxD = 6.25) {
  let best = null, bestD = maxD;
  for (const n of royals) {
    const d2 = n.doll.group.position.distanceToSquared(ctx.player.group.position);
    if (d2 < bestD) { bestD = d2; best = n; }
  }
  return best;
}

export function updateRoyal(n, dt, t) {
  const p = n.doll.group.position;
  const toPlayer = { x: ctx.player.group.position.x - p.x, z: ctx.player.group.position.z - p.z };
  const distToPlayer = Math.hypot(toPlayer.x, toPlayer.z);

  if (distToPlayer < 3) {
    /* greet the visitor */
    n.state = 'greet';
    n.doll.setPose('stand');
    n.sitting = false;
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(toPlayer.x, toPlayer.z), Math.min(1, dt * 6));
    n.waveTimer -= dt;
    if (n.waveTimer <= 0) {
      n.doll.wave();
      n.waveTimer = 4 + Math.random() * 4;
      if (ctx.ui.effectsOn() && Math.random() < 0.4) ctx.effects.spawnHearts(1, p);
    }
    return;
  }
  if (n.sitting) {
    n.timer -= dt;
    if (n.timer <= 0) {
      n.sitting = false;
      n.doll.setPose('stand');
      n.doll.group.position.y = 0;
      n.state = 'idle';
      n.timer = 0.6;
    }
    return;
  }
  if (n.state === 'idle') {
    n.timer -= dt;
    if (n.timer <= 0) {
      if (Math.random() < 0.35) {
        /* pick a chair and go sit */
        const spot = ctx.world.castle.sits[(Math.random() * ctx.world.castle.sits.length) | 0];
        n.target.set(spot.x, 0, spot.z);
        n.sitSpot = spot;
      } else {
        pickInteriorTarget(n, ctx.world.castle.bounds);
        n.sitSpot = null;
      }
      n.state = 'walk';
    }
    return;
  }
  /* walking */
  const dx = n.target.x - p.x, dz = n.target.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.35) {
    if (n.sitSpot && Math.hypot(p.x - n.sitSpot.x, p.z - n.sitSpot.z) < 0.6) {
      /* arrived at the chair — sit down */
      n.sitting = true;
      n.doll.setPose('sit');
      n.doll.group.position.y = 0.12;
      n.doll.group.rotation.y = n.sitSpot.ry;
      n.timer = 7 + Math.random() * 10;
      n.state = 'sit';
    } else {
      n.state = 'idle';
      n.timer = 1.5 + Math.random() * 3.5;
    }
  } else {
    p.x += (dx / d) * (n.speed * dt);
    p.z += (dz / d) * (n.speed * dt);
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
  }
  resolveCastleCollisions(p, 0.26);
  n.stuckTimer += dt;
  if (n.stuckTimer > 1.6) {
    if (p.distanceToSquared(n.lastPos) < 0.09) {
      pickInteriorTarget(n, ctx.world.castle.bounds);
      n.sitSpot = null;
      if (n.state === 'idle') n.timer = 0.2;
    }
    n.lastPos.copy(p);
    n.stuckTimer = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Talking                                                            */
/* ------------------------------------------------------------------ */
export function npcQuestAction(n) {
  const q = n.ch.quest;
  const stage = ctx.progress.questStage(q.id);
  if (stage === 'done') {
    dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    return;
  }
  if (stage === 0) {
    ctx.progress.setQuestStage(q.id, 1);
    ctx.save();
    ctx.quests.updateTracker();
    ctx.quests.renderJournal();
    dialogueHtml(n.ch.name, n.ch.emoji, q.offer, null);
    ctx.ui.toast(`📜 New quest: <b>${ctx.quests.QUESTS.find((x) => x.id === q.id).title}</b>`, 3000);
    return;
  }
  /* active */
  if (q.id === 'princeFavor') {
    if (ctx.inventory.candyBalance() >= 8) {
      ctx.state.spent += 8; /* the candies are handed over */
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
      ctx.ui.updateStats();
    } else {
      const need = 8 - ctx.inventory.candyBalance();
      dialogueHtml(n.ch.name, n.ch.emoji, q.active.replace('{N}', need), null);
    }
    return;
  }
  if (q.id === 'royalDecree') {
    if (ctx.quests.royalsMet() >= 5) {
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    } else {
      dialogueHtml(n.ch.name, n.ch.emoji, q.active.replace('{N}', ctx.quests.royalsMet()), null);
    }
    return;
  }
  if (q.id === 'queensGame') {
    if (ctx.state.progress.games.catchBest >= 10) {
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    } else {
      dialogueHtml(n.ch.name, n.ch.emoji, q.active.replace('{N}', ctx.state.progress.games.catchBest), null);
    }
    return;
  }
  if (q.id === 'ringChampion') {
    const best = ctx.state.progress.games.raceBest;
    if (best !== null && best !== undefined && best <= RACE_PAR) {
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    } else {
      dialogueHtml(n.ch.name, n.ch.emoji,
        q.active.replace('{N}', best === null || best === undefined ? 'no time yet' : best.toFixed(1) + 's').replace('{PAR}', RACE_PAR), null);
    }
    return;
  }
  dialogueHtml(n.ch.name, n.ch.emoji, q.active, null);
}

export function talkToNpc(n) {
  n.doll.wave();
  const line = n.ch.lines[(Math.random() * n.ch.lines.length) | 0];
  const choices = [];
  if (n.ch.quest) {
    const stage = ctx.progress.questStage(n.ch.quest.id);
    const label = stage === 0 ? '📜 Quest' : (stage === 'done' ? '📜 Quest' : '📜 How goes it?');
    choices.push(dchoiceBtn(label, () => npcQuestAction(n), true));
  }
  choices.push(dchoiceBtn('💬 Chat', () => {
    const l = n.ch.lines[(Math.random() * n.ch.lines.length) | 0];
    dialogueHtml(n.ch.name, n.ch.emoji, l, null);
  }));
  choices.push(dchoiceBtn('👋 Bye', closeDialogue));
  dialogueHtml(n.ch.name, n.ch.emoji, line, null);
  /* render choice buttons after the line */
  const wrap = document.createElement('div');
  wrap.className = 'dchoices';
  for (const c of choices) wrap.appendChild(c);
  $('dialogue').appendChild(wrap);

  /* escort quest: first talk sets homeSweet stage */
  if (!ctx.progress.isQuestDone('homeSweet') && ctx.progress.questStage('homeSweet') === 0) {
    ctx.progress.setQuestStage('homeSweet', 1);
    ctx.ui.toast(`🏡 <b>${n.ch.name}</b> will meet you at the gumdrop village!`, 3200);
    ctx.quests.updateTracker();
    ctx.save();
  }

  /* the King's decree: remember which royals you have met */
  if (n.ch.royal && !ctx.state.progress.met[n.ch.id]) {
    ctx.state.progress.met[n.ch.id] = true;
    ctx.save();
    if (ctx.progress.questStage('royalDecree') === 1 && !ctx.progress.isQuestDone('royalDecree')) {
      ctx.quests.updateTracker();
      if (n.ch.id !== 'jamoh') ctx.ui.toast(`👑 Family met: <b>${ctx.quests.royalsMet()}/5</b>`, 2000);
    } else if (n.ch.id !== 'jamoh' && !ctx.state.progress.met.__royalHello) {
      ctx.state.progress.met.__royalHello = true;
      ctx.ui.toast('👑 You met the royal family! Talk to <b>King Jamoh</b> for his decree.', 3200);
      ctx.save();
    }
  }
}
