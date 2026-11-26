/* =====================================================================
   quality.js — graphics quality presets + adaptive "Auto" tier

   The user picks Auto / Low / Medium / High in Settings. While Auto is
   selected, a rolling FPS monitor steps the effective tier down when the
   frame rate is sustained-low (weak phones) and back up when there is
   headroom — with hysteresis + cooldown so it never oscillates.
   ===================================================================== */
import { ctx, $ } from './ctx.js';

export const QUALITY_CHOICES = ['auto', 'low', 'medium', 'high'];
const ORDER = ['low', 'medium', 'high'];
const DPR_CAP = { low: 1, medium: 1.25, high: 2 };
const SHADOW_RES = { low: 512, medium: 1024, high: 2048 };

let renderer, key, state, isTouch, save, toast;
let autoTier = 'high';   /* effective tier while quality === 'auto' */
let target = 'high';     /* ceiling Auto may climb back to */
let avgFps = 60;         /* smoothed frames-per-second */
let fpsOverride = null;  /* debug hook: forces the measured fps */
let warmup = 0;          /* ignore the first seconds (shader/asset warm-up) */
let lowT = 0;            /* seconds continuously under the low bar */
let highT = 0;           /* seconds continuously over the high bar */
let cooldown = 0;        /* seconds until the next tier change is allowed */

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function level() {
  const q = state.settings.quality || 'auto';
  return q === 'auto' ? autoTier : q;
}

function apply() {
  const lvl = level();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP[lvl], isTouch ? 1.5 : 2));
  const res = SHADOW_RES[lvl];
  if (key.shadow.mapSize.width !== res) {
    key.shadow.mapSize.set(res, res);
    if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
  }
}

function renderBtn() {
  const q = state.settings.quality || 'auto';
  $('btnQuality').textContent = `🎚️ Quality: ${cap(q)}${q === 'auto' ? ` (${cap(level())})` : ''}`;
}

function change(tier, why) {
  if (level() === tier) return;
  autoTier = tier;
  lowT = 0; highT = 0; cooldown = 8;
  apply();
  renderBtn();
  if (why) toast(`🎚️ Auto quality → <b>${cap(tier)}</b> ${why}`, 2200);
}

/* called once per rendered frame from the main loop */
function tick(dt) {
  warmup += dt;
  if (cooldown > 0) cooldown -= dt;
  if (fpsOverride !== null) avgFps = fpsOverride;
  else avgFps += (1 / Math.max(dt, 1e-4) - avgFps) * Math.min(1, dt * 2);
  if (warmup < 6 || (state.settings.quality || 'auto') !== 'auto') return;
  if (avgFps < 28) { lowT += dt; highT = 0; }
  else if (avgFps > 55) { highT += dt; lowT = 0; }
  else { lowT = 0; highT = 0; }
  if (cooldown > 0) return;
  const i = ORDER.indexOf(autoTier);
  if (lowT >= 5 && i > 0) change(ORDER[i - 1], '· smoother framerate');
  else if (highT >= 30 && i < ORDER.indexOf(target)) change(ORDER[i + 1], '· extra sparkle');
}

/* ---- debug hooks (deterministic tests) ---- */
function simulateFps(x) { fpsOverride = x; }
function debugAdvance(seconds) {
  for (let t = 0; t < seconds; t += 0.25) tick(0.25);
}

const api = { level, apply, tick, simulateFps, debugAdvance, renderBtn };

export function initQuality(deps) {
  ({ renderer, key, state, isTouch, save, toast } = deps);
  autoTier = isTouch ? 'medium' : 'high';
  target = autoTier;
  apply();
  renderBtn();
  $('btnQuality').addEventListener('click', () => {
    const cur = state.settings.quality || 'auto';
    state.settings.quality = QUALITY_CHOICES[(QUALITY_CHOICES.indexOf(cur) + 1) % QUALITY_CHOICES.length];
    apply();
    renderBtn();
    save();
    toast(`🎚️ Graphics quality: <b>${cap(state.settings.quality)}</b>${state.settings.quality === 'auto' ? ` (→ ${cap(level())})` : ''}`, 2200);
  });
  window.addEventListener('resize', apply);
  ctx.quality = api;
  return api;
}
