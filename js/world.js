/* =====================================================================
   world.js — the Candy World: open environment + candy-cane maze
   Returns colliders (AABBs + circles), animated props, and update().
   ===================================================================== */
import * as THREE from 'three';

/* ---------- helpers ---------- */
function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}
function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02, ...o });
}

/* candy-cane diagonal stripes */
function stripeTex() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fff4f6';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#f45d8e';
    const band = 22;
    for (let x = -w * 1.2; x < w * 1.2; x += band * 2) {
      ctx.fillRect(x, -h, band, h * 2.5);
    }
    ctx.restore();
  }, 1, 1);
}
/* chocolate for the river */
function chocolateTex() {
  return canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7a4a2b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,220,190,0.25)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const y0 = Math.random() * h;
      ctx.moveTo(0, y0);
      for (let x = 0; x <= w; x += 32) {
        ctx.lineTo(x, y0 + Math.sin(x / 28 + i) * 9);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(60,32,16,0.35)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 6, 1);
}
/* sprinkle "frosting grass" ground */
function sprinkleTex(base = '#d5f0d8') {
  const colors = ['#ff8fb7', '#ffd45e', '#63b8f5', '#a7d97a', '#b57de0', '#fff'];
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < 340; i++) {
      ctx.save();
      ctx.rotate(Math.random() * Math.PI * 2);
      ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
      const len = 10 + Math.random() * 12, th = 4;
      ctx.beginPath();
      const x = (Math.random() - 0.5) * w * 1.1, y = (Math.random() - 0.5) * h * 1.1;
      ctx.roundRect ? ctx.roundRect(x, y, len, th, th / 2) : ctx.rect(x, y, len, th);
      ctx.fill();
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, 26, 26);
}
/* wooden sign text */
function signTex(text, sub) {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f7e3c8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = '#5b4a63';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText(text, w / 2, sub ? h / 2 - 34 : h / 2);
    if (sub) {
      ctx.font = '600 44px system-ui, sans-serif';
      ctx.fillText(sub, w / 2, h / 2 + 44);
    }
  });
}
function dotTexture() {
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
}

/* =====================================================================
   createWorld(scene, lightDir) -> api
   ===================================================================== */
export function createWorld(scene, keyLight) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const boxes = [];    // AABB colliders {minX,maxX,minZ,maxZ}
  const circles = [];  // round colliders {x,z,r}
  const R_BOUND = 50;  // world radius

  const stripes = stripeTex();
  const stripesMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 });

  /* ---------------- ground ---------------- */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(R_BOUND + 26, 64),
    new THREE.MeshStandardMaterial({ map: sprinkleTex(), roughness: 0.85 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  /* ---------------- maze (candy-cane blocks) ---------------- */
  const GRID = 21;           // odd blocks
  const CELL = 1.8;          // block size
  const HALF = (GRID - 1) / 2;
  const MAZE_H = 2.6;

  const grid = Array.from({ length: GRID }, () => Array(GRID).fill(1));
  /* DFS carve */
  const stack = [[1, 1]];
  grid[1][1] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => Math.random() - 0.5);
    let moved = false;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx > 0 && nx < GRID - 1 && ny > 0 && ny < GRID - 1 && grid[ny][nx] === 1) {
        grid[ny][nx] = 0;
        grid[cy + dy / 2][cx + dx / 2] = 0;
        stack.push([nx, ny]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  /* center plaza (3x3) */
  for (let y = 9; y <= 11; y++) for (let x = 9; x <= 11; x++) grid[y][x] = 0;
  /* entrance (south) + exit (north) — clear boundary AND the block behind it */
  grid[GRID - 1][10] = 0;
  grid[GRID - 2][10] = 0;
  grid[0][10] = 0;
  grid[1][10] = 0;

  const wallCells = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (grid[y][x] === 1) wallCells.push([x, y]);
    }
  }
  const wallGeo = new THREE.BoxGeometry(CELL, MAZE_H, CELL);
  const walls = new THREE.InstancedMesh(wallGeo, stripesMat, wallCells.length);
  walls.castShadow = true;
  walls.receiveShadow = true;
  {
    const d = new THREE.Object3D();
    wallCells.forEach(([x, y], i) => {
      d.position.set((x - HALF) * CELL, MAZE_H / 2, (y - HALF) * CELL);
      d.updateMatrix();
      walls.setMatrixAt(i, d.matrix);
      boxes.push({
        minX: (x - HALF) * CELL - CELL / 2, maxX: (x - HALF) * CELL + CELL / 2,
        minZ: (y - HALF) * CELL - CELL / 2, maxZ: (y - HALF) * CELL + CELL / 2,
      });
    });
    walls.instanceMatrix.needsUpdate = true;
  }
  group.add(walls);

  /* maze island slab + chocolate rim */
  const island = new THREE.Mesh(new THREE.BoxGeometry(GRID * CELL + 2.4, 0.08, GRID * CELL + 2.4),
    mat('#8a5a3a', { roughness: 0.9 }));
  island.position.y = -0.02;
  island.receiveShadow = true;
  group.add(island);
  const rim = new THREE.Mesh(new THREE.TorusGeometry((GRID * CELL + 2.4) / 2, 0.07, 10, 96),
    mat('#6b3f24', { roughness: 0.8 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.03;
  group.add(rim);

  /* star candy gem at maze center */
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85),
    new THREE.MeshStandardMaterial({ color: '#ff9ec6', emissive: '#ff6fa5', emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.3 })
  );
  gem.position.set(0, 1.35, 0);
  gem.castShadow = true;
  group.add(gem);
  const gemLight = new THREE.PointLight('#ff8fb7', 12, 10);
  gemLight.position.set(0, 1.8, 0);
  group.add(gemLight);
  let gemActive = true, gemRespawn = 0;

  /* ---------------- candy canes at the entrance ---------------- */
  function candyCane(x, z, s = 1) {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.28 * s, 4.6 * s, 14), stripesMat);
    stick.position.y = 2.3 * s;
    stick.castShadow = true;
    g.add(stick);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.75 * s, 0.26 * s, 12, 24, Math.PI), stripesMat);
    hook.position.set(0.75 * s, 4.6 * s, 0);
    hook.castShadow = true;
    g.add(hook);
    g.position.set(x, 0, z);
    group.add(g);
    circles.push({ x, z, r: 0.55 * s });
  }
  candyCane(-2.4, HALF * CELL + 3.2, 1);
  candyCane(2.4, HALF * CELL + 3.2, 1);

  /* ---------------- signposts ---------------- */
  function sign(x, z, rotY, text, sub) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.7, 8), mat('#a5713f'));
    post.position.y = 0.85;
    post.castShadow = true;
    g.add(post);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2),
      new THREE.MeshStandardMaterial({ map: signTex(text, sub), roughness: 0.7 }));
    board.position.y = 1.7;
    board.castShadow = true;
    g.add(board);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
    circles.push({ x, z, r: 0.4 });
  }
  sign(3.4, HALF * CELL + 4.2, 0.28, '🍭 The Maze', 'find the Star Candy');
  sign(-3.4, -HALF * CELL - 4.2, -0.28 + Math.PI, '🏔️ Ice Cream Peaks', '');

  /* ---------------- lollipop forest ---------------- */
  const LOOPS = 64;
  const stemGeo = new THREE.CylinderGeometry(0.16, 0.2, 2.8, 10);
  const topGeo = new THREE.SphereGeometry(0.78, 16, 12);
  const stems = new THREE.InstancedMesh(stemGeo, mat('#fff6ec', { roughness: 0.5 }), LOOPS);
  const tops = new THREE.InstancedMesh(topGeo, new THREE.MeshStandardMaterial({ roughness: 0.35 }), LOOPS);
  stems.castShadow = tops.castShadow = true;
  {
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const palette = ['#ff8fb7', '#f45d8e', '#ffd45e', '#4fc3ae', '#63b8f5', '#b57de0', '#ff9e4f'];
    let placed = 0, guard = 0;
    while (placed < LOOPS && guard++ < 900) {
      const a = Math.random() * Math.PI * 2;
      const r = 24 + Math.random() * 22;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 22 && Math.abs(z) < 22) continue;         // keep off the maze island
      if (z > 28 && z < 36 && Math.abs(x) < 48) continue;         // keep off the river
      const s = 0.75 + Math.random() * 0.7;
      d.position.set(x, 1.4 * s, z);
      d.scale.setScalar(s);
      d.rotation.set(0, 0, (Math.random() - 0.5) * 0.14);
      d.updateMatrix();
      stems.setMatrixAt(placed, d.matrix);
      d.position.y = (2.8 + 0.55) * s;
      d.updateMatrix();
      tops.setMatrixAt(placed, d.matrix);
      tops.setColorAt(placed, col.set(palette[(Math.random() * palette.length) | 0]));
      circles.push({ x, z, r: 0.42 * s });
      placed++;
    }
    stems.count = tops.count = placed;
    stems.instanceMatrix.needsUpdate = true;
    tops.instanceMatrix.needsUpdate = true;
    if (tops.instanceColor) tops.instanceColor.needsUpdate = true;
  }
  group.add(stems, tops);

  /* giant lollipops (landmarks) */
  for (const [x, z, c] of [[-30, -14, '#f45d8e'], [30, -16, '#b57de0'], [-26, 26, '#63b8f5'], [27, 25, '#ffd45e']]) {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 7, 12), mat('#fff6ec'));
    stick.position.y = 3.5;
    stick.castShadow = true;
    g.add(stick);
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 18), mat(c, { roughness: 0.3 }));
    top.position.y = 7.6;
    top.castShadow = true;
    g.add(top);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI;
    group.add(g);
    circles.push({ x, z, r: 1.1 });
  }

  /* ---------------- gumdrops & marshmallows ---------------- */
  {
    const N = 46;
    const geo = new THREE.SphereGeometry(0.62, 12, 10);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.3 }), N);
    im.castShadow = true;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const palette = ['#ff8fb7', '#ffd45e', '#a7d97a', '#63b8f5', '#b57de0', '#ff9e4f'];
    let placed = 0, guard = 0;
    while (placed < N && guard++ < 500) {
      const a = Math.random() * Math.PI * 2;
      const r = 23 + Math.random() * 23;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 22 && Math.abs(z) < 22) continue;
      if (z > 28 && z < 36) continue;
      const s = 0.7 + Math.random() * 0.8;
      d.position.set(x, 0.35 * s, z);
      d.scale.set(s, s * 0.72, s);
      d.rotation.y = Math.random() * Math.PI;
      d.updateMatrix();
      im.setMatrixAt(placed, d.matrix);
      im.setColorAt(placed, col.set(palette[(Math.random() * palette.length) | 0]));
      circles.push({ x, z, r: 0.55 * s });
      placed++;
    }
    im.count = placed;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
  }
  {
    const N = 30;
    const geo = new THREE.BoxGeometry(1.1, 0.8, 1.1);
    const im = new THREE.InstancedMesh(geo, mat('#fffaf4', { roughness: 0.9 }), N);
    im.castShadow = true;
    const d = new THREE.Object3D();
    let placed = 0, guard = 0;
    while (placed < N && guard++ < 400) {
      const a = Math.random() * Math.PI * 2;
      const r = 23 + Math.random() * 24;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 22 && Math.abs(z) < 22) continue;
      if (z > 27 && z < 37) continue;
      const s = 0.7 + Math.random() * 0.9;
      d.position.set(x, 0.4 * s, z);
      d.scale.setScalar(s);
      d.rotation.y = Math.random() * Math.PI;
      d.updateMatrix();
      im.setMatrixAt(placed, d.matrix);
      placed++;
    }
    im.count = placed;
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }

  /* ---------------- chocolate river + donut stones ---------------- */
  const riverTex = chocolateTex();
  const river = new THREE.Mesh(new THREE.PlaneGeometry(R_BOUND * 2 + 30, 5.4),
    new THREE.MeshStandardMaterial({ map: riverTex, roughness: 0.25, metalness: 0.05 }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.025, 32);
  group.add(river);
  /* banks */
  for (const zEdge of [29.2, 34.8]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(R_BOUND * 2 + 30, 0.5, 0.9),
      mat('#f2dbe2', { roughness: 0.8 }));
    bank.position.set(0, 0.18, zEdge);
    bank.receiveShadow = true;
    group.add(bank);
  }
  /* colliders with 3 gaps (donut crossings) */
  for (const [x0, x1] of [[-R_BOUND - 15, -21], [-15, -3], [3, 15], [21, R_BOUND + 15]]) {
    boxes.push({ minX: x0, maxX: x1, minZ: 29.6, maxZ: 34.4 });
  }
  const donutMat = mat('#ff8fb7', { roughness: 0.4 });
  const donutGeo = new THREE.TorusGeometry(1.5, 0.55, 14, 28);
  for (const x of [-18, 0, 18]) {
    const donut = new THREE.Mesh(donutGeo, donutMat);
    donut.rotation.x = -Math.PI / 2;
    donut.position.set(x, 0.12, 32);
    donut.castShadow = true;
    donut.receiveShadow = true;
    group.add(donut);
  }

  /* ---------------- ice cream mountains ---------------- */
  for (const [x, z, r, h, c] of [
    [-42, 52, 9, 15, '#f7c5d8'], [-18, 58, 12, 20, '#ffe3b8'],
    [4, 55, 10, 17, '#cfe6ff'], [26, 58, 13, 21, '#f7c5d8'], [48, 52, 9, 15, '#ffe3b8'],
  ]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), mat('#e9b98a', { roughness: 0.8 }));
    cone.position.set(x, h / 2, z);
    group.add(cone);
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 20, 16), mat(c, { roughness: 0.7 }));
    scoop.position.set(x, h + r * 0.35, z);
    group.add(scoop);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(r * 0.18, 12, 10), mat('#f45d8e'));
    cherry.position.set(x, h + r * 0.8, z);
    group.add(cherry);
  }

  /* ---------------- giant cupcake ---------------- */
  {
    const g = new THREE.Group();
    const wrapper = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.9, 2.3, 24), stripesMat);
    wrapper.position.y = 1.15;
    wrapper.castShadow = true;
    g.add(wrapper);
    for (const [r, y, c] of [[2.1, 2.9, '#fff0f6'], [1.6, 3.7, '#ffd9e6'], [1.05, 4.35, '#fff0f6']]) {
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(c, { roughness: 0.5 }));
      scoop.position.y = y;
      scoop.castShadow = true;
      g.add(scoop);
    }
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat('#f45d8e', { roughness: 0.3 }));
    cherry.position.y = 5.15;
    g.add(cherry);
    g.position.set(-27, 0, 10);
    group.add(g);
    circles.push({ x: -27, z: 10, r: 2.6 });
  }

  /* ---------------- cotton candy clouds ---------------- */
  const clouds = [];
  const cloudMat = mat('#ffffff', { roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 11; i++) {
    const c = new THREE.Group();
    const a = (i / 11) * Math.PI * 2 + Math.random() * 0.5;
    const r = 26 + Math.random() * 28;
    const baseY = 13 + Math.random() * 8;
    const s = 1.6 + Math.random() * 2.4;
    for (const [ox, oy, oz, sc] of [[0, 0, 0, 1], [1.15, 0.25, 0.2, 0.75], [-1.1, 0.15, -0.15, 0.7]]) {
      const puffBall = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10), cloudMat);
      puffBall.position.set(ox * s, oy * s, oz * s);
      puffBall.scale.setScalar(sc * s);
      c.add(puffBall);
    }
    c.position.set(Math.cos(a) * r, baseY, Math.sin(a) * r);
    c.userData = { baseY, speed: 0.25 + Math.random() * 0.4, phase: Math.random() * 6 };
    group.add(c);
    clouds.push(c);
  }

  /* ---------------- sparkles ---------------- */
  function sparkleField(count, radius, yMin, yMax, size, color) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * (0.2 + 0.8 * Math.random());
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size, map: dotTexture(), transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(color),
    }));
    group.add(pts);
    return pts;
  }
  const sparkA = sparkleField(220, R_BOUND, 0.4, 11, 0.14, '#ffffff');
  const sparkB = sparkleField(110, R_BOUND, 0.4, 11, 0.26, '#fff2c9');

  /* ================= SWEET FANTASY UPGRADE ================= */

  /* ---------------- frosting meadows (pastel colour patches) ---------------- */
  for (const [x, z, r, c] of [
    [9, 17, 7.5, '#cdeedd'], [-11, 14, 6.5, '#e4d9f7'], [24, 27, 7, '#fdf3d9'],
    [-24, 21, 6.5, '#d9ecf7'], [12, 33, 6, '#cdeedd'], [-14, 27, 5.5, '#fbdcec'],
  ]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 40),
      mat(c, { roughness: 0.9 }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.012, z);
    patch.receiveShadow = true;
    group.add(patch);
  }

  /* ---------------- cookie path: spawn -> maze entrance ---------------- */
  {
    const cookieMat = mat('#d9a066', { roughness: 0.85 });
    const chipMat = mat('#5b3a22', { roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const z = 25 - i * 0.95;
      const x = Math.sin(i * 1.3) * 0.35;
      const cookie = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.045, 20), cookieMat);
      cookie.position.set(x, 0.025, z);
      cookie.receiveShadow = true;
      group.add(cookie);
      for (let k = 0; k < 3; k++) {
        const chip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), chipMat);
        chip.scale.y = 0.5;
        chip.position.set(x + (Math.random() - 0.5) * 0.7, 0.05, z + (Math.random() - 0.5) * 0.7);
        group.add(chip);
      }
    }
  }

  /* ---------------- candy castle (north, past the maze exit) ---------------- */
  {
    const castle = new THREE.Group();
    const wallMat = mat('#fdf0f5', { roughness: 0.6 });
    const roofPink = mat('#f45d8e', { roughness: 0.4 });
    const roofBlue = mat('#63b8f5', { roughness: 0.4 });
    const roofGold = mat('#ffd45e', { roughness: 0.35 });
    function tower(x, z, r, h, roofMat_, roofH) {
      const t = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 18), wallMat);
      body.position.y = h / 2;
      body.castShadow = true;
      t.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, roofH, 18), roofMat_);
      roof.position.y = h + roofH / 2;
      roof.castShadow = true;
      t.add(roof);
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8), roofGold);
      flag.position.y = h + roofH + 0.22;
      t.add(flag);
      /* stripe bands */
      for (let y = 1; y < h; y += 1.8) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.16, 18), stripesMat);
        band.position.y = y;
        t.add(band);
      }
      t.position.set(x, 0, z);
      castle.add(t);
      circles.push({ x, z, r: r * 1.15 });
      return t;
    }
    tower(0, -44, 2.3, 10, roofPink, 3.4);
    tower(-5.4, -44.5, 1.7, 7, roofBlue, 2.6);
    tower(5.4, -44.5, 1.7, 7, roofBlue, 2.6);
    tower(-3.4, -48.5, 1.1, 5, roofGold, 1.8);
    tower(3.4, -48.5, 1.1, 5, roofGold, 1.8);
    /* gate wall between towers */
    const gate = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.6, 1.4), wallMat);
    gate.position.set(0, 2.3, -44);
    gate.castShadow = true;
    castle.add(gate);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.5, 20, 1, false, 0, Math.PI), mat('#8a5a3a'));
    door.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    door.position.set(0, 1.0, -43.2);
    castle.add(door);
    const crenellation = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.35, 1.7), roofPink);
    crenellation.position.set(0, 4.75, -44);
    castle.add(crenellation);
    group.add(castle);
    boxes.push({ minX: -4.3, maxX: 4.3, minZ: -44.7, maxZ: -43.3 });
  }

  /* ---------------- rainbow over the chocolate river ---------------- */
  {
    const rainbowColors = ['#f45d8e', '#ff9e4f', '#ffd45e', '#a7d97a', '#63b8f5', '#8f9cf5', '#b57de0'];
    const rainbow = new THREE.Group();
    rainbowColors.forEach((c, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(13.5 - i, 0.5, 8, 60, Math.PI),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 })
      );
      rainbow.add(arc);
    });
    rainbow.position.set(0, 0, 33);
    group.add(rainbow);
    /* clouds at both ends of the rainbow */
    const cloudEnd = mat('#ffffff', { roughness: 1 });
    for (const s of [-1, 1]) {
      for (const [ox, oy, sc] of [[0, 1.4, 1.3], [1.2, 1.1, 1], [-1.2, 1.2, 0.95]]) {
        const puffBall = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), cloudEnd);
        puffBall.position.set(s * 14.5 + ox, 1.6 + oy * 0.4, 33);
        puffBall.scale.setScalar(sc);
        group.add(puffBall);
      }
    }
  }

  /* ---------------- gumdrop village (near spawn) ---------------- */
  function gumdropHouse(x, z, color) {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(color, { roughness: 0.35 }));
    dome.position.y = 0.4;
    dome.castShadow = true;
    g.add(dome);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.35, 22), mat('#fff6ec'));
    base.position.y = 0.17;
    g.add(base);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16, 1, false, 0, Math.PI), mat('#8a5a3a'));
    door.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    door.position.set(0, 0.62, 1.42);
    g.add(door);
    for (const s of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshStandardMaterial({ color: '#fff3b8', emissive: '#ffd45e', emissiveIntensity: 0.35 }));
      win.position.set(s * 0.72, 0.95, 1.22);
      win.rotation.y = s * 0.4;
      g.add(win);
    }
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x + 0, -z + 20);
    group.add(g);
    circles.push({ x, z, r: 1.9 });
  }
  gumdropHouse(15.5, 23, '#ff8fb7');
  gumdropHouse(18.5, 19.5, '#a7d97a');
  gumdropHouse(12.5, 19, '#63b8f5');

  /* cupcake house */
  {
    const g = new THREE.Group();
    const wrapper = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.25, 1.5, 22), stripesMat);
    wrapper.position.y = 0.75;
    wrapper.castShadow = true;
    g.add(wrapper);
    const frosting = new THREE.Mesh(new THREE.SphereGeometry(1.55, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mat('#fdf0f6', { roughness: 0.5 }));
    frosting.position.y = 1.6;
    frosting.castShadow = true;
    g.add(frosting);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat('#f45d8e', { roughness: 0.3 }));
    cherry.position.y = 3.0;
    g.add(cherry);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16, 1, false, 0, Math.PI), mat('#8a5a3a'));
    door.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    door.position.set(0, 0.7, 1.35);
    g.add(door);
    g.position.set(-17, 0, 21);
    group.add(g);
    circles.push({ x: -17, z: 21, r: 2.1 });
  }

  /* ---------------- gummy bears ---------------- */
  function gummyBear(x, z, color) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.25, transparent: true, opacity: 0.85 });
    const bodyB = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), m);
    bodyB.position.y = 0.55;
    bodyB.scale.set(1, 1.15, 0.85);
    bodyB.castShadow = true;
    g.add(bodyB);
    const headB = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), m);
    headB.position.y = 1.3;
    g.add(headB);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), m);
      ear.position.set(s * 0.22, 1.58, 0);
      g.add(ear);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 4, 8), m);
      arm.position.set(s * 0.58, 0.7, 0.1);
      arm.rotation.z = s * 0.5;
      g.add(arm);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 8), m);
      leg.position.set(s * 0.26, 0.16, 0.08);
      g.add(leg);
    }
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mat('#fff6ec', { roughness: 0.4 }));
    belly.position.set(0, 0.48, 0.38);
    belly.scale.set(1, 1.2, 0.5);
    g.add(belly);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    group.add(g);
    circles.push({ x, z, r: 0.8 });
  }
  gummyBear(7, 14, '#ff8fb7');
  gummyBear(-8.5, 11, '#a7d97a');
  gummyBear(26, 6, '#ffd45e');
  gummyBear(-21, 4, '#63b8f5');
  gummyBear(21, 13, '#b57de0');
  gummyBear(-5, 31, '#ff9e4f');

  /* ---------------- cotton candy trees ---------------- */
  {
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.38, 2.6, 10);
    const trunkMat = mat('#c9a06a', { roughness: 0.85 });
    const fluffMats = ['#ffd9e6', '#fff0f6', '#e4d9f7', '#d9ecf7'].map((c) => mat(c, { roughness: 1 }));
    const spots = [[-30, 30], [30, 33], [-34, -8], [36, -2], [-6, 40], [20, 41], [-40, 34], [42, 18], [8, -34], [-13, -33]];
    spots.forEach(([x, z], i) => {
      const t = new THREE.Mesh(trunkGeo, trunkMat);
      t.position.set(x, 1.3, z);
      t.castShadow = true;
      group.add(t);
      const fm = fluffMats[i % fluffMats.length];
      const puffs = [[0, 3.1, 0, 1.15], [0.7, 2.8, 0.3, 0.75], [-0.65, 2.9, -0.25, 0.8], [0.1, 3.7, -0.1, 0.7]];
      for (const [ox, oy, oz, sc] of puffs) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), fm);
        p.position.set(x + ox, oy, z + oz);
        p.scale.setScalar(sc);
        group.add(p);
      }
      circles.push({ x, z, r: 0.75 });
    });
  }

  /* ---------------- whipped cream hills ---------------- */
  for (const [x, z, r, c] of [
    [-38, 14, 8, '#fff6ec'], [40, 26, 7.5, '#ffd9e6'], [-44, -20, 9, '#fff0f6'],
    [46, -18, 8, '#fdf3d9'], [-22, 42, 6.5, '#e4d9f7'], [26, 44, 7, '#d9ecf7'],
  ]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), mat(c, { roughness: 1 }));
    hill.position.set(x, -r * 0.55, z);
    hill.castShadow = true;
    group.add(hill);
    circles.push({ x, z, r: r * 0.82 });
  }

  /* ---------------- lollipop flowers ---------------- */
  {
    const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.9, 8);
    const stemMat = mat('#5eae6e', { roughness: 0.7 });
    const petalColors = ['#ff8fb7', '#ffd45e', '#63b8f5', '#b57de0', '#ff9e4f'];
    const spots = [
      [5, 18.5], [7.5, 20.5], [3, 20], [12, 25.5], [17, 26.5], [14, 28.5],
      [-6, 23.5], [-9, 25.5], [-3.5, 27], [-13, 25], [-20, 24.5], [8, 30.5],
    ];
    spots.forEach(([x, z], i) => {
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(x, 0.45, z);
      group.add(stem);
      const c = petalColors[i % petalColors.length];
      const pm = mat(c, { roughness: 0.45 });
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), pm);
        petal.position.set(x + Math.cos(a) * 0.14, 0.92, z + Math.sin(a) * 0.14);
        petal.scale.set(1.2, 0.55, 1.2);
        group.add(petal);
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat('#fff3b8'));
      center.position.set(x, 0.95, z);
      group.add(center);
    });
  }

  /* ---------------- butterflies ---------------- */
  const butterflies = [];
  {
    const bodyGeo = new THREE.CapsuleGeometry(0.022, 0.1, 3, 8);
    const bodyMat = mat('#4a3550', { roughness: 0.6 });
    const wingGeo = new THREE.CircleGeometry(0.17, 12);
    const wingColors = ['#ff8fb7', '#b57de0', '#63b8f5', '#ffd45e', '#a7d97a', '#ff9e4f', '#fff0f6'];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const color = wingColors[i % wingColors.length];
      const wm = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const b = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      b.add(body);
      const wingL = new THREE.Group();
      const wingR = new THREE.Group();
      for (const [s, wg] of [[-1, wingL], [1, wingR]]) {
        const front = new THREE.Mesh(wingGeo, wm);
        front.scale.set(1, 0.78, 1);
        front.position.set(s * 0.13, 0, 0.06);
        wg.add(front);
        const back = new THREE.Mesh(wingGeo, wm);
        back.scale.set(0.7, 0.6, 1);
        back.position.set(s * 0.1, 0, -0.07);
        wg.add(back);
        /* wings lie flat (horizontal), flap via rotation.y */
        wg.rotation.order = 'YXZ';
        b.add(wg);
      }
      b.traverse((o) => { if (o.isMesh && o.material === wm) { o.rotation.x = 0; } });
      /* flatten wing circles to horizontal */
      wingL.children.forEach((c) => { c.rotation.x = -Math.PI / 2; });
      wingR.children.forEach((c) => { c.rotation.x = -Math.PI / 2; });
      /* anchors spread over the world, higher above the maze island */
      let ax, az;
      do {
        const a = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * 40;
        ax = Math.cos(a) * r;
        az = Math.sin(a) * r;
      } while (Math.abs(ax) < 40 && Math.abs(az) < 40 && false);
      let h = 1 + Math.random() * 3.2;
      if (Math.abs(ax) < 21 && Math.abs(az) < 21) h = Math.max(h, 3.9);
      b.userData = {
        anchor: new THREE.Vector3(ax, h, az),
        orbitR: 1.5 + Math.random() * 4,
        speed: (0.25 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        flapSpeed: 14 + Math.random() * 10,
      };
      group.add(b);
      butterflies.push(b);
    }
  }
  function updateButterflies(dt, t) {
    for (const b of butterflies) {
      const d = b.userData;
      const angle = t * d.speed + d.phase;
      const wobble = 1 + 0.18 * Math.sin(t * 0.37 + d.phase);
      b.position.set(
        d.anchor.x + Math.cos(angle) * d.orbitR * wobble,
        d.anchor.y + Math.sin(t * 1.3 + d.phase) * 0.55 + Math.sin(angle * 2) * 0.25,
        d.anchor.z + Math.sin(angle) * d.orbitR
      );
      const vx = -Math.sin(angle) * d.speed;
      const vz = Math.cos(angle) * d.speed;
      b.rotation.y = Math.atan2(vx, vz);
      const flap = 0.2 + Math.abs(Math.sin(t * d.flapSpeed + d.phase)) * 0.85;
      b.children[1].rotation.y = -flap;   /* wingL */
      b.children[2].rotation.y = flap;    /* wingR */
    }
  }

  /* ---------------- collectible candies (unique, permanent) ---------------- */
  const candies = [];
  {
    const bodyGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.16, 10);
    const wrapGeo = new THREE.ConeGeometry(0.09, 0.13, 8);
    const colors = ['#ff8fb7', '#ffd45e', '#63b8f5', '#a7d97a', '#b57de0', '#ff9e4f'];
    const mats = colors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 }));
    /* maze dead-end rooms (odd,odd cells are always corridors) */
    const spots = [];
    for (const [cx, cy] of [[1, 1], [5, 5], [9, 1], [13, 3], [17, 17], [3, 15]]) {
      spots.push([(cx - HALF) * CELL, (cy - HALF) * CELL]);
    }
    spots.push(
      [1.2, 22.5], [-1.6, 24], [14, 21.5], [18.5, 23], [-4, 28.2], [5, 28.2],
      [-18, 32], [18, 32], [26, 12], [-27, 7], [30, 27], [-31, 29],
      [8, 30.5], [-9, 27], [24, -6], [-24, -4], [36, -8], [-36, -6],
      [12, 38], [-12, 39], [0, -24], [4, -26]
    );
    spots.forEach(([x, z], i) => {
      const m = mats[i % colors.length];
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, m);
      body.rotation.z = Math.PI / 2;
      g.add(body);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(wrapGeo, m);
        w.rotation.z = (s * Math.PI) / 2;
        w.position.x = s * 0.13;
        g.add(w);
      }
      g.position.set(x, 0.45, z);
      g.userData = { baseY: 0.45, phase: Math.random() * 6 };
      group.add(g);
      candies.push({ id: 'c' + i, obj: g, x, z, active: true });
    });
  }

  /* ---------------- golden gummy bear (quest) ---------------- */
  const goldenBear = { active: true };
  {
    const gold = new THREE.MeshStandardMaterial({ color: '#ffd45e', metalness: 0.6, roughness: 0.25, emissive: '#ffb84e', emissiveIntensity: 0.25 });
    const g = new THREE.Group();
    const bodyB = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), gold);
    bodyB.position.y = 0.55;
    bodyB.scale.set(1, 1.15, 0.85);
    g.add(bodyB);
    const headB = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), gold);
    headB.position.y = 1.3;
    g.add(headB);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), gold);
      ear.position.set(s * 0.22, 1.58, 0);
      g.add(ear);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 4, 8), gold);
      arm.position.set(s * 0.58, 0.7, 0.1);
      arm.rotation.z = s * 0.5;
      g.add(arm);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 8), gold);
      leg.position.set(s * 0.26, 0.16, 0.08);
      g.add(leg);
    }
    g.position.set(43, 0, -25);
    g.rotation.y = -0.6;
    group.add(g);
    goldenBear.obj = g;
    const gl = new THREE.PointLight('#ffd45e', 6, 8);
    gl.position.set(43, 2.2, -25);
    group.add(gl);
    goldenBear.light = gl;
  }

  /* ---------------- quest beacon (map marker) ---------------- */
  let beaconCone = null;
  const beacon = new THREE.Group();
  {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.55, 9, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    beam.position.y = 4.5;
    beacon.add(beam);
    const beamCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    beamCore.position.y = 4.5;
    beacon.add(beamCore);
    beaconCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.8, 4),
      new THREE.MeshBasicMaterial({ color: '#ffd45e', transparent: true, opacity: 0.9 })
    );
    beaconCone.rotation.x = Math.PI;
    beaconCone.position.y = 5.6;
    beacon.add(beaconCone);
    beacon.visible = false;
    group.add(beacon);
  }
  function setBeacon(x, z) {
    if (x === null) { beacon.visible = false; return; }
    beacon.visible = true;
    beacon.position.set(x, 0, z);
  }

  /* ---------------- castle interior (enterable) ---------------- */
  const castle = { group: new THREE.Group(), boxes: [], circles: [], chandeliers: [] };
  {
    const g = castle.group;
    g.visible = false;
    scene.add(g);
    const W = 14, D = 10, H = 5.2;
    /* checker floor */
    const floorTex = canvasTex(256, 256, (ctx, w, h) => {
      const s = 32;
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? '#fdf0f5' : '#f6c7d9';
          ctx.fillRect(x, y, s, s);
        }
      }
    }, 4, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    /* walls */
    const wallMatI = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, side: THREE.DoubleSide });
    const mkWall = (w, h, x, y, z, rotY) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMatI);
      m.position.set(x, y, z);
      m.rotation.y = rotY;
      m.receiveShadow = true;
      g.add(m);
    };
    mkWall(W, H, 0, H / 2, -D / 2, 0);                    /* north */
    mkWall(D, H, -W / 2, H / 2, 0, Math.PI / 2);          /* west  */
    mkWall(D, H, W / 2, H / 2, 0, -Math.PI / 2);          /* east  */
    mkWall(W / 2 - 1, H, -(W / 4 + 0.5), H / 2, D / 2, Math.PI);  /* south left  */
    mkWall(W / 2 - 1, H, (W / 4 + 0.5), H / 2, D / 2, Math.PI);  /* south right */
    /* colliders */
    castle.boxes.push({ minX: -W / 2 - 0.3, maxX: -W / 2 + 0.3, minZ: -D / 2, maxZ: D / 2 });
    castle.boxes.push({ minX: W / 2 - 0.3, maxX: W / 2 + 0.3, minZ: -D / 2, maxZ: D / 2 });
    castle.boxes.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2 - 0.3, maxZ: -D / 2 + 0.3 });
    castle.boxes.push({ minX: -W / 2, maxX: -1, minZ: D / 2 - 0.3, maxZ: D / 2 + 0.3 });
    castle.boxes.push({ minX: 1, maxX: W / 2, minZ: D / 2 - 0.3, maxZ: D / 2 + 0.3 });
    /* pillars */
    const pillarMat = mat('#fdf0f5', { roughness: 0.5 });
    for (const [px, pz] of [[-4.5, -3], [4.5, -3], [-4.5, 2], [4.5, 2]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, H, 16), pillarMat);
      p.position.set(px, H / 2, pz);
      p.castShadow = true;
      g.add(p);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat('#f45d8e'));
      cap.position.set(px, H, pz);
      g.add(cap);
      castle.circles.push({ x: px, z: pz, r: 0.62 });
    }
    /* carpet to the throne */
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.4), mat('#e0457a', { roughness: 0.9 }));
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.015, -0.6);
    carpet.receiveShadow = true;
    g.add(carpet);
    /* throne */
    {
      const throneGem = mat('#ff9ec6', { roughness: 0.15, metalness: 0.35 });
      const t = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.1), mat('#c98a2f', { metalness: 0.4, roughness: 0.4 }));
      seat.position.y = 0.6;
      t.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.28), mat('#c98a2f', { metalness: 0.4, roughness: 0.4 }));
      back.position.set(0, 1.6, -0.45);
      t.add(back);
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), mat('#ffd45e', { metalness: 0.6, roughness: 0.25, emissive: '#ffb84e', emissiveIntensity: 0.3 }));
      crest.position.set(0, 2.8, -0.45);
      t.add(crest);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 1.0), mat('#c98a2f', { metalness: 0.4, roughness: 0.4 }));
        arm.position.set(s * 0.66, 0.95, 0.05);
        t.add(arm);
        const gemT = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), throneGem);
        gemT.position.set(s * 0.66, 1.16, 0.05);
        t.add(gemT);
      }
      t.position.set(0, 0, -3.6);
      g.add(t);
      castle.circles.push({ x: 0, z: -3.6, r: 1.05 });
    }
    /* treasure chest */
    {
      const c = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.62, 0.8), mat('#8a5a3a', { roughness: 0.6 }));
      base.position.y = 0.31;
      base.castShadow = true;
      c.add(base);
      const lid = new THREE.Group();
      const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 14, 1, false, 0, Math.PI), mat('#a5713f', { roughness: 0.5 }));
      lidMesh.rotation.z = Math.PI / 2;
      lidMesh.position.y = 0.2;
      lid.add(lidMesh);
      lid.position.set(0, 0.62, -0.4);
      c.add(lid);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.1), mat('#ffd45e', { metalness: 0.7, roughness: 0.3 }));
      lock.position.set(0, 0.55, 0.42);
      c.add(lock);
      c.position.set(3.6, 0, -3.4);
      c.rotation.y = -0.5;
      g.add(c);
      castle.chest = { group: c, lid, opened: false, anim: 0 };
      castle.circles.push({ x: 3.6, z: -3.4, r: 0.95 });
    }
    /* chandeliers */
    for (const [cx, cz] of [[-3, -1], [3, -1], [0, 2]]) {
      const ch = new THREE.Group();
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), mat('#c98a2f'));
      chain.position.y = H - 0.5;
      ch.add(chain);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 20), mat('#ffd45e', { metalness: 0.7, roughness: 0.3, emissive: '#ffd45e', emissiveIntensity: 0.35 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = H - 1.05;
      ch.add(ring);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), mat('#fff6ec'));
      candle.position.y = H - 0.93;
      ch.add(candle);
      ch.position.set(cx, 0, cz);
      ch.userData = { phase: Math.random() * 6 };
      g.add(ch);
      castle.chandeliers.push(ch);
    }
    /* interior light */
    const inLight = new THREE.PointLight('#ffe3c4', 18, 18);
    inLight.position.set(0, 3.6, 0);
    g.add(inLight);
  }

  /* ---------------- api ---------------- */
  return {
    group, boxes, circles, R_BOUND,
    gem, butterflies,
    candies, goldenBear,
    castle, setBeacon,
    castlePos: new THREE.Vector3(0, 0, -43),
    castleDoor: new THREE.Vector3(0, 0, -42.6),
    donuts: [new THREE.Vector3(-18, 0, 32), new THREE.Vector3(0, 0, 32), new THREE.Vector3(18, 0, 32)],
    villagePos: new THREE.Vector3(15.5, 0, 21),
    bigLollipop: new THREE.Vector3(-30, 0, -14),
    peaks: new THREE.Vector3(0, 0, 48),
    spawn: new THREE.Vector3(0, 0, HALF * CELL + 7.5),
    get gemActive() { return gemActive; },
    collectGem() {
      gemActive = false;
      gem.visible = false;
      gemLight.visible = false;
      gemRespawn = 30;
    },
    update(dt, t) {
      gem.rotation.y += dt * 1.4;
      gem.position.y = 1.35 + Math.sin(t * 1.8) * 0.18;
      if (!gemActive) {
        gemRespawn -= dt;
        if (gemRespawn <= 0) {
          gemActive = true;
          gem.visible = true;
          gemLight.visible = true;
        }
      }
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > R_BOUND + 30) c.position.x = -R_BOUND - 30;
        c.position.y = c.userData.baseY + Math.sin(t * 0.35 + c.userData.phase) * 0.8;
      }
      riverTex.offset.x += dt * 0.045;
      updateButterflies(dt, t);
      /* collectible candies: float & spin (collection is permanent) */
      for (const c of candies) {
        if (c.active) {
          c.obj.position.y = c.obj.userData.baseY + Math.sin(t * 2.2 + c.obj.userData.phase) * 0.09;
          c.obj.rotation.y += dt * 1.8;
        }
      }
      if (goldenBear.active) {
        goldenBear.obj.rotation.y = -0.6 + Math.sin(t * 0.8) * 0.25;
      }
      /* beacon (quest map marker) */
      if (beacon.visible) {
        beaconCone.rotation.y += dt * 2.2;
        beaconCone.position.y = 5.6 + Math.sin(t * 2.2) * 0.3;
      }
      /* castle interior */
      if (castle.group.visible) {
        for (const ch of castle.chandeliers) {
          ch.rotation.z = Math.sin(t * 0.9 + ch.userData.phase) * 0.06;
        }
        if (castle.chest.anim > 0) {
          castle.chest.anim = Math.max(0, castle.chest.anim - dt * 1.8);
          const k = 1 - castle.chest.anim;
          castle.chest.lid.rotation.x = -k * 1.9;
        }
      }
      sparkA.rotation.y += dt * 0.02;
      sparkB.rotation.y -= dt * 0.016;
      sparkA.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.1);
      sparkB.material.opacity = 0.45 + 0.3 * Math.sin(t * 1.7 + 2);
    },
  };
}
