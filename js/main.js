/* =====================================================================
   main.js — Trepio Candy World
   Studio (dress-up) + open candy world with maze, free movement & NPCs.
   ===================================================================== */
import * as THREE from 'three';
import { createDoll, SKINS, HAIRC, CLOTH, EYES, SHOEC,
         HAIRSTYLES, OUTFITS, SHOESTYLES, ACCESSORIES,
         MALE_HAIRSTYLES, MALE_OUTFITS, MALE_ACCESSORIES } from './doll.js';
import { createWorld } from './world.js';
import { createEffects } from './effects.js';
import { Beatbox } from './audio.js';
import { createInput } from './input.js';

/* ------------------------------------------------------------------ */
/* Characters — each doll has different characteristics               */
/* ------------------------------------------------------------------ */
const CHARACTERS = [
  {
    id: 'trixie', emoji: '👑', name: 'Trixie', title: 'Bubblegum Princess',
    blurb: 'Sweet, sparkling and always first through the maze.',
    speed: 5.6, jump: 4.6,
    cfg: { hair: 'buns', hairColor: '#d96a9c', skin: '#b5714f', eyes: '#5a3420',
      outfit: 'princess', top: '#ff8fb7', skirt: '#f45d8e',
      shoes: 'heels', shoeColor: '#f45d8e',
      accessories: { crown: true, bow: false, glasses: false, necklace: false, earrings: true } },
  },
  {
    id: 'momo', emoji: '🍫', name: 'Momo', title: 'Choco Scout',
    blurb: 'Clever and cautious — maps every corridor before sprinting.',
    speed: 4.9, jump: 5.3,
    cfg: { hair: 'ponytail', hairColor: '#3a2a1e', skin: '#8d5524', eyes: '#3f7d4e',
      outfit: 'party', top: '#ff9e4f', skirt: '#8a5a3a',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: false, bow: false, glasses: true, necklace: false, earrings: false } },
  },
  {
    id: 'zuri', emoji: '🌿', name: 'Zuri', title: 'Mint Ranger',
    blurb: 'Quick on her feet, quickest through the lollipop forest.',
    speed: 6.2, jump: 4.2,
    cfg: { hair: 'bob', hairColor: '#57b3c9', skin: '#dda273', eyes: '#2f6d8f',
      outfit: 'coord', top: '#4fc3ae', skirt: '#a7d97a',
      shoes: 'boots', shoeColor: '#4fc3ae',
      accessories: { crown: false, bow: true, glasses: false, necklace: false, earrings: false } },
  },
  {
    id: 'lulu', emoji: '🫐', name: 'Lulu', title: 'Berry Dreamer',
    blurb: 'Dreamy and gentle — follows the scent of the chocolate river.',
    speed: 5.0, jump: 4.7,
    cfg: { hair: 'long', hairColor: '#8f6fd3', skin: '#654128', eyes: '#5a3420',
      outfit: 'gown', top: '#b57de0', skirt: '#8f9cf5',
      shoes: 'flats', shoeColor: '#b57de0',
      accessories: { crown: false, bow: false, glasses: false, necklace: true, earrings: true } },
  },
  {
    id: 'kiki', emoji: '💫', name: 'Kiki', title: 'Vanilla Comet',
    blurb: 'The fastest doll in Candy World — catch her if you can!',
    speed: 6.5, jump: 5.6, gender: 'female',
    cfg: { hair: 'short', hairColor: '#e8c268', skin: '#f9ddc4', eyes: '#8a5a3c',
      outfit: 'party', top: '#fff3f6', skirt: '#ffd45e',
      shoes: 'boots', shoeColor: '#d9a441',
      accessories: { crown: true, bow: true, glasses: false, necklace: false, earrings: true } },
  },
  {
    id: 'theo', emoji: '🤴', name: 'Theo', title: 'Cocoa Prince',
    blurb: 'Bold and gallant — claims the candy castle is his by right.',
    speed: 5.4, jump: 4.8, gender: 'male',
    cfg: { hair: 'quiff', hairColor: '#3a2a1e', skin: '#8d5524', eyes: '#5a3420',
      outfit: 'mprince', top: '#ffd45e', skirt: '#63b8f5',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: true, bow: true, glasses: false } },
  },
  {
    id: 'amani', emoji: '🍀', name: 'Amani', title: 'Mint Explorer',
    blurb: 'Charts every trail from the rainbow to the ice cream peaks.',
    speed: 5.1, jump: 5.2, gender: 'male',
    cfg: { hair: 'curly', hairColor: '#1a1410', skin: '#dda273', eyes: '#3f7d4e',
      outfit: 'explorer', top: '#a7d97a', skirt: '#4fc3ae',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: false, bow: false, glasses: true } },
  },
  {
    id: 'dex', emoji: '⚡', name: 'Dex', title: 'Lemon Bolt',
    blurb: 'Fastest boy in the world — a yellow blur through the meadow.',
    speed: 6.4, jump: 5.5, gender: 'male',
    cfg: { hair: 'sidepart', hairColor: '#e8c268', skin: '#f9ddc4', eyes: '#2f6d8f',
      outfit: 'sporty', top: '#ffd45e', skirt: '#fff3f6',
      shoes: 'flats', shoeColor: '#d9a441',
      accessories: { crown: false, bow: false, glasses: false } },
  },
];

const STORE_KEY = 'trepio-doll-v2';
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
    /* migrate v1 (flat cfg) */
    const old = localStorage.getItem('trepio-doll-v1');
    if (old) {
      const cfg = JSON.parse(old);
      return { character: 'trixie', cfgs: { trixie: cfg } };
    }
  } catch { /* ignore */ }
  return { character: 'trixie', cfgs: {} };
}
const state = loadState();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
function cfgFor(id) {
  const ch = CHARACTERS.find((c) => c.id === id);
  return { ...ch.cfg, ...(state.cfgs[id] || {}),
           gender: ch.gender,
           accessories: { ...ch.cfg.accessories, ...((state.cfgs[id] || {}).accessories || {}) } };
}

/* ------------------------------------------------------------------ */
/* Renderer / scene                                                    */
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

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 260);

/* lights */
scene.add(new THREE.HemisphereLight(0xfff4ec, 0xffd9e6, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 2.3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -18; key.shadow.camera.right = 18;
key.shadow.camera.top = 18;  key.shadow.camera.bottom = -18;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 60;
key.shadow.bias = -0.0008;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xffc4e0, 1.1);
rim.position.set(-3, 2.2, -2.4);
scene.add(rim);

/* backgrounds & fog per mode */
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
const studioBg = bgTexture('#ffeaf3', '#ffd2a6');
const worldBg = bgTexture('#bfe6ff', '#ffd9e6');
const studioFog = new THREE.Fog(0xffd2a6, 9, 16);
const worldFog = new THREE.Fog(0xffd9e6, 45, 130);

/* ------------------------------------------------------------------ */
/* Studio (dress-up stage)                                             */
/* ------------------------------------------------------------------ */
const studioGroup = new THREE.Group();
scene.add(studioGroup);
{
  const platMat = new THREE.MeshStandardMaterial({ color: '#ffd9e6', roughness: 0.8 });
  const platTopMat = new THREE.MeshStandardMaterial({ color: '#fff0f6', roughness: 0.75 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#f3c14b', metalness: 0.75, roughness: 0.28 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.18, 0.14, 64), platMat);
  platform.position.y = -0.07;
  platform.receiveShadow = true;
  studioGroup.add(platform);
  const platTop = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.022, 64), platTopMat);
  platTop.position.y = 0.006;
  platTop.receiveShadow = true;
  studioGroup.add(platTop);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.022, 12, 72), goldMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.005;
  studioGroup.add(ring);

  /* studio sparkles */
  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  function studioSparkles(count, size, color) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 2.2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.2 + Math.random() * 2.8;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size, map: dot, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(color),
    }));
  }
  const sparkA = studioSparkles(120, 0.05, '#ffffff');
  const sparkB = studioSparkles(60, 0.09, '#fff2c9');
  studioGroup.add(sparkA, sparkB);
  studioGroup.userData.update = (dt, t) => {
    sparkA.rotation.y += dt * (0.05 + 0.25 * (game.danceT > 0 ? 1 : 0));
    sparkB.rotation.y -= dt * 0.04;
    sparkA.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.1);
    sparkB.material.opacity = 0.45 + 0.3 * Math.sin(t * 1.7 + 2);
  };
}
scene.background = studioBg;
scene.fog = studioFog;

/* ------------------------------------------------------------------ */
/* World + effects + audio + input                                     */
/* ------------------------------------------------------------------ */
const world = createWorld(scene, key);
const effects = createEffects(scene);
const music = new Beatbox();
const input = createInput(canvas);

/* ------------------------------------------------------------------ */
/* Player doll                                                         */
/* ------------------------------------------------------------------ */
let currentChar = CHARACTERS.find((c) => c.id === state.character) || CHARACTERS[0];
let playerCfg = cfgFor(currentChar.id);
let player = createDoll(playerCfg);
studioGroup.add(player.group);
player.group.position.y = 0.01;

function rebuildPlayer(id) {
  const parent = player.group.parent;
  player.dispose();
  parent.remove(player.group);
  currentChar = CHARACTERS.find((c) => c.id === id);
  playerCfg = cfgFor(id);
  player = createDoll(playerCfg);
  parent.add(player.group);
  if (state.mode === 'world') {
    player.group.position.copy(world.spawn);
    player.group.rotation.y = Math.PI;
  } else {
    player.group.position.y = 0.01;
  }
  state.character = id;
  rebuildNpcs();
  buildWardrobePanel();
  updateHud();
  save();
}

/* ------------------------------------------------------------------ */
/* NPC dolls wandering the world — every character except the player   */
/* ------------------------------------------------------------------ */
let npcs = [];
function rebuildNpcs() {
  for (const n of npcs) {
    n.doll.dispose();
    world.group.remove(n.doll.group);
  }
  npcs = [];
  const others = CHARACTERS.filter((c) => c.id !== currentChar.id);
  others.forEach((ch, i) => {
    const doll = createDoll(cfgFor(ch.id));
    let p = null;
    for (let k = 0; k < 30 && !p; k++) {
      const a = (i / others.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const r = 24 + Math.random() * 8;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 22.5 && Math.abs(z) < 22.5) continue;   /* off the maze island */
      if (z > 27 && z < 37) continue;                             /* off the river */
      p = new THREE.Vector3(x, 0, z);
    }
    if (!p) p = new THREE.Vector3(24, 0, 24);
    doll.group.position.copy(p);
    doll.group.rotation.y = Math.random() * Math.PI * 2;
    world.group.add(doll.group);
    npcs.push({
      doll, ch,
      state: 'idle',
      timer: 1 + Math.random() * 3,
      target: p.clone(),
      speed: 2.2 + Math.random() * 1.2,
      waveTimer: 0.5 + Math.random() * 3,
    });
  });
}
function pickNpcTarget(n) {
  for (let k = 0; k < 20; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = 23 + Math.random() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 22.5 && Math.abs(z) < 22.5) continue;   // off the maze island
    if (z > 27) continue;                                      // stay south of the river
    n.target.set(x, 0, z);
    return;
  }
  n.target.set(0, 0, 26);
}

/* ------------------------------------------------------------------ */
/* Camera controller                                                   */
/* ------------------------------------------------------------------ */
const cam = {
  yaw: 0, pitch: 0.5, dist: 6,
  target: new THREE.Vector3(0, 0.85, 0),
  lastUser: -10,
};
input.onDrag((dx, dy) => {
  cam.yaw -= dx * 0.005;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.004, 0.12, 1.15);
  cam.lastUser = performance.now() / 1000;
});
input.onZoom((dz) => {
  cam.dist = THREE.MathUtils.clamp(cam.dist + dz, 2.6, 14);
});
const _camDesired = new THREE.Vector3();
function updateCamera(dt, auto) {
  if (auto && performance.now() / 1000 - cam.lastUser > 4) cam.yaw += dt * 0.12;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  _camDesired.set(
    cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
    cam.target.y + sp * cam.dist,
    cam.target.z + Math.cos(cam.yaw) * cp * cam.dist
  );
  const k = 1 - Math.exp(-8 * dt);
  camera.position.lerp(_camDesired, k);
  camera.lookAt(cam.target);
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const titleEl = $('title'), hudEl = $('hud'), panelEl = $('panel'), actionbarEl = $('actionbar');
const joyEl = $('joy'), toastEl = $('toast');
const charRowEl = $('charRow'), charInfoEl = $('charInfo');

let toastTimer = null;
function toast(msg, ms = 2600) {
  toastEl.innerHTML = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

/* character chips */
const charBtns = CHARACTERS.map((c) => {
  const b = document.createElement('button');
  b.className = 'charchip';
  b.innerHTML = `<span class="ce">${c.emoji}</span><span>${c.name}</span>`;
  b.addEventListener('click', () => selectCharacter(c.id));
  charRowEl.appendChild(b);
  return { b, id: c.id };
});
function renderCharInfo() {
  const c = currentChar;
  const bar = (v, max) => `<div class="bar"><i style="width:${Math.round(100 * Math.min(1, v / max))}%"></i></div>`;
  charInfoEl.innerHTML = `
    <div class="ci-name">${c.emoji} ${c.name} <span class="ci-title">· ${c.title}</span></div>
    <div class="ci-blurb">${c.blurb}</div>
    <div class="ci-stats">
      <div><label>Speed</label>${bar(c.speed, 7)}</div>
      <div><label>Jump</label>${bar(c.jump, 6)}</div>
    </div>`;
}
function selectCharacter(id) {
  if (id === currentChar.id) return;
  rebuildPlayer(id);
  renderCharInfo();
  syncCharChips();
  updateHud();
}
function syncCharChips() {
  for (const { b, id } of charBtns) b.classList.toggle('on', id === currentChar.id);
}
syncCharChips();
renderCharInfo();

/* ---------------- wardrobe panel (studio, gender-aware) ---------------- */
const uiSync = [];
let TABS = [];
let activeTab = 'hair';
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
function persistCfg() {
  state.cfgs[currentChar.id] = JSON.parse(JSON.stringify(player.cfg));
  save();
}
function buildWardrobePanel() {
  uiSync.length = 0;
  TABS = [];
  panelEl.innerHTML = '';
  const male = !!player.male;
  const hairstyles = male ? MALE_HAIRSTYLES : HAIRSTYLES;
  const outfits = male ? MALE_OUTFITS : OUTFITS;
  const accList = male ? MALE_ACCESSORIES : ACCESSORIES;
  const bottomLabel = male ? 'Trousers' : 'Skirt &amp; accents';
  TABS = [
    { id: 'hair', label: male ? '💈 Hair' : '💈 Hair', build: () => container(
        groupLabel('Style'), chips(hairstyles, () => player.cfg.hair, (v) => { player.cfg.hair = v; player.buildHair(); persistCfg(); }),
        groupLabel('Color'), swatches(HAIRC, () => player.cfg.hairColor, (v) => { player.cfg.hairColor = v; player.mats.hairMat.color.set(v); persistCfg(); })) },
    { id: 'outfit', label: male ? '🤴 Outfit' : '👗 Outfit', build: () => container(
        groupLabel('Style'), chips(outfits, () => player.cfg.outfit, (v) => { player.cfg.outfit = v; player.buildBottom(); persistCfg(); }),
        groupLabel('Top'), swatches(CLOTH, () => player.cfg.top, (v) => { player.cfg.top = v; player.mats.topMat.color.set(v); persistCfg(); }),
        groupLabel(bottomLabel), swatches(CLOTH, () => player.cfg.skirt, (v) => { player.cfg.skirt = v; player.mats.skirtMat.color.set(v); player.mats.accentMat.color.set(v); persistCfg(); })) },
    { id: 'beauty', label: '💄 Beauty', build: () => container(
        groupLabel('Skin tone'), swatches(SKINS, () => player.cfg.skin, (v) => { player.cfg.skin = v; player.mats.skinMat.color.set(v); persistCfg(); }),
        groupLabel('Eyes'), swatches(EYES, () => player.cfg.eyes, (v) => { player.cfg.eyes = v; player.mats.pupilMat.color.set(v); persistCfg(); })) },
    { id: 'shoes', label: '👟 Shoes', build: () => container(
        groupLabel('Style'), chips(SHOESTYLES, () => player.cfg.shoes, (v) => { player.cfg.shoes = v; player.buildShoes(); persistCfg(); }),
        groupLabel('Color'), swatches(SHOEC, () => player.cfg.shoeColor, (v) => { player.cfg.shoeColor = v; player.mats.shoeMat.color.set(v); persistCfg(); })) },
    { id: 'extras', label: '✨ Extras', build: () => {
        const chipsWrap = el('div', 'chips');
        const btns = accList.map((a) => {
          const b = el('button', 'chip', a.label);
          b.addEventListener('click', () => { player.setAccessory(a.id, !player.cfg.accessories[a.id]); persistCfg(); syncUI(); });
          chipsWrap.appendChild(b);
          return { b, id: a.id };
        });
        uiSync.push(() => { for (const { b, id } of btns) b.classList.toggle('on', !!player.cfg.accessories[id]); });
        return container(groupLabel('Accessories'), chipsWrap);
      } },
  ];
  if (!TABS.find((t) => t.id === activeTab)) activeTab = 'hair';
  const tabsBar = el('div');
  tabsBar.id = 'tabs';
  panelEl.appendChild(tabsBar);
  for (const t of TABS) {
    const btn = el('button', 'tab', t.label);
    btn.addEventListener('click', () => { activeTab = t.id; syncUI(); });
    btn.dataset.tab = t.id;
    tabsBar.appendChild(btn);
    const pane = t.build();
    pane.className = 'tabpane';
    pane.dataset.pane = t.id;
    panelEl.appendChild(pane);
    t.pane = pane;
    t.btn = btn;
  }
  syncUI();
}
function syncUI() {
  for (const t of TABS) {
    t.btn.classList.toggle('on', t.id === activeTab);
    t.pane.classList.toggle('on', t.id === activeTab);
  }
  for (const f of uiSync) f();
}
buildWardrobePanel();

/* ------------------------------------------------------------------ */
/* Modes                                                               */
/* ------------------------------------------------------------------ */
const game = {
  mode: 'studio',
  danceT: 0,
  spinT: 0,
  vy: 0,
  grounded: true,
  walk01: 0,
};
function enterWorld() {
  game.mode = 'world';
  state.mode = 'world';
  titleEl.classList.add('hidden');
  panelEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  actionbarEl.classList.remove('hidden');
  if (isTouch) joyEl.classList.add('show');
  document.body.classList.add('mode-world');

  studioGroup.visible = false;
  world.group.visible = true;
  scene.background = worldBg;
  scene.fog = worldFog;

  worldGroupOf(player).add(player.group);
  player.group.position.copy(world.spawn);
  player.group.position.y = 0;
  player.group.rotation.y = Math.PI;
  game.vy = 0;
  game.walk01 = 0;

  cam.target.set(world.spawn.x, 1.1, world.spawn.z);
  cam.yaw = 0; cam.pitch = 0.5; cam.dist = 6.5;
  camera.position.set(world.spawn.x, 4, world.spawn.z + 7);

  if (music.ctx) music.start('ambient');
  updateHud();
  toast(`${currentChar.emoji} <b>${currentChar.name}</b> enters Candy World!<br><small>WASD / joystick to move · find the Star Candy in the maze</small>`, 4200);
  effects.spawnHearts(3, world.spawn);
  save();
}
function enterStudio() {
  game.mode = 'studio';
  state.mode = 'studio';
  titleEl.classList.remove('hidden');
  panelEl.classList.remove('hidden');
  hudEl.classList.add('hidden');
  actionbarEl.classList.add('hidden');
  joyEl.classList.remove('show');
  document.body.classList.remove('mode-world');
  game.danceT = 0;
  music.start('ambient');

  world.group.visible = false;
  studioGroup.visible = true;
  scene.background = studioBg;
  scene.fog = studioFog;

  studioGroup.add(player.group);
  player.group.position.set(0, 0.01, 0);
  player.group.rotation.y = 0;
  cam.target.set(0, 0.85, 0);
  cam.yaw = 0.35; cam.pitch = 0.42; cam.dist = 3.4;
  camera.position.set(1.2, 2.2, 3.2);
  save();
}
function worldGroupOf(dollApi) { return world.group; }

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function updateHud() {
  $('hudName').innerHTML = `${currentChar.emoji} ${currentChar.name}
    <small>${currentChar.title} · speed ${currentChar.speed.toFixed(1)} · jump ${currentChar.jump.toFixed(1)}</small>`;
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
$('btnEnter').addEventListener('click', enterWorld);
$('btnHome').addEventListener('click', enterStudio);
$('btnCustomize').addEventListener('click', () => {
  panelEl.classList.toggle('hidden');
});
$('btnDance').addEventListener('click', () => {
  if (game.danceT > 0) {
    game.danceT = 0;
    music.start('ambient');
    $('btnDance').classList.remove('on');
  } else {
    game.danceT = 6;
    music.start('dance');
    $('btnDance').classList.add('on');
    effects.spawnConfetti(30, player.group.position);
  }
});
$('btnWave').addEventListener('click', () => {
  player.wave();
  effects.spawnHearts(2, player.group.position);
});
$('btnSpin').addEventListener('click', () => { game.spinT = 1.6; });
$('btnJump').addEventListener('click', () => input.queueJump());
$('btnMute').addEventListener('click', (e) => {
  music.setMuted(!music.muted);
  e.currentTarget.textContent = music.muted ? '🔇' : '🔊';
});

/* keyboard shortcuts */
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyE') { player.wave(); effects.spawnHearts(2, player.group.position); }
  if (e.code === 'KeyR') $('btnDance').click();
  if (e.code === 'KeyF') game.spinT = 1.6;
  if (e.code === 'KeyM') $('btnMute').click();
  if (e.code === 'KeyH' && game.mode === 'world') enterStudio();
});

/* browsers block audio until the first user gesture */
const kickstartMusic = () => {
  if (game.mode === 'world' && !music.playing) music.start('ambient');
};
window.addEventListener('pointerdown', kickstartMusic);
window.addEventListener('keydown', kickstartMusic);

/* ------------------------------------------------------------------ */
/* Movement & collision                                                */
/* ------------------------------------------------------------------ */
const PLAYER_R = 0.34;
const GRAVITY = 14;
const _move = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function resolveCollisions(p, r) {
  for (const b of world.boxes) {
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
  for (const c of world.circles) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const rr = c.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x = c.x + (dx / d) * rr;
      p.z = c.z + (dz / d) * rr;
    }
  }
  const bd = Math.hypot(p.x, p.z);
  if (bd > world.R_BOUND - 1) {
    p.x = (p.x / bd) * (world.R_BOUND - 1);
    p.z = (p.z / bd) * (world.R_BOUND - 1);
  }
}

function updatePlayer(dt, t) {
  const p = player.group.position;
  const ax = input.axis();
  const running = input.running();

  if (ax.len > 0.08 && game.danceT <= 0) {
    const speed = currentChar.speed * (running ? 1.45 : 1) * (0.45 + 0.55 * ax.len);
    _fwd.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    _right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    _move.set(0, 0, 0)
      .addScaledVector(_fwd, ax.y)
      .addScaledVector(_right, ax.x);
    if (_move.lengthSq() > 0) {
      _move.normalize().multiplyScalar(speed);
      p.x += _move.x * dt;
      p.z += _move.z * dt;
      if (game.spinT <= 0) {
        player.group.rotation.y = lerpAngle(player.group.rotation.y, Math.atan2(_move.x, _move.z), Math.min(1, dt * 12));
      }
    }
    game.walk01 = THREE.MathUtils.lerp(game.walk01, Math.min(1, ax.len * (running ? 1.15 : 0.9)), Math.min(1, dt * 8));
  } else {
    game.walk01 = THREE.MathUtils.lerp(game.walk01, 0, Math.min(1, dt * 10));
  }

  /* jump */
  if (input.consumeJump() && game.grounded) {
    game.vy = currentChar.jump;
    game.grounded = false;
    player.boing();
  }
  if (!game.grounded) {
    game.vy -= GRAVITY * dt;
    p.y += game.vy * dt;
    if (p.y <= 0) { p.y = 0; game.vy = 0; game.grounded = true; }
  } else {
    p.y = 0;
  }

  resolveCollisions(p, PLAYER_R);

  /* spin emote */
  if (game.spinT > 0) {
    game.spinT = Math.max(0, game.spinT - dt);
    player.group.rotation.y += dt * 10 * Math.min(1, game.spinT * 2);
  }

  /* dance timer */
  if (game.danceT > 0) {
    game.danceT -= dt;
    if (game.danceT <= 0) {
      music.start('ambient');
      $('btnDance').classList.remove('on');
    }
  }

  /* gem pickup */
  if (world.gemActive) {
    const gp = world.gem.position;
    const dx = p.x - gp.x, dz = p.z - gp.z;
    if (dx * dx + dz * dz < 1.3 * 1.3 && Math.abs(p.y + 1.2 - gp.y) < 2) {
      world.collectGem();
      effects.spawnConfetti(40, gp);
      effects.spawnHearts(6, p);
      toast('⭐ You found the <b>Star Candy</b>! It will reappear soon…', 3600);
    }
  }
}

function updateNpc(n, dt, t) {
  const p = n.doll.group.position;
  const toPlayer = new THREE.Vector3().subVectors(player.group.position, p);
  const distToPlayer = toPlayer.length();

  if (distToPlayer < 3 && game.mode === 'world') {
    /* greet the player */
    n.state = 'greet';
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(toPlayer.x, toPlayer.z), Math.min(1, dt * 6));
    n.waveTimer -= dt;
    if (n.waveTimer <= 0) {
      n.doll.wave();
      n.waveTimer = 4 + Math.random() * 4;
      if (Math.random() < 0.4) effects.spawnHearts(1, p);
    }
    n.doll.update({ walk01: 0, dance01: 0, beatPhase: music.beatPhase() }, dt, t);
    return;
  }

  if (n.state === 'idle') {
    n.timer -= dt;
    if (n.timer <= 0) {
      pickNpcTarget(n);
      n.state = 'walk';
    }
  } else {
    const dir = new THREE.Vector3().subVectors(n.target, p);
    dir.y = 0;
    const d = dir.length();
    if (d < 0.6) {
      n.state = 'idle';
      n.timer = 1.5 + Math.random() * 3.5;
    } else {
      dir.multiplyScalar((n.speed * dt) / d);
      p.x += dir.x;
      p.z += dir.z;
      n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dir.x, dir.z), Math.min(1, dt * 6));
    }
  }
  /* keep NPCs off props */
  resolveCollisions(p, 0.3);
  const bd = Math.hypot(p.x, p.z);
  if (bd > world.R_BOUND - 1.5) {
    n.target.set(0, 0, 26);
  }
  n.doll.update({ walk01: n.state === 'walk' ? 0.7 : 0, dance01: 0, beatPhase: music.beatPhase() }, dt, t);
}

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
const _lightTarget = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const beat = music.beatPhase();

  if (game.mode === 'studio') {
    studioGroup.rotation.y += dt * 0.12;
    if (studioGroup.userData.update) studioGroup.userData.update(dt, t);
    player.update({ walk01: 0, dance01: game.danceT > 0 ? 1 : 0, beatPhase: beat }, dt, t);
    if (game.danceT > 0) {
      game.danceT -= dt;
      if (game.danceT <= 0) { music.start('ambient'); $('btnDance').classList.remove('on'); }
    }
    cam.target.set(0, 0.85, 0);
    updateCamera(dt, true);
    _lightTarget.set(0, 0.6, 0);
  } else {
    updatePlayer(dt, t);
    player.update({ walk01: game.walk01, dance01: game.danceT > 0 ? 1 : 0, beatPhase: beat }, dt, t);
    for (const n of npcs) updateNpc(n, dt, t);
    world.update(dt, t);
    cam.target.set(player.group.position.x, player.group.position.y + 1.1, player.group.position.z);
    updateCamera(dt, false);
    _lightTarget.copy(player.group.position);
  }

  /* key light follows the action for tight shadows */
  key.position.set(_lightTarget.x + 6, _lightTarget.y + 11, _lightTarget.z + 5);
  key.target.position.copy(_lightTarget);
  key.target.updateMatrixWorld();

  effects.update(dt, t);
  renderer.render(scene, camera);
}
animate();

/* resize */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.stop();
  else if (music.ctx) music.start();
});

/* restore last mode */
rebuildNpcs();
if (state.mode === 'world') enterWorld(); else enterStudio();

/* test hook (harmless in production) */
window.__trepio = {
  game, world, player, npcs, music,
  teleport(x, z) { player.group.position.set(x, 0, z); },
  state() {
    return {
      mode: game.mode,
      pos: player.group.position.toArray(),
      npcs: npcs.map((n) => n.doll.group.position.toArray()),
      npcNames: npcs.map((n) => n.ch.name),
      butterflies: world.butterflies.map((b) => [b.position.x, b.position.y, b.position.z]),
      gemActive: world.gemActive,
      gender: player.male ? 'male' : 'female',
    };
  },
};
