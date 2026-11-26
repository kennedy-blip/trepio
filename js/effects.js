/* =====================================================================
   effects.js — hearts, confetti particles
   ===================================================================== */
import * as THREE from 'three';

function heartTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.translate(64, 62);
  ctx.fillStyle = '#ff6f9c';
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.bezierCurveTo(-58, -6, -34, -54, 0, -22);
  ctx.bezierCurveTo(34, -54, 58, -6, 0, 34);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.arc(-14, -20, 9, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEffects(scene) {
  const heartTex = heartTexture();
  const heartMat = new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false });
  const confettiGeo = new THREE.PlaneGeometry(0.09, 0.14);
  const confettiMats = ['#ff8fb7', '#ffd45e', '#63b8f5', '#a7d97a', '#b57de0', '#fff3f6']
    .map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));

  const particles = [];

  function spawnHearts(n, at = null) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(heartMat);
      s.renderOrder = 10;
      const base = at ? at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.15, (Math.random() - 0.5) * 0.3))
                      : new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.15 + Math.random() * 0.25, 0.3);
      s.position.copy(base);
      const sc = 0.12 + Math.random() * 0.09;
      s.scale.set(sc, sc, 1);
      scene.add(s);
      particles.push({
        obj: s, kind: 'heart', life: 0, max: 1.2 + Math.random() * 0.5, baseScale: sc,
        phase: Math.random() * 6, origin: base,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.65 + Math.random() * 0.35, (Math.random() - 0.2) * 0.2),
      });
    }
  }

  function spawnConfetti(n, at = null) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(confettiGeo, confettiMats[i % confettiMats.length]);
      if (at) {
        m.position.set(at.x + (Math.random() - 0.5) * 1.4, 2.4 + Math.random() * 0.8, at.z + (Math.random() - 0.5) * 1.4);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.85;
        m.position.set(Math.cos(a) * r, 2.0 + Math.random() * 0.6, Math.sin(a) * r);
      }
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(m);
      particles.push({
        obj: m, kind: 'confetti', life: 0, max: 2.4 + Math.random() * 0.8,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.55, -0.45 - Math.random() * 0.35, (Math.random() - 0.5) * 0.55),
        spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
        phase: Math.random() * 6,
      });
    }
  }

  function update(dt, t) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.obj.position.addScaledVector(p.vel, dt);
      if (p.kind === 'heart') {
        p.obj.position.y += Math.sin(t * 6 + p.phase) * 0.12 * dt;
      } else {
        p.vel.x += Math.sin(t * 3 + p.phase) * 0.35 * dt;
        p.obj.rotation.x += p.spin.x * dt;
        p.obj.rotation.y += p.spin.y * dt;
        p.obj.rotation.z += p.spin.z * dt;
      }
      const k = p.life / p.max;
      if (k > 0.7) {
        const s = Math.max(0.001, 1 - (k - 0.7) / 0.3);
        p.obj.scale.setScalar(p.kind === 'heart' ? p.baseScale * s : s);
      }
      if (p.life >= p.max) {
        scene.remove(p.obj);
        particles.splice(i, 1);
      }
    }
  }

  return { spawnHearts, spawnConfetti, update };
}
