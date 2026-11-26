/* =====================================================================
   homes.js — NPC cottage entry/exit, interiors & sitting
   ===================================================================== */
import { ctx, $ } from './ctx.js';
import { nameOf } from './quests.js';

let activeHome = null;
export function getActiveHome() { return activeHome; }

export function enterHome(home) {
  ctx.minigames.cancelMini(true);
  ctx.game.mode = 'house';
  activeHome = home;
  ctx.world.group.visible = false;
  ctx.world.setBeacon(null);
  $('tracker') && ($('tracker').innerHTML = '');
  home.interior.group.visible = true;
  ctx.scene.background = ctx.view.studioBg;
  ctx.scene.fog = ctx.view.castleFog;

  home.interior.group.add(ctx.player.group);
  ctx.player.group.position.set(0, 0, 1.6);
  ctx.player.group.rotation.y = Math.PI;
  ctx.game.vy = 0;
  ctx.game.walk01 = 0;
  ctx.game.doorHintShown = false;
  if (ctx.player.sitting()) ctx.player.setPose('stand');

  ctx.cam.target.set(0, 1.1, 1.0);
  ctx.cam.yaw = 0; ctx.cam.pitch = 0.4; ctx.cam.dist = 4.4;
  ctx.camera.position.set(0, 2.4, 5.6);
  const who = nameOf(home.npc);
  ctx.ui.toast(`🏡 <b>${who}'s Home</b> — make yourself comfortable!<br><small>${who} wanders in and out… sit on a chair, say hello</small>`, 3600);
  ctx.pet.reparentPet();
  ctx.save();
}

export function leaveHome() {
  if (!activeHome) return;
  const home = activeHome;
  ctx.game.mode = 'world';
  home.interior.group.visible = false;
  activeHome = null;
  ctx.world.group.visible = true;
  ctx.scene.background = ctx.view.worldBg;
  ctx.scene.fog = ctx.view.worldFog;

  ctx.world.group.add(ctx.player.group);
  ctx.player.group.position.copy(home.exit);
  ctx.player.group.position.y = 0;
  ctx.player.group.rotation.y = Math.atan2(home.exit.x - home.pos.x, home.exit.z - home.pos.z);
  if (ctx.player.sitting()) ctx.player.setPose('stand');
  ctx.game.doorHintShown = false;
  ctx.cam.target.set(ctx.player.group.position.x, 1.1, ctx.player.group.position.z);
  ctx.quests.updateTracker();
  ctx.pet.reparentPet();
  ctx.save();
}

/** hide every interior scene (called when leaving interiors entirely) */
export function hideAllInteriors() {
  for (const h of ctx.world.homes) h.interior.group.visible = false;
  activeHome = null;
}

export function nearestHomeDoor() {
  let best = null, bestD = 9.6; /* ~3.1m squared */
  for (const h of ctx.world.homes) {
    const d2 = ctx.player.group.position.distanceToSquared(h.door);
    if (d2 < bestD) { bestD = d2; best = h; }
  }
  return best;
}

/** sit the player on a spot (chair / sofa / throne) */
export function playerSit(spot, label) {
  ctx.player.group.position.set(spot.x, 0.18, spot.z);
  ctx.player.group.rotation.y = spot.ry;
  ctx.player.setPose('sit');
  ctx.player.boing();
  if (ctx.ui.effectsOn()) ctx.effects.spawnHearts(2, ctx.player.group.position);
  ctx.ui.toast(label || '😌 You sit down. <i>Move to stand up.</i>', 2600);
}
