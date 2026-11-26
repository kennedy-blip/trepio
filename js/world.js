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
/* sprinkle ground */
function sprinkleTex() {
  const colors = ['#ff8fb7', '#ffd45e', '#63b8f5', '#a7d97a', '#b57de0', '#fff'];
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ffd9e6';
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
  const sparkA = sparkleField(150, R_BOUND, 0.4, 10, 0.14, '#ffffff');
  const sparkB = sparkleField(80, R_BOUND, 0.4, 10, 0.26, '#fff2c9');

  /* ---------------- api ---------------- */
  return {
    group, boxes, circles, R_BOUND,
    gem,
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
      sparkA.rotation.y += dt * 0.02;
      sparkB.rotation.y -= dt * 0.016;
      sparkA.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.1);
      sparkB.material.opacity = 0.45 + 0.3 * Math.sin(t * 1.7 + 2);
    },
  };
}
