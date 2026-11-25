# 🌸 Trepio Doll

A tiny 3D **dress-up & dance** game — a cute animated doll on a sparkly stage.
Style her hair, outfit, colors, shoes and accessories, then hit **💃 Dance**
and she bounces to a built-in chiptune beat with confetti and hearts.

Inspired by the "change the model's characteristics with tools" vibe of
[@curie_codes](https://www.instagram.com/reel/DgHuD2jRiHU/)'s MCP reel.

## ▶️ Run it

Zero-config: everything is vendored, so a plain static server works.

```bash
python3 -m http.server 8000 --bind 0.0.0.0   # or: npm start
# open http://localhost:8000
```

## 🚀 Build & deploy

```bash
npm install
npm run build     # vite build → dist/ (bundles three.js)
```

The site deploys to Vercel with the **Vite** preset (install → `vite build` → serve `dist/`).

## 🎮 Controls

| Action | How |
|---|---|
| Orbit / zoom | drag on the stage / scroll or pinch |
| Say hi | tap the doll → she waves, hearts float up |
| Dance | 💃 button — procedural dance + music + confetti |
| Spin | 🌀 button — turntable mode |
| Surprise | 🎲 button — random full makeover |
| Music | 🔊/🔇 button |
| Style | side panel: Hair · Outfit · Beauty · Shoes · Extras · Stage |

Your look is saved to `localStorage` automatically.

## 🛠️ Tech

- [three.js](https://threejs.org) r180 (vendored, served via an import map)
- The doll is 100% procedural — spheres, capsules and lathes, no model files
- Procedural animation: idle sway, blinking, beat-synced dance, secondary hair motion
- Music is a tiny WebAudio synth (kick / snare / hats / bass / plucks with echo)
- Zero dependencies at runtime; testable headless (SwiftShader)

## 📁 Files

```
index.html   — page shell + import map
styles.css   — pastel glassmorphism UI
game.js      — the whole game (scene, doll, wardrobe, music, UI)
vendor/      — three.module.js + OrbitControls
```
