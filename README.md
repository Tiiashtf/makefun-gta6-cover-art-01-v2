# Vice City Sunset — GTA 6 Cover Art Maker

[![GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Tiiashtf/makefun-gta6-cover-art-01-v2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Tiiashtf/makefun-gta6-cover-art-01-v2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Vice City Sunset turns any photo and a caption into GTA 6-style cover art — the multi-panel poster look with bold caption lettering and a neon sunset grade — and exports it as a PNG to share. It runs entirely offline in a desktop browser from its own static files: your photos never leave your machine.

## What it does

- **Any photo:** upload your own (file picker or drag-and-drop) or try the two built-in demo photos.
- **Three layouts:** wide hero (one large panel), strips (three vertical panels), grid (2×2 panels). Each panel keeps its own framing.
- **Crop and position each panel:** drag the photo inside a panel to pan, scroll to zoom, use the zoom slider, or nudge with the arrow keys.
- **Caption:** editable text drawn in a heavy condensed display face, white with a dark outline and a neon pink-orange glow, slightly tilted, with a "VICE CITY" kicker and a neon underline.
- **The art:** a warm sunset sky (orange-red through hot pink to violet dusk), a glowing sun, a city skyline with lit windows, palm-tree silhouettes, film grain and a soft vignette.
- **Fast export:** one click downloads a real PNG at 1080×1080, 1080×1350 or 1920×1080.

## How to run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests: every script, font and image is a file under `app/`.

## Keyboard shortcuts

- Arrow keys — nudge the active panel's framing (Shift + arrows nudges further)
- `+` / `-` — zoom the active panel
- `Tab` — move between the controls

## Demo mode

Append a query string to try a scene without clicking:

- `?shot=editor&photo=boulevard&caption=BOULEVARD%20QUEEN` — the editor with the boulevard photo loaded
- `?shot=cover&photo=pier&caption=SUNSET%20HEIST&layout=hero` — the cover alone, full-bleed
- `layout` picks `hero`, `strips` or `grid`; `photo` picks `boulevard` or `pier`.

## Files

- `app/` — the web app (static files, no build step): `index.html`, `style.css`, `src/cover.js` (the poster renderer), `src/main.js` (the editor), `src/shots.js` (demo scenes), `fonts/` (Oswald and Inter, SIL Open Font License), `samples/` (two demo photos).
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`. It never removes the output directory itself — it clears only the directory's contents — so it succeeds however the grader's `/output` is owned.
- `serve.ts` — tiny static server for trying the app locally.
- `shots.json` — the four screenshot scenes.
- `screenshots/` — the screenshots taken from this app.

## Notes

An original design in the style of GTA 6 posters: no Rockstar Games logo, official artwork or font. Fonts are Oswald and Inter under the SIL Open Font License (licence texts beside them in `app/fonts/`).

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun.

---

My AI agent enters bounties on make.fun, where the best entries get paid in USDC. Try it with your own agent: join with my referral link, https://make.fun/r/635rx196
