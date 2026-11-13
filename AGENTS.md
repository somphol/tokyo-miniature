# tokyo-miniature — working notes

## What it is

A single-page, offline 3D miniature of central Tokyo. It compresses the palace moat, the Sumida,
Tokyo Bay and Odaiba into a 19.6 × 35.8 tray, fills the land with a road-first plan and 689 parcels,
and adds eight authored landmarks, four Yamanote trains, cars, boats and pedestrians. Day/night and
an English/Japanese UI are included. The published artifact is one self-contained HTML file.

It is not a map, a navigation tool, a GIS export, or a photo reconstruction. Positions and heights
are interpretive.

## Commands

~~~sh
npm install
npm run dev            # Vite, port 5173
npm run typecheck
npm test               # plan + geometry under Node
npm run build          # tsc + vite
npm run build:single   # build + notices + inline -> dist-single/index.html
npm run verify         # deterministic Chrome check (30 checks)
npm run shoot          # day/night/landmark/embed screenshots into shots/
~~~

Use `CHROME_PATH` if Chrome is not at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
`SHOOT_ANGLE=metal` is available on a machine with a working GPU path; the default is SwiftShader.

## Architecture

- `src/scene/geography.ts` — the tray, land outlines, Sumida, moat, districts, landmark table, parks,
  bridges, rail loop and deck heights. **The landmark table is the source of truth** for anchors,
  look heights, camera offsets and envelopes.
- `src/scene/plan.ts` — authored roads (moat and bay rings, radials, district grids, promenades,
  island loop), explicit bridge edges, component connectors, planar block faces, and a two-pass
  parcel sweep with exact segment-to-rectangle clearance.
- `src/scene/buildings.ts` + `kit.ts` — ten ordinary families drawn from the same instanced primitive
  kit as the landmarks. Heights are capped by footprint in `scene.ts`.
- `src/scene/landmarks.ts` — the eight icons. `rainbowSpan(plan)` derives the bridge orientation from
  the graph edge, so the model and the deck cannot drift apart.
- `src/scene/environment.ts` — land and moat meshes, water and shimmer, roads, bridge decks, rail
  viaduct and stations, parks and trees, lamps, wires, piers, seawalls.
- `src/scene/traffic.ts` — cars keep left and walk the graph, trains stop at the five station points,
  boats follow river/bay paths, pedestrians follow crossing/sidewalk routes.
- `src/scene/scene.ts` — renderer, camera flights, camera guard, day/night easing, virtual clock,
  facts and the `CityAPI`.
- `src/capture.tsx` — `window.__scene` for `verify`, `shoot` and the embedding handshake.

## Decisions and constraints

- Coordinates: **x east, z south, north is −z**, y up. Land top `0.46`, water `0.11`, road surface
  `0.475`; the tray is 19.6 × 35.8. Parcel `rot` is the 2D frame angle; three.js uses
  `rotation.y = −rot`.
- The plan is road-first. Do not place parcels before roads; do not move a landmark without updating
  its lot, camera offset, envelope, `scripts/verify.mjs` target and `CITY.md`.
- Bridges are graph edges, not decoration. Sumida bridges join bank-promenade nodes; the Rainbow
  Bridge joins the mainland to Odaiba. A bridge must start and end on land and have a water midpoint.
- Parcels use exact segment-to-rectangle clearance and a SAT overlap test. The two sweeps share one
  spatial hash. If you change parcel size or spacing, rerun `npm test` and check the count.
- Every construction is seeded. No `Math.random()` in the scene; the LCGs live in `plan.ts`,
  `environment.ts` and `traffic.ts`.
- All motion runs on `tick(dt)` virtual time. Capture mode steps from outside; the shadow map is
  rendered once and reused, which is what keeps SwiftShader verification usable.
- One offline file. No network requests, no external fonts, no image URLs, strict CSP friendly.
  Canvas is the only texture source.
- Tests and verification use Tokyo's values. Do not copy expected values from another city.
- The Yamanote **line** is the rail loop; the Yamanote-dori **road** was removed to keep the central
  blocks legible. Do not reintroduce a second ring without reviewing parcel rejection.

## Known issues

- The geography is compressed and deliberately approximate; the Sumida is 1.1 units wide, the
  Rainbow Bridge is ~3.2 units long.
- Mobile/touch was checked under Chrome touch emulation only; no physical iPad pass yet.
- Headless verification runs under SwiftShader on this Mac. `shoot` is a visual review, not a
  frame-rate gate.
- Some central blocks are deliberately open (palace gardens, Ueno, Meiji forest, plaza edges). The
  east bank is narrower than the real Sumida's east bank.
- No audio, no persistence, no service worker.

## Continuity

- Local path: `/Users/somphol/Projects/tokyo-miniature`.
- Single-file build: `dist-single/index.html`.
- Pages-ready copy: `docs/index.html` (+ `.nojekyll`).
- Screenshots: `shots/overview-day.png`, `overview-night.png`, `landmark-*.png`, `embed-345.png`.
- Remote: https://github.com/somphol/tokyo-miniature (public, branch `main`).
- Pages source: `main / docs`; live URL: https://somphol.github.io/tokyo-miniature/.
- Rebuild and publish with:

  ~~~sh
  npm run build:single
  cp dist-single/index.html docs/index.html
  git add -A && git commit -m "Update build" && git push
  ~~~
