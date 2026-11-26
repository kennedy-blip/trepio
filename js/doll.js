/* =====================================================================
   doll.js — procedural 3D doll factory (multiple instances, both genders)
   Each doll is built entirely from primitives and can be animated with
   idle / walk / dance / wave states via update().
   ===================================================================== */
import * as THREE from 'three';

/* ---------------- palettes & wardrobe data ---------------- */
export const SKINS  = ['#f9ddc4', '#efc39d', '#dda273', '#b5714f', '#8d5524', '#654128'];
export const HAIRC  = ['#1a1410', '#3a2a1e', '#5d3a24', '#8a5a2b', '#c9973f', '#e8c268',
                       '#c2673f', '#d96a9c', '#8f6fd3', '#57b3c9'];
export const CLOTH  = ['#ff8fb7', '#f45d8e', '#ff7a68', '#ff9e4f', '#ffd45e', '#a7d97a',
                       '#4fc3ae', '#63b8f5', '#8f9cf5', '#b57de0', '#fff3f6', '#33304a'];
export const EYES   = ['#5a3420', '#2f6d8f', '#3f7d4e', '#8a5a3c', '#7c8aa0'];
export const SHOEC  = ['#f45d8e', '#ff8fb7', '#ffd45e', '#a7d97a', '#63b8f5', '#b57de0',
                       '#fff3f6', '#33304a', '#d9a441'];

export const HAIRSTYLES = [
  { id: 'buns',     label: '🍡 Space buns' },
  { id: 'ponytail', label: '马尾 Ponytail' },
  { id: 'long',     label: '💇‍♀️ Long hair' },
  { id: 'bob',      label: '✂️ Bob' },
  { id: 'short',    label: '🍓 Pixie' },
];
export const OUTFITS = [
  { id: 'princess', label: '👑 Princess', flare: 0.46, len: 0.55, puff: 0.082, belt: false, trim: true  },
  { id: 'gown',     label: '🎀 Ball gown', flare: 0.53, len: 0.58, puff: 0.055, belt: false, trim: true  },
  { id: 'party',    label: '🎉 Party',     flare: 0.27, len: 0.34, puff: 0.066, belt: true,  trim: true  },
  { id: 'coord',    label: '🧶 Co-ord',    flare: 0.33, len: 0.46, puff: 0,     belt: false, trim: false },
  { id: 'rainbow',  label: '🌈 Rainbow Gown', flare: 0.50, len: 0.60, puff: 0.07, belt: false, trim: true, locked: 2 },
  { id: 'candycane', label: '🍭 Candy Cane', flare: 0.42, len: 0.50, puff: 0.07, belt: false, trim: true, shop: 15 },
];

export const MALE_HAIRSTYLES = [
  { id: 'mshort',   label: '🌰 Short crop' },
  { id: 'quiff',    label: '⚡ Quiff' },
  { id: 'curly',    label: '🌀 Curly' },
  { id: 'sidepart', label: '〰️ Side part' },
];
export const MALE_OUTFITS = [
  { id: 'mprince',  label: '🤴 Prince',   len: 0.32, belt: true,  jacket: true  },
  { id: 'explorer', label: '🧭 Explorer', len: 0.17, belt: true,  jacket: false },
  { id: 'sporty',   label: '⚽ Sporty',   len: 0.15, belt: false, jacket: false },
  { id: 'smart',    label: '🎩 Smart',    len: 0.36, belt: true,  jacket: true  },
  { id: 'star',     label: '✨ Star Suit', len: 0.30, belt: true, jacket: true, locked: 2 },
  { id: 'candycane', label: '🍭 Candy Cane', len: 0.28, belt: true, jacket: false, shop: 15 },
];

export const SHOESTYLES = [
  { id: 'flats',  label: '🩰 Flats'  },
  { id: 'boots',  label: '🥾 Boots'  },
  { id: 'heels',  label: '👠 Heels'  },
];
export const ACCESSORIES = [
  { id: 'crown',    label: '👑 Crown'    },
  { id: 'bow',      label: '🎀 Bow'      },
  { id: 'glasses',  label: '👓 Glasses'  },
  { id: 'necklace', label: '📿 Necklace' },
  { id: 'earrings', label: '💎 Earrings' },
  { id: 'wings',    label: '🦋 Wings', locked: 3 },
  { id: 'halo',     label: '🌟 Halo',  locked: 4 },
  { id: 'wand',     label: '🪄 Star Wand', shop: 25 },
];
export const MALE_ACCESSORIES = [
  { id: 'crown',   label: '👑 Crown'    },
  { id: 'bow',     label: '🎀 Bow tie'  },
  { id: 'glasses', label: '👓 Glasses'  },
  { id: 'wings',   label: '🦋 Wings', locked: 3 },
  { id: 'halo',    label: '🌟 Halo',  locked: 4 },
  { id: 'wand',    label: '🪄 Star Wand', shop: 25 },
];

/* unlockable outfit textures (built lazily) */
let _rainbowTex = null, _starTex = null, _candycaneTex = null;
export function rainbowTexture() {
  if (_rainbowTex) return _rainbowTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const colors = ['#f45d8e', '#ff9e4f', '#ffd45e', '#a7d97a', '#63b8f5', '#8f9cf5', '#b57de0'];
  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(-Math.PI / 4);
  const band = 128 / 7;
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(-128 + i * band * 1.45, -128, band * 1.45, 256);
  });
  ctx.restore();
  _rainbowTex = new THREE.CanvasTexture(c);
  _rainbowTex.colorSpace = THREE.SRGBColorSpace;
  return _rainbowTex;
}
export function starTexture() {
  if (_starTex) return _starTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#33304a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffd45e';
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 128, y = Math.random() * 128;
    const r = 1.5 + Math.random() * 3.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  _starTex = new THREE.CanvasTexture(c);
  _starTex.colorSpace = THREE.SRGBColorSpace;
  return _starTex;
}
export function candyCaneTexture() {
  if (_candycaneTex) return _candycaneTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff4f6';
  ctx.fillRect(0, 0, 128, 128);
  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#f45d8e';
  const band = 24;
  for (let x = -128; x < 128; x += band * 2) {
    ctx.fillRect(x, -128, band, 256);
  }
  ctx.restore();
  _candycaneTex = new THREE.CanvasTexture(c);
  _candycaneTex.colorSpace = THREE.SRGBColorSpace;
  _candycaneTex.wrapS = _candycaneTex.wrapT = THREE.RepeatWrapping;
  _candycaneTex.repeat.set(2, 2);
  return _candycaneTex;
}

/* shared, non-varying materials */
const goldMat  = new THREE.MeshStandardMaterial({ color: '#f3c14b', metalness: 0.75, roughness: 0.28 });
const gemMat   = new THREE.MeshStandardMaterial({ color: '#ff9ec6', roughness: 0.15, metalness: 0.35 });
const glassMat = new THREE.MeshStandardMaterial({ color: '#43304d', roughness: 0.35, metalness: 0.3 });
const lensMat  = new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.18 });
const whiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

const lerp = THREE.MathUtils.lerp;

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function clearGroup(g) {
  if (!g) return;
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

/* =====================================================================
   createDoll(cfg) -> api
   cfg: { gender?, hair, hairColor, skin, eyes, outfit, top, skirt,
          shoes, shoeColor, accessories:{...} }
   'skirt' doubles as the bottom colour (trousers/shorts) for male dolls.
   ===================================================================== */
export function createDoll(cfg) {
  const male = cfg.gender === 'male';

  /* per-instance materials */
  const skinMat   = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.65 });
  const hairMat   = new THREE.MeshStandardMaterial({ color: cfg.hairColor, roughness: 0.45, side: THREE.DoubleSide });
  const topMat    = new THREE.MeshStandardMaterial({ color: cfg.top, roughness: 0.6 });
  const skirtMat  = new THREE.MeshStandardMaterial({ color: cfg.skirt, roughness: 0.6, side: THREE.DoubleSide });
  const accentMat = new THREE.MeshStandardMaterial({ color: cfg.skirt, roughness: 0.55 });
  const trimMat   = new THREE.MeshStandardMaterial({ color: '#fff6ec', roughness: 0.5 });
  const shoeMat   = new THREE.MeshStandardMaterial({ color: cfg.shoeColor, roughness: 0.4 });
  const smileMat  = new THREE.MeshStandardMaterial({ color: '#c9556e', roughness: 0.6 });
  const blushMat  = new THREE.MeshStandardMaterial({ color: '#ff9fb0', roughness: 0.9, transparent: true, opacity: male ? 0.3 : 0.6 });
  const pupilMat  = new THREE.MeshStandardMaterial({ color: cfg.eyes, roughness: 0.25 });
  const apiMats   = { skinMat, hairMat, topMat, skirtMat, accentMat, shoeMat, pupilMat, blushMat };

  const group = new THREE.Group();      // yaw / spin pivot
  const body = new THREE.Group();       // bounce / sway pivot
  group.add(body);

  /* legs (pivot at hips) — male legs carry the trousers */
  const HIP_Y = 0.52;
  const legR = male ? 0.062 : 0.055;
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set((male ? 0.082 : 0.075) * side, HIP_Y, 0);
    const leg = mesh(new THREE.CapsuleGeometry(legR, 0.34, 4, 12), skinMat, 0, -0.20, 0);
    hip.add(leg);
    const shoe = new THREE.Group();
    shoe.position.set(0, -0.465, 0.015);
    hip.add(shoe);
    const trouser = new THREE.Group();
    hip.add(trouser);
    body.add(hip);
    return { hip, shoe, trouser };
  }
  const legL = makeLeg(-1);
  const legR2 = makeLeg(1);

  /* torso */
  const torso = new THREE.Group();
  torso.position.set(0, 0.55, 0);
  body.add(torso);
  torso.add(mesh(new THREE.CapsuleGeometry(male ? 0.118 : 0.108, male ? 0.22 : 0.20, 4, 14), topMat, 0, 0.16, 0));
  torso.add(mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.09, 12), skinMat, 0, 0.315, 0));

  /* arms (pivot at shoulders) */
  const SH_X = male ? 0.162 : 0.148;
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(SH_X * side, 0.27, 0);
    shoulder.add(mesh(new THREE.CapsuleGeometry(male ? 0.05 : 0.045, 0.22, 4, 10), skinMat, 0, -0.145, 0));
    shoulder.add(mesh(new THREE.SphereGeometry(0.049, 14, 10), skinMat, 0, -0.275, 0));
    const puff = mesh(new THREE.SphereGeometry(0.08, 12, 10), topMat, 0, -0.045, 0);
    shoulder.add(puff);
    shoulder.rotation.z = 0.16 * side;
    torso.add(shoulder);
    return { shoulder, puff };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  /* skirt (female only) */
  const skirtGroup = male ? null : new THREE.Group();
  if (skirtGroup) {
    skirtGroup.position.set(0, 0.585, 0);
    body.add(skirtGroup);
  }

  /* head (pivot at neck top) */
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.38, 0);
  torso.add(headPivot);
  const head = mesh(new THREE.SphereGeometry(0.19, 28, 22), skinMat, 0, 0.17, 0);
  head.scale.set(1, 1.06, 0.96);
  headPivot.add(head);

  function makeEye(side) {
    const g = new THREE.Group();
    g.position.set(0.078 * side, 0.21, 0.135);
    const white = mesh(new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }), 0, 0, 0);
    white.scale.set(0.85, 1.15, 0.55);
    g.add(white);
    g.add(mesh(new THREE.SphereGeometry(0.027, 12, 10), pupilMat, 0, 0, 0.036));
    g.add(mesh(new THREE.SphereGeometry(0.0085, 8, 6), whiteMat, 0.013 * side, 0.015, 0.055));
    headPivot.add(g);
    return g;
  }
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);

  for (const s of [-1, 1]) {
    const brow = mesh(new THREE.BoxGeometry(male ? 0.092 : 0.082, male ? 0.02 : 0.014, 0.012), hairMat, 0.08 * s, 0.305, 0.152);
    brow.rotation.z = -0.12 * s;
    headPivot.add(brow);
  }
  headPivot.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), skinMat, 0, 0.155, 0.183));
  const smile = mesh(new THREE.TorusGeometry(0.038, 0.011, 10, 18, Math.PI), smileMat, 0, 0.10, 0.163);
  smile.rotation.z = Math.PI;
  smile.rotation.x = -0.12;
  headPivot.add(smile);
  const blushL = mesh(new THREE.SphereGeometry(0.034, 10, 8), blushMat, -0.125, 0.125, 0.132);
  blushL.scale.set(1.1, 0.6, 0.5);
  const blushR = blushL.clone();
  blushR.position.x = 0.125;
  headPivot.add(blushL, blushR);
  for (const s of [-1, 1]) {
    headPivot.add(mesh(new THREE.SphereGeometry(0.036, 12, 10), skinMat, 0.185 * s, 0.155, -0.005));
  }

  /* hair */
  const hairG = new THREE.Group();
  headPivot.add(hairG);
  let tailPivot = null, bunL = null, bunR = null;

  function buildHair() {
    clearGroup(hairG);
    tailPivot = null; bunL = bunR = null;
    if (male) {
      const cap = mesh(new THREE.SphereGeometry(0.205, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat, 0, 0.185, -0.015);
      hairG.add(cap);
      const backVol = mesh(new THREE.SphereGeometry(0.185, 20, 16), hairMat, 0, 0.155, -0.075);
      hairG.add(backVol);
      switch (cfg.hair) {
        case 'quiff': {
          for (const [x, y, z, sc] of [[0, 0.345, 0.115, 1], [0.05, 0.36, 0.06, 0.8], [-0.05, 0.36, 0.06, 0.8]]) {
            const q = mesh(new THREE.SphereGeometry(0.055, 12, 10), hairMat, x, y, z);
            q.scale.set(sc, sc * 1.25, sc * 0.9);
            hairG.add(q);
          }
          break;
        }
        case 'curly': {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const r = 0.13;
            const c = mesh(new THREE.SphereGeometry(0.05, 10, 8), hairMat,
              Math.cos(a) * r, 0.345 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * r * 0.8 - 0.02);
            hairG.add(c);
          }
          break;
        }
        case 'sidepart': {
          const sweep = mesh(new THREE.SphereGeometry(0.055, 12, 10), hairMat, 0.06, 0.325, 0.115);
          sweep.scale.set(1.5, 0.55, 0.85);
          hairG.add(sweep);
          const side = mesh(new THREE.SphereGeometry(0.05, 10, 8), hairMat, -0.115, 0.24, 0.06);
          side.scale.set(0.6, 1.2, 0.8);
          hairG.add(side);
          break;
        }
        default: break; /* mshort: just the cap */
      }
      return;
    }
    /* ---- female ---- */
    const cap = mesh(new THREE.SphereGeometry(0.205, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.34), hairMat, 0, 0.185, -0.015);
    hairG.add(cap);
    const backVol = mesh(new THREE.SphereGeometry(0.185, 20, 16), hairMat, 0, 0.155, -0.08);
    hairG.add(backVol);
    const fringe = () => {
      for (const [x, y, z] of [[-0.072, 0.30, 0.138], [0, 0.315, 0.15], [0.072, 0.30, 0.138]]) {
        const f = mesh(new THREE.SphereGeometry(0.052, 12, 10), hairMat, x, y, z);
        f.scale.set(1, 0.8, 0.7);
        hairG.add(f);
      }
    };
    switch (cfg.hair) {
      case 'buns': {
        fringe();
        bunL = mesh(new THREE.SphereGeometry(0.078, 16, 12), hairMat, -0.148, 0.335, -0.02);
        bunR = mesh(new THREE.SphereGeometry(0.078, 16, 12), hairMat, 0.148, 0.335, -0.02);
        hairG.add(bunL, bunR);
        break;
      }
      case 'ponytail': {
        fringe();
        const scrunchie = mesh(new THREE.TorusGeometry(0.045, 0.017, 10, 20), accentMat, 0, 0.285, -0.165);
        scrunchie.rotation.x = 0.55;
        hairG.add(scrunchie);
        tailPivot = new THREE.Group();
        tailPivot.position.set(0, 0.295, -0.175);
        const tail = mesh(new THREE.CapsuleGeometry(0.052, 0.26, 4, 10), hairMat, 0, -0.15, -0.07);
        tail.rotation.x = 0.35;
        tailPivot.add(tail);
        tailPivot.rotation.x = -0.25;
        hairG.add(tailPivot);
        break;
      }
      case 'long': {
        fringe();
        for (const s of [-1, 1]) {
          const strand = mesh(new THREE.CapsuleGeometry(0.05, 0.36, 4, 10), hairMat, 0.158 * s, -0.02, 0.03);
          strand.rotation.z = -0.09 * s;
          hairG.add(strand);
        }
        const backPanel = mesh(new THREE.CapsuleGeometry(0.115, 0.42, 4, 12), hairMat, 0, -0.02, -0.11);
        backPanel.scale.set(1, 1, 0.72);
        hairG.add(backPanel);
        break;
      }
      case 'bob': {
        const bowl = mesh(new THREE.SphereGeometry(0.217, 28, 20, Math.PI / 2 + 0.7, Math.PI * 2 - 1.4, 0, Math.PI * 0.75), hairMat, 0, 0.19, -0.012);
        hairG.add(bowl);
        fringe();
        break;
      }
      case 'short': {
        fringe();
        break;
      }
    }
  }

  /* ---------- bottoms: skirt (female) / trousers (male) ---------- */
  let waist = null;
  let wingL = null, wingR = null, halo = null, wandStar = null;
  function buildBottom() {
    if (male) {
      for (const { trouser } of [legL, legR2]) clearGroup(trouser);
      if (waist) { body.remove(waist); waist.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); waist = null; }
      const o = MALE_OUTFITS.find((x) => x.id === cfg.outfit) || MALE_OUTFITS[0];
      const starry = cfg.outfit === 'star';
      const caney = cfg.outfit === 'candycane';
      skirtMat.map = starry ? starTexture() : (caney ? candyCaneTexture() : null);
      skirtMat.color.set(starry || caney ? '#ffffff' : cfg.skirt);
      skirtMat.needsUpdate = true;
      for (const { trouser } of [legL, legR2]) {
        const leg = mesh(new THREE.CapsuleGeometry(legR + 0.012, o.len, 4, 12), skirtMat, 0, -(o.len / 2 + 0.04), 0);
        trouser.add(leg);
      }
      waist = mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.09, 16), skirtMat, 0, HIP_Y - 0.045, 0);
      body.add(waist);
      if (o.belt) {
        const belt = mesh(new THREE.TorusGeometry(0.108, 0.02, 10, 24), accentMat, 0, 0.04, 0);
        belt.rotation.x = Math.PI / 2;
        waist.add(belt);
      }
      armL.puff.visible = armR.puff.visible = false;
      return;
    }
    /* female: skirt */
    clearGroup(skirtGroup);
    const o = OUTFITS.find((x) => x.id === cfg.outfit) || OUTFITS[0];
    const rainbow = cfg.outfit === 'rainbow';
    const caney = cfg.outfit === 'candycane';
    skirtMat.map = rainbow ? rainbowTexture() : (caney ? candyCaneTexture() : null);
    skirtMat.color.set(rainbow || caney ? '#ffffff' : cfg.skirt);
    skirtMat.needsUpdate = true;
    const pts = [];
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = 0.155 + (o.flare - 0.155) * Math.pow(t, 0.72);
      pts.push(new THREE.Vector2(r, -t * o.len));
    }
    const sm = mesh(new THREE.LatheGeometry(pts, 44), skirtMat);
    sm.receiveShadow = true;
    skirtGroup.add(sm);
    if (o.trim) {
      const hem = mesh(new THREE.TorusGeometry(o.flare - 0.008, 0.013, 10, 48), trimMat, 0, -o.len + 0.006, 0);
      hem.rotation.x = Math.PI / 2;
      skirtGroup.add(hem);
    }
    if (o.belt) {
      const belt = mesh(new THREE.TorusGeometry(0.152, 0.024, 10, 40), accentMat, 0, -0.008, 0);
      belt.rotation.x = Math.PI / 2;
      skirtGroup.add(belt);
    }
    armL.puff.visible = armR.puff.visible = o.puff > 0;
    armL.puff.scale.setScalar(o.puff / 0.08);
    armR.puff.scale.setScalar(o.puff / 0.08);
  }

  /* shoes */
  function buildShoes() {
    for (const { shoe } of [legL, legR2]) {
      clearGroup(shoe);
      if (cfg.shoes === 'boots') {
        const shaft = mesh(new THREE.CylinderGeometry(0.062, 0.066, 0.20, 14), shoeMat, 0, 0.10, 0);
        const foot = mesh(new THREE.SphereGeometry(0.07, 14, 10), shoeMat, 0, 0, 0.03);
        foot.scale.set(1, 0.5, 1.35);
        const cuff = mesh(new THREE.TorusGeometry(0.064, 0.014, 10, 20), trimMat, 0, 0.205, 0);
        cuff.rotation.x = Math.PI / 2;
        shoe.add(shaft, foot, cuff);
      } else if (cfg.shoes === 'heels') {
        const foot = mesh(new THREE.SphereGeometry(0.068, 14, 10), shoeMat, 0, -0.005, 0.035);
        foot.scale.set(1, 0.52, 1.4);
        const heel = mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.07, 10), shoeMat, 0, -0.008, -0.062);
        shoe.add(foot, heel);
      } else {
        const foot = mesh(new THREE.SphereGeometry(0.07, 14, 10), shoeMat, 0, -0.005, 0.02);
        foot.scale.set(1, 0.55, 1.35);
        const strap = mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 18), shoeMat, 0, 0.035, 0);
        strap.rotation.x = Math.PI / 2 - 0.25;
        shoe.add(foot, strap);
      }
    }
  }

  /* accessories */
  const acc = {};
  {
    const g = new THREE.Group();
    g.position.set(0, 0.385, 0.01);
    g.rotation.x = -0.12;
    g.add(mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.032, 24, 1, true), goldMat));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const big = i === 0;
      g.add(mesh(new THREE.ConeGeometry(big ? 0.017 : 0.012, big ? 0.06 : 0.045, 8), goldMat,
        Math.sin(a) * 0.062, big ? 0.042 : 0.036, Math.cos(a) * 0.062));
      if (big) g.add(mesh(new THREE.SphereGeometry(0.015, 10, 8), gemMat, Math.sin(a) * 0.062, 0.078, Math.cos(a) * 0.062));
    }
    g.traverse((o) => { if (o.isMesh) o.material.side = THREE.DoubleSide; });
    headPivot.add(g);
    acc.crown = g;
  }
  {
    /* bow — hair bow (female) or bow tie (male) */
    const g = new THREE.Group();
    if (male) {
      g.position.set(0, 0.285, 0.115);
      g.rotation.set(-0.15, 0, 0);
      const knot = mesh(new THREE.SphereGeometry(0.019, 12, 10), accentMat);
      const wingL = mesh(new THREE.ConeGeometry(0.03, 0.06, 10), accentMat, -0.036, 0, 0);
      wingL.rotation.z = Math.PI / 2;
      const wingR = mesh(new THREE.ConeGeometry(0.03, 0.06, 10), accentMat, 0.036, 0, 0);
      wingR.rotation.z = -Math.PI / 2;
      g.add(knot, wingL, wingR);
    } else {
      g.position.set(0.155, 0.30, 0.095);
      g.rotation.z = -0.3;
      const knot = mesh(new THREE.SphereGeometry(0.027, 12, 10), accentMat);
      const wingL = mesh(new THREE.ConeGeometry(0.045, 0.09, 10), accentMat, -0.05, 0, 0);
      wingL.rotation.z = Math.PI / 2;
      const wingR = mesh(new THREE.ConeGeometry(0.045, 0.09, 10), accentMat, 0.05, 0, 0);
      wingR.rotation.z = -Math.PI / 2;
      const ribbon = mesh(new THREE.ConeGeometry(0.03, 0.06, 8), accentMat, 0, -0.045, 0);
      ribbon.rotation.z = Math.PI;
      g.add(knot, wingL, wingR, ribbon);
    }
    headPivot.add(g);
    acc.bow = g;
  }
  {
    const g = new THREE.Group();
    g.position.set(0, 0.21, 0.155);
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.TorusGeometry(0.052, 0.009, 10, 24), glassMat, 0.078 * s, 0, 0));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.047, 20), lensMat);
      lens.position.set(0.078 * s, 0, 0);
      g.add(lens);
      const temple = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.14), glassMat, 0.128 * s, 0.02, -0.072);
      temple.rotation.y = -0.28 * s;
      g.add(temple);
    }
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.01, 0.012), glassMat, 0, 0.018, 0));
    headPivot.add(g);
    acc.glasses = g;
  }
  if (!male) {
    {
      const g = new THREE.Group();
      g.position.set(0, 0.335, 0.028);
      g.rotation.x = 0.38;
      const chain = mesh(new THREE.TorusGeometry(0.075, 0.009, 10, 28), goldMat);
      const pendant = mesh(new THREE.SphereGeometry(0.018, 12, 10), gemMat, 0, -0.062, 0.062);
      g.add(chain, pendant);
      torso.add(g);
      acc.necklace = g;
    }
    {
      const g = new THREE.Group();
      for (const s of [-1, 1]) {
        g.add(mesh(new THREE.SphereGeometry(0.013, 10, 8), goldMat, 0.187 * s, 0.115, 0.008));
        const drop = mesh(new THREE.ConeGeometry(0.011, 0.03, 8), gemMat, 0.187 * s, 0.092, 0.008);
        drop.rotation.x = Math.PI;
        g.add(drop);
      }
      headPivot.add(g);
      acc.earrings = g;
    }
  }

  /* butterfly wings (unlockable) */
  {
    const g = new THREE.Group();
    g.position.set(0, 0.22, -0.17);
    const wm = new THREE.MeshBasicMaterial({ map: rainbowTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    const wingGeo = new THREE.CircleGeometry(0.26, 14);
    const mkWing = (s) => {
      const wg = new THREE.Group();
      const front = new THREE.Mesh(wingGeo, wm);
      front.scale.set(1, 0.85, 1);
      front.position.set(s * 0.17, 0.03, 0);
      front.rotation.x = -Math.PI / 2;
      wg.add(front);
      const back = new THREE.Mesh(wingGeo, wm);
      back.scale.set(0.6, 0.55, 1);
      back.position.set(s * 0.11, 0.01, -0.1);
      back.rotation.x = -Math.PI / 2;
      wg.add(back);
      g.add(wg);
      return wg;
    };
    wingL = mkWing(-1);
    wingR = mkWing(1);
    torso.add(g);
    acc.wings = g;
    apiMats.wingMat = wm;
  }

  /* star wand (boutique item) — held in the right hand */
  {
    const g = new THREE.Group();
    g.position.set(0.01, -0.30, 0.06);
    const stick = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8), goldMat, 0, 0.1, 0);
    g.add(stick);
    const starMatW = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd45e', emissiveIntensity: 0.8, roughness: 0.3 });
    const star = mesh(new THREE.OctahedronGeometry(0.05), starMatW, 0, 0.29, 0);
    star.scale.y = 1.4;
    g.add(star);
    const sparkle = mesh(new THREE.SphereGeometry(0.012, 8, 6), gemMat, 0.045, 0.26, 0.02);
    g.add(sparkle);
    armR.shoulder.add(g);
    acc.wand = g;
    apiMats.wandStarMat = starMatW;
    wandStar = star;
  }

  /* halo (unlockable) */
  {
    const g = new THREE.Group();
    const hm = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd45e', emissiveIntensity: 0.7, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 10, 24), hm);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.position.set(0, 0.46, 0);
    headPivot.add(g);
    acc.halo = g;
    halo = g;
    apiMats.haloMat = hm;
  }

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  buildHair();
  buildBottom();
  buildShoes();
  for (const a of ACCESSORIES) {
    if (acc[a.id]) acc[a.id].visible = !!cfg.accessories[a.id];
  }

  /* ------------------------- api ------------------------- */
  const api = {
    group, cfg, male,
    mats: apiMats,
    buildHair, buildBottom, buildSkirt: buildBottom, buildShoes,
    setAccessory(id, on) { cfg.accessories[id] = on; if (acc[id]) acc[id].visible = on; },
    waveT: 0, boingT: 0,
    wave() { api.waveT = 1; },
    boing() { api.boingT = 1; },
    /* pose: 'stand' (default) or 'sit' — used for chairs, thrones, sofas */
    _pose: 'stand',
    setPose(pose) { api._pose = pose === 'sit' ? 'sit' : 'stand'; },
    sitting() { return api._pose === 'sit'; },
    dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      if (waist) waist.traverse?.((o) => { if (o.geometry) o.geometry.dispose(); });
      for (const m of Object.values(api.mats)) m.dispose();
    },
    /* internal animation state */
    _dance: 0, _walkPhase: 0, _blinkNext: 2 + Math.random() * 3, _blinkAge: -1,

    /* anim: { walk01, dance01, beatPhase } */
    update(anim, dt, t) {
      const w = Math.max(0, Math.min(1, anim.walk01 || 0));
      api._dance = lerp(api._dance, anim.dance01 || 0, Math.min(1, dt * 4));
      const b = api._dance;
      if (api.waveT > 0) api.waveT = Math.max(0, api.waveT - dt / 1.4);
      if (api.boingT > 0) api.boingT = Math.max(0, api.boingT - dt / 0.55);
      const waveA = api.waveT, boingA = api.boingT;
      const phase = anim.beatPhase !== undefined ? anim.beatPhase : (t * 1.9) % 1;
      api._walkPhase += dt * (1.5 + 9 * w);
      const swing = Math.sin(api._walkPhase);
      const energy = Math.max(w, b);

      /* body bounce & sway */
      const hop = Math.abs(Math.sin(phase * Math.PI)) * 0.075 * b;
      const boingHop = boingA > 0 ? Math.sin(Math.min(boingA, 1) * Math.PI) * 0.06 : 0;
      const walkBob = Math.abs(swing) * 0.05 * w;
      body.position.y = hop + boingHop + walkBob + Math.sin(t * 2.2) * 0.012 * (1 - energy);
      body.rotation.z = Math.sin(t * 1.6) * 0.035 * (1 - energy) + swing * 0.045 * w;

      /* torso & head */
      torso.rotation.y = Math.sin(phase * Math.PI * 2) * 0.18 * b + swing * 0.10 * w;
      headPivot.rotation.y = Math.sin(t * 0.7) * 0.14 * (1 - energy) + Math.sin(phase * Math.PI * 2) * 0.32 * b - swing * 0.05 * w;
      headPivot.rotation.z = Math.sin(t * 1.3) * 0.03 * (1 - energy) + Math.sin(phase * Math.PI * 4) * 0.08 * b + 0.12 * waveA;
      headPivot.rotation.x = Math.sin(phase * Math.PI * 4) * 0.07 * b + Math.sin(api._walkPhase * 2) * 0.03 * w;

      /* arms */
      const danceZR = 2.35 + Math.sin(t * 7) * 0.45;
      const idleZR = 0.16 + Math.sin(t * 1.8) * 0.05;
      let armRz = idleZR * (1 - b) + danceZR * b;
      let armLz = -(idleZR * (1 - b) + (2.35 + Math.sin(t * 7 + 1.2) * 0.45) * b);
      if (waveA > 0) armRz = lerp(armRz, 2.6 + Math.sin(t * 15) * 0.5, waveA);
      armR.shoulder.rotation.z = armRz;
      armL.shoulder.rotation.z = armLz;
      const armSwing = -swing * 0.62 * w;
      armR.shoulder.rotation.x = armSwing * (1 - b) + Math.sin(phase * Math.PI * 2 + 1.5) * 0.25 * b;
      armL.shoulder.rotation.x = -armSwing * (1 - b) + Math.sin(phase * Math.PI * 2 + 3.9) * 0.25 * b;

      /* legs */
      const step = Math.sin(phase * Math.PI * 2);
      if (api._pose === 'sit') {
        /* seated: legs bent forward, small idle sway */
        legL.hip.rotation.x = lerp(legL.hip.rotation.x, -1.42 + Math.sin(t * 1.2) * 0.02, Math.min(1, dt * 7));
        legR2.hip.rotation.x = lerp(legR2.hip.rotation.x, -1.34 + Math.sin(t * 1.2 + 1) * 0.02, Math.min(1, dt * 7));
        legL.hip.rotation.z = 0;
        legR2.hip.rotation.z = 0;
      } else {
        legL.hip.rotation.x = swing * 0.62 * w + step * 0.30 * b + Math.sin(t * 1.5) * 0.02 * (1 - energy);
        legR2.hip.rotation.x = -swing * 0.62 * w - step * 0.30 * b + Math.sin(t * 1.5 + 2) * 0.02 * (1 - energy);
        legL.hip.rotation.z = -0.07 * b;
        legR2.hip.rotation.z = 0.07 * b;
      }

      /* skirt sway (female) */
      if (skirtGroup) {
        const sway = 1 + (0.05 * Math.sin(phase * Math.PI * 4) * b + 0.04 * Math.abs(swing) * w);
        skirtGroup.scale.set(sway, 1, sway);
        skirtGroup.rotation.z = Math.sin(phase * Math.PI * 2) * 0.07 * b + swing * 0.06 * w;
      }

      /* wings flap & halo bob (unlockables) */
      if (acc.wings && acc.wings.visible) {
        const flap = 0.15 + Math.abs(Math.sin(t * 6 + w * 3)) * 0.75;
        wingL.rotation.y = -flap;
        wingR.rotation.y = flap;
      }
      if (halo && halo.visible) {
        halo.position.y = 0.46 + Math.sin(t * 2) * 0.02;
        halo.rotation.y += dt * 0.8;
      }
      if (acc.wand && acc.wand.visible && api._wandStar) {
        api._wandStar.rotation.y += dt * 2.4;
        api._wandStar.position.y = 0.29 + Math.sin(t * 3.2) * 0.02;
      }

      /* hair secondary motion */
      if (tailPivot) {
        tailPivot.rotation.x = -0.25 - (0.22 * (1 - energy) + (0.45 * b + 0.35 * w)) * Math.sin(t * (2.5 + 6 * b + 4 * w));
        tailPivot.rotation.z = Math.sin(t * (3 + 5 * b)) * 0.12 * b + swing * 0.08 * w;
      }
      if (bunL) {
        const j = 1 + (Math.abs(Math.sin(phase * Math.PI * 4)) * 0.07 * b + Math.abs(swing) * 0.05 * w);
        bunL.scale.setScalar(j); bunR.scale.setScalar(j);
      }

      /* face */
      smile.scale.set(1 + 0.3 * b + 0.15 * waveA, 1 + 0.25 * b + 0.1 * waveA, 1);
      blushMat.opacity = (male ? 0.3 : 0.55) + 0.3 * b;
      if (api._blinkAge >= 0) {
        api._blinkAge += dt;
        if (api._blinkAge > 0.22) api._blinkAge = -1;
      }
      api._blinkNext -= dt;
      if (api._blinkNext <= 0) { api._blinkAge = 0; api._blinkNext = 2 + Math.random() * 3.5; }
      const blinkS = api._blinkAge >= 0 ? 1 - 0.94 * Math.abs(Math.sin(Math.PI * api._blinkAge / 0.22)) : 1;
      eyeL.scale.y = eyeR.scale.y = blinkS;
    },
  };
  api._wandStar = wandStar;
  return api;
}
