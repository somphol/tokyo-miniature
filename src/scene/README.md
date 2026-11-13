# Scene modules

Every module is authored for Tokyo.

- `geography.ts` — tray, land outlines, Sumida, palace moat, districts, landmark table, parks,
  bridges, rail loop, deck heights.
- `plan.ts` — authored roads and district grids, bridge edges, connectors, blocks, two-pass parcels.
- `kit.ts` — instanced boxes, cylinders, pyramids, spheres, beams, warm lights, neon signs.
- `buildings.ts` — eleven ordinary families and footprint-aware height.
- `landmarks.ts` — the eight icons, including the graph-derived Rainbow Bridge.
- `environment.ts` — land, water, roads, bridge decks, rail, parks, trees, furniture, piers.
- `traffic.ts` — cars, trains, boats, pedestrians.
- `scene.ts` — renderer, camera, transitions, day/night, facts, capture API.

Coordinates: x east, z south, north −z. Parcel `rot` is the 2D angle; three.js yaw is `−rot`.
