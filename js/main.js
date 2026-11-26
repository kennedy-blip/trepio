/* =====================================================================
   main.js — Trepio: The Living Fantasy Kingdom
   Modes, characters, camera, UI wiring and the main loop.
   Gameplay systems live in sibling modules:
     quests.js  npc.js  homes.js  minigames.js  inventory.js  pets.js
     save.js  collide.js  world.js  doll.js  effects.js  input.js  audio.js
   ===================================================================== */
import * as THREE from 'three';
import { createDoll, SKINS, HAIRC, CLOTH, EYES, SHOEC,
         HAIRSTYLES, OUTFITS, SHOESTYLES, ACCESSORIES,
         MALE_HAIRSTYLES, MALE_OUTFITS, MALE_ACCESSORIES } from './doll.js';
import { createWorld } from './world.js';
import { createEffects } from './effects.js';
import { Beatbox } from './audio.js';
import { createInput } from './input.js';
import { createProgress, LEVEL_XP } from './progress.js';
import { createPet, PETS } from './pets.js';
import { ctx, $ } from './ctx.js';
import * as saveMod from './save.js';
import { RACE_PAR, QUESTS, royalsMet, updateTracker, renderJournal, completeQuest, updateQuests, nameOf } from './quests.js';
import { SHOP, candyBalance, renderShop, buyItem } from './inventory.js';
import { startMini, cancelMini, updateMini } from './minigames.js';
import { npcs, royals, rebuildNpcs, buildRoyals, updateNpc, updateRoyal, nearestNpc, nearestRoyal,
         talkToNpc, closeDialogue, dialogueOpen, enterNpcHome, exitNpcHome } from './npc.js';
import { enterHome, leaveHome, nearestHomeDoor, hideAllInteriors, playerSit, getActiveHome } from './homes.js';
import { initQuality } from './quality.js';
import { lerpAngle, resolveWorldCollisions, resolveCastleCollisions, resolveBoxCircle } from './collide.js';

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */
const CHARACTERS = [
  {
    id: 'trixie', emoji: '👑', name: 'Trixie', title: 'Bubblegum Princess', gender: 'female',
    blurb: 'Sweet, sparkling and always first through the maze.',
    speed: 5.6, jump: 4.6,
    lines: ['The maze changes every time I visit!', 'Have you seen the castle up north? Simply royal.', 'Pink is always the right answer.'],
    cfg: { hair: 'buns', hairColor: '#d96a9c', skin: '#b5714f', eyes: '#5a3420',
      outfit: 'princess', top: '#ff8fb7', skirt: '#f45d8e',
      shoes: 'heels', shoeColor: '#f45d8e',
      accessories: { crown: true, bow: false, glasses: false, necklace: false, earrings: true } },
  },
  {
    id: 'momo', emoji: '🍫', name: 'Momo', title: 'Choco Scout', gender: 'female',
    blurb: 'Clever and cautious — maps every corridor before sprinting.',
    speed: 4.9, jump: 5.3,
    lines: ['The donut crossings are safest, trust me.', 'I heard a golden gummy went missing near the cream hills…', 'Chocolate river. Every. Single. Day.'],
    cfg: { hair: 'ponytail', hairColor: '#3a2a1e', skin: '#8d5524', eyes: '#3f7d4e',
      outfit: 'party', top: '#ff9e4f', skirt: '#8a5a3a',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: false, bow: false, glasses: true, necklace: false, earrings: false } },
  },
  {
    id: 'zuri', emoji: '🌿', name: 'Zuri', title: 'Mint Ranger', gender: 'female',
    blurb: 'Quick on her feet, quickest through the lollipop forest.',
    speed: 6.2, jump: 4.2,
    quest: { id: 'forestRamble', offer: 'Meet me by the giant lollipop in the north-west forest — it is my favourite spot!', active: 'Any luck? Head north-west, past the hills!', done: 'Best ramble ever! Told you the forest is magic.' },
    lines: ['Race you to the forest!', 'The butterflies follow me home sometimes.', 'Mint makes everything better.'],
    cfg: { hair: 'bob', hairColor: '#57b3c9', skin: '#dda273', eyes: '#2f6d8f',
      outfit: 'coord', top: '#4fc3ae', skirt: '#a7d97a',
      shoes: 'boots', shoeColor: '#4fc3ae',
      accessories: { crown: false, bow: true, glasses: false, necklace: false, earrings: false } },
  },
  {
    id: 'lulu', emoji: '🫐', name: 'Lulu', title: 'Berry Dreamer', gender: 'female',
    blurb: 'Dreamy and gentle — follows the scent of the chocolate river.',
    speed: 5.0, jump: 4.7,
    lines: ['I could watch the rainbow for hours…', 'The village houses look good enough to eat.', 'Someday I\'ll live in the castle.'],
    cfg: { hair: 'long', hairColor: '#8f6fd3', skin: '#654128', eyes: '#5a3420',
      outfit: 'gown', top: '#b57de0', skirt: '#8f9cf5',
      shoes: 'flats', shoeColor: '#b57de0',
      accessories: { crown: false, bow: false, glasses: false, necklace: true, earrings: true } },
  },
  {
    id: 'kiki', emoji: '💫', name: 'Kiki', title: 'Vanilla Comet', gender: 'female',
    blurb: 'The fastest doll in Candy World — catch her if you can!',
    speed: 6.5, jump: 5.6,
    lines: ['Bet you can\'t keep up!', 'Candy count: still counting!', 'Zoom zoom!'],
    cfg: { hair: 'short', hairColor: '#e8c268', skin: '#f9ddc4', eyes: '#8a5a3c',
      outfit: 'party', top: '#fff3f6', skirt: '#ffd45e',
      shoes: 'boots', shoeColor: '#d9a441',
      accessories: { crown: true, bow: true, glasses: false, necklace: false, earrings: true } },
  },
  {
    id: 'theo', emoji: '🤴', name: 'Theo', title: 'Cocoa Prince', gender: 'male',
    blurb: 'Bold and gallant — claims the candy castle is his by right.',
    speed: 5.4, jump: 4.8,
    quest: { id: 'princeFavor', offer: 'A task worthy of you: gather 8 candies and present them to me. You shall be rewarded.', active: 'Only {N} more candies — I shall be waiting, of course.', done: 'Magnificent! You have the favour of the prince.' },
    lines: ['That castle? Mine. Eventually.', 'A prince is never lost, merely scouting.', 'Have you paid your candy taxes?'],
    cfg: { hair: 'quiff', hairColor: '#3a2a1e', skin: '#8d5524', eyes: '#5a3420',
      outfit: 'mprince', top: '#ffd45e', skirt: '#63b8f5',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: true, bow: true, glasses: false } },
  },
  {
    id: 'amani', emoji: '🍀', name: 'Amani', title: 'Mint Explorer', gender: 'male',
    blurb: 'Charts every trail from the rainbow to the ice cream peaks.',
    speed: 5.1, jump: 5.2,
    quest: { id: 'peakSightseer', offer: 'I chart trails no one dares. Cross the river and gaze upon the ice cream peaks — then tell me what you see!', active: 'The peaks are north, across the chocolate river. Don\'t lick the donuts.', done: 'The peaks at sunset… you saw it too? Marvellous.' },
    lines: ['I\'m mapping a new route past the hills today.', 'The golden gummy story is TRUE, I tell you.', 'Nature, but make it candy.'],
    cfg: { hair: 'curly', hairColor: '#1a1410', skin: '#dda273', eyes: '#3f7d4e',
      outfit: 'explorer', top: '#a7d97a', skirt: '#4fc3ae',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: false, bow: false, glasses: true } },
  },
  {
    id: 'dex', emoji: '⚡', name: 'Dex', title: 'Lemon Bolt', gender: 'male',
    blurb: 'Fastest boy in the world — a yellow blur through the meadow.',
    speed: 6.4, jump: 5.5,
    lines: ['Was that too fast? Let me do it again.', 'Candies collected, on my way to a record!', 'Slow down? Never heard of it.'],
    cfg: { hair: 'sidepart', hairColor: '#e8c268', skin: '#f9ddc4', eyes: '#2f6d8f',
      outfit: 'sporty', top: '#ffd45e', skirt: '#fff3f6',
      shoes: 'flats', shoeColor: '#d9a441',
      accessories: { crown: false, bow: false, glasses: false } },
  },
  /* ---- the royal family (live in the castle, not player-selectable) ---- */
  {
    id: 'jamoh', emoji: '👑', name: 'Jamoh', title: 'King of Candy World', gender: 'male', royal: true,
    blurb: 'Wise and booming — ruler of the candy realm.',
    speed: 4.2, jump: 3.8,
    quest: { id: 'royalDecree', offer: 'By royal decree! My family has gathered in this palace — meet the Queen, my son Ken, and the three princesses. Earn the crown\'s trust!', active: 'You have met {N} of my 5 family members. They are all inside the palace.', done: 'Splendid! You know my whole family now. You are truly a friend of the crown.' },
    lines: ['The realm is sweeter than ever this season.', 'My throne? Comfortable. My duties? Endless.', 'A ruler is only as sweet as his kingdom.'],
    cfg: { hair: 'quiff', hairColor: '#c9c2b8', skin: '#8d5524', eyes: '#5a3420',
      outfit: 'mprince', top: '#ffd45e', skirt: '#8a2f4f',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: true, bow: false, glasses: false } },
  },
  {
    id: 'dama', emoji: '💐', name: 'Dama', title: 'Queen of Candy World', gender: 'female', royal: true,
    blurb: 'Warm and watchful — the heart of the palace.',
    speed: 4.4, jump: 3.9,
    quest: { id: 'queensGame', offer: 'Deary, the Candy Catch arcade in the village delights me so. Score 10 or better and I shall reward you handsomely!', active: 'The candy-catching machine by the village — 10 catches, that is all I ask. Your best so far: {N}.', done: 'Oh, marvellous reflexes! You have made the Queen very proud.' },
    lines: ['The princesses tire me out, but I would not trade them for all the gumdrops.', 'Jamoh snores like a boiling kettle.', 'Did you eat today? The cooks worry.'],
    cfg: { hair: 'long', hairColor: '#d9a441', skin: '#b5714f', eyes: '#5a3420',
      outfit: 'gown', top: '#f2b8d0', skirt: '#d96a9c',
      shoes: 'flats', shoeColor: '#d9a441',
      accessories: { crown: true, bow: false, glasses: false, necklace: true, earrings: true } },
  },
  {
    id: 'ken', emoji: '🤴', name: 'Ken', title: 'Crown Prince', gender: 'male', royal: true,
    blurb: 'The oldest brother — brave, competitive, always training.',
    speed: 6.0, jump: 5.0,
    quest: { id: 'ringChampion', offer: 'The Gummy Rush race — six golden rings across the realm. Beat the par time and you will have my respect. And candies.', active: 'Run the Gummy Rush at the blue kiosk. Par is {PAR} seconds — your best: {N}.', done: 'A true champion! Perhaps one day you will race me for the crown.' },
    lines: ['I train every morning. Sword, sprint, sweets.', 'Bleso hid my boots again. Little gremlin.', 'Father says I will make a fine king. I say: obviously.'],
    cfg: { hair: 'quiff', hairColor: '#3a2a1e', skin: '#8d5524', eyes: '#2f6d8f',
      outfit: 'mprince', top: '#63b8f5', skirt: '#33304a',
      shoes: 'boots', shoeColor: '#33304a',
      accessories: { crown: true, bow: false, glasses: false } },
  },
  {
    id: 'fay', emoji: '🌸', name: 'Fay', title: 'Princess of Blossoms', gender: 'female', royal: true,
    blurb: 'The eldest princess — bubbly, glittery, always at her vanity.',
    speed: 5.2, jump: 4.4,
    lines: ['Do you like my bow? I made it myself!', 'The fountain in the west wing is the best spot for thinking.', 'Whitney reads TOO much. Books, books, books.'],
    cfg: { hair: 'buns', hairColor: '#ff8fb7', skin: '#f9ddc4', eyes: '#8a5a3c',
      outfit: 'party', top: '#ffb3cd', skirt: '#f45d8e',
      shoes: 'flats', shoeColor: '#ff8fb7',
      accessories: { crown: true, bow: true, glasses: false, necklace: false, earrings: true } },
  },
  {
    id: 'whitney', emoji: '📚', name: 'Whitney', title: 'Princess of Stories', gender: 'female', royal: true,
    blurb: 'The bookish princess — quiet, clever, always near a shelf.',
    speed: 4.8, jump: 4.2,
    lines: ['Did you know the maze regrows its walls every night? It is in my book.', 'Shhh… I am at the good part.', 'The royal library has two hundred books. I have read them twice.'],
    cfg: { hair: 'ponytail', hairColor: '#4a3b2a', skin: '#dda273', eyes: '#5a3420',
      outfit: 'coord', top: '#b57de0', skirt: '#8f6fd3',
      shoes: 'boots', shoeColor: '#8f6fd3',
      accessories: { crown: true, bow: false, glasses: true, necklace: false, earrings: false } },
  },
  {
    id: 'bleso', emoji: '🍬', name: 'Bleso', title: 'Littlest Princess', gender: 'female', royal: true,
    blurb: 'The youngest — a tiny mischief-maker with sticky fingers.',
    speed: 5.8, jump: 4.9,
    lines: ['I put a frog in Ken\'s boot. Hehe.', 'The royal vault? I know where the key is. But I am not telling!', 'Race you to the fountain! Last one there does the dishes!'],
    cfg: { hair: 'bob', hairColor: '#1a1410', skin: '#b5714f', eyes: '#3f7d4e',
      outfit: 'party', top: '#ffd45e', skirt: '#a7d97a',
      shoes: 'flats', shoeColor: '#ff8fb7',
      accessories: { crown: true, bow: true, glasses: false, necklace: false, earrings: false } },
  },
];

/* ------------------------------------------------------------------ */
/* State / save                                                        */
/* ------------------------------------------------------------------ */
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const state = saveMod.load(reducedMotion);
const save = saveMod.save;

const progress = createProgress(state.progress);

function cfgFor(id) {
  const ch = CHARACTERS.find((c) => c.id === id);
  return { ...ch.cfg, ...(state.cfgs[id] || {}),
           gender: ch.gender,
           accessories: { ...ch.cfg.accessories, ...((state.cfgs[id] || {}).accessories || {}) } };
}

const effectsOn = () => !!state.settings.effects;

/* ------------------------------------------------------------------ */
/* Renderer / scene                                                    */
/* ------------------------------------------------------------------ */
const canvas = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch });
} catch (e) {
  document.getElementById('fallback').hidden = false;
  throw e;
}
/* device-aware quality: lower caps on touch devices */
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = !!state.settings.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 260);

scene.add(new THREE.HemisphereLight(0xfff4ec, 0xffd9e6, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 2.3);
key.castShadow = !!state.settings.shadows;
key.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
key.shadow.camera.left = -18; key.shadow.camera.right = 18;
key.shadow.camera.top = 18;  key.shadow.camera.bottom = -18;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 60;
key.shadow.bias = -0.0008;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xffc4e0, 1.1);
rim.position.set(-3, 2.2, -2.4);
scene.add(rim);

function bgTexture(top, bot) {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const g = c.getContext('2d').createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.62, bot);
  g.addColorStop(1, bot);
  const ctx2 = c.getContext('2d');
  ctx2.fillStyle = g;
  ctx2.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const studioBg = bgTexture('#ffeaf3', '#ffd2a6');
const worldBg = bgTexture('#bfe6ff', '#ffd9e6');
const studioFog = new THREE.Fog(0xffd2a6, 9, 16);
const worldFog = new THREE.Fog(0xffd9e6, 45, 130);
const castleFog = new THREE.Fog(0xf6c7d9, 14, 30);

/* ------------------------------------------------------------------ */
/* Studio stage                                                        */
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

  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx2 = c.getContext('2d');
    const g = ctx2.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(32, 32, 30, 0, Math.PI * 2);
    ctx2.fill();
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
/* World / effects / audio / input                                     */
/* ------------------------------------------------------------------ */
const world = createWorld(scene, key);
const effects = createEffects(scene);
const music = new Beatbox();
music.muted = !state.settings.music;
const input = createInput(canvas);

/* permanently collected candies (from save) */
for (const c of world.candies) {
  if (state.progress.collected[c.id]) {
    c.active = false;
    c.obj.visible = false;
  }
}

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */
let currentChar = CHARACTERS.find((c) => c.id === state.character) || CHARACTERS[0];
let playerCfg = cfgFor(currentChar.id);
let player = createDoll(playerCfg);
studioGroup.add(player.group);
player.group.position.set(0, 0.01, 0);

function rebuildPlayer(id) {
  const parent = player.group.parent;
  player.dispose();
  parent.remove(player.group);
  currentChar = CHARACTERS.find((c) => c.id === id);
  playerCfg = cfgFor(id);
  player = createDoll(playerCfg);
  parent.add(player.group);
  if (game.mode === 'world') {
    player.group.position.copy(world.spawn);
    player.group.rotation.y = Math.PI;
  } else if (game.mode === 'castle') {
    player.group.position.set(0, 0, 8.2);
    player.group.rotation.y = Math.PI;
  } else {
    player.group.position.y = 0.01;
  }
  ctx.player = player;
  ctx.currentChar = currentChar;
  state.character = id;
  rebuildNpcs();
  buildWardrobePanel();
  updateHud();
  save();
}

/* ------------------------------------------------------------------ */
/* Game state + shared context                                         */
/* ------------------------------------------------------------------ */
const game = {
  mode: 'studio',
  danceT: 0,
  spinT: 0,
  vy: 0,
  grounded: true,
  walk01: 0,
  doorHintShown: false,
  chestHintShown: false,
  trailTimer: 0,
  mini: null,
};

ctx.CHARACTERS = CHARACTERS;
ctx.state = state;
ctx.progress = progress;
ctx.save = save;
ctx.isTouch = isTouch;
ctx.scene = scene;
ctx.camera = camera;
ctx.view = { studioBg, worldBg, studioFog, worldFog, castleFog };
ctx.world = world;
ctx.effects = effects;
ctx.music = music;
ctx.game = game;
ctx.player = player;
ctx.currentChar = currentChar;
ctx.cfgFor = cfgFor;
ctx.quests = { QUESTS, royalsMet, updateTracker, renderJournal, completeQuest };
ctx.inventory = { SHOP, candyBalance, renderShop, buyItem };
ctx.minigames = { startMini, cancelMini, updateMini };
ctx.homes = { getActiveHome, enterHome, leaveHome, nearestHomeDoor, playerSit };
ctx.pet = { setPet: (id) => setPet(id), reparentPet };

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */
const cam = {
  yaw: 0, pitch: 0.5, dist: 6,
  target: new THREE.Vector3(0, 0.85, 0),
  lastUser: -10,
};
ctx.cam = cam;
input.onDrag((dx, dy) => {
  cam.yaw -= dx * 0.005;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.004, 0.12, 1.15);
  cam.lastUser = performance.now() / 1000;
});
input.onZoom((dz) => {
  cam.dist = THREE.MathUtils.clamp(cam.dist + dz, 2.6, (game.mode === 'castle' || game.mode === 'house') ? 5.5 : 14);
});
const _camDesired = new THREE.Vector3();
function updateCamera(dt, auto) {
  if (auto && !reducedMotion && performance.now() / 1000 - cam.lastUser > 4) cam.yaw += dt * 0.12;
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
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */
const titleEl = $('title'), hudEl = $('hud'), panelEl = $('panel'), actionbarEl = $('actionbar');
const joyEl = $('joy'), toastEl = $('toast'), statsEl = $('stats'), trackerEl = $('tracker');
const dialogueEl = $('dialogue'), settingsEl = $('settings'), loadingEl = $('loading');
const journalEl = $('journal'), shopEl = $('shop');
const charRowEl = $('charRow'), charInfoEl = $('charInfo');

ctx.ui = { toast, updateStats, renderCharInfo, buildWardrobePanel, effectsOn, updateHud };

let toastTimer = null;
function toast(msg, ms = 2600) {
  toastEl.innerHTML = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function updateStats() {
  const next = LEVEL_XP[progress.level] || null;
  statsEl.innerHTML = `Lv ${progress.level} <small>· ✨ ${progress.xp}${next ? '/' + next : ''} · 🍬 ${candyBalance()}</small>`;
}
function updateHud() {
  $('hudName').innerHTML = `${currentChar.emoji} ${currentChar.name}
    <small>${currentChar.title} · speed ${currentChar.speed.toFixed(1)} · jump ${currentChar.jump.toFixed(1)}</small>`;
}

progress.on('levelup', (lv) => {
  toast(`🎉 Level ${lv}! New wardrobe items unlocked`, 3400);
  if (effectsOn()) effects.spawnConfetti(26, player.group.position);
  buildWardrobePanel();
});
progress.on('candy', () => { updateStats(); renderShop(); });
progress.on('quest', () => { updateTracker(); save(); });

/* ------------------------------------------------------------------ */
/* Character chips                                                     */
/* ------------------------------------------------------------------ */
const charBtns = CHARACTERS.filter((c) => !c.royal).map((c) => {
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
    </div>
    <div class="ci-prog">🍬 Level ${progress.level} · ${candyBalance()} candies · ${QUESTS.filter((q) => progress.isQuestDone(q.id)).length}/${QUESTS.length} quests</div>`;
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

/* ------------------------------------------------------------------ */
/* Wardrobe (gender-aware, level & boutique gating)                    */
/* ------------------------------------------------------------------ */
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
/* lock info: shop items need purchase; level items need level (or purchase) */
function lockInfo(o) {
  if (o.shop && !state.purchases[o.id]) return { label: `🛍️ ${o.shop} candies`, toast: `🛍️ Buy this in the <b>Candy Boutique</b>!` };
  if (o.locked && progress.level < o.locked && !state.purchases[o.id]) return { label: `🔒 Lv ${o.locked}`, toast: `🔒 Reach <b>level ${o.locked}</b> — or buy it in the boutique!` };
  return null;
}
function chips(list, get, set) {
  const wrap = el('div', 'chips');
  const btns = list.map((o) => {
    const li = lockInfo(o);
    const b = el('button', 'chip', li ? `${o.label}<small>${li.label}</small>` : o.label);
    if (li) b.classList.add('locked');
    b.addEventListener('click', () => {
      if (lockInfo(o)) { toast(lockInfo(o).toast, 2400); return; }
      set(o.id);
      save();
      syncUI();
    });
    wrap.appendChild(b);
    return { b, o };
  });
  uiSync.push(() => {
    for (const { b, o } of btns) {
      b.classList.toggle('on', !lockInfo(o) && get() === o.id);
    }
  });
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
    { id: 'hair', label: '💈 Hair', build: () => container(
        groupLabel('Style'), chips(hairstyles, () => player.cfg.hair, (v) => { player.cfg.hair = v; player.buildHair(); persistCfg(); }),
        groupLabel('Color'), swatches(HAIRC, () => player.cfg.hairColor, (v) => { player.cfg.hairColor = v; player.mats.hairMat.color.set(v); persistCfg(); })) },
    { id: 'outfit', label: male ? '🤴 Outfit' : '👗 Outfit', build: () => container(
        groupLabel('Style'), chips(outfits, () => player.cfg.outfit, (v) => { player.cfg.outfit = v; player.buildBottom(); persistCfg(); }),
        groupLabel('Top'), swatches(CLOTH, () => player.cfg.top, (v) => { player.cfg.top = v; player.mats.topMat.color.set(v); persistCfg(); }),
        groupLabel(bottomLabel), swatches(CLOTH, () => player.cfg.skirt, (v) => { player.cfg.skirt = v; if (!['rainbow', 'star', 'candycane'].includes(player.cfg.outfit)) player.mats.skirtMat.color.set(v); player.mats.accentMat.color.set(v); persistCfg(); })) },
    { id: 'beauty', label: '💄 Beauty', build: () => container(
        groupLabel('Skin tone'), swatches(SKINS, () => player.cfg.skin, (v) => { player.cfg.skin = v; player.mats.skinMat.color.set(v); persistCfg(); }),
        groupLabel('Eyes'), swatches(EYES, () => player.cfg.eyes, (v) => { player.cfg.eyes = v; player.mats.pupilMat.color.set(v); persistCfg(); })) },
    { id: 'shoes', label: '👟 Shoes', build: () => container(
        groupLabel('Style'), chips(SHOESTYLES, () => player.cfg.shoes, (v) => { player.cfg.shoes = v; player.buildShoes(); persistCfg(); }),
        groupLabel('Color'), swatches(SHOEC, () => player.cfg.shoeColor, (v) => { player.cfg.shoeColor = v; player.mats.shoeMat.color.set(v); persistCfg(); })) },
    { id: 'extras', label: '✨ Extras', build: () => {
        const chipsWrap = el('div', 'chips');
        const btns = accList.map((a) => {
          const li = lockInfo(a);
          const b = el('button', 'chip', li ? `${a.label}<small>${li.label}</small>` : a.label);
          if (li) b.classList.add('locked');
          b.addEventListener('click', () => {
            if (lockInfo(a)) { toast(lockInfo(a).toast, 2400); return; }
            player.setAccessory(a.id, !player.cfg.accessories[a.id]);
            persistCfg();
            syncUI();
          });
          chipsWrap.appendChild(b);
          return { b, o: a, kind: 'acc' };
        });
        /* sparkle trail (boutique item, toggle) */
        if (state.purchases.trail) {
          const b = el('button', 'chip', '✨ Sparkle trail');
          b.addEventListener('click', () => {
            state.settings.trail = !state.settings.trail;
            save();
            syncUI();
          });
          chipsWrap.appendChild(b);
          btns.push({ b, o: { id: '__trail' }, kind: 'trail' });
        } else {
          const b = el('button', 'chip locked', '✨ Sparkle trail<small>🛍️ 35 candies</small>');
          b.addEventListener('click', () => toast('🛍️ Buy the <b>Sparkle Trail</b> in the Candy Boutique!', 2400));
          chipsWrap.appendChild(b);
        }
        /* pets (boutique, toggle — one companion at a time) */
        for (const p of PETS) {
          const owned = !!state.purchases['pet_' + p.id];
          const b = el('button', 'chip', owned ? `${p.icon} ${p.name}` : `${p.icon} ${p.name}<small>🛍️ ${p.price} candies</small>`);
          if (!owned) {
            b.classList.add('locked');
            b.addEventListener('click', () => toast(`🛍️ Buy <b>${p.name}</b> in the Candy Boutique!`, 2400));
          } else {
            b.addEventListener('click', () => {
              setPet(state.settings.pet === p.id ? null : p.id);
              syncUI();
            });
          }
          chipsWrap.appendChild(b);
          btns.push({ b, o: { id: '__pet_' + p.id }, kind: 'pet', petId: p.id });
        }
        uiSync.push(() => {
          for (const { b, o, kind, petId } of btns) {
            if (kind === 'trail') b.classList.toggle('on', !!state.settings.trail);
            else if (kind === 'pet') b.classList.toggle('on', state.settings.pet === petId);
            else b.classList.toggle('on', !lockInfo(o) && !!player.cfg.accessories[o.id]);
          }
        });
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
/* Pets — follow the player everywhere                                 */
/* ------------------------------------------------------------------ */
let petObj = null;
const _petFollow = new THREE.Vector3();
function setPet(id) {
  const ok = id && state.purchases['pet_' + id];
  if (!ok) id = null;
  if (petObj) {
    petObj.group.parent && petObj.group.parent.remove(petObj.group);
    petObj = null;
  }
  state.settings.pet = id;
  if (id) {
    petObj = createPet(id);
    const parent = player.group.parent || scene;
    parent.add(petObj.group);
    petObj.group.position.copy(player.group.position);
    petObj.group.position.x += 0.7;
    if (effectsOn()) effects.spawnHearts(3, petObj.group.position);
  }
  save();
}
function reparentPet() {
  if (petObj && player.group.parent && petObj.group.parent !== player.group.parent) {
    player.group.parent.add(petObj.group);
  }
}
function updatePet(dt, t) {
  if (!petObj) return;
  const pp = player.group.position;
  const ry = player.group.rotation.y;
  /* trail slightly behind the player */
  _petFollow.set(pp.x - Math.sin(ry) * 0.75, 0, pp.z - Math.cos(ry) * 0.75);
  petObj.update(dt, t, _petFollow, game.walk01 > 0.35 || game.danceT > 0);
}

/* ------------------------------------------------------------------ */
/* Shop / journal overlays                                             */
/* ------------------------------------------------------------------ */
function openShop() {
  renderShop();
  shopEl.classList.remove('hidden');
  closeJournal();
}
function closeShop() { shopEl.classList.add('hidden'); }
function openJournal() {
  renderJournal();
  journalEl.classList.remove('hidden');
  closeShop();
}
function closeJournal() { journalEl.classList.add('hidden'); }

/* ------------------------------------------------------------------ */
/* Modes                                                               */
/* ------------------------------------------------------------------ */
function enterWorld() {
  game.mode = 'world';
  state.mode = 'world';
  titleEl.classList.add('hidden');
  panelEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  actionbarEl.classList.remove('hidden');
  statsEl.classList.remove('hidden');
  if (isTouch) joyEl.classList.add('show');
  document.body.classList.add('mode-world');

  hideAllInteriors();
  exitCastleScene();
  studioGroup.visible = false;
  world.group.visible = true;
  scene.background = worldBg;
  scene.fog = worldFog;

  world.group.add(player.group);
  player.group.position.copy(world.spawn);
  player.group.position.y = 0;
  player.group.rotation.y = Math.PI;
  game.vy = 0;
  game.walk01 = 0;
  game.doorHintShown = false;

  cam.target.set(player.group.position.x, 1.1, player.group.position.z);
  cam.yaw = 0; cam.pitch = 0.5; cam.dist = 6.5;
  camera.position.set(player.group.position.x, 4, player.group.position.z + 7);

  if (music.ctx) music.start('ambient');
  updateHud();
  updateStats();
  updateTracker();
  const done = QUESTS.filter((q) => progress.isQuestDone(q.id)).length;
  toast(`${currentChar.emoji} <b>${currentChar.name}</b> enters Candy World!<br><small>${done < QUESTS.length ? '📜 Journal shows your quests — follow the golden beacon!' : 'All quests complete — enjoy the world!'}</small>`, 4200);
  if (effectsOn()) effects.spawnHearts(3, player.group.position);
  reparentPet();
  save();
}
function enterStudio() {
  game.mode = 'studio';
  state.mode = 'studio';
  cancelMini(true);
  titleEl.classList.remove('hidden');
  panelEl.classList.remove('hidden');
  hudEl.classList.add('hidden');
  actionbarEl.classList.add('hidden');
  statsEl.classList.add('hidden');
  joyEl.classList.remove('show');
  document.body.classList.remove('mode-world');
  game.danceT = 0;
  if (music.ctx) music.start('ambient');

  hideAllInteriors();
  exitCastleScene();
  world.group.visible = false;
  studioGroup.visible = true;
  scene.background = studioBg;
  scene.fog = studioFog;
  world.setBeacon(null);

  studioGroup.add(player.group);
  player.group.position.set(0, 0.01, 0);
  player.group.rotation.y = 0;
  if (player.sitting()) player.setPose('stand');
  cam.target.set(0, 0.85, 0);
  cam.yaw = 0.35; cam.pitch = 0.42; cam.dist = 3.4;
  camera.position.set(1.2, 2.2, 3.2);
  renderCharInfo();
  reparentPet();
  save();
}

/* castle mode */
function enterCastle() {
  cancelMini(true);
  game.mode = 'castle';
  world.group.visible = false;
  world.setBeacon(null);
  trackerEl.innerHTML = '';
  world.castle.group.visible = true;
  scene.background = studioBg;
  scene.fog = castleFog;

  world.castle.group.add(player.group);
  player.group.position.set(0, 0, 8.2);
  player.group.rotation.y = Math.PI;
  game.vy = 0;
  game.walk01 = 0;
  game.chestHintShown = false;
  game.doorHintShown = false;
  if (player.sitting()) player.setPose('stand');

  cam.target.set(0, 1.1, 6.5);
  cam.yaw = 0; cam.pitch = 0.35; cam.dist = 4.6;
  camera.position.set(0, 3, 11);
  toast("🏰 <b>The Royal Palace</b> — home of King Jamoh's family.<br><small>Meet the royals · find the vault · sit on the throne · visit your chambers in the west wing</small>", 4200);
  reparentPet();
  save();
}
function exitCastleScene() {
  world.castle.group.visible = false;
  hideAllInteriors();
}
function leaveCastle() {
  game.mode = 'world';
  world.castle.group.visible = false;
  world.group.visible = true;
  scene.background = worldBg;
  scene.fog = worldFog;

  world.group.add(player.group);
  player.group.position.copy(world.castleDoor);
  player.group.position.z -= 1.2;
  player.group.position.y = 0;
  player.group.rotation.y = 0;
  if (player.sitting()) player.setPose('stand');
  game.doorHintShown = false;
  cam.target.set(player.group.position.x, 1.1, player.group.position.z);
  updateTracker();
  reparentPet();
  save();
}

/* ------------------------------------------------------------------ */
/* Chest                                                               */
/* ------------------------------------------------------------------ */
function openChest() {
  const chest = world.castle.chest;
  if (!chest.opened) {
    chest.opened = true;
    chest.anim = 1;
    progress.addCandies(8);
    completeQuest('royalTreasure');
    if (effectsOn()) {
      effects.spawnConfetti(40, chest.group.position.clone().add(new THREE.Vector3(0, 1, 0)));
      effects.spawnHearts(5, player.group.position);
    }
    toast('🗝️ The royal vault opens — <b>+8 candies</b>!', 3400);
  } else {
    toast('The vault is empty… but the memory of candy remains 🍬', 2400);
  }
}

/* ------------------------------------------------------------------ */
/* Interaction (E key / Talk button)                                   */
/* ------------------------------------------------------------------ */
function interact() {
  if (dialogueOpen) { closeDialogue(); return; }
  if (game.mode === 'world') {
    /* arcade kiosks (mini-games) */
    const arc = nearestArcade();
    if (arc) {
      startMini(arc.id);
      return;
    }
    /* an NPC's front door? */
    const home = nearestHomeDoor();
    if (home) {
      enterHome(home);
      return;
    }
    /* palace gate? */
    if (player.group.position.distanceTo(world.castleDoor) < 3.4) {
      enterCastle();
      return;
    }
    const n = nearestNpc();
    if (n) {
      talkToNpc(n);
      return;
    }
    toast('Nobody is close enough to talk to 🤔 — walk up to a doll!', 2200);
  } else if (game.mode === 'house') {
    /* the owner might be home */
    const owner = npcs.find((x) => x.home === getActiveHome());
    if (owner && owner.homeState === 'home' &&
        owner.doll.group.position.distanceTo(player.group.position) < 2.6) {
      talkToNpc(owner);
      return;
    }
    /* door -> leave */
    if (player.group.position.z > 1.6 && Math.abs(player.group.position.x) < 1.0) {
      leaveHome();
      return;
    }
    /* chairs */
    for (const s of getActiveHome().interior.sits) {
      if (Math.hypot(player.group.position.x - s.x, player.group.position.z - s.z) < 1.4) {
        playerSit(s);
        return;
      }
    }
    toast(`${nameOf(getActiveHome().npc)} is out exploring — come back later! 🚶`, 2400);
  } else if (game.mode === 'castle') {
    /* near door -> leave */
    if (player.group.position.z > 7.8 && Math.abs(player.group.position.x) < 1.3) {
      leaveCastle();
      return;
    }
    /* a royal right next to you? (takes precedence over furniture) */
    const royal = nearestRoyal(2.56); /* 1.6m */
    if (royal) {
      talkToNpc(royal);
      return;
    }
    /* near chest? */
    const c = world.castle.chest.group.position;
    if (player.group.position.distanceTo(c) < 2.2) {
      openChest();
      return;
    }
    /* the throne */
    if (Math.hypot(player.group.position.x, player.group.position.z + 7.4) < 1.7) {
      if (player.sitting()) { player.setPose('stand'); player.group.position.y = 0; return; }
      playerSit({ x: 0, z: -7.3, ry: 0 }, '👑 You sit on the throne. <i>All of Candy World salutes you!</i>');
      return;
    }
    /* chairs & sofas */
    for (const s of world.castle.sits) {
      if (Math.hypot(player.group.position.x - s.x, player.group.position.z - s.z) < 1.2) {
        if (player.sitting()) { player.setPose('stand'); player.group.position.y = 0; return; }
        playerSit(s);
        return;
      }
    }
    toast('Explore the palace — the royals wander these halls 👑', 2200);
  }
}

function nearestArcade() {
  let best = null, bestD = 7.8; /* ~2.8m squared */
  for (const a of world.arcades) {
    const d2 = player.group.position.distanceToSquared(a.pos);
    if (d2 < bestD) { bestD = d2; best = a; }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Buttons & keys                                                      */
/* ------------------------------------------------------------------ */
$('btnEnter').addEventListener('click', enterWorld);
$('btnHome').addEventListener('click', () => { if (game.mode === 'castle') leaveCastle(); if (game.mode === 'house') leaveHome(); enterStudio(); });
$('btnCustomize').addEventListener('click', () => panelEl.classList.toggle('hidden'));
$('btnDance').addEventListener('click', () => {
  if (game.danceT > 0) {
    game.danceT = 0;
    music.start('ambient');
    $('btnDance').classList.remove('on');
  } else {
    game.danceT = 6;
    music.start('dance');
    $('btnDance').classList.add('on');
    if (effectsOn()) effects.spawnConfetti(30, player.group.position);
  }
});
$('btnWave').addEventListener('click', () => {
  player.wave();
  if (effectsOn()) effects.spawnHearts(2, player.group.position);
});
$('btnSpin').addEventListener('click', () => { game.spinT = 1.6; });
$('btnJump').addEventListener('click', () => input.queueJump());
$('btnTalk').addEventListener('click', interact);
$('btnJournal').addEventListener('click', openJournal);
$('btnJournal2').addEventListener('click', openJournal);
$('btnCloseJournal').addEventListener('click', closeJournal);
journalEl.addEventListener('click', (e) => { if (e.target === journalEl) closeJournal(); });
$('btnShop').addEventListener('click', openShop);
$('btnShop2').addEventListener('click', openShop);
$('btnCloseShop').addEventListener('click', closeShop);
shopEl.addEventListener('click', (e) => { if (e.target === shopEl) closeShop(); });

$('btnMute').addEventListener('click', (e) => {
  const muted = !music.muted;
  music.setMuted(muted);
  state.settings.music = !muted;
  save();
  e.currentTarget.textContent = muted ? '🔇' : '🔊';
  $('optMusic').checked = !muted;
});

/* settings */
function openSettings() { settingsEl.classList.remove('hidden'); }
function closeSettings() { settingsEl.classList.add('hidden'); }
$('btnSettings').addEventListener('click', openSettings);
$('btnSettings2').addEventListener('click', openSettings);
$('btnCloseSettings').addEventListener('click', closeSettings);
settingsEl.addEventListener('click', (e) => { if (e.target === settingsEl) closeSettings(); });
$('optMusic').checked = state.settings.music;
$('optShadows').checked = state.settings.shadows;
$('optEffects').checked = state.settings.effects;
$('optMusic').addEventListener('change', (e) => {
  state.settings.music = e.target.checked;
  music.setMuted(!e.target.checked);
  $('btnMute').textContent = e.target.checked ? '🔊' : '🔇';
  save();
});
$('optShadows').addEventListener('change', (e) => {
  state.settings.shadows = e.target.checked;
  setShadows(e.target.checked);
  save();
});
$('optEffects').addEventListener('change', (e) => {
  state.settings.effects = e.target.checked;
  save();
});
$('btnReset').addEventListener('click', () => {
  try { localStorage.removeItem(saveMod.STORE_KEY); } catch { /* ignore */ }
  location.reload();
});
function setShadows(on) {
  renderer.shadowMap.enabled = on;
  key.castShadow = on;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
}

/* graphics quality: presets + adaptive Auto (module) */
const quality = initQuality({ renderer, key, state, isTouch, save, toast });

/* save management: export / import */
$('saveVersion').textContent = `v${saveMod.SAVE_VERSION}`;
$('btnExportSave').addEventListener('click', async () => {
  const json = saveMod.exportSave();
  let copied = false;
  try { await navigator.clipboard.writeText(json); copied = true; } catch { /* clipboard may be unavailable */ }
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trepio-save.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch { /* download may be blocked */ }
  toast(copied
    ? '💾 Save exported — <b>copied to clipboard</b> and downloaded as <i>trepio-save.json</i>'
    : '💾 Save exported as <i>trepio-save.json</i> — keep it somewhere safe!', 4200);
});
$('btnImportSave').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const res = saveMod.importSave(text);
    if (!res.ok) { toast(`⚠️ Import failed: ${res.error}`, 3400); return; }
    if (!saveMod.commitImport(res.state)) { toast('⚠️ Could not write the save (storage full?)', 3400); return; }
    toast('💾 Save imported! Reloading…', 1600);
    setTimeout(() => location.reload(), 700);
  } catch {
    toast('⚠️ Could not read that file', 3000);
  }
});

/* keyboard */
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyJ') (journalEl.classList.contains('hidden') ? openJournal() : closeJournal());
  if (e.code === 'KeyB') (shopEl.classList.contains('hidden') ? openShop() : closeShop());
  if (e.code === 'KeyQ') { player.wave(); if (effectsOn()) effects.spawnHearts(2, player.group.position); }
  if (e.code === 'KeyR') $('btnDance').click();
  if (e.code === 'KeyF') game.spinT = 1.6;
  if (e.code === 'KeyM') $('btnMute').click();
  if (e.code === 'Escape') { closeSettings(); closeJournal(); closeShop(); closeDialogue(); }
  if (e.code === 'KeyH' && game.mode !== 'studio') { if (game.mode === 'castle') leaveCastle(); if (game.mode === 'house') leaveHome(); enterStudio(); }
});

/* audio unlock on first gesture — respects the saved music preference */
const kickstartMusic = () => {
  if (game.mode !== 'studio' && !music.playing && state.settings.music) music.start('ambient');
};
window.addEventListener('pointerdown', kickstartMusic);
window.addEventListener('keydown', kickstartMusic);

/* ------------------------------------------------------------------ */
/* Movement & collision                                                */
/* ------------------------------------------------------------------ */
const PLAYER_R = 0.34;
const GRAVITY = 14;
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();

function updatePlayer(dt, t) {
  const p = player.group.position;
  const ax = input.axis();
  const running = input.running();
  const inCastle = game.mode === 'castle';
  const inHouse = game.mode === 'house';

  /* stand up from a chair when the player moves */
  if (player.sitting()) {
    if (ax.len > 0.08) {
      player.setPose('stand');
      player.group.position.y = 0;
    } else {
      game.walk01 = Math.max(0, game.walk01 - dt * 4);
      player.group.position.y = 0.18;
      return;
    }
  }

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

  if (inCastle) resolveCastleCollisions(p, PLAYER_R);
  else if (inHouse && getActiveHome()) resolveBoxCircle(getActiveHome().interior.boxes, getActiveHome().interior.circles, p, PLAYER_R);
  else resolveWorldCollisions(p, PLAYER_R);

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

  /* sparkle trail (boutique item) */
  if (state.purchases.trail && state.settings.trail && effectsOn() && game.walk01 > 0.55) {
    game.trailTimer -= dt;
    if (game.trailTimer <= 0) {
      game.trailTimer = 0.12;
      effects.spawnSpark(p);
    }
  }

  if (inHouse) {
    if (p.z > 1.6 && Math.abs(p.x) < 1.0 && !game.doorHintShown) {
      game.doorHintShown = true;
      toast('🚪 Press <b>E</b> to step outside', 2400);
    }
    return;
  }
  if (inCastle) {
    /* hints inside the castle */
    const chest = world.castle.chest;
    if (!chest.opened && !game.chestHintShown && p.distanceTo(chest.group.position) < 2.6) {
      game.chestHintShown = true;
      toast('🗝️ Press <b>E</b> to open the royal vault!', 2600);
    }
    if (p.z > 7.2 && Math.abs(p.x) < 1.4 && !game.doorHintShown) {
      game.doorHintShown = true;
      toast('🚪 Press <b>E</b> to leave the palace', 2400);
    }
    return;
  }

  /* candy pickup (permanent) */
  for (const c of world.candies) {
    if (!c.active) continue;
    const dx = p.x - c.x, dz = p.z - c.z;
    if (dx * dx + dz * dz < 0.85) {
      c.active = false;
      c.obj.visible = false;
      state.progress.collected[c.id] = true;
      progress.addCandy();
      if (effectsOn()) effects.spawnHearts(1, p);
      updateStats();
      save();
    }
  }

  /* golden gummy bear pickup */
  if (world.goldenBear.active) {
    const dx = p.x - 43, dz = p.z + 25;
    if (dx * dx + dz * dz < 1.4) {
      world.goldenBear.active = false;
      world.goldenBear.obj.visible = false;
      world.goldenBear.light.visible = false;
      progress.addCandies(5);
      if (effectsOn()) effects.spawnConfetti(20, world.goldenBear.obj.position);
      toast('🧸 You found the <b>golden gummy bear</b>! +5 candies', 3000);
      updateStats();
    }
  }

  /* star candy gem — repeatable candy source */
  if (world.gemActive) {
    const gp = world.gem.position;
    const dx = p.x - gp.x, dz = p.z - gp.z;
    if (dx * dx + dz * dz < 1.3 * 1.3 && Math.abs(p.y + 1.2 - gp.y) < 2) {
      world.collectGem();
      progress.addCandies(1);
      if (!progress.questStage('__gemFirst')) {
        progress.setQuestStage('__gemFirst', 1);
        toast('💎 The star candy glows… it will return!', 2600);
      } else {
        toast('💎 +1 candy', 1400);
      }
      if (effectsOn()) effects.spawnHearts(2, p);
      updateStats();
    }
  }

  if (!game.doorHintShown && p.distanceTo(world.castleDoor) < 5) {
    game.doorHintShown = true;
    toast('🏰 Press <b>E</b> at the gate to enter the candy castle!', 3000);
  }

  updateQuests();
  updateTracker();
}

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
const _lightTarget = new THREE.Vector3();
let firstFrame = true;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const beat = music.beatPhase();

  if (firstFrame) {
    firstFrame = false;
    if (loadingEl) {
      loadingEl.classList.add('done');
      setTimeout(() => loadingEl.remove(), 700);
    }
  }

  if (game.mode === 'studio') {
    studioGroup.rotation.y += dt * 0.12;
    if (studioGroup.userData.update) studioGroup.userData.update(dt, t);
    game.walk01 = 0;
    player.update({ walk01: 0, dance01: game.danceT > 0 ? 1 : 0, beatPhase: beat }, dt, t);
    if (game.danceT > 0) {
      game.danceT -= dt;
      if (game.danceT <= 0) { music.start('ambient'); $('btnDance').classList.remove('on'); }
    }
    cam.target.set(0, 0.85, 0);
    updateCamera(dt, true);
    _lightTarget.set(0, 0.6, 0);
  } else if (game.mode === 'castle') {
    updatePlayer(dt, t);
    player.update({ walk01: game.walk01, dance01: game.danceT > 0 ? 1 : 0, beatPhase: beat }, dt, t);
    for (const r of royals) updateRoyal(r, dt, t);
    world.update(dt, t);
    cam.target.set(player.group.position.x, player.group.position.y + 1.1, player.group.position.z);
    updateCamera(dt, false);
    _lightTarget.copy(player.group.position);
  } else if (game.mode === 'house') {
    updatePlayer(dt, t);
    player.update({ walk01: game.walk01, dance01: game.danceT > 0 ? 1 : 0, beatPhase: beat }, dt, t);
    for (const n of npcs) updateNpc(n, dt, t); /* the owner runs if they are home */
    world.update(dt, t);
    cam.target.set(player.group.position.x, player.group.position.y + 1.1, player.group.position.z);
    updateCamera(dt, false);
    _lightTarget.copy(player.group.position);
  } else {
    updatePlayer(dt, t);
    player.update({ walk01: game.walk01, dance01: game.danceT > 0 ? 1 : 0, beatPhase: beat }, dt, t);
    for (const n of npcs) updateNpc(n, dt, t);
    updateMini(dt, t);
    if (game.mini) updateTracker();
    world.update(dt, t);
    cam.target.set(player.group.position.x, player.group.position.y + 1.1, player.group.position.z);
    updateCamera(dt, false);
    _lightTarget.copy(player.group.position);
  }

  updatePet(dt, t);

  key.position.set(_lightTarget.x + 6, _lightTarget.y + 11, _lightTarget.z + 5);
  key.target.position.copy(_lightTarget);
  key.target.updateMatrixWorld();

  effects.update(dt, t);
  quality.tick(dt);
  renderer.render(scene, camera);
}
animate();

/* resize — also refresh pixel ratio (display change) */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.stop();
  else if (music.ctx && state.settings.music) music.start();
});

$('btnMute').textContent = state.settings.music ? '🔊' : '🔇';

/* boot */
rebuildNpcs();
buildRoyals();
if (state.mode === 'world') enterWorld(); else enterStudio();
if (state.settings.pet && state.purchases['pet_' + state.settings.pet]) setPet(state.settings.pet);
updateStats();
renderShop();

/* debug hook — dev / ?debug only */
const DEBUG = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
  new URLSearchParams(location.search).has('debug');
if (DEBUG) {
  window.__trepio = {
    game, world, player, npcs, royals, music, progress, quests: QUESTS,
    teleport(x, z) { player.group.position.set(x, 0, z); },
    interact, enterCastle, leaveCastle, openChest, raw: state,
    simulateFps: (x) => quality.simulateFps(x),
    qualityTick: (s) => quality.debugAdvance(s),
    enterHome(id) { const h = world.homes.find((x) => x.id === id); if (h) enterHome(h); },
    leaveHome, startMini, cancelMini, setPet,
    saveApi: saveMod,
    forceNpcHome(id, home) {
      const n = npcs.find((x) => x.ch.id === id);
      if (!n || !n.home) return false;
      if (home) enterNpcHome(n); else exitNpcHome(n);
      return true;
    },
    buy(id) { const it = SHOP.find((x) => x.id === id); if (it) buyItem(it); },
    state() {
      const owner = getActiveHome() ? npcs.find((x) => x.home === getActiveHome()) : null;
      return {
        mode: game.mode,
        home: getActiveHome() ? getActiveHome().id : null,
        ownerHome: owner ? owner.homeState : null,
        pos: player.group.position.toArray(),
        npcs: npcs.length,
        royals: royals.length,
        royalStates: royals.map((r) => r.ch.id + ':' + (r.sitting ? 'sit' : r.state)),
        homeStates: npcs.filter((n) => n.home).map((n) => n.ch.id + ':' + n.homeState),
        butterflies: world.butterflies.length,
        candiesActive: world.candies.filter((c) => c.active).length,
        candiesTotal: world.candies.length,
        goldenBear: world.goldenBear.active,
        gemActive: world.gemActive,
        chestOpened: world.castle.chest.opened,
        mini: game.mini ? { kind: game.mini.kind, score: game.mini.score, idx: game.mini.idx, t: game.mini.t } : null,
        pet: state.settings.pet,
        petPos: petObj ? petObj.group.position.toArray() : null,
        met: state.progress.met,
        games: state.progress.games,
        quality: state.settings.quality || 'auto',
        qualityTier: quality.level(),
        gender: player.male ? 'male' : 'female',
        level: progress.level,
        xp: progress.xp,
        candyCount: progress.candies,
        balance: candyBalance(),
        purchases: state.purchases,
        collected: Object.keys(state.progress.collected).length,
        quests: progress.quests,
        tracker: document.getElementById('tracker')?.textContent || '',
      };
    },
  };
}
