# 🍬 Trepio Candy World

Dress up your doll, then step into a **sweet fantasy world**: a candy-cane maze,
lollipop forest, chocolate river under a rainbow, gumdrop village, gummy bears,
cotton-candy trees, whipped-cream hills, a candy castle — and butterflies
fluttering everywhere. Collect candies, level up, complete quests and unlock
magical outfits. The other dolls live in the world as NPCs you can talk to.

## 🎯 Gameplay

- **Quests** — collect candies, visit the castle, cross the rainbow river,
  find the lost golden gummy bear, help a friend get home
- **XP & levels** — candies and quests give XP; levels unlock wardrobe items
- **Unlockables** — 🌈 Rainbow Gown (Lv 2), ✨ Star Suit (Lv 2),
  🦋 butterfly Wings (Lv 3), 🌟 Halo (Lv 4)
- **28 collectible candies** scattered across the world (some hidden in the maze)
- **NPC dialogue** — walk up to any doll and press E to chat
- Progress, outfits and settings are saved in `localStorage`

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
| Talk to NPCs | E / 💬 button |
| Look around | drag · scroll / pinch to zoom |
| Wave / Dance / Spin | Q / R / F or buttons |
| Music / Settings | M / ⚙️ |
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
- Quest/XP/level progression module with level-gated unlockables
- Procedural maze (DFS backtracker, verified always solvable) with AABB collision
- Third-person follow camera, jump physics, circle/box collision resolution
- 24 animated butterflies with orbiting free-flight paths & flapping wings
- Candy castle, rainbow, gumdrop village, gummy bears, cream hills, cookie paths
- WebAudio beatbox with two moods — ambient world music & dance beat
- NPCs with wander/greet AI, stuck detection & obstacle avoidance, LOD updates,
  and allocation-free per-frame math (no GC pressure)
- Settings menu (music / shadows / effects), loading screen, reduced-motion
  support, zoom-friendly viewport, debug hook dev-gated (`?debug`)

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
