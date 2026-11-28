# 🍬 Trepio — The Candy Kingdom

Documentation for the whole project can be found in the [Trepio Wiki](https://github.com/kennedy-blip/trepio.wiki.git).

A handcrafted 3D **candy-fantasy kingdom** that runs entirely in your browser —
no servers, no accounts, no downloads. Dress up your doll, step outside and
explore a living little world: a candy-cane maze, lollipop forest, rainbow
river, gumdrop village and a grand palace. Complete quests, meet the royal
family, keep pets, and play arcade mini-games. Progress saves locally on your
device and can be exported as a file.

**3.0 "The Living Fantasy Kingdom"** began the art overhaul: golden-morning
lighting, a natural meadow palette, and a rebuilt timber-and-shingle village —
candy as *accents*, not candy-everything. **3.4** added four family homes
(babies included, full interaction). **3.1** rebuilt the palace as a
full **candy palace** (lollipop-topped towers, gumdrop domes, icing trims,
candy-cane gate) with **palace guards** stationed at the gate. **3.2** made
the world lush and crowded: a candy-hedge maze, plump swirl lollipops, dense
flower meadows and pastel candy bushes — with every walkpath kept clear — plus
a free-tilt, wall-aware camera. **3.3** went realistic: fbm-noise grass,
bark-textured trees with swaying layered canopies, a flowing river, scattered
rocks, worn stone village paths and a teal-to-peach golden-hour sky.

Built with [three.js](https://threejs.org) — a single static page, playable
offline. **Live at <https://trepio.vercel.app>**.

## 🎯 What's in the game

| | |
|---|---|
| 🧸 **8 characters** | Trixie, Momo, Zuri, Lulu, Kiki, Theo, Amani, Dex — each with their own speed, jump and personality. Seven of them live in the world as villagers you can chat with. |
| 👑 **The royal family** | Six royals in the palace — King Jamoh, Queen Dama, Prince Ken, Princess Fay, Duke Whitney, Chef Bleso — each with a quest line and a warm word. |
| 🍭 **The Candy Palace** | A lollipop-towered palace guarded by **Guard Gumdrop & Guard Taffy**, who flank the gate and greet every visitor. |
| 📜 **12 quests** | From *Sweet Tooth* (collect candies) and *Royal Visit* to finding the Golden Gummy Bear and helping the royals — tracked in your quest journal. |
| 🏡 **7 village homes + 4 family homes** | Every villager has a cottage — knock, come inside, sit on the furniture. Plus four far-flung **family homes** where whole families live: two parents and their **babies** (the Gumdropps even have twins), with cribs, toy blocks and teddy bears. Everyone is talkable — peek-a-boo with the babies included. |
| 🐾 **5 pets** | Gummy Cat, Coco Bunny, Sugar Pup — plus the premium Gummy Bear (🍬 60) and Candy Unicorn (🍬 100) — follow you around the kingdom. |
| 🕹️ **2 arcade mini-games** | **Candy Catch** (catch falling candies) and **Gummy Rush** (ring race) — best scores are saved, and the first win of each game per visit pays **double candies**. |
| 👗 **Wardrobe** | Hairstyles, outfits and accessories for every character, unlocked as you level up. Boys and girls get their own collections. |
| 💾 **Save system** | Versioned saves in `localStorage` with **Export / Import** — carry your kingdom between devices or back it up. |

## 🎮 Controls

**Desktop** — WASD / arrows to move, mouse to look (drag up/down to tilt the
camera from the horizon to a top-down view), scroll to zoom, `Space` to jump,
`E` to interact (talk, doors, arcades, chairs), `Esc` to close panels. The
camera automatically pulls in when a wall would block your view.
**Mobile** — touch joystick + look-drag; on-screen buttons for jump, talk
and journal.

⚙️ **Graphics quality** (Settings): `Auto / Low / Medium / High` — pixel-ratio
and shadow resolution scale down on low-power phones. **Auto is adaptive**: it
picks Medium on touch devices and High on desktop, then watches the frame rate
and steps the tier down (or back up) if the device struggles — so weak phones
stay smooth automatically.

## 💾 Saves & data

Everything lives in your browser's `localStorage` (key `trepio-doll-v2`, save
format v3). **Settings → Export Save** copies a `trepio-save.json` file to your
downloads and clipboard; **Import Save** restores it. Old save formats are
migrated automatically on load. No accounts, no tracking, no purchases — ever.

## 🚀 Running it

No build step needed — it's a plain static site:

```bash
npm start        # serve on :8000 (python http.server)
# or: npx serve .  /  any static file server
```

Optional bundling with Vite:

```bash
npm install
npm run build    # → dist/
npm run preview  # serve the build
```

## ✅ Tests

A headless-browser regression suite covers the game end to end — boot, candy
persistence over reload, shop + balance, pets, all 12 quests, palace and all
7 homes (with owner visits), both mini-games with persisted records, save
export/import round-trips (plus garbage rejection and v2→v3 migration),
graphics-quality settings (including the adaptive Auto tier), the economy
(new pets, prices, daily-bonus rewards), and a mobile (Pixel 5) emulation
pass:

```bash
npm install      # brings a self-contained headless Chromium
npm test
```

## 🗂 Code layout

Plain ES modules (`js/`), no framework, no bundler required — three.js loads
via an import map:

| Module | Role |
|---|---|
| `js/main.js` | Composition root — wires every module, HUD, settings, boot |
| `js/world.js` | Terrain, maze, river, village, palace, arcades, collectibles |
| `js/doll.js` | Procedural low-poly dolls, poses, outfits |
| `js/npc.js` | Villagers & royals: schedules, homing, dialogue |
| `js/homes.js` | Cottage interiors, entering/leaving, sitting |
| `js/quests.js` | The 12 quests + journal |
| `js/inventory.js` | Candy shop & pets |
| `js/minigames.js` | Candy Catch & Gummy Rush |
| `js/save.js` | Versioned save/load, export/import, migration |
| `js/quality.js` | Graphics quality presets + adaptive Auto tier |
| `js/ctx.js` | Late-bound shared context (module wiring) |
| `js/collide.js`, `js/input.js`, `js/pets.js`, `js/audio.js`, `js/effects.js`, `js/progress.js` | Physics, keyboard/touch, pet AI, sound, sparkle effects, XP/levels |

## ☁️ Deploy

Any static host works. This repo deploys on push to `main` via Vercel
(static build, no framework preset).

## 🗺 Roadmap

- **3.0 — art overhaul** (*Acts I–II shipped*): golden-morning lighting with
  warm fog, meadow-green palette, plaster-and-timber cottages with shingle
  roofs, glowing windows, flower boxes, door lanterns, village footpaths —
  and the full **candy palace** rebuild with gate guards (3.1).
- Later — islands, achievements, fashion shows, seasonal events.
