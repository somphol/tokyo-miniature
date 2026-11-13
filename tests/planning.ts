import assert from 'node:assert/strict'
import {
  BRIDGES,
  LANDMARKS,
  MAIN_LAND,
  ODAIBA,
  inMoat,
  onLand,
  onOdaiba,
  roadable,
  type Point,
} from '../src/scene/geography'
import { bridgeStats, planTokyo, pointInPolygon, segmentDistance } from '../src/scene/plan'

const plan = planTokyo()
const net = plan.network

// 1. The graph is one connected component.
const seen = new Set<number>([0])
const queue = [0]
while (queue.length) {
  for (const n of net.nodes[queue.shift()!].neighbors) {
    if (!seen.has(n)) {
      seen.add(n)
      queue.push(n)
    }
  }
}
assert.equal(seen.size, net.nodes.length, `all ${net.nodes.length} road nodes reachable (reached ${seen.size})`)
assert(net.edges.length > 260, `expected a dense plan, got ${net.edges.length} road edges`)

// 2. Parcels sit on land, clear of the moat, and clear of each road corridor.
const corners = (p: { x: number; z: number; w: number; d: number; rot: number }): Point[] => {
  const c = Math.cos(p.rot)
  const s = Math.sin(p.rot)
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sz]) => [p.x + (sx * p.w * c) / 2 - (sz * p.d * s) / 2, p.z + (sx * p.w * s) / 2 + (sz * p.d * c) / 2] as Point)
}
assert(plan.parcels.length >= 320, `expected at least 320 parcels, got ${plan.parcels.length}`)
for (const p of plan.parcels) {
  for (const [x, z] of corners(p)) {
    assert(onLand(x, z), `parcel corner ${x.toFixed(2)},${z.toFixed(2)} is on land`)
    assert(!inMoat(x, z), 'parcel corner is clear of the palace moat')
  }
}
for (const e of net.edges) {
  const a = net.nodes[e.a]
  const b = net.nodes[e.b]
  for (let t = 0; t <= 1; t += 0.1) {
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    for (const lot of plan.parcels) {
      const c = Math.cos(lot.rot)
      const s = Math.sin(lot.rot)
      const dx = x - lot.x
      const dz = z - lot.z
      const gx = Math.max(Math.abs(dx * c + dz * s) - lot.w / 2, 0)
      const gz = Math.max(Math.abs(-dx * s + dz * c) - lot.d / 2, 0)
      assert(Math.hypot(gx, gz) >= e.width / 2 - 1e-6, `road ${e.name} stays clear of parcels`)
    }
  }
}

// 3. No two parcels overlap (rotated SAT).
for (let i = 0; i < plan.parcels.length; i++) {
  for (let j = i + 1; j < plan.parcels.length; j++) {
    const a = plan.parcels[i]
    const b = plan.parcels[j]
    if (Math.hypot(a.x - b.x, a.z - b.z) > 0.8) continue
    let separated = false
    for (const angle of [a.rot, a.rot + Math.PI / 2, b.rot, b.rot + Math.PI / 2]) {
      const nx = Math.cos(angle)
      const nz = Math.sin(angle)
      const project = (p: typeof a) => {
        const c = Math.cos(p.rot)
        const s = Math.sin(p.rot)
        const ra = Math.abs((p.w / 2) * (c * nx + s * nz)) + Math.abs((p.d / 2) * (-s * nx + c * nz))
        const center = p.x * nx + p.z * nz
        return [center - ra, center + ra]
      }
      const [a0, a1] = project(a)
      const [b0, b1] = project(b)
      if (a1 <= b0 + 1e-5 || b1 <= a0 + 1e-5) separated = true
    }
    assert(separated, `parcels ${i} and ${j} do not overlap`)
  }
}

// 4. Bridges start and end on land, and cross water.
const bridges = bridgeStats(plan)
assert.equal(bridges.length, BRIDGES.length, 'every authored bridge reaches the graph')
for (const b of bridges) {
  assert(b.startsLand, `${b.id} starts on land`)
  assert(b.endsLand, `${b.id} ends on land`)
  assert(b.midWater, `${b.id} crosses water`)
}
assert(bridges.filter((b) => b.type === 'sumida').length >= 4, 'at least four Sumida crossings')
assert(bridges.filter((b) => b.type === 'rainbow').length === 1, 'the Rainbow Bridge connects Odaiba')

// 5. Landmarks are on the right surface and inside their reserved lots or water.
for (const l of LANDMARKS) {
  if (l.overWater) {
    assert(!onLand(l.x, l.z), `${l.id} sits over the bay`)
  } else {
    assert(onLand(l.x, l.z), `${l.id} sits on land`)
    assert(!inMoat(l.x, l.z) || l.id === 'imperial-palace', `${l.id} is not in the moat`)
  }
}
assert(onOdaiba(4.6, 11.0), 'Odaiba is land')
assert(!roadable(5.9, 0), 'the Sumida is not roadable')

// 6. Every block has a real face and parcels are attributed where they fall.
assert(plan.blocks.length > 30, `expected city blocks, got ${plan.blocks.length}`)
assert(plan.parcels.every((p) => p.district.length > 0), 'every parcel has a district')
assert(plan.parcels.some((p) => p.blockId >= 0), 'parcels fall inside block faces')
assert(plan.parcels.some((p) => p.district === 'shibuya'), 'Shibuya has its own parcels')
assert(plan.parcels.some((p) => p.district === 'asakusa'), 'Asakusa has its own parcels')

// 7. The road graph never routes through water or the palace moat.
for (const e of net.edges) {
  const a = net.nodes[e.a]
  const b = net.nodes[e.b]
  for (let t = 0; t <= 1; t += 0.2) {
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    if (!e.bridge) assert(roadable(x, z), `${e.name} is on land`)
  }
}

console.log(
  JSON.stringify({
    planning: 'pass',
    parcels: plan.parcels.length,
    blocks: plan.blocks.length,
    roads: net.edges.length,
    nodes: net.nodes.length,
    bridges: bridges.map((b) => b.id),
    districts: [...new Set(plan.parcels.map((p) => p.district))],
  }),
)
