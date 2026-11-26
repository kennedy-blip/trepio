# 🍬 Trepio Candy World

Dress up your doll, then step into a **sweet fantasy world**: a candy-cane maze,
lollipop forest, chocolate river under a rainbow, gumdrop village, gummy bears,
cotton-candy trees, whipped-cream hills, a candy castle — and butterflies
fluttering everywhere. Find the **Star Candy** hidden at the maze center.
The other dolls live in the world as NPCs who wander around and wave hello.

## 🧸 Characters

Eight dolls — girls and boys — each with different characteristics:

| Doll | Title | Speed | Jump |
|---|---|---|---|
| 👑 Trixie | Bubblegum Princess | 5.6 | 4.6 |
| 🍫 Momo | Choco Scout | 4.9 | 5.3 |
| 🌿 Zuri | Mint Ranger | 6.2 | 4.2 |
| 🫐 Lulu | Berry Dreamer | 5.0 | 4.7 |
| 💫 Kiki | Vanilla Comet | 6.5 | 5.6 |
| 🤴 Theo | Cocoa Prince | 5.4 | 4.8 |
| 🍀 Amani | Mint Explorer | 5.1 | 5.2 |
| ⚡ Dex | Lemon Bolt | 6.4 | 5.5 |

Every doll is fully customizable — hair, outfit (skirts for the girls,
trousers for the boys), colors, shoes and accessories — and looks are saved
per character in `localStorage`. When you play one doll, the other seven
wander the world as NPCs.

## 🎮 Controls

| Action | Input |
|---|---|
| Move | WASD / arrows (or touch joystick) |
| Run | Shift |
| Jump | Space / 🤸 button |
| Look around | drag · scroll / pinch to zoom |
| Wave / Dance / Spin | E / R / F or buttons |
| Music | M |
| Back to studio | H / 🏠 |

## ▶️ Run it

Zero-config — a plain static server works (everything is vendored):

```bash
python3 -m http.server 8000 --bind 0.0.0.0   # or: npm start
```

## 🚀 Build & deploy

```bash
npm install
npm run build     # vite build → dist/
```

Deploys to Vercel with the **Vite** preset. Live: https://trepio.vercel.app

## 🛠️ Tech

- three.js r180 — the dolls are 100% procedural (spheres, capsules, lathes)
- Male & female doll bodies from one factory (trousers attach to leg rigs)
- Procedural maze (DFS backtracker, verified always solvable) with AABB collision
- Third-person follow camera, jump physics, circle/box collision resolution
- 24 animated butterflies with orbiting free-flight paths & flapping wings
- Candy castle, rainbow, gumdrop village, gummy bears, cream hills, cookie paths
- WebAudio beatbox with two moods — ambient world music & dance beat
- NPCs with simple wander/greet AI (all non-player dolls populate the world)
- Game features (objectives, collectibles, scoring) planned after review

## 📁 Files

```
index.html      — page shell + import map
styles.css      — UI (title screen, HUD, joystick, wardrobe panel)
js/doll.js      — doll factory + idle/walk/dance/wave animation
js/world.js     — candy world: maze, props, colliders, animated scenery
js/input.js     — keyboard, touch joystick, camera drag/pinch
js/audio.js     — WebAudio beatbox (ambient / dance)
js/effects.js   — hearts & confetti particles
js/main.js      — modes, characters, movement, camera, NPCs, UI
vendor/         — three.js (for the no-build static mode)
```
