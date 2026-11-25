/* =====================================================================
   Trepio Doll — a tiny 3D dress-up & dance game
   Built with three.js (vendored locally, no CDN needed).
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------------ */
/* Palettes & wardrobe data                                            */
/* ------------------------------------------------------------------ */
const SKINS  = ['#f9ddc4', '#efc39d', '#dda273', '#b5714f', '#8d5524', '#654128'];
const HAIRC  = ['#1a1410', '#3a2a1e', '#5d3a24', '#8a5a2b', '#c9973f', '#e8c268',
                '#c2673f', '#d96a9c', '#8f6fd3', '#57b3c9'];
const CLOTH  = ['#ff8fb7', '#f45d8e', '#ff7a68', '#ff9e4f', '#ffd45e', '#a7d97a',
                '#4fc3ae', '#63b8f5', '#8f9cf5', '#b57de0', '#fff3f6', '#33304a'];
const EYES   = ['#5a3420', '#2f6d8f', '#3f7d4e', '#8a5a3c', '#7c8aa0'];
const SHOEC  = ['#f45d8e', '#ff8fb7', '#ffd45e', '#a7d97a', '#63b8f5', '#b57de0',
                '#fff3f6', '#33304a', '#d9a441'];

const HAIRSTYLES = [
  { id: 'buns',     label: '🍡 Space buns' },
  { id: 'ponytail', label: '马尾 Ponytail' },
  { id: 'long',     label: '💇‍♀️ Long hair' },
  { id: 'bob',      label: '✂️ Bob' },
  { id: 'short',    label: '🍓 Pixie' },
];
const OUTFITS = [
  { id: 'princess', label: '👑 Princess', flare: 0.46, len: 0.55, puff: 0.082, belt: false, trim: true  },
  { id: 'gown',     label: '🎀 Ball gown', flare: 0.53, len: 0.58, puff: 0.055, belt: false, trim: true  },
  { id: 'party',    label: '🎉 Party',     flare: 0.27, len: 0.34, puff: 0.066, belt: true,  trim: true  },
  { id: 'coord',    label: '🧶 Co-ord',    flare: 0.33, len: 0.46, puff: 0,     belt: false, trim: false },
];
const SHOESTYLES = [
  { id: 'flats',  label: '🩰 Flats'  },
  { id: 'boots',  label: '🥾 Boots'  },
  { id: 'heels',  label: '👠 Heels'  },
];
const ACCESSORIES = [
  { id: 'crown',    label: '👑 Crown'    },
  { id: 'bow',      label: '🎀 Bow'      },
  { id: 'glasses',  label: '👓 Glasses'  },
  { id: 'necklace', label: '📿 Necklace' },
  { id: 'earrings', label: '💎 Earrings' },
];
const THEMES = [
  { id: 'day',    label: '☁️ Daydream', top: '#ffeaf3', bot: '#ffd2a6', plat: '#ffd9e6', platTop: '#fff0f6', spark: '#ffffff' },
  { id: 'sunset', label: '🌅 Sunset',   top: '#ffd3a1', bot: '#ff90a2', plat: '#ffc9b8', platTop: '#ffe3d1', spark: '#fff2c9' },
  { id: 'night',  label: '🌙 Midnight', top: '#453569', bot: '#1d2440', plat: '#332d52', platTop: '#4a4270', spark: '#cdd6ff' },
  { id: 'ice',    label: '🍦 Vanilla',  top: '#e8f4ff', bot: '#cfe6ff', plat: '#dceaf7', platTop: '#f2faff', spark: '#ffffff' },
];

const DEFAULT_CFG = {
  hair: 'buns', hairColor: '#1a1410', skin: '#b5714f', eyes: '#5a3420',
  outfit: 'princess', top: '#ff8fb7', skirt: '#f45d8e',
  shoes: 'flats', shoeColor: '#f45d8e',
  accessories: { crown: true, bow: false, glasses: false, necklace: false, earrings: true },
  theme: 'day',
};

const STORE_KEY = 'trepio-doll-v1';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const cfg = loadCfg();
function loadCfg() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_CFG, accessories: { ...DEFAULT_CFG.accessories } };
    const saved = JSON.parse(raw);
    return {
      ...DEFAULT_CFG, ...saved,
      accessories: { ...DEFAULT_CFG.accessories, ...(saved.accessories || {}) },
    };
  } catch { return { ...DEFAULT_CFG, accessories: { ...DEFAULT_CFG.accessories } }; }
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ } }

/* ------------------------------------------------------------------ */
/* Renderer / scene / camera                                           */
/* ------------------------------------------------------------------ */
const canvas = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.getElementById('fallback').hidden = false;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffd2a6, 9, 16);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.set(0.35, 1.35, 3.4);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.72, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 1.7;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * 0.55;
controls.update();

/* Lights */
scene.add(new THREE.HemisphereLight(0xfff4ec, 0xffd9e6, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 2.3);
key.position.set(2.6, 4.2, 2.8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
key.shadow.camera.top = 3.2;  key.shadow.camera.bottom = -1.2;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
key.shadow.bias = -0.0008;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffc4e0, 1.1);
rim.position.set(-3, 2.2, -2.4);
scene.add(rim);

/* Background gradient (canvas texture) */
function bgTexture(top, bot) {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.62, bot);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Shared materials                                                    */
/* ------------------------------------------------------------------ */
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.55, metalness: 0.02, ...o,
});
const skinMat   = mat('#b5714f', { roughness: 0.65 });
const hairMat   = mat('#1a1410', { roughness: 0.45, side: THREE.DoubleSide });
const topMat    = mat('#ff8fb7', { roughness: 0.6 });
const skirtMat  = mat('#f45d8e', { roughness: 0.6, side: THREE.DoubleSide });
const accentMat = mat('#f45d8e', { roughness: 0.55 });
const trimMat   = mat('#fff6ec', { roughness: 0.5 });
const shoeMat   = mat('#f45d8e', { roughness: 0.4 });
const goldMat   = mat('#f3c14b', { metalness: 0.75, roughness: 0.28 });
const smileMat  = mat('#c9556e', { roughness: 0.6 });
const blushMat  = new THREE.MeshStandardMaterial({ color: '#ff9fb0', roughness: 0.9, transparent: true, opacity: 0.6 });
const whiteMat  = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const pupilMat  = mat('#5a3420', { roughness: 0.25 });
const gemMat    = mat('#ff9ec6', { roughness: 0.15, metalness: 0.35 });
const glassMat  = mat('#43304d', { roughness: 0.35, metalness: 0.3 });
const lensMat   = new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.18 });

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function clearGroup(g) {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */
const platMat   = mat('#ffd9e6', { roughness: 0.8 });
const platTopMat = mat('#fff0f6', { roughness: 0.75 });
const stage = new THREE.Group();
const platform = mesh(new THREE.CylinderGeometry(1.06, 1.18, 0.14, 64), platMat, 0, -0.07, 0);
platform.receiveShadow = true;
stage.add(platform);
const platTop = mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.022, 64), platTopMat, 0, 0.006, 0);
platTop.receiveShadow = true;
stage.add(platTop);
const platRing = mesh(new THREE.TorusGeometry(1.05, 0.022, 12, 72), goldMat, 0, 0.005, 0);
platRing.rotation.x = Math.PI / 2;
stage.add(platRing);
scene.add(stage);

/* ------------------------------------------------------------------ */
/* The doll                                                            */
/* ------------------------------------------------------------------ */
const doll = new THREE.Group();      // spin pivot
const body = new THREE.Group();      // bounce / sway pivot
doll.add(body);
scene.add(doll);

/* --- legs (pivot at hips) --- */
const HIP_Y = 0.52;
function makeLeg(side) {            // side: -1 left, +1 right
  const hip = new THREE.Group();
  hip.position.set(0.075 * side, HIP_Y, 0);
  const leg = mesh(new THREE.CapsuleGeometry(0.055, 0.34, 4, 12), skinMat, 0, -0.20, 0);
  hip.add(leg);
  const shoe = new THREE.Group();
  shoe.position.set(0, -0.465, 0.015);
  hip.add(shoe);
  body.add(hip);
  return { hip, shoe };
}
const legL = makeLeg(-1);
const legR = makeLeg(1);

/* --- torso (pivot at waist) --- */
const torso = new THREE.Group();
torso.position.set(0, 0.55, 0);
body.add(torso);

const chest = mesh(new THREE.CapsuleGeometry(0.108, 0.20, 4, 14), topMat, 0, 0.16, 0);
torso.add(chest);
const neck = mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.09, 12), skinMat, 0, 0.315, 0);
torso.add(neck);

/* --- arms (pivot at shoulders) --- */
function makeArm(side) {
  const shoulder = new THREE.Group();
  shoulder.position.set(0.148 * side, 0.27, 0);
  const arm = mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 10), skinMat, 0, -0.145, 0);
  shoulder.add(arm);
  const hand = mesh(new THREE.SphereGeometry(0.049, 14, 10), skinMat, 0, -0.275, 0);
  shoulder.add(hand);
  const puff = mesh(new THREE.SphereGeometry(0.08, 12, 10), topMat, 0, -0.045, 0);
  shoulder.add(puff);
  shoulder.rotation.z = 0.16 * side;
  torso.add(shoulder);
  return { shoulder, puff };
}
const armL = makeArm(-1);
const armR = makeArm(1);

/* --- skirt (pivot at waist, follows hips not twist) --- */
const skirtGroup = new THREE.Group();
skirtGroup.position.set(0, 0.585, 0);
body.add(skirtGroup);
let skirtMesh = null, hemTrim = null, beltMesh = null;

function buildSkirt() {
  clearGroup(skirtGroup);
  const o = OUTFITS.find((x) => x.id === cfg.outfit);
  const pts = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = 0.155 + (o.flare - 0.155) * Math.pow(t, 0.72);
    pts.push(new THREE.Vector2(r, -t * o.len));
  }
  skirtMesh = mesh(new THREE.LatheGeometry(pts, 44), skirtMat);
  skirtMesh.receiveShadow = true;
  skirtGroup.add(skirtMesh);
  if (o.trim) {
    hemTrim = mesh(new THREE.TorusGeometry(o.flare - 0.008, 0.013, 10, 48), trimMat, 0, -o.len + 0.006, 0);
    hemTrim.rotation.x = Math.PI / 2;
    skirtGroup.add(hemTrim);
  }
  if (o.belt) {
    beltMesh = mesh(new THREE.TorusGeometry(0.152, 0.024, 10, 40), accentMat, 0, -0.008, 0);
    beltMesh.rotation.x = Math.PI / 2;
    skirtGroup.add(beltMesh);
  }
  armL.puff.visible = armR.puff.visible = o.puff > 0;
  armL.puff.scale.setScalar(o.puff / 0.08);
  armR.puff.scale.setScalar(o.puff / 0.08);
}

/* --- head (pivot at neck top) --- */
const headPivot = new THREE.Group();
headPivot.position.set(0, 0.38, 0);
torso.add(headPivot);

const head = mesh(new THREE.SphereGeometry(0.19, 28, 22), skinMat, 0, 0.17, 0);
head.scale.set(1, 1.06, 0.96);
headPivot.add(head);

/* eyes */
function makeEye(side) {
  const g = new THREE.Group();
  g.position.set(0.078 * side, 0.21, 0.135);
  const white = mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }));
  white.scale.set(0.85, 1.15, 0.55);
  g.add(white);
  const pupil = mesh(new THREE.SphereGeometry(0.027, 12, 10), pupilMat, 0, 0, 0.036);
  g.add(pupil);
  const glint = mesh(new THREE.SphereGeometry(0.0085, 8, 6), whiteMat, 0.013 * side, 0.015, 0.055);
  g.add(glint);
  headPivot.add(g);
  return g;
}
const eyeL = makeEye(-1);
const eyeR = makeEye(1);

/* brows */
for (const s of [-1, 1]) {
  const brow = mesh(new THREE.BoxGeometry(0.082, 0.014, 0.012), hairMat, 0.08 * s, 0.305, 0.152);
  brow.rotation.z = -0.12 * s;
  headPivot.add(brow);
}
/* nose, smile, blush, ears */
const nose = mesh(new THREE.SphereGeometry(0.014, 10, 8), skinMat, 0, 0.155, 0.183);
headPivot.add(nose);
const smile = mesh(new THREE.TorusGeometry(0.038, 0.011, 10, 18, Math.PI), smileMat, 0, 0.10, 0.163);
smile.rotation.z = Math.PI;      // bottom half → smile curve
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

/* --- hair --- */
const hairG = new THREE.Group();
headPivot.add(hairG);
let tailPivot = null, bunL = null, bunR = null;

function buildHair() {
  clearGroup(hairG);
  tailPivot = null; bunL = bunR = null;
  /* skullcap: top of the head only, stops above the brows */
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
      /* bowl cut: covers back & sides, leaves the face open (phi gap at the front) */
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

/* --- accessories (built once, toggled) --- */
const acc = {};

/* crown */
{
  const g = new THREE.Group();
  g.position.set(0, 0.385, 0.01);
  g.rotation.x = -0.12;
  g.add(mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.032, 24, 1, true), goldMat));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const big = i === 0;
    const spike = mesh(new THREE.ConeGeometry(big ? 0.017 : 0.012, big ? 0.06 : 0.045, 8), goldMat,
      Math.sin(a) * 0.062, big ? 0.042 : 0.036, Math.cos(a) * 0.062);
    g.add(spike);
    if (big) g.add(mesh(new THREE.SphereGeometry(0.015, 10, 8), gemMat, Math.sin(a) * 0.062, 0.078, Math.cos(a) * 0.062));
  }
  g.traverse((o) => { if (o.isMesh) o.material.side = THREE.DoubleSide; });
  headPivot.add(g);
  acc.crown = g;
}
/* bow */
{
  const g = new THREE.Group();
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
  headPivot.add(g);
  acc.bow = g;
}
/* glasses */
{
  const g = new THREE.Group();
  g.position.set(0, 0.21, 0.155);
  for (const s of [-1, 1]) {
    const ring = mesh(new THREE.TorusGeometry(0.052, 0.009, 10, 24), glassMat, 0.078 * s, 0, 0);
    g.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.047, 20), lensMat);
    lens.position.set(0.078 * s, 0, 0);
    g.add(lens);
    const temple = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.14), glassMat, 0.128 * s, 0.02, -0.072);
    temple.rotation.y = -0.28 * s;
    g.add(temple);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.03, 0.01, 0.012), glassMat, 0, 0.018, 0);
  g.add(bridge);
  headPivot.add(g);
  acc.glasses = g;
}
/* necklace */
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
/* earrings */
{
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const stud = mesh(new THREE.SphereGeometry(0.013, 10, 8), goldMat, 0.187 * s, 0.115, 0.008);
    const drop = mesh(new THREE.ConeGeometry(0.011, 0.03, 8), gemMat, 0.187 * s, 0.092, 0.008);
    drop.rotation.x = Math.PI;
    g.add(stud, drop);
  }
  headPivot.add(g);
  acc.earrings = g;
}

/* --- shoes (rebuild on change) --- */
function buildShoes() {
  for (const { shoe } of [legL, legR]) {
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
    } else { // flats
      const foot = mesh(new THREE.SphereGeometry(0.07, 14, 10), shoeMat, 0, -0.005, 0.02);
      foot.scale.set(1, 0.55, 1.35);
      const strap = mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 18), shoeMat, 0, 0.035, 0);
      strap.rotation.x = Math.PI / 2 - 0.25;
      shoe.add(foot, strap);
    }
  }
}

/* shadows on every doll part */
doll.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });

/* ------------------------------------------------------------------ */
/* Sparkles                                                            */
/* ------------------------------------------------------------------ */
function dotTexture(colorInner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, colorInner);
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function makeSparkles(count, radius, yMin, yMax, size, color) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = radius * (0.25 + 0.75 * Math.random());
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    size, map: dotTexture(), transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(color),
  });
  const pts = new THREE.Points(geo, m);
  scene.add(pts);
  return pts;
}
let sparkA = makeSparkles(160, 2.4, 0.2, 3.2, 0.05, '#ffffff');
let sparkB = makeSparkles(90, 2.4, 0.2, 3.2, 0.09, '#fff2c9');

/* ------------------------------------------------------------------ */
/* Particles: hearts & confetti                                        */
/* ------------------------------------------------------------------ */
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
const heartTex = heartTexture();
const heartMatShared = new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false });
const confettiGeo = new THREE.PlaneGeometry(0.05, 0.075);
const confettiMats = ['#ff8fb7', '#ffd45e', '#63b8f5', '#a7d97a', '#b57de0', '#fff3f6']
  .map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));

const particles = [];
function spawnHearts(n) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(heartMatShared);
    s.renderOrder = 10;
    s.position.set((Math.random() - 0.5) * 0.5, 1.15 + Math.random() * 0.25, 0.25 + Math.random() * 0.2);
    const sc = 0.12 + Math.random() * 0.09;
    s.scale.set(sc, sc, 1);
    scene.add(s);
    particles.push({ obj: s, kind: 'heart', life: 0, max: 1.2 + Math.random() * 0.5, baseScale: sc,
      phase: Math.random() * 6,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.65 + Math.random() * 0.35, (Math.random() - 0.2) * 0.2) });
  }
}
function spawnConfetti(n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(confettiGeo, confettiMats[i % confettiMats.length]);
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.85;
    m.position.set(Math.cos(a) * r, 2.0 + Math.random() * 0.6, Math.sin(a) * r);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(m);
    particles.push({ obj: m, kind: 'confetti', life: 0, max: 2.4 + Math.random() * 0.8,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.55, -0.45 - Math.random() * 0.35, (Math.random() - 0.5) * 0.55),
      spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6), phase: Math.random() * 6 });
  }
}
function updateParticles(dt, t) {
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

/* ------------------------------------------------------------------ */
/* Music — tiny WebAudio beatbox                                       */
/* ------------------------------------------------------------------ */
const BASS = [45, 45, 48, 45, 43, 43, 48, 50, 45, 45, 48, 45, 41, 43, 50, 52];
const PLUCK = { 0: 69, 3: 72, 6: 76, 10: 74, 12: 72, 16: 69, 19: 72, 22: 79, 26: 77, 28: 76, 30: 74 };
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Beatbox {
  constructor() {
    this.ctx = null; this.playing = false; this.muted = false;
    this.bpm = 112; this.step = 0; this.nextT = 0; this.timer = null; this.t0 = 0;
  }
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    /* echo bus for plucks */
    this.echo = this.ctx.createDelay(0.5);
    this.echo.delayTime.value = 60 / this.bpm * 0.75;
    const fb = this.ctx.createGain(); fb.gain.value = 0.32;
    const wet = this.ctx.createGain(); wet.gain.value = 0.4;
    this.echo.connect(fb); fb.connect(this.echo);
    this.echo.connect(wet); wet.connect(this.master);
    /* noise buffer */
    const len = this.ctx.sampleRate * 0.3;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  start() {
    this.ensure();
    this.ctx.resume();
    this.playing = true;
    this.step = 0;
    this.t0 = this.nextT = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 30);
  }
  stop() {
    this.playing = false;
    clearInterval(this.timer); this.timer = null;
  }
  tick() {
    if (document.hidden) { this.nextT = Math.max(this.nextT, this.ctx.currentTime + 0.05); return; }
    while (this.nextT < this.ctx.currentTime + 0.12) {
      this.schedule(this.step, this.nextT);
      this.nextT += 60 / this.bpm / 4;
      this.step = (this.step + 1) % 32;
    }
  }
  schedule(s, t) {
    if (s % 4 === 0) this.kick(t);
    if (s % 8 === 4) this.snare(t);
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.11 : 0.07);
    if (s % 2 === 0) this.bass(t, midi(BASS[(s / 2) | 0] - 12));
    if (PLUCK[s] !== undefined) this.pluck(t, midi(PLUCK[s]));
  }
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.18);
  }
  hat(t, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.1); src.stop(t + 0.06);
  }
  snare(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.1); src.stop(t + 0.18);
    const o = this.ctx.createOscillator(), og = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 185;
    og.gain.setValueAtTime(0.12, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 0.1);
  }
  bass(t, f0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f0;
    f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 1.1;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.24);
  }
  pluck(t, f0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = f0;
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 2;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(f); f.connect(g);
    g.connect(this.master); g.connect(this.echo);
    o.start(t); o.stop(t + 0.22);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }
  beatTime() { return this.playing && this.ctx ? this.ctx.currentTime - this.t0 : 0; }
}
const music = new Beatbox();

/* ------------------------------------------------------------------ */
/* Apply config                                                        */
/* ------------------------------------------------------------------ */
function setTheme(id) {
  const th = THEMES.find((x) => x.id === id) || THEMES[0];
  const old = scene.background;
  scene.background = bgTexture(th.top, th.bot);
  if (old) old.dispose();
  scene.fog.color.set(th.bot);
  platMat.color.set(th.plat);
  platTopMat.color.set(th.platTop);
  sparkA.material.color.set(th.spark);
  sparkB.material.color.set(th.spark);
}
function applyAll() {
  skinMat.color.set(cfg.skin);
  hairMat.color.set(cfg.hairColor);
  pupilMat.color.set(cfg.eyes);
  topMat.color.set(cfg.top);
  skirtMat.color.set(cfg.skirt);
  accentMat.color.set(cfg.skirt);
  shoeMat.color.set(cfg.shoeColor);
  buildHair();
  buildSkirt();
  buildShoes();
  for (const a of ACCESSORIES) acc[a.id].visible = !!cfg.accessories[a.id];
  setTheme(cfg.theme);
}
applyAll();

/* ------------------------------------------------------------------ */
/* Animation state                                                     */
/* ------------------------------------------------------------------ */
let danceOn = false, spinOn = false;
let danceBlend = 0, spinBlend = 0, waveT = 0, boingT = 0;
let blinkNext = 2.5, blinkAge = -1;
let confettiTimer = 0;
const clock = new THREE.Clock();

function beatPhase() {
  const t = music.beatTime();
  const tt = t > 0 ? t : clock.elapsedTime;
  return (tt * music.bpm / 60) % 1;
}

function wave() { waveT = 1; }
function boing() { boingT = 1; }

function setDance(on) {
  danceOn = on;
  document.getElementById('btnDance').classList.toggle('active', on);
  if (on) {
    music.start();
    spawnConfetti(46);
    confettiTimer = 0;
  } else {
    music.stop();
  }
}

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
const _armIdle = 0.16;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const phase = beatPhase();
  const b = danceBlend = THREE.MathUtils.lerp(danceBlend, danceOn ? 1 : 0, Math.min(1, dt * 4));
  spinBlend = THREE.MathUtils.lerp(spinBlend, spinOn ? 1 : 0, Math.min(1, dt * 3));
  if (waveT > 0) waveT = Math.max(0, waveT - dt / 1.4);
  if (boingT > 0) boingT = Math.max(0, boingT - dt / 0.55);

  /* spin */
  doll.rotation.y += dt * 2.2 * spinBlend;

  /* body bounce & sway */
  const hop = Math.abs(Math.sin(phase * Math.PI)) * 0.075 * b;
  const boingHop = boingT > 0 ? Math.sin(Math.min(boingT, 1) * Math.PI) * 0.06 : 0;
  const idleBob = Math.sin(t * 2.2) * 0.012 * (1 - b);
  body.position.y = hop + boingHop + idleBob;
  body.rotation.z = Math.sin(t * 1.6) * 0.035 * (1 - b);

  /* torso twist & head */
  torso.rotation.y = Math.sin(phase * Math.PI * 2) * 0.18 * b;
  headPivot.rotation.y = Math.sin(t * 0.7) * 0.14 * (1 - b) + Math.sin(phase * Math.PI * 2) * 0.32 * b;
  headPivot.rotation.z = Math.sin(t * 1.3) * 0.03 * (1 - b) + Math.sin(phase * Math.PI * 4) * 0.08 * b;
  headPivot.rotation.x = Math.sin(phase * Math.PI * 4) * 0.07 * b;

  /* arms */
  const danceZR = 2.35 + Math.sin(t * 7) * 0.45;
  const idleZR = _armIdle + Math.sin(t * 1.8) * 0.05;
  let armRz = idleZR * (1 - b) + danceZR * b;
  let armLz = -(idleZR * (1 - b) + (2.35 + Math.sin(t * 7 + 1.2) * 0.45) * b);
  if (waveT > 0) {
    const wz = 2.6 + Math.sin(t * 15) * 0.5;
    armRz = THREE.MathUtils.lerp(armRz, wz, waveT);
    headPivot.rotation.z += 0.12 * waveT;
  }
  armR.shoulder.rotation.z = armRz;
  armL.shoulder.rotation.z = armLz;
  armR.shoulder.rotation.x = Math.sin(phase * Math.PI * 2 + 1.5) * 0.25 * b;
  armL.shoulder.rotation.x = Math.sin(phase * Math.PI * 2 + 3.9) * 0.25 * b;

  /* legs — little dance steps */
  const step = Math.sin(phase * Math.PI * 2);
  legL.hip.rotation.x = step * 0.30 * b + Math.sin(t * 1.5) * 0.02 * (1 - b);
  legR.hip.rotation.x = -step * 0.30 * b + Math.sin(t * 1.5 + 2) * 0.02 * (1 - b);
  legL.hip.rotation.z = -0.07 * b;
  legR.hip.rotation.z = 0.07 * b;

  /* skirt sway */
  const sway = 1 + 0.05 * Math.sin(phase * Math.PI * 4) * b;
  skirtGroup.scale.set(sway, 1, sway);
  skirtGroup.rotation.z = Math.sin(phase * Math.PI * 2) * 0.07 * b;

  /* hair secondary motion */
  if (tailPivot) tailPivot.rotation.x = -0.25 - (0.22 * (1 - b) + 0.45 * b) * Math.sin(t * (2.5 + 6 * b));
  if (tailPivot) tailPivot.rotation.z = Math.sin(t * (3 + 5 * b)) * 0.12 * b;
  if (bunL) { const j = 1 + Math.abs(Math.sin(phase * Math.PI * 4)) * 0.07 * b; bunL.scale.setScalar(j); bunR.scale.setScalar(j); }

  /* face */
  smile.scale.set(1 + 0.3 * b, 1 + 0.25 * b, 1);
  blushMat.opacity = 0.55 + 0.3 * b;
  if (blinkAge >= 0) {
    blinkAge += dt;
    if (blinkAge > 0.22) blinkAge = -1;
  }
  blinkNext -= dt;
  if (blinkNext <= 0) { blinkAge = 0; blinkNext = 2 + Math.random() * 3.5; }
  const blinkS = blinkAge >= 0 ? 1 - 0.94 * Math.abs(Math.sin(Math.PI * blinkAge / 0.22)) : 1;
  eyeL.scale.y = eyeR.scale.y = blinkS;

  /* stage & sparkles */
  platform.parent.rotation.y += dt * (0.12 + 0.8 * b);
  sparkA.rotation.y += dt * (0.05 + 0.25 * b);
  sparkB.rotation.y -= dt * (0.04 + 0.2 * b);
  sparkA.material.opacity = 0.6 + 0.3 * Math.sin(t * 2.1);
  sparkB.material.opacity = 0.5 + 0.35 * Math.sin(t * 1.7 + 2);

  /* confetti rain while dancing */
  if (danceOn) {
    confettiTimer += dt;
    if (confettiTimer > 2.9) { confettiTimer = 0; spawnConfetti(14); }
  }

  updateParticles(dt, t);
  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ------------------------------------------------------------------ */
/* Pointer: tap the doll to say hi                                     */
/* ------------------------------------------------------------------ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(doll, true);
  if (hit.length) { wave(); boing(); spawnHearts(4); }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && danceOn) music.stop();
  else if (!document.hidden && danceOn) music.start();
});

/* ------------------------------------------------------------------ */
/* UI panel                                                            */
/* ------------------------------------------------------------------ */
const panel = document.getElementById('panel');
const tabsBar = document.createElement('div');
tabsBar.id = 'tabs';
panel.appendChild(tabsBar);
const uiSync = [];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function groupLabel(text) { return el('div', 'group-label', text); }
function container(...kids) {
  const d = el('div');
  for (const k of kids) d.appendChild(k);
  return d;
}
function swatches(colors, get, set) {
  const wrap = el('div', 'swatches');
  const btns = colors.map((c) => {
    const b = el('button', 'swatch');
    b.style.background = c;
    b.title = c;
    b.addEventListener('click', () => { set(c); save(); syncUI(); });
    wrap.appendChild(b);
    return { b, c };
  });
  uiSync.push(() => { for (const { b, c } of btns) b.classList.toggle('on', get() === c); });
  return wrap;
}
function chips(list, get, set) {
  const wrap = el('div', 'chips');
  const btns = list.map((o) => {
    const b = el('button', 'chip', o.label);
    b.addEventListener('click', () => { set(o.id); save(); syncUI(); });
    wrap.appendChild(b);
    return { b, id: o.id };
  });
  uiSync.push(() => { for (const { b, id } of btns) b.classList.toggle('on', get() === id); });
  return wrap;
}

const TABS = [
  { id: 'hair', label: '💈 Hair', build: () => container(
      groupLabel('Style'), chips(HAIRSTYLES, () => cfg.hair, (v) => { cfg.hair = v; buildHair(); }),
      groupLabel('Color'), swatches(HAIRC, () => cfg.hairColor, (v) => { cfg.hairColor = v; hairMat.color.set(v); })) },
  { id: 'outfit', label: '👗 Outfit', build: () => container(
      groupLabel('Style'), chips(OUTFITS, () => cfg.outfit, (v) => { cfg.outfit = v; buildSkirt(); }),
      groupLabel('Top'), swatches(CLOTH, () => cfg.top, (v) => { cfg.top = v; topMat.color.set(v); }),
      groupLabel('Skirt &amp; accents'), swatches(CLOTH, () => cfg.skirt, (v) => { cfg.skirt = v; skirtMat.color.set(v); accentMat.color.set(v); })) },
  { id: 'beauty', label: '💄 Beauty', build: () => container(
      groupLabel('Skin tone'), swatches(SKINS, () => cfg.skin, (v) => { cfg.skin = v; skinMat.color.set(v); }),
      groupLabel('Eyes'), swatches(EYES, () => cfg.eyes, (v) => { cfg.eyes = v; pupilMat.color.set(v); })) },
  { id: 'shoes', label: '👠 Shoes', build: () => container(
      groupLabel('Style'), chips(SHOESTYLES, () => cfg.shoes, (v) => { cfg.shoes = v; buildShoes(); }),
      groupLabel('Color'), swatches(SHOEC, () => cfg.shoeColor, (v) => { cfg.shoeColor = v; shoeMat.color.set(v); })) },
  { id: 'extras', label: '✨ Extras', build: () => {
      const chipsWrap = el('div', 'chips');
      const btns = ACCESSORIES.map((a) => {
        const b = el('button', 'chip', a.label);
        b.addEventListener('click', () => { cfg.accessories[a.id] = !cfg.accessories[a.id]; acc[a.id].visible = cfg.accessories[a.id]; save(); syncUI(); });
        chipsWrap.appendChild(b);
        return { b, id: a.id };
      });
      uiSync.push(() => { for (const { b, id } of btns) b.classList.toggle('on', !!cfg.accessories[id]); });
      return container(groupLabel('Accessories'), chipsWrap);
    } },
  { id: 'stage', label: '🎪 Stage', build: () => container(
      groupLabel('Theme'), chips(THEMES, () => cfg.theme, (v) => { cfg.theme = v; setTheme(v); })) },
];

let activeTab = 'hair';
for (const t of TABS) {
  const btn = el('button', 'tab', t.label);
  btn.addEventListener('click', () => { activeTab = t.id; syncUI(); });
  btn.dataset.tab = t.id;
  tabsBar.appendChild(btn);
  const pane = t.build();
  pane.className = 'tabpane';
  pane.dataset.pane = t.id;
  panel.appendChild(pane);
  t.pane = pane;
  t.btn = btn;
}
function syncUI() {
  for (const t of TABS) {
    t.btn.classList.toggle('on', t.id === activeTab);
    t.pane.classList.toggle('on', t.id === activeTab);
  }
  for (const f of uiSync) f();
}
syncUI();

/* ------------------------------------------------------------------ */
/* Action buttons                                                      */
/* ------------------------------------------------------------------ */
document.getElementById('btnDance').addEventListener('click', () => setDance(!danceOn));
document.getElementById('btnWave').addEventListener('click', () => { wave(); spawnHearts(2); });
document.getElementById('btnSpin').addEventListener('click', (e) => {
  spinOn = !spinOn;
  e.currentTarget.classList.toggle('on', spinOn);
});
document.getElementById('btnRandom').addEventListener('click', () => {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  cfg.hair = pick(HAIRSTYLES).id;
  cfg.hairColor = pick(HAIRC);
  cfg.skin = pick(SKINS);
  cfg.eyes = pick(EYES);
  cfg.outfit = pick(OUTFITS).id;
  cfg.top = pick(CLOTH);
  cfg.skirt = pick(CLOTH);
  cfg.shoes = pick(SHOESTYLES).id;
  cfg.shoeColor = pick(SHOEC);
  cfg.theme = pick(THEMES).id;
  for (const a of ACCESSORIES) cfg.accessories[a.id] = Math.random() < 0.45;
  applyAll();
  syncUI();
  save();
  spawnConfetti(20);
  boing();
});
document.getElementById('btnMute').addEventListener('click', (e) => {
  music.setMuted(!music.muted);
  e.currentTarget.textContent = music.muted ? '🔇' : '🔊';
});

/* first-visit hint */
window.addEventListener('load', () => {
  if (!localStorage.getItem(STORE_KEY)) spawnHearts(2);
  save();
});
