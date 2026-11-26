# 🍬 Trepio Candy World

Dress up a doll, then step into an open **candy world**: explore the candy-cane
maze, lollipop forest, chocolate river with donut crossings, ice-cream
mountains, a giant cupcake — and find the **Star Candy** hidden at the maze
center. Three NPC dolls wander the world and wave hello.

## 🧸 Characters

Five dolls, each with different characteristics:

| Doll | Title | Speed | Jump |
|---|---|---|---|
| 👑 Trixie | Bubblegum Princess | 5.6 | 4.6 |
| 🍫 Momo | Choco Scout | 4.9 | 5.3 |
| 🌿 Zuri | Mint Ranger | 6.2 | 4.2 |
| 🫐 Lulu | Berry Dreamer | 5.0 | 4.7 |
| 💫 Kiki | Vanilla Comet | 6.5 | 5.6 |

Every doll is fully customizable (hair, outfit, colors, shoes, accessories)
in the studio — your look is saved per character in `localStorage`.

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
- Procedural maze (DFS backtracker, verified always solvable) with AABB collision
- Third-person follow camera, jump physics, circle/box collision resolution
- Instanced props (lollipop forest, gumdrops, marshmallows, maze walls)
- WebAudio beatbox with two moods — ambient world music & dance beat
- NPCs with simple wander/greet AI
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
