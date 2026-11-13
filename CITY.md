# City brief: Tokyo

The design contract. Written before scene code; every module below follows it.

## 1. Identity

- City / district: central Tokyo, the 23 wards compressed into one tray — Chiyoda, Chuo, Minato,
  Shinjuku, Shibuya, Taito, Sumida and Odaiba.
- One-line pitch: Tokyo as one dense, low tray: a moated palace at the centre, a green train looping
  it, the Sumida cutting the east, and a bay full of bridges.
- Three-second read: the ring of water at the centre, Tokyo Tower's orange lattice south of it,
  Skytree's pale needle in the north-east, the white Rainbow Bridge over the bay, and the green
  Yamanote train threading between them.
- Languages / locales: English (default), Japanese (`ja`, alias `jp`).
- Not: a neon-only cyberpunk city, a generic grid, or a skyline of interchangeable glass towers.
  The ordinary city is low-rise, tight and grey; the icons are exceptions, not the rule.

## 2. Geography (compressed)

- Orientation: north is up-screen and −z. x grows east, z grows south, y is up. Camera overview from
  the south-east.
- Water: Tokyo Bay fills the south-east quadrant. The Sumida River runs north–south at x≈5.35–6.45,
  from a head at z≈−15.2 to the bay at z≈4.0. The Imperial Palace moat is a rectangular ring of water
  at the centre, outer edge x ±2.8, z ±2.5, with the palace island inside. Odaiba is an island in
  the bay, joined by the Rainbow Bridge.
- Land: one west/central/north mass; an east-bank strip (Asakusa/Fukagawa) across the Sumida; the
  palace island; Odaiba. Coastline runs from the south-west corner north-east to the Sumida mouth.
- Green: Imperial Palace grounds, Ueno Park, Meiji Jingu forest, Sumida Park, Odaiba seaside park.
- Tray: rounded rectangle 19.6 × 35.8 units inside the frame; land roughly 18 × 32.
- Why it reads as Tokyo: the moat is central, not a waterfront edge; the Sumida divides the east
  bank; the bay is a working harbour, not an ocean; rail, not road, is the strongest line.

## 3. Districts

| District | Where | Character | Building families | Landmarks |
| --- | --- | --- | --- | --- |
| Chiyoda | centre | moat, stone walls, low government blocks, pines | office, school, apartment | Imperial Palace |
| Marunouchi / Otemachi | east of moat | stone-and-glass offices, wide avenues | office, department | — |
| Ginza / Nihonbashi | south-east of moat | department stores, tight shopping grid, vertical signs | department, office, konbini | — |
| Shinjuku | west | tall towers, neon, dense small blocks | tower, office, apartment | Shinjuku Twin Towers |
| Shibuya / Harajuku | south-west | scramble crossing, screens, low shops against forest | shibuya shop, apartment, konbini | Shibuya Crossing, Meiji Jingu torii |
| Asakusa / Ueno | north-east | temple roofs, low machiya, river promenade, park | machiya, asakusa shop, temple | Senso-ji, Tokyo Skytree |
| Odaiba | bay | reclaimed waterfront, warehouses, open plazas | warehouse, apartment, office | Rainbow Bridge |
| Minato | south of moat | embassies, offices, the tower in a park | office, apartment, tower | Tokyo Tower |

## 4. Landmarks (8)

| # | Landmark | District | Silhouette / must-read features | Anchor (x, z) | Lot (w × d) | Look | View offset |
| - | --- | --- | --- | --- | --- | --- | --- |
| 01 | Tokyo Tower | Minato | orange/white lattice, four legs, two decks, antenna | (−1.6, 7.1) | 1.7 × 1.7 | 3.2 | (7.5, 5.5, 9.5) |
| 02 | Tokyo Skytree | Sumida | pale tripod needle, two ring decks, long antenna | (7.55, −12.8) | 1.9 × 1.9 | 6.0 | (16.0, 13.0, 11.0) |
| 03 | Senso-ji | Asakusa | red gate, giant lantern, five stacked pagoda roofs | (7.6, −8.4) | 2.2 × 1.9 | 1.3 | (−5.0, 4.2, 5.5) |
| 04 | Rainbow Bridge | Odaiba | white suspension bridge, two towers, long cables | (2.2, 11.05) | 3.8 × 1.6 | 1.3 | (6.5, 5.2, 8.0) |
| 05 | Shibuya Crossing | Shibuya | diagonal zebra stripes, corner screens, 109 cylinder | (−7.05, 4.65) | 2.6 × 2.2 | 0.8 | (−5.0, 6.2, 4.8) |
| 06 | Meiji Jingu torii | Harajuku | tall timber torii in a forest clearing | (−6.35, −0.45) | 1.8 × 1.5 | 0.8 | (−4.6, 4.0, 5.0) |
| 07 | Imperial Palace | Chiyoda | moat, stone walls, white turret, double bridge | (0, 0) | 6.2 × 5.6 | 1.0 | (8.0, 6.2, 8.0) |
| 08 | Shinjuku Twin Towers | Shinjuku | twin glass shafts, shared podium, observation crown | (−6.6, −4.3) | 1.9 × 1.8 | 4.0 | (−7.5, 7.2, 6.8) |

## 5. Street pattern

- Dominant pattern: no single grid. A moat ring and radials at the centre; district grids at
  different angles: Asakusa +0.18 rad, Ueno +0.06, Shinjuku −0.42, Shibuya −0.22, Ginza +0.10,
  Marunouchi 0.00; a Yamanote ring road around the palace; the Sumida's two bank promenades.
- Spine: Sotobori-dori around the moat, then Chuo-dori east to Nihonbashi/Ginza, Sakurada-dori south
  past Tokyo Tower, Meiji-dori south-west to Shibuya, Yasukuni-dori north-west to Shinjuku.
- Crossings: five Sumida bridges (Azuma, Komagata, Kuramae, Ryogoku, Eitai) and the Rainbow Bridge
  to Odaiba. The moat has Nijubashi only as a pedestrian symbol; the palace island is not drivable.
- Transit: the green Yamanote line on an elevated viaduct looping the centre, with stations at Tokyo,
  Shinjuku, Shibuya, Ueno and Yurakucho; taxis, buses and kei trucks on the roads.
- Pedestrian life: Shibuya scramble, Asakusa Nakamise, Ginza weekend street, Sumida promenade.
- Connectivity: each bank has a promenade and at least five crossings; Odaiba has a perimeter road
  and the Rainbow Bridge. The graph is one component by construction and by test.

## 6. Architecture

| Family | Where | Height | Materials / colours | Roof / details |
| --- | --- | --- | --- | --- |
| machiya | Asakusa, Yanaka | 0.7–1.2 | dark timber, plaster, indigo noren | tiled ridge roof, lantern, lattice |
| danchi | west residential | 1.4–2.4 | pale concrete, blue-grey | balcony rails, stair tower, tanks |
| office | Marunouchi, Toranomon | 2.2–4.0 | beige stone, blue glass | setback, mullions, rooftop plant |
| department | Ginza, Nihonbashi | 1.4–2.2 | cream stone, bronze | cornice, vertical sign, canopy |
| tower | Shinjuku, Toranomon | 3.4–5.4 | blue-grey glass, steel | crown light, podium, helipad |
| asakusa-shop | Asakusa, Ueno | 0.8–1.5 | vermilion, dark wood, cream | deep eaves, paper lantern, sign |
| apartment | Shibuya, Odaiba | 1.2–2.6 | warm grey, white | balconies, AC units, roof rails |
| konbini | every corner | 0.5–0.8 | white, green/blue stripe | bright glass front, pole sign |
| temple-school | Ueno, Asakusa | 0.8–1.4 | dark tile, white plaster, timber | irimoya roof, wall, gate |
| warehouse | Sumida, Odaiba | 0.9–1.6 | grey ribbed metal, teal | loading doors, vents, gantry |

## 7. Transport and city life

- Signature vehicles: black-and-white taxis, green/white city buses, white kei trucks, a few dark
  sedans. Traffic keeps left.
- Rail: four green-and-white Yamanote trains, three cars each, on the elevated loop; they stop at
  stations and are the brightest moving line at night.
- Boats: yakatabune with red lanterns on the Sumida; a white water bus in the bay; a small barge
  near Odaiba.
- Pedestrians: dense at Shibuya and Asakusa, sparse in Shinjuku and Odaiba; umbrellas in Ginza.
- Street furniture: vending machines, utility poles and sagging wires, red lanterns, guardrails,
  cherry trees along the moat and Sumida, pines in the palace grounds.
- Night: window grids, neon signs in Shibuya/Shinjuku/Ginza, lanterns at Asakusa, tower floodlights,
  train windows, bridge cable lights, water reflections.

## 8. Palette and light

- Day: sky #dfe9ea, fog #dfe9ea, sun warm #fff1d2, water #4f8792, land #c9c6b6, accent vermilion
  #c94b3a.
- Night: sky #0d1526, fog #0d1526, water #102c44, windows #ffdca8, neon #ff4f9a / #57d8ff,
  lanterns #ff9a4d.
- UI: ink #1d2a2e, panel #f3efe4, accent #c94b3a, secondary #6e7b78.
- Remember: vermilion, flooded white, and the green of the Yamanote line.

## 9. Copy and locales

- Title: "Tokyo" / line 2 "in one tray"; eyebrow "CITY MINIATURE · 東京".
- Tagline: "Eight places, one impossible city."
- Subtitle: "The moat at the centre, the Sumida on the east, the bay to the south — and a green train
  that never stops."
- Landmark copy: short, factual, place-led; 18–32 words each. Compact labels ≤ 9 characters.
- Japanese: 8–20 characters per landmark name; body text 30–55 characters; no line-break tricks
  needed beyond normal CJK wrapping. Keep the bar labels short (皇居, 東京タワー, スカイツリー,
  浅草寺, レインボー, 渋谷, 明治神宮, 新宿).
- Tone: dry, affectionate, no tourism-brochure superlatives.

## 10. Technical targets

- Tray 19.6 × 35.8; camera overview (20, 21, 26) → (0, 0.8, 0), distance ≈ 38.
- Heights: Skytree 12.3, Tokyo Tower 6.6, Shinjuku twins 4.3; ordinary buildings 0.25–3.2, capped by footprint.
- Budget: ~450k triangles, ~73 draw calls, 689 parcels; instanced primitives for fabric.
- Pixel ratio ≤ 2 high / 1 low; shadow map 2048 high / 512 low; one water plane; capture renders the shadow map once.
- Single file, strict CSP, no external requests, system fonts only, no textures from the network.

## 11. Verification targets

- Landmark camera targets `(x, look, z)`: as the table above.
- Envelopes `(w, d, topY)`: tower 1.7/1.7/7.1; skytree 1.9/1.9/12.8; senso-ji 2.2/1.9/2.9;
  rainbow 3.8/1.6/3.5; shibuya 2.6/2.2/2.1; meiji 1.8/1.5/1.2; palace 6.2/5.6/2.6;
  shinjuku 1.9/1.8/5.3.
- Facts: 8 landmarks, 805 road edges, 689 parcels, 64 vehicles, 4 trains, 218 pedestrians,
  4 boats, 6 bridges.
- Locale checks: `ja` bar contains 浅草寺 and 皇居; embed 345×345 hides header and intro.
- Browser check: 8 flights, day/night, reset, zoom, orbit, pan, rotate, facts, no errors, no external
  requests, embed.

## 12. Definition of done

- [x] Brief filled and reviewed before scene code.
- [x] No reference-city coordinates, street names, landmark ids, model files, i18n strings or test
      targets remain.
- [x] Geography, plan, buildings, landmarks, environment, traffic and copy are target-specific.
- [x] Road graph connected; parcels contained, clear and non-overlapping; bridges cross water.
- [x] Every landmark flight, day/night, locales and the embed pass (30/30).
- [x] Single file works offline under the sandbox CSP.
- [x] README, AGENTS.md, CHANGELOG and screenshots updated.

## 13. Do-not-copy checklist

- [x] No reference `src/` files copied and renamed.
- [x] No reference outline, river, grid angle, street names or parcel lattice.
- [x] No reference landmark models, anchors, view offsets or envelopes.
- [x] No reference building families, palette or roof kit unchanged.
- [x] No reference i18n strings or README copy.
- [x] No reference test expected values.
- [x] The overview should read as Tokyo before the title.
