# Tokyo, in one tray

One interactive diorama of central Tokyo: a moated palace at the centre, the Sumida cutting the east
bank, the bay and Odaiba to the south, a green Yamanote loop, and eight landmarks you can fly to.

Built from scratch with React, TypeScript and three.js. The published artifact is one offline HTML
file with no external assets, fonts or requests.

## What is in the tray

- **Geography:** Tokyo Bay, the Sumida River with five crossings, the Imperial Palace moat, Odaiba,
  Ueno Park, Meiji forest, Shiba Park and the Sumida promenade.
- **Eight landmarks:** Tokyo Tower, Tokyo Skytree, Senso-ji, Rainbow Bridge, Shibuya Crossing, Meiji
  Jingu torii, the Imperial Palace and the Shinjuku Twin Towers.
- **A city, not a backdrop:** 689 parcels in 15 districts with their own street angles, ten ordinary
  building families, 805 road edges, a green Yamanote loop with four trains, 64 vehicles, 218
  pedestrians and four boats.
- **Two light states:** a daylight palette and a night city with warm windows, coloured signs,
  floodlit towers and lit bridge cables.
- **Two locales:** English and Japanese, switchable with `?lang=ja`.
- **A 345 × 345 embed:** `?embed=1` hides the chrome and keeps the controls inside the frame.

## Commands

~~~sh
npm install
npm run dev          # Vite on http://localhost:5173
npm run typecheck
npm test             # plan + geometry, no browser
npm run build:single # dist-single/index.html, one offline file
npm run verify       # 30 deterministic browser checks
npm run shoot        # screenshots in shots/
~~~

`verify` and `shoot` need Chrome. Set `CHROME_PATH` if it is not at the default macOS location.
On a machine without GPU-backed headless Chrome, the scripts use SwiftShader; capture mode steps
virtual time and renders the shadow map once, so the check stays deterministic.

## Controls

- Drag to orbit, scroll to zoom, right-drag to pan.
- Day / Night, auto-rotate, reset.
- Landmark bar: eight camera flights, each with a card.
- Zoom, snapshot and fullscreen buttons.
- `?quality=low|high` forces a tier; `?view=topdown|bay|west|tower|asakusa` starts at a debug view;
  `?capture=1` exposes `window.__scene.step()` for deterministic capture.

## Layout

~~~text
src/scene/geography.ts   outline, water, moat, districts, landmarks, bridges, rail
src/scene/plan.ts        road-first plan, bridges, blocks, parcels
src/scene/buildings.ts   ten ordinary building families
src/scene/landmarks.ts   the eight authored landmarks
src/scene/environment.ts land, water, roads, bridges, parks, rail, street life
src/scene/traffic.ts     cars, trains, boats, pedestrians
src/scene/kit.ts         instanced primitive batches
src/scene/scene.ts       renderer, camera, day/night, transitions, capture API
src/App.tsx, src/i18n.ts, src/style.css
tests/                   plan and geometry invariants
scripts/                 single-file build, browser verification, screenshots
~~~

## Design rule

The city is authored for Tokyo. The street pattern, moat, Sumida, bay, landmarks, building families,
vehicles, copy and tests are not a reskin of another city. See `CITY.md` for the brief and
`AGENTS.md` for the working notes.

## Verification

- `npm test`: connected road graph, bridge water spans, parcel containment/clearance/overlap,
  landmark envelopes, distinct building families.
- `npm run verify`: every landmark flight, card/button agreement, day/night, reset, zoom, orbit, pan,
  rotate, scene facts, locales, the 345 embed, no console errors and no external requests.
  Current result: **30/30**.

## Hosting

The single file is `dist-single/index.html`. A Pages-ready copy lives in `docs/index.html` with
`.nojekyll`; point Pages at `main / docs`.

## Credits

Original work. Built with React 19 and three.js 0.186 under the MIT licence; their notices are
embedded in the single file. No map tiles, photographs or font files are redistributed.
