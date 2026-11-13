# Tests

Run with `npm test` (tsx, no browser).

- `planning.ts` — graph connected; every bridge starts and ends on land with a water midpoint;
  parcels on land, clear of the moat and every road corridor; no two parcels overlap; all landmark
  anchors on the right surface; 689 parcels, 805 road edges, 6 bridges.
- `geometry.ts` — each of the eleven building families builds a distinct, finite mass; every landmark
  is inside its authored envelope and lot; the shared kit materials light up at night.

The expected values are Tokyo's. Do not copy them from another city.
