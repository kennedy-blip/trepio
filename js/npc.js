/* =====================================================================
   npc.js — villagers, the royal family, dialogue & daily schedules
   ===================================================================== */
import * as THREE from 'three';
import { ctx, $ } from './ctx.js';
import { createDoll } from './doll.js';
import { resolveWorldCollisions, resolveBoxCircle, resolveCastleCollisions, lerpAngle } from './collide.js';
import { RACE_PAR } from './quests.js';
import { getActiveHome } from './homes.js';

/* ------------------------------------------------------------------ */
/* Dialogue                                                            */
/* ------------------------------------------------------------------ */
export let dialogueOpen = false;
let dialogueTimer = null;
export function closeDialogue() {
  const el = $('dialogue');
  el.classList.remove('show', 'interactive');
  dialogueOpen = false;
  clearTimeout(dialogueTimer);
}
export function dialogueHtml(name, emoji, text, choices) {
  const el = $('dialogue');
  el.innerHTML = `<b>${emoji} ${name}</b><br>“${text}”` +
    (choices ? `<div class="dchoices">${choices}</div>` : '');
  el.classList.add('show', 'interactive');
  dialogueOpen = true;
  clearTimeout(dialogueTimer);
  /* auto-hide casual chatter, but keep choice dialogs open until answered */
  if (!choices) dialogueTimer = setTimeout(() => closeDialogue(), 7000);
}
export function dchoiceBtn(label, fn, isQuest) {
  const b = document.createElement('button');
  b.className = 'dchoice' + (isQuest ? ' quest' : '');
  b.innerHTML = label;
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

/* ------------------------------------------------------------------ */
/* Villagers (wander the world, go home on their own schedule)         */
/* ------------------------------------------------------------------ */
const _toP = { x: 0, z: 0 };
export const npcs = [];
export function rebuildNpcs() {
  for (const n of npcs) {
    n.doll.group.parent && n.doll.group.parent.remove(n.doll.group);
    n.doll.dispose();
  }
  npcs.length = 0;
  const others = ctx.CHARACTERS.filter((c) => c.id !== ctx.currentChar.id && !c.royal);
  others.forEach((ch, i) => {
    const doll = createDoll(ctx.cfgFor(ch.id));
    const home = ctx.world.homes.find((h) => h.npc === ch.id) || null;
    /* some NPCs start at home */
    const startHome = home && Math.random() < 0.25;
    let p = null;
    for (let k = 0; k < 30 && !p; k++) {
      const a = (i / others.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const r = 24 + Math.random() * 8;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 22.5 && Math.abs(z) < 22.5) continue;
      if (z > 27 && z < 37) continue;
      p = { x, z };
    }
    if (!p) p = { x: 24, z: 24 };
    if (startHome) {
      doll.group.position.copy(home.npcSpot);
      home.interior.group.add(doll.group);
    } else {
      doll.group.position.set(p.x, 0, p.z);
      ctx.world.group.add(doll.group);
    }
    doll.group.rotation.y = Math.random() * Math.PI * 2;
    npcs.push({
      doll, ch, home,
      state: 'idle',
      timer: 1 + Math.random() * 3,
      target: startHome ? home.npcSpot.clone() : new THREE.Vector3(p.x, 0, p.z),
      speed: 2.2 + Math.random() * 1.2,
      waveTimer: 0.5 + Math.random() * 3,
      lastPos: doll.group.position.clone(),
      stuckTimer: 0,
      tick: i,
      homeState: startHome ? 'home' : 'out',
      homeTimer: 30 + Math.random() * 110,
      goingHome: false,
      sitting: false,
    });
  });
}
function pickNpcTarget(n) {
  for (let k = 0; k < 20; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = 23 + Math.random() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 22.5 && Math.abs(z) < 22.5) continue;
    if (z > 27) continue;
    n.target.set(x, 0, z);
    return;
  }
  n.target.set(0, 0, 26);
}
function pickInteriorTarget(n, bounds) {
  n.target.set(
    bounds.minX + Math.random() * (bounds.maxX - bounds.minX), 0,
    bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ));
}

export function enterNpcHome(n) {
  n.home.interior.group.add(n.doll.group);
  n.doll.group.position.copy(n.home.npcSpot);
  n.doll.group.position.y = 0;
  n.doll.group.rotation.y = Math.PI + (Math.random() - 0.5);
  n.homeState = 'home';
  n.goingHome = false;
  n.state = 'idle';
  n.timer = 1;
  n.homeTimer = 40 + Math.random() * 80;
  n.sitting = false;
  n.doll.setPose('stand');
  n.lastPos.copy(n.doll.group.position);
}
export function exitNpcHome(n) {
  ctx.world.group.add(n.doll.group);
  n.doll.group.position.copy(n.home.exit);
  n.doll.group.position.y = 0;
  n.homeState = 'out';
  n.homeTimer = 60 + Math.random() * 140;
  n.state = 'idle';
  n.timer = 0.5;
  n.sitting = false;
  n.doll.setPose('stand');
  n.target.set(0, 0, 26);
  n.lastPos.copy(n.doll.group.position);
}

export function updateNpc(n, dt, t) {
  const p = n.doll.group.position;

  /* ---- inside their own house ---- */
  if (n.homeState === 'home') {
    if (!ctx.homes.getActiveHome() || ctx.homes.getActiveHome() !== n.home) return; /* frozen while nobody watches */
    _toP.x = ctx.player.group.position.x - p.x;
    _toP.z = ctx.player.group.position.z - p.z;
    const distToPlayer = Math.hypot(_toP.x, _toP.z);
    n.homeTimer -= dt;
    if (n.homeTimer <= 0) { exitNpcHome(n); return; }

    if (n.sitting) {
      n.timer -= dt;
      if (n.timer <= 0) {
        n.sitting = false;
        n.doll.setPose('stand');
        n.doll.group.position.y = 0;
        n.state = 'idle';
        n.timer = 1;
      }
    } else if (distToPlayer < 2.5) {
      n.state = 'greet';
      n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(_toP.x, _toP.z), Math.min(1, dt * 6));
      n.waveTimer -= dt;
      if (n.waveTimer <= 0) {
        n.doll.wave();
        n.waveTimer = 4 + Math.random() * 4;
        if (ctx.ui.effectsOn() && Math.random() < 0.4) ctx.effects.spawnHearts(1, p);
      }
    } else if (n.state === 'idle') {
      n.timer -= dt;
      if (n.timer <= 0) {
        if (Math.random() < 0.3 && n.home.interior.sits.length) {
          const spot = n.home.interior.sits[(Math.random() * n.home.interior.sits.length) | 0];
          n.target.set(spot.x, 0, spot.z);
          n.sitSpot = spot;
        } else {
          pickInteriorTarget(n, n.home.interior.bounds);
          n.sitSpot = null;
        }
        n.state = 'walk';
      }
    } else {
      const dx = n.target.x - p.x, dz = n.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) {
        if (n.sitSpot && Math.hypot(p.x - n.sitSpot.x, p.z - n.sitSpot.z) < 0.55) {
          n.sitting = true;
          n.doll.setPose('sit');
          n.doll.group.position.y = 0.12;
          n.doll.group.rotation.y = n.sitSpot.ry;
          n.timer = 8 + Math.random() * 12;
        } else {
          n.state = 'idle';
          n.timer = 1.5 + Math.random() * 3;
        }
      } else {
        p.x += (dx / d) * (n.speed * 0.7 * dt);
        p.z += (dz / d) * (n.speed * 0.7 * dt);
        n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
      }
      resolveBoxCircle(n.home.interior.boxes, n.home.interior.circles, p, 0.3);
    }
    n.doll.update({ walk01: n.state === 'walk' ? 0.55 : 0, dance01: 0, beatPhase: ctx.music.beatPhase() }, dt, t);
    return;
  }

  /* ---- out in the world ---- */
  _toP.x = ctx.player.group.position.x - p.x;
  _toP.z = ctx.player.group.position.z - p.z;
  const distToPlayer = Math.hypot(_toP.x, _toP.z);
  npcTick++;

  if (distToPlayer > 45 && (npcTick + n.tick) % 3 !== 0) return;

  /* homing: head home when the timer fires */
  if (n.home && !n.goingHome && distToPlayer > 12) {
    n.homeTimer -= dt;
    if (n.homeTimer <= 0) {
      n.goingHome = true;
      n.target.copy(n.home.door);
      n.state = 'walk';
      n.sitSpot = null;
    }
  }

  if (distToPlayer < 3 && ctx.game.mode === 'world') {
    n.state = 'greet';
    n.goingHome = false; /* pause to greet the player */
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(_toP.x, _toP.z), Math.min(1, dt * 6));
    n.waveTimer -= dt;
    if (n.waveTimer <= 0) {
      n.doll.wave();
      n.waveTimer = 4 + Math.random() * 4;
      if (ctx.ui.effectsOn() && Math.random() < 0.4) ctx.effects.spawnHearts(1, p);
    }
  } else if (n.goingHome) {
    const door = n.home.door;
    const dx = door.x - p.x, dz = door.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.8) {
      enterNpcHome(n);
      return;
    }
    p.x += (dx / d) * (n.speed * 1.15 * dt);
    p.z += (dz / d) * (n.speed * 1.15 * dt);
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
  } else if (n.state === 'idle') {
    n.timer -= dt;
    if (n.timer <= 0) {
      pickNpcTarget(n);
      n.state = 'walk';
    }
  } else {
    const dx = n.target.x - p.x, dz = n.target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      n.state = 'idle';
      n.timer = 1.5 + Math.random() * 3.5;
    } else {
      p.x += (dx / d) * (n.speed * dt);
      p.z += (dz / d) * (n.speed * dt);
      n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
    }
  }

  n.stuckTimer += dt;
  if (n.stuckTimer > 1.6) {
    if (p.distanceToSquared(n.lastPos) < 0.09) {
      if (n.goingHome) n.target.copy(n.home.door);
      else pickNpcTarget(n);
      if (n.state === 'idle') n.timer = 0.2;
    }
    n.lastPos.copy(p);
    n.stuckTimer = 0;
  }

  resolveWorldCollisions(p, 0.3);
  const bd = Math.hypot(p.x, p.z);
  if (bd > ctx.world.R_BOUND - 1.5) {
    n.target.set(0, 0, 26);
  }
  n.doll.update({ walk01: n.state === 'walk' || n.goingHome ? 0.7 : 0, dance01: 0, beatPhase: ctx.music.beatPhase() }, dt, t);
}
let npcTick = 0;

export function nearestNpc() {
  let best = null, bestD = 25;
  for (const n of npcs) {
    if (n.homeState === 'home') continue; /* inside their house */
    const d2 = n.doll.group.position.distanceToSquared(ctx.player.group.position);
    if (d2 < bestD) { bestD = d2; best = n; }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Family homes: parents + babies, mostly indoors, full interaction    */
/* ------------------------------------------------------------------ */
export const families = [];
const BABY_SCALE = 0.55;
const FAMILY_DEFS = [
  { home: 'berrywhistle', label: 'The Berrywhistles', members: [
    { id: 'bo', kind: 'parent', emoji: '🫐', name: 'Bo Berrywhistle', spot: [-1.4, 0.9],
      cfg: { gender: 'male', hair: 'mshort', hairColor: '#4a3524', skin: '#8f5f42', eyes: '#3a2a1e',
        outfit: 'explorer', top: '#5e7a9b', skirt: '#6b4a33', shoes: 'boots', shoeColor: '#4a3a2a',
        accessories: { bow: false, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['Little Bibi keeps us on our toes — and up at night!',
        'We moved out here for the quiet. And the berries, of course.',
        'Bella bakes a berry tart every Sunday. You are welcome to imagine a slice.',
        'The toddlers in this house rule everything. We just live here.',
        'Shh — the baby naps right after her bottle. Usually. Sometimes.'],
      about: 'Bibi just took her first steps! Three of them. Then a very soft landing.' },
    { id: 'bella', kind: 'parent', emoji: '🧺', name: 'Bella Berrywhistle', spot: [0.9, 1.7],
      cfg: { gender: 'female', hair: 'long', hairColor: '#6b4226', skin: '#b5714f', eyes: '#5a3420',
        outfit: 'coord', top: '#e8a9c0', skirt: '#f4d7e3', shoes: 'flats', shoeColor: '#a5713f',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['A basket of berries, a warm hearth, my family — what else does anyone need?',
        'Bibi has Bo wrapped around her tiny finger. Both of them, really.',
        'Careful where you step — blocks everywhere. It is a law of nature.',
        'I just rocked Bibi to sleep. If she wakes, I am blaming you!',
        'The forest past the river has the sweetest blackberries this season.'],
      about: 'Bibi said her first word last week. It was "berry". We are very proud.' },
    { id: 'bibi', kind: 'baby', emoji: '👶', name: 'Baby Bibi', spot: [2.3, 1.0],
      cfg: { gender: 'female', hair: 'buns', hairColor: '#4a3524', skin: '#b5714f', eyes: '#5a3420',
        outfit: 'party', top: '#f4d7e3', skirt: '#e8a9c0', shoes: 'flats', shoeColor: '#f4d7e3',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      babble: ['Goo goo gah!', 'Ba-ba-ba-ba!', '*happy baby noises*', 'Mama! Dada! ...Candy!', '*giggles and claps*'] },
  ] },
  { home: 'gumdropp', label: 'The Gumdropps', members: [
    { id: 'gus', kind: 'parent', emoji: '🍬', name: 'Gus Gumdropp', spot: [-1.4, 0.9],
      cfg: { gender: 'male', hair: 'quiff', hairColor: '#2f2a26', skin: '#704b36', eyes: '#2f2420',
        outfit: 'smart', top: '#7fae62', skirt: '#4a5a3a', shoes: 'boots', shoeColor: '#3a3a2a',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['Twins, friend. TWINS. I have not slept since spring.',
        'Our garden grows actual gumdrops. The kids eat the profits.',
        'Greta says the twins get their energy from me. I choose to be flattered.',
        'Poppy hoards blocks. Pip hoards trouble. Perfect balance.',
        'Stop by any time — kettle is always warm in this house.'],
      about: 'Poppy stacked six blocks yesterday. Pip knocked them over in half a second. Teamwork.' },
    { id: 'greta', kind: 'parent', emoji: '🍯', name: 'Greta Gumdropp', spot: [0.9, 1.7],
      cfg: { gender: 'female', hair: 'ponytail', hairColor: '#8f5f42', skin: '#704b36', eyes: '#3a2a1e',
        outfit: 'coord', top: '#c4dfa4', skirt: '#7fae62', shoes: 'flats', shoeColor: '#a5713f',
        accessories: { bow: false, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['Twins double the joy. And the laundry. Mostly the laundry.',
        'Honey tea? I just put the kettle on. Sit, sit!',
        'Pip learned to climb the crib rail. My heart is not ready.',
        'Gus snores, the babies cry, and I would not trade a single second.',
        'The bees by the meadow make the best honey in the kingdom.'],
      about: 'Poppy and Pip were born four minutes apart. Pip arrived like a little thunderstorm.' },
    { id: 'poppy', kind: 'baby', emoji: '👶', name: 'Baby Poppy', spot: [2.5, 1.6],
      cfg: { gender: 'female', hair: 'buns', hairColor: '#2f2a26', skin: '#704b36', eyes: '#3a2a1e',
        outfit: 'party', top: '#c4dfa4', skirt: '#dff0d5', shoes: 'flats', shoeColor: '#dff0d5',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      babble: ['Ba!', 'Bee-bee-bee!', '*stacks a block proudly*', 'Dada, up! UP!', '*baby giggles*'] },
    { id: 'pip', kind: 'baby', emoji: '👶', name: 'Baby Pip', spot: [2.0, 0.5],
      cfg: { gender: 'male', hair: 'mshort', hairColor: '#2f2a26', skin: '#704b36', eyes: '#2f2420',
        outfit: 'sporty', top: '#a9c6e8', skirt: '#5b9bc4', shoes: 'boots', shoeColor: '#3a3a2a',
        accessories: { bow: false, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      babble: ['GOO!', 'Nyah nyah!', '*knocks over a block tower*', 'Mama! Ma-ma!', '*mischievous giggle*'] },
  ] },
  { home: 'mintwhisk', label: 'The Mintwhisks', members: [
    { id: 'milo', kind: 'parent', emoji: '🌿', name: 'Milo Mintwhisk', spot: [-1.4, 0.9],
      cfg: { gender: 'male', hair: 'sidepart', hairColor: '#5e4326', skin: '#c98a5f', eyes: '#3a2a1e',
        outfit: 'explorer', top: '#5b9bc4', skirt: '#3a5a6a', shoes: 'boots', shoeColor: '#3a3a2a',
        accessories: { bow: false, crown: false, glasses: true, wings: false, halo: false, wand: false } },
      lines: ['I catalogue every herb in the kingdom. Miu catalogues every spoon in the house.',
        'Mint tea before bed, mint tea after breakfast. We are a focused family.',
        'Our Miu has opinions. Strong ones. Mostly about spoons.',
        'Mimi says I dote. I say the baby learned it from somewhere.',
        'A quiet house on the meadow — best decision we ever made.'],
      about: 'Miu can name three herbs already. She points at mint and shouts "MMMH!". Close enough.' },
    { id: 'mimi', kind: 'parent', emoji: '🍵', name: 'Mimi Mintwhisk', spot: [0.9, 1.7],
      cfg: { gender: 'female', hair: 'bob', hairColor: '#5e4326', skin: '#c98a5f', eyes: '#5a3420',
        outfit: 'coord', top: '#bcd4ee', skirt: '#d9ecf7', shoes: 'flats', shoeColor: '#a5713f',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['Miu emptied the entire spoon drawer again. Every. Single. Spoon.',
        'Milo fusses over his herb garden more than the baby. It is close, though.',
        'Would you like tea? We have mint. We have... more mint.',
        'She is a small baby with a big personality. Wonder where she gets that.',
        'The meadow breeze through the window is worth every step out here.'],
      about: 'Miu walked eight steps in a row today! Then she sat down and applauded herself.' },
    { id: 'miu', kind: 'baby', emoji: '👶', name: 'Baby Miu', spot: [2.3, 1.0],
      cfg: { gender: 'female', hair: 'short', hairColor: '#5e4326', skin: '#c98a5f', eyes: '#5a3420',
        outfit: 'party', top: '#d9ecf7', skirt: '#bcd4ee', shoes: 'flats', shoeColor: '#d9ecf7',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      babble: ['MMMH!', 'Spoon! *waves a spoon*', '*determined crawl*', 'Papa! Papa!', '*proud baby giggle*'] },
  ] },
  { home: 'cocoabean', label: 'The Cocoabeans', members: [
    { id: 'cade', kind: 'parent', emoji: '☕', name: 'Cade Cocoabean', spot: [-1.4, 0.9],
      cfg: { gender: 'male', hair: 'curly', hairColor: '#3a2a20', skin: '#8f5f42', eyes: '#2f2420',
        outfit: 'smart', top: '#a5713f', skirt: '#5e4326', shoes: 'boots', shoeColor: '#3a3a2a',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['I roast cocoa beans for the whole kingdom. My daughter taste-tests. Rigorously.',
        'Coco has a chocolate-detecting nose. Nothing in this house is safe.',
        'Cora says our house smells like dessert. I call that a professional achievement.',
        'The little one already waves like the royals do. We are raising nobility, clearly.',
        'Sit a while? The cocoa is fresh. The baby is... also fresh.'],
      about: 'Coco can smell chocolate from the other room. She is nineteen months old. A prodigy.' },
    { id: 'cora', kind: 'parent', emoji: '🍫', name: 'Cora Cocoabean', spot: [0.9, 1.7],
      cfg: { gender: 'female', hair: 'long', hairColor: '#3a2a20', skin: '#8f5f42', eyes: '#3a2a1e',
        outfit: 'coord', top: '#d9a066', skirt: '#f0e0d0', shoes: 'flats', shoeColor: '#a5713f',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      lines: ['Our kitchen is 60% cocoa, 40% chaos. We like those odds.',
        'Coco said "choclit" before she said "mama". Cade framed the moment.',
        'A warm house, a warm drink, and a warm baby on your lap. That is the whole recipe.',
        'Do not leave the door open — the smell of cocoa attracts gummy bears.',
        'Cade claims he is "just tasting for quality". Sure, dear.'],
      about: 'Coco shares her cocoa buttons with exactly one person: her teddy bear. She has standards.' },
    { id: 'coco', kind: 'baby', emoji: '👶', name: 'Baby Coco', spot: [2.3, 1.0],
      cfg: { gender: 'female', hair: 'buns', hairColor: '#3a2a20', skin: '#8f5f42', eyes: '#3a2a1e',
        outfit: 'party', top: '#f0e0d0', skirt: '#d9a066', shoes: 'flats', shoeColor: '#f0e0d0',
        accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false } },
      babble: ['Choclit!', '*hugs her teddy*', 'Dada dada!', '*blows a tiny raspberry*', 'MmmMMM!'] },
  ] },
];
export function buildFamilies() {
  for (const f of families) {
    for (const m of f.members) {
      m.doll.group.parent && m.doll.group.parent.remove(m.doll.group);
      m.doll.dispose();
    }
  }
  families.length = 0;
  for (const def of FAMILY_DEFS) {
    const home = ctx.world.homes.find((h) => h.id === def.home);
    if (!home) continue;
    const f = { home, label: def.label, members: [] };
    for (const md of def.members) {
      const doll = createDoll({ ...md.cfg });
      if (md.kind === 'baby') doll.group.scale.setScalar(BABY_SCALE);
      const spot = new THREE.Vector3(md.spot[0] + (Math.random() - 0.5) * 0.3, 0, md.spot[1] + (Math.random() - 0.5) * 0.3);
      doll.group.position.copy(spot);
      doll.group.rotation.y = Math.random() * Math.PI * 2;
      home.interior.group.add(doll.group);
      f.members.push({
        doll, ch: md, home, kind: md.kind,
        spot, target: spot.clone(),
        where: 'in', /* in | out */
        wanderT: 0.5 + Math.random() * 2,
        outingT: 200 + Math.random() * 280, /* parents: rare stroll */
        lingerT: 0,
        waveT: 2 + Math.random() * 4,
        giggleT: 4 + Math.random() * 6,
        walk01: 0,
      });
    }
    families.push(f);
  }
}
/* inside=true: members in the active home; inside=false: members outside */
export function nearestFamilyMember(maxD, inside) {
  let best = null, bestD = maxD * maxD;
  for (const f of families) {
    if (inside) {
      const active = getActiveHome();
      if (!active || active.id !== f.home.id) continue;
    }
    for (const m of f.members) {
      if ((m.where === 'in') !== inside) continue;
      const d2 = m.doll.group.position.distanceToSquared(ctx.player.group.position);
      if (d2 < bestD) { bestD = d2; best = m; }
    }
  }
  return best;
}
export function talkToFamilyMember(m) {
  m.doll.wave();
  const wrap = document.createElement('div');
  wrap.className = 'dchoices';
  if (m.kind === 'parent') {
    dialogueHtml(m.ch.name, m.ch.emoji, m.ch.lines[(Math.random() * m.ch.lines.length) | 0], null);
    wrap.appendChild(dchoiceBtn('🍼 About the little one', () => {
      dialogueHtml(m.ch.name, m.ch.emoji, m.ch.about, null);
    }));
    wrap.appendChild(dchoiceBtn('💬 Chat', () => {
      dialogueHtml(m.ch.name, m.ch.emoji, m.ch.lines[(Math.random() * m.ch.lines.length) | 0], null);
    }));
  } else {
    dialogueHtml(m.ch.name, m.ch.emoji, m.ch.babble[(Math.random() * m.ch.babble.length) | 0], null);
    wrap.appendChild(dchoiceBtn('🤗 Peek-a-boo', () => {
      dialogueHtml(m.ch.name, m.ch.emoji, '*peek-a-boo!* ' + m.ch.babble[(Math.random() * m.ch.babble.length) | 0], null);
      if (ctx.ui.effectsOn()) ctx.effects.spawnHearts(2, m.doll.group.position);
      m.doll.wave();
    }));
    wrap.appendChild(dchoiceBtn('🎵 Sing a lullaby', () => {
      dialogueHtml(m.ch.name, m.ch.emoji, '*sways to the lullaby* ' + m.ch.babble[(Math.random() * m.ch.babble.length) | 0], null);
      if (ctx.ui.effectsOn()) ctx.effects.spawnHearts(1, m.doll.group.position);
    }));
  }
  wrap.appendChild(dchoiceBtn('👋 Bye', closeDialogue));
  $('dialogue').appendChild(wrap);
}
const _famTarget = new THREE.Vector3();
export function updateFamily(f, dt, t) {
  const inThisHome = ctx.game.mode === 'house' && getActiveHome() && getActiveHome().id === f.home.id;
  for (const m of f.members) {
    const p = m.doll.group.position;
    if (m.where === 'in') {
      /* wander near the spot (babies tighter) */
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 1.5 + Math.random() * 3.5;
        const rad = m.kind === 'baby' ? 0.8 : 2.2;
        _famTarget.set(
          THREE.MathUtils.clamp(m.spot.x + (Math.random() - 0.5) * rad * 2, -3.4, 3.4), 0,
          THREE.MathUtils.clamp(m.spot.z + (Math.random() - 0.5) * rad * 2, -2.2, 2.4));
        m.target.copy(_famTarget);
      }
      const dx = m.target.x - p.x, dz = m.target.z - p.z;
      const d = Math.hypot(dx, dz);
      const speed = m.kind === 'baby' ? 0.5 : 0.8;
      if (d > 0.15) {
        p.x += (dx / d) * speed * dt;
        p.z += (dz / d) * speed * dt;
        m.doll.group.rotation.y = lerpAngle(m.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 5));
        m.walk01 = m.kind === 'baby' ? 0.5 : 0.35;
      } else m.walk01 = 0;
      /* face the visitor while chatting distance */
      if (inThisHome) {
        const to = ctx.player.group.position;
        const dp = Math.hypot(to.x - p.x, to.z - p.z);
        if (dp < 2.6) {
          m.doll.group.rotation.y = lerpAngle(m.doll.group.rotation.y, Math.atan2(to.x - p.x, to.z - p.z), Math.min(1, dt * 4));
          m.waveT -= dt;
          if (m.waveT <= 0) { m.doll.wave(); m.waveT = 5 + Math.random() * 5; }
          if (m.kind === 'baby') {
            m.giggleT -= dt;
            if (m.giggleT <= 0) {
              m.giggleT = 6 + Math.random() * 8;
              if (ctx.ui.effectsOn()) ctx.effects.spawnHearts(1, p);
            }
          }
        }
      }
      /* parents: rare outing */
      if (m.kind === 'parent') {
        m.outingT -= dt;
        if (m.outingT <= 0 && !inThisHome) {
          /* step outside for a short stroll */
          m.where = 'out';
          m.lingerT = 25 + Math.random() * 30;
          m.outingT = 240 + Math.random() * 320;
          ctx.world.group.add(m.doll.group);
          m.doll.group.position.copy(f.home.exit);
          m.doll.group.rotation.y = Math.atan2(f.home.pos.x - f.home.exit.x, f.home.pos.z - f.home.exit.z);
        }
      }
    } else {
      /* outside: linger near the door, then head back in */
      m.lingerT -= dt;
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 4 + Math.random() * 4;
        _famTarget.set(
          f.home.exit.x + (Math.random() - 0.5) * 4, 0,
          f.home.exit.z + (Math.random() - 0.5) * 4);
        m.target.copy(_famTarget);
      }
      const dx = m.target.x - p.x, dz = m.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.2) {
        p.x += (dx / d) * 0.9 * dt;
        p.z += (dz / d) * 0.9 * dt;
        m.doll.group.rotation.y = lerpAngle(m.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 5));
        m.walk01 = 0.4;
      } else m.walk01 = 0;
      if (m.lingerT <= 0) {
        /* walk back inside */
        m.where = 'in';
        f.home.interior.group.add(m.doll.group);
        m.doll.group.position.copy(m.spot);
        m.target.copy(m.spot);
      }
      /* keep within world bounds */
      resolveWorldCollisions(p, 0.3);
    }
    m.doll.update({ walk01: m.walk01, dance01: 0, beatPhase: ctx.music.beatPhase() }, dt, t);
  }
}

/* ------------------------------------------------------------------ */
/* Palace guards (flank the gate, stand at attention, chat only)       */
/* ------------------------------------------------------------------ */
export const guards = [];
const GUARD_SPOT = { z: -42.3, x: 2.6 }; /* just outside the gate interact ring */
const GUARD_CFG = {
  gender: 'male',
  hair: 'mshort', hairColor: '#3b2a20', skin: '#b5714f', eyes: '#3a2a1e',
  outfit: 'smart', top: '#d9485e', skirt: '#f2e7d4',
  shoes: 'boots', shoeColor: '#4a3a2a',
  accessories: { bow: true, crown: false, glasses: false, wings: false, halo: false, wand: false },
};
const GUARD_DEFS = [
  { id: 'guardgum', emoji: '🍬', name: 'Guard Gumdrop', side: -1,
    lines: [
      'Halt! ...Just kidding — the palace is open to everyone.',
      'Mind the chocolate river on your way in, traveller.',
      'The King loves visitors. Head on through!',
      'I have stood here so long, I have grown roots. Sweet, sugary roots.',
      'Between us? The Chef Bleso bakes the guards extra cookies.',
    ] },
  { id: 'guardtaffy', emoji: '🍭', name: 'Guard Taffy', side: 1,
    lines: [
      'Welcome to the Candy Palace! Wipe your feet, please.',
      'The royal family is receiving guests inside.',
      'I once caught a gummy bear sneaking in. We shared it.',
      'Pretty sweet post, right? Heh. Pretty sweet.',
      'If you see a sparkle trail in the throne room — that was not me.',
    ] },
];
export function buildGuards() {
  for (const g of guards) {
    g.doll.group.parent && g.doll.group.parent.remove(g.doll.group);
    g.spear.parent && g.spear.parent.remove(g.spear);
    g.doll.dispose();
  }
  guards.length = 0;
  /* drop previous guard colliders, then add fresh ones */
  for (let i = ctx.world.circles.length - 1; i >= 0; i--) {
    if (ctx.world.circles[i].__guard) ctx.world.circles.splice(i, 1);
  }
  for (const def of GUARD_DEFS) {
    const x = def.side * GUARD_SPOT.x;
    const doll = createDoll({ ...GUARD_CFG });
    doll.group.position.set(x, 0, GUARD_SPOT.z);
    doll.group.rotation.y = 0; /* face the approach (south) */
    doll.setPose('stand');
    ctx.world.group.add(doll.group);
    /* candy-cane spear planted beside each guard */
    const spear = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.3, 10),
      new THREE.MeshStandardMaterial({ color: '#fff6ec', roughness: 0.4 }));
    shaft.castShadow = true;
    spear.add(shaft);
    /* stripe the shaft with pink bands */
    for (let y = -1.05; y <= 1.05; y += 0.3) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.15, 10),
        new THREE.MeshStandardMaterial({ color: '#f45d8e', roughness: 0.4 }));
      band.position.y = y;
      spear.add(band);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: '#ffd45e', metalness: 0.5, roughness: 0.3 }));
    tip.position.y = 1.28;
    spear.add(tip);
    spear.position.set(x + def.side * 0.55, 1.15, GUARD_SPOT.z + 0.15);
    ctx.world.group.add(spear);
    ctx.world.circles.push({ x, z: GUARD_SPOT.z, r: 0.42, __guard: true });
    guards.push({ doll, ch: def, side: def.side, spear, waveTimer: 3 + Math.random() * 4 });
  }
}
export function nearestGuard(maxD = 4) {
  let best = null, bestD = maxD;
  for (const g of guards) {
    const d2 = g.doll.group.position.distanceToSquared(ctx.player.group.position);
    if (d2 < bestD) { bestD = d2; best = g; }
  }
  return best;
}
export function talkToGuard(g) {
  g.doll.wave();
  const line = g.ch.lines[(Math.random() * g.ch.lines.length) | 0];
  const choices = document.createElement('div');
  choices.className = 'dchoices';
  choices.appendChild(dchoiceBtn('💬 Chat', () => {
    const l = g.ch.lines[(Math.random() * g.ch.lines.length) | 0];
    dialogueHtml(g.ch.name, g.ch.emoji, l, null);
  }));
  choices.appendChild(dchoiceBtn('👋 Bye', closeDialogue));
  dialogueHtml(g.ch.name, g.ch.emoji, line, null);
  $('dialogue').appendChild(choices);
}
export function updateGuard(g, dt, t) {
  const p = g.doll.group.position;
  const to = ctx.player.group.position;
  const d = Math.hypot(to.x - p.x, to.z - p.z);
  if (d < 4.5 && ctx.game.mode === 'world') {
    /* stand at attention and face the visitor */
    g.doll.group.rotation.y = lerpAngle(g.doll.group.rotation.y, Math.atan2(to.x - p.x, to.z - p.z), Math.min(1, dt * 5));
    g.waveTimer -= dt;
    if (g.waveTimer <= 0) {
      g.doll.wave();
      g.waveTimer = 5 + Math.random() * 5;
    }
  } else {
    g.doll.group.rotation.y = lerpAngle(g.doll.group.rotation.y, 0, Math.min(1, dt * 2));
  }
  g.doll.update({ walk01: 0, dance01: 0, beatPhase: ctx.music.beatPhase() }, dt, t);
}

/* ------------------------------------------------------------------ */
/* The royal family (live inside the palace, never leave)              */
/* ------------------------------------------------------------------ */
export const royals = [];
const ROYAL_SPOTS = {
  jamoh: [2.6, -6.0], dama: [10.6, 2.4], ken: [9.2, -6.2],
  fay: [9.8, 4.4], whitney: [9.5, -7.6], bleso: [-6.5, 6.2],
};
export function buildRoyals() {
  for (const n of royals) {
    n.doll.group.parent && n.doll.group.parent.remove(n.doll.group);
    n.doll.dispose();
  }
  royals.length = 0;
  for (const ch of ctx.CHARACTERS.filter((c) => c.royal)) {
    const doll = createDoll(ctx.cfgFor(ch.id));
    const [hx, hz] = ROYAL_SPOTS[ch.id] || [0, 0];
    doll.group.position.set(hx, 0, hz);
    doll.group.rotation.y = Math.random() * Math.PI * 2;
    ctx.world.castle.group.add(doll.group);
    royals.push({
      doll, ch,
      state: 'idle',
      timer: 1 + Math.random() * 4,
      target: new THREE.Vector3(hx, 0, hz),
      speed: 1.7 + Math.random() * 0.8,
      waveTimer: 0.5 + Math.random() * 3,
      lastPos: new THREE.Vector3(hx, 0, hz),
      stuckTimer: 0,
      tick: Math.random() * 10 | 0,
      sitting: false,
      sitSpot: null,
    });
  }
}
export function nearestRoyal(maxD = 6.25) {
  let best = null, bestD = maxD;
  for (const n of royals) {
    const d2 = n.doll.group.position.distanceToSquared(ctx.player.group.position);
    if (d2 < bestD) { bestD = d2; best = n; }
  }
  return best;
}

export function updateRoyal(n, dt, t) {
  const p = n.doll.group.position;
  const toPlayer = { x: ctx.player.group.position.x - p.x, z: ctx.player.group.position.z - p.z };
  const distToPlayer = Math.hypot(toPlayer.x, toPlayer.z);

  if (distToPlayer < 3) {
    /* greet the visitor */
    n.state = 'greet';
    n.doll.setPose('stand');
    n.sitting = false;
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(toPlayer.x, toPlayer.z), Math.min(1, dt * 6));
    n.waveTimer -= dt;
    if (n.waveTimer <= 0) {
      n.doll.wave();
      n.waveTimer = 4 + Math.random() * 4;
      if (ctx.ui.effectsOn() && Math.random() < 0.4) ctx.effects.spawnHearts(1, p);
    }
    return;
  }
  if (n.sitting) {
    n.timer -= dt;
    if (n.timer <= 0) {
      n.sitting = false;
      n.doll.setPose('stand');
      n.doll.group.position.y = 0;
      n.state = 'idle';
      n.timer = 0.6;
    }
    return;
  }
  if (n.state === 'idle') {
    n.timer -= dt;
    if (n.timer <= 0) {
      if (Math.random() < 0.35) {
        /* pick a chair and go sit */
        const spot = ctx.world.castle.sits[(Math.random() * ctx.world.castle.sits.length) | 0];
        n.target.set(spot.x, 0, spot.z);
        n.sitSpot = spot;
      } else {
        pickInteriorTarget(n, ctx.world.castle.bounds);
        n.sitSpot = null;
      }
      n.state = 'walk';
    }
    return;
  }
  /* walking */
  const dx = n.target.x - p.x, dz = n.target.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.35) {
    if (n.sitSpot && Math.hypot(p.x - n.sitSpot.x, p.z - n.sitSpot.z) < 0.6) {
      /* arrived at the chair — sit down */
      n.sitting = true;
      n.doll.setPose('sit');
      n.doll.group.position.y = 0.12;
      n.doll.group.rotation.y = n.sitSpot.ry;
      n.timer = 7 + Math.random() * 10;
      n.state = 'sit';
    } else {
      n.state = 'idle';
      n.timer = 1.5 + Math.random() * 3.5;
    }
  } else {
    p.x += (dx / d) * (n.speed * dt);
    p.z += (dz / d) * (n.speed * dt);
    n.doll.group.rotation.y = lerpAngle(n.doll.group.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
  }
  resolveCastleCollisions(p, 0.26);
  n.stuckTimer += dt;
  if (n.stuckTimer > 1.6) {
    if (p.distanceToSquared(n.lastPos) < 0.09) {
      pickInteriorTarget(n, ctx.world.castle.bounds);
      n.sitSpot = null;
      if (n.state === 'idle') n.timer = 0.2;
    }
    n.lastPos.copy(p);
    n.stuckTimer = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Talking                                                            */
/* ------------------------------------------------------------------ */
export function npcQuestAction(n) {
  const q = n.ch.quest;
  const stage = ctx.progress.questStage(q.id);
  if (stage === 'done') {
    dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    return;
  }
  if (stage === 0) {
    ctx.progress.setQuestStage(q.id, 1);
    ctx.save();
    ctx.quests.updateTracker();
    ctx.quests.renderJournal();
    dialogueHtml(n.ch.name, n.ch.emoji, q.offer, null);
    ctx.ui.toast(`📜 New quest: <b>${ctx.quests.QUESTS.find((x) => x.id === q.id).title}</b>`, 3000);
    return;
  }
  /* active */
  if (q.id === 'princeFavor') {
    if (ctx.inventory.candyBalance() >= 8) {
      ctx.state.spent += 8; /* the candies are handed over */
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
      ctx.ui.updateStats();
    } else {
      const need = 8 - ctx.inventory.candyBalance();
      dialogueHtml(n.ch.name, n.ch.emoji, q.active.replace('{N}', need), null);
    }
    return;
  }
  if (q.id === 'royalDecree') {
    if (ctx.quests.royalsMet() >= 5) {
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    } else {
      dialogueHtml(n.ch.name, n.ch.emoji, q.active.replace('{N}', ctx.quests.royalsMet()), null);
    }
    return;
  }
  if (q.id === 'queensGame') {
    if (ctx.state.progress.games.catchBest >= 10) {
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    } else {
      dialogueHtml(n.ch.name, n.ch.emoji, q.active.replace('{N}', ctx.state.progress.games.catchBest), null);
    }
    return;
  }
  if (q.id === 'ringChampion') {
    const best = ctx.state.progress.games.raceBest;
    if (best !== null && best !== undefined && best <= RACE_PAR) {
      ctx.quests.completeQuest(q.id);
      dialogueHtml(n.ch.name, n.ch.emoji, q.done, null);
    } else {
      dialogueHtml(n.ch.name, n.ch.emoji,
        q.active.replace('{N}', best === null || best === undefined ? 'no time yet' : best.toFixed(1) + 's').replace('{PAR}', RACE_PAR), null);
    }
    return;
  }
  dialogueHtml(n.ch.name, n.ch.emoji, q.active, null);
}

export function talkToNpc(n) {
  n.doll.wave();
  const line = n.ch.lines[(Math.random() * n.ch.lines.length) | 0];
  const choices = [];
  if (n.ch.quest) {
    const stage = ctx.progress.questStage(n.ch.quest.id);
    const label = stage === 0 ? '📜 Quest' : (stage === 'done' ? '📜 Quest' : '📜 How goes it?');
    choices.push(dchoiceBtn(label, () => npcQuestAction(n), true));
  }
  choices.push(dchoiceBtn('💬 Chat', () => {
    const l = n.ch.lines[(Math.random() * n.ch.lines.length) | 0];
    dialogueHtml(n.ch.name, n.ch.emoji, l, null);
  }));
  choices.push(dchoiceBtn('👋 Bye', closeDialogue));
  dialogueHtml(n.ch.name, n.ch.emoji, line, null);
  /* render choice buttons after the line */
  const wrap = document.createElement('div');
  wrap.className = 'dchoices';
  for (const c of choices) wrap.appendChild(c);
  $('dialogue').appendChild(wrap);

  /* escort quest: first talk sets homeSweet stage */
  if (!ctx.progress.isQuestDone('homeSweet') && ctx.progress.questStage('homeSweet') === 0) {
    ctx.progress.setQuestStage('homeSweet', 1);
    ctx.ui.toast(`🏡 <b>${n.ch.name}</b> will meet you at the gumdrop village!`, 3200);
    ctx.quests.updateTracker();
    ctx.save();
  }

  /* the King's decree: remember which royals you have met */
  if (n.ch.royal && !ctx.state.progress.met[n.ch.id]) {
    ctx.state.progress.met[n.ch.id] = true;
    ctx.save();
    if (ctx.progress.questStage('royalDecree') === 1 && !ctx.progress.isQuestDone('royalDecree')) {
      ctx.quests.updateTracker();
      if (n.ch.id !== 'jamoh') ctx.ui.toast(`👑 Family met: <b>${ctx.quests.royalsMet()}/5</b>`, 2000);
    } else if (n.ch.id !== 'jamoh' && !ctx.state.progress.met.__royalHello) {
      ctx.state.progress.met.__royalHello = true;
      ctx.ui.toast('👑 You met the royal family! Talk to <b>King Jamoh</b> for his decree.', 3200);
      ctx.save();
    }
  }
}
