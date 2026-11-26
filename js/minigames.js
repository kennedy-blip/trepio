/* =====================================================================
   minigames.js — Candy Catch & Gummy Rush arcade games
   ===================================================================== */
import * as THREE from 'three';
import { ctx } from './ctx.js';
import { RACE_PAR } from './quests.js';

const CATCH_GEO = new THREE.SphereGeometry(0.2, 12, 10);
const CATCH_MATS = ['#ff8fb7', '#ffd45e', '#63b8f5', '#a7d97a', '#b57de0', '#ff9e4f']
  .map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3, roughness: 0.3 }));

export function startMini(kind) {
  if (ctx.game.mini) { ctx.ui.toast('🎮 Finish the current game first!', 2000); return; }
  if (kind === 'catch') {
    ctx.game.mini = { kind: 'catch', t: 45, score: 0, spawn: 0.2, items: [] };
    ctx.ui.toast('🍭 <b>Candy Catch!</b> Sweets rain from the sky — run and grab them!<br><small>45 seconds · rewards candies</small>', 4200);
  } else {
    ctx.game.mini = { kind: 'race', idx: 0, t: 0 };
    for (const r of ctx.world.raceRings) { r.visible = true; r.scale.set(1, 1, 1); }
    ctx.ui.toast(`🏁 <b>Gummy Rush!</b> Sprint through the 6 golden rings in order!<br><small>Par time: ${RACE_PAR}s · rewards candies</small>`, 4200);
  }
  ctx.music.start('dance');
  if (ctx.ui.effectsOn()) ctx.effects.spawnConfetti(12, ctx.player.group.position);
  updateTrackerSelf();
}

export function cancelMini(silent) {
  if (!ctx.game.mini) return;
  for (const m of ctx.game.mini.items || []) ctx.world.group.remove(m);
  for (const r of ctx.world.raceRings) { r.visible = false; r.scale.set(1, 1, 1); }
  ctx.game.mini = null;
  if (!silent) { ctx.music.start('ambient'); updateTrackerSelf(); }
}

function updateTrackerSelf() {
  /* quest module owns the tracker; avoid an import cycle */
  if (ctx.quests) ctx.quests.updateTracker();
}

function finishCatch() {
  const mini = ctx.game.mini;
  const g = ctx.state.progress.games;
  const score = mini.score;
  const first = !g.catchFirst && score >= 3;
  const reward = first ? Math.min(20, Math.max(2, score)) : Math.min(6, Math.floor(score / 3));
  if (score > g.catchBest) g.catchBest = score;
  if (score >= 3) g.catchFirst = true;
  cancelMini(true);
  if (reward > 0) ctx.progress.addCandies(reward);
  ctx.music.start('ambient');
  ctx.ui.toast(`🍭 <b>Candy Catch over!</b> Score: <b>${score}</b> · best ${g.catchBest} · <b>+${reward} candies</b>${first ? ' 🎉' : ''}`, 4200);
  ctx.ui.updateStats();
  ctx.save();
  updateTrackerSelf();
}

function finishRace() {
  const mini = ctx.game.mini;
  const time = mini.t;
  const g = ctx.state.progress.games;
  const isRecord = g.raceBest === null || g.raceBest === undefined || time < g.raceBest;
  if (isRecord) g.raceBest = Math.round(time * 10) / 10;
  const win = time <= RACE_PAR;
  const first = win && !g.raceFirst;
  const reward = first ? 15 : (win ? 5 : 2);
  if (win) g.raceFirst = true;
  cancelMini(true);
  ctx.progress.addCandies(reward);
  ctx.music.start('ambient');
  if (ctx.ui.effectsOn()) ctx.effects.spawnConfetti(30, ctx.player.group.position);
  ctx.ui.toast(`🏁 <b>Race finished!</b> Time <b>${time.toFixed(1)}s</b>${isRecord ? ' · new best!' : ''} · <b>+${reward} candies</b>${win ? '' : ' (over par)'}`, 4200);
  ctx.ui.updateStats();
  ctx.save();
  updateTrackerSelf();
}

export function updateMini(dt, t) {
  const mini = ctx.game.mini;
  if (!mini) return;
  const p = ctx.player.group.position;
  if (mini.kind === 'catch') {
    mini.t -= dt;
    mini.spawn -= dt;
    if (mini.spawn <= 0 && mini.items.length < 14) {
      mini.spawn = Math.max(0.4, 0.85 - mini.score * 0.02);
      const m = new THREE.Mesh(CATCH_GEO, CATCH_MATS[(Math.random() * CATCH_MATS.length) | 0]);
      m.position.set(p.x + (Math.random() - 0.5) * 9, 8.5, p.z + (Math.random() - 0.5) * 9);
      ctx.world.group.add(m);
      mini.items.push(m);
    }
    for (let i = mini.items.length - 1; i >= 0; i--) {
      const m = mini.items[i];
      m.position.y -= dt * (3.1 + Math.min(1.4, mini.score * 0.02));
      m.rotation.y += dt * 3;
      const dx = p.x - m.position.x, dz = p.z - m.position.z;
      if (m.position.y < 1.8 && m.position.y > 0.2 && dx * dx + dz * dz < 1.1) {
        mini.score++;
        ctx.world.group.remove(m);
        mini.items.splice(i, 1);
        if (ctx.ui.effectsOn()) ctx.effects.spawnHearts(1, m.position);
        continue;
      }
      if (m.position.y < 0.22) { ctx.world.group.remove(m); mini.items.splice(i, 1); }
    }
    if (mini.t <= 0) finishCatch();
  } else {
    mini.t += dt;
    const ring = ctx.world.raceRings[mini.idx];
    if (ring) {
      const s = 1 + Math.sin(t * 6) * 0.14;
      ring.scale.set(s, s, s);
      ring.rotation.y += dt * 0.8;
      const tp = ctx.world.racePath[mini.idx];
      if (Math.hypot(p.x - tp.x, p.z - tp.z) < 2.6) {
        ring.visible = false;
        ring.scale.set(1, 1, 1);
        mini.idx++;
        if (ctx.ui.effectsOn()) ctx.effects.spawnConfetti(8, new THREE.Vector3(tp.x, 1.4, tp.z));
        if (mini.idx >= ctx.world.racePath.length) finishRace();
        else ctx.ui.toast(`🏁 Ring <b>${mini.idx}/${ctx.world.racePath.length}</b>!`, 1400);
      }
    }
  }
}
