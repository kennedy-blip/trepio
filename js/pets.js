/* =====================================================================
   pets.js — candy pets that follow the player everywhere
   ===================================================================== */
import * as THREE from 'three';

export const PETS = [
  { id: 'gummycat', icon: '🐱', name: 'Gummy Cat', price: 30, color: '#ff8fb7', ear: 'point',
    desc: 'A bouncy pink kitty made of gummy.' },
  { id: 'cocobunny', icon: '🐰', name: 'Cocoa Bunny', price: 30, color: '#a5713f', ear: 'long',
    desc: 'A soft chocolate bunny with a sweet tooth.' },
  { id: 'sugarpup', icon: '🐶', name: 'Sugar Pup', price: 40, color: '#63b8f5', ear: 'floppy',
    desc: 'A blueberry sugar puppy — endlessly loyal.' },
  { id: 'gumbear', icon: '🐻', name: 'Gummy Bear', price: 60, color: '#ff5470', ear: 'round',
    desc: 'A squishy ruby gummy bear — hugs included.' },
  { id: 'unicorn', icon: '🦄', name: 'Candy Unicorn', price: 100, color: '#fdeef7', ear: 'point', horn: true,
    desc: 'A tiny pastel unicorn with a swirly candy horn.' },
];

const lerp = THREE.MathUtils.lerp;

export function createPet(kindId) {
  const def = PETS.find((p) => p.id === kindId) || PETS[0];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.4 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: '#fff3f6', roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.4 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: '#ff9ec6', roughness: 0.4 });

  const mk = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    return o;
  };

  /* body */
  const body = mk(new THREE.SphereGeometry(0.17, 16, 12), bodyMat, 0, 0.20, 0);
  body.scale.set(1, 0.92, 1.18);
  group.add(body);
  const belly = mk(new THREE.SphereGeometry(0.12, 12, 10), bellyMat, 0, 0.17, 0.10);
  belly.scale.set(1, 0.8, 0.6);
  group.add(belly);

  /* head */
  const head = new THREE.Group();
  head.position.set(0, 0.36, 0.13);
  group.add(head);
  head.add(mk(new THREE.SphereGeometry(0.13, 16, 12), bodyMat, 0, 0, 0));
  /* muzzle + eyes + nose */
  head.add(mk(new THREE.SphereGeometry(0.055, 10, 8), bellyMat, 0, -0.03, 0.115));
  head.add(mk(new THREE.SphereGeometry(0.02, 8, 6), darkMat, -0.055, 0.035, 0.105));
  head.add(mk(new THREE.SphereGeometry(0.02, 8, 6), darkMat, 0.055, 0.035, 0.105));
  head.add(mk(new THREE.SphereGeometry(0.016, 8, 6), pinkMat, 0, -0.01, 0.15));

  /* ears per kind */
  const ears = [];
  if (def.ear === 'round') {
    for (const s of [-1, 1]) {
      const e = mk(new THREE.SphereGeometry(0.055, 12, 10), bodyMat, s * 0.075, 0.10, 0);
      e.scale.set(1, 1, 0.55);
      head.add(e);
      ears.push(e);
    }
  } else if (def.ear === 'point') {
    for (const s of [-1, 1]) {
      const e = mk(new THREE.ConeGeometry(0.045, 0.12, 8), bodyMat, s * 0.075, 0.115, 0);
      e.rotation.z = s * -0.3;
      head.add(e);
      ears.push(e);
    }
  } else if (def.ear === 'long') {
    for (const s of [-1, 1]) {
      const e = mk(new THREE.CapsuleGeometry(0.03, 0.16, 4, 8), bodyMat, s * 0.05, 0.17, 0);
      e.rotation.z = s * -0.16;
      head.add(e);
      const inner = mk(new THREE.CapsuleGeometry(0.016, 0.10, 4, 6), pinkMat, 0, 0.02, 0.028);
      e.add(inner);
      ears.push(e);
    }
  } else { /* floppy */
    for (const s of [-1, 1]) {
      const e = mk(new THREE.SphereGeometry(0.055, 10, 8), bodyMat, s * 0.125, 0.02, 0);
      e.scale.set(0.6, 1.5, 0.8);
      e.rotation.z = s * 0.5;
      head.add(e);
      ears.push(e);
    }
  }

  /* unicorn extras: golden candy horn + striped mane */
  if (def.horn) {
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd45e', roughness: 0.25, metalness: 0.5 });
    const horn = mk(new THREE.ConeGeometry(0.035, 0.16, 10), goldMat, 0, 0.16, -0.01);
    horn.rotation.x = -0.22;
    head.add(horn);
    const maneCols = ['#f45d8e', '#ffd45e', '#63b8f5'];
    maneCols.forEach((c, i) => {
      const m = mk(new THREE.SphereGeometry(0.045, 10, 8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }),
        0, 0.34 - i * 0.09, -0.07 - i * 0.018);
      m.scale.set(0.9, 0.65, 0.9);
      group.add(m);
    });
  }

  /* tail */
  const tail = mk(new THREE.SphereGeometry(0.05, 10, 8), bodyMat, 0, 0.26, -0.20);
  tail.scale.set(1, 1, 1.5);
  group.add(tail);

  /* legs (pivot at top so they can swing) */
  const legs = [];
  for (const [lx, lz] of [[-0.08, 0.09], [0.08, 0.09], [-0.08, -0.08], [0.08, -0.08]]) {
    const pivot = new THREE.Group();
    pivot.position.set(lx, 0.14, lz);
    const leg = mk(new THREE.CapsuleGeometry(0.028, 0.07, 4, 8), bodyMat, 0, -0.05, 0);
    pivot.add(leg);
    group.add(pivot);
    legs.push(pivot);
  }

  /* collar */
  const collar = mk(new THREE.TorusGeometry(0.095, 0.016, 8, 18), new THREE.MeshStandardMaterial({ color: '#ffd45e', roughness: 0.3, metalness: 0.4 }), 0, 0.27, 0.05);
  collar.rotation.x = Math.PI / 2 - 0.35;
  group.add(collar);

  /* ------------------------------------------------------------------ */
  const api = {
    group, def,
    _phase: Math.random() * 7,
    _idle: 0,
    update(dt, t, follow, moving) {
      const p = group.position;
      const d = Math.hypot(follow.x - p.x, follow.z - p.z);
      if (d > 10) {
        /* snap when left far behind (mode changes) */
        p.set(follow.x, 0, follow.z);
      } else if (d > 0.05) {
        const sp = Math.min(moving ? 6.2 : 4.2, d * 5);
        const k = Math.min(1, (sp * dt) / d);
        p.x += (follow.x - p.x) * k;
        p.z += (follow.z - p.z) * k;
      }
      api._idle = moving || d > 0.35 ? 0 : api._idle + dt;

      /* face travel direction (or owner when idle) */
      let wantY = group.rotation.y;
      if (d > 0.35) wantY = Math.atan2(follow.x - p.x, follow.z - p.z);
      group.rotation.y = lerp(group.rotation.y, wantY, Math.min(1, dt * 6));

      /* hop while moving; sit when idle */
      const hop = moving && d > 0.3;
      group.position.y = hop ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
      const sit = api._idle > 2.2;
      for (let i = 0; i < legs.length; i++) {
        const front = i < 2;
        let target;
        if (sit) target = front ? -0.85 : 0.45;              /* tucked sit */
        else if (hop) target = Math.sin(t * 9 + i * Math.PI / 2) * 0.55;
        else target = 0;
        legs[i].rotation.x = lerp(legs[i].rotation.x, target, Math.min(1, dt * 8));
      }
      body.rotation.x = lerp(body.rotation.x, sit ? -0.35 : 0, Math.min(1, dt * 6));
      head.rotation.x = lerp(head.rotation.x, sit ? 0.28 : 0, Math.min(1, dt * 6));

      /* tail wag & ear twitch */
      tail.rotation.x = Math.sin(t * (sit ? 3.2 : 8)) * 0.35;
      ears[0].rotation.z = (def.ear === 'point' ? -0.3 : def.ear === 'long' ? -0.16 : 0.5) + Math.sin(t * 2.3) * 0.06;
      ears[1].rotation.z = -ears[0].rotation.z;
      head.rotation.y = Math.sin(t * 0.9 + api._phase) * 0.18 * (moving ? 0 : 1);
    },
  };
  return api;
}
