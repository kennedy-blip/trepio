/* =====================================================================
   collide.js — shared circle/box collision resolution
   ===================================================================== */
import { ctx } from './ctx.js';

export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function resolveBoxCircle(boxes, circles, p, r) {
  for (const b of boxes) {
    if (p.x + r < b.minX || p.x - r > b.maxX || p.z + r < b.minZ || p.z - r > b.maxZ) continue;
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      if (d < r) {
        const push = (r - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      }
    } else {
      const l = p.x - b.minX + r, rr = b.maxX - p.x + r;
      const t = p.z - b.minZ + r, bo = b.maxZ - p.z + r;
      const m = Math.min(l, rr, t, bo);
      if (m === l) p.x = b.minX - r;
      else if (m === rr) p.x = b.maxX + r;
      else if (m === t) p.z = b.minZ - r;
      else p.z = b.maxZ + r;
    }
  }
  for (const c of circles) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const rr = c.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x = c.x + (dx / d) * rr;
      p.z = c.z + (dz / d) * rr;
    }
  }
}

export function resolveWorldCollisions(p, r) {
  resolveBoxCircle(ctx.world.boxes, ctx.world.circles, p, r);
  const bd = Math.hypot(p.x, p.z);
  if (bd > ctx.world.R_BOUND - 1) {
    p.x = (p.x / bd) * (ctx.world.R_BOUND - 1);
    p.z = (p.z / bd) * (ctx.world.R_BOUND - 1);
  }
}

export function resolveCastleCollisions(p, r) {
  resolveBoxCircle(ctx.world.castle.boxes, ctx.world.castle.circles, p, r);
}

export function resolveHomeCollisions(p, r) {
  const home = ctx.homes.getActiveHome();
  if (home) resolveBoxCircle(home.interior.boxes, home.interior.circles, p, r);
}
