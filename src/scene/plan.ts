// The street plan is authored from the city, not a lattice: a moat ring, radials, district grids at
// their own angles, two river promenades, a bay shore road, an island loop and explicit bridges.
import {
  BRIDGES,
  DISTRICTS,
  LANDMARKS,
  ODAIBA,
  PARKS,
  SUMIDA,
  inMoat,
  onLand,
  onOdaiba,
  roadable,
  type District,
  type Point,
} from './geography'

export type Footprint = { x: number; z: number; w: number; d: number; height: number; rot?: number }
export type RoadNode = { x: number; z: number; neighbors: number[]; signal: number }
export type RoadEdge = {
  a: number
  b: number
  name: string
  width: number
  bridge?: 'sumida' | 'rainbow'
}
export type RoadNetwork = { nodes: RoadNode[]; edges: RoadEdge[] }
export type CityBlock = { id: number; boundary: Point[]; district: string }
export type Parcel = Footprint & {
  rot: number
  blockId: number
  district: string
  family: string
  variant: number
}
export type Plan = {
  network: RoadNetwork
  blocks: CityBlock[]
  parcels: Parcel[]
  reserved: Footprint[]
}

export function segmentsCross(a: Point, b: Point, c: Point, d: Point) {
  const cross = (p: Point, q: Point, r: Point) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

const segmentDistance = (x: number, z: number, a: Point, b: Point) => {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)))
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}

export function pointInPolygon(x: number, z: number, poly: Point[]) {
  let yes = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) yes = !yes
  }
  return yes
}

export function districtAt(x: number, z: number): District {
  let best = DISTRICTS[0]
  let bestD = Infinity
  for (const d of DISTRICTS) {
    if (Math.abs(x - d.cx) <= d.hu + 0.05 && Math.abs(z - d.cz) <= d.hv + 0.05) return d
    const dist = Math.hypot(x - d.cx, z - d.cz)
    if (dist < bestD) {
      bestD = dist
      best = d
    }
  }
  return best
}

export function planTokyo(): Plan {
  const reserved: Footprint[] = LANDMARKS.filter((l) => !l.overWater).map((l) => ({
    x: l.x,
    z: l.z,
    w: l.lotW,
    d: l.lotD,
    height: 0,
  }))
  const obstacles = [...reserved, ...PARKS.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d, height: 0 }))]
  const margin = 0.12
  const blocked = (x: number, z: number) =>
    obstacles.some(
      (b) =>
        Math.abs(x - b.x) < b.w / 2 + margin - 1e-6 &&
        Math.abs(z - b.z) < b.d / 2 + margin - 1e-6,
    )

  const clear = (a: Point, b: Point) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.035))
    for (let i = 0; i <= n; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / n
      const z = a[1] + ((b[1] - a[1]) * i) / n
      if (!roadable(x, z) || blocked(x, z)) return false
    }
    return true
  }

  type Segment = { a: Point; b: Point; name: string; width: number }
  const segments: Segment[] = []

  /**
   * Streets stop at a reserved campus instead of drawing a diagonal detour around it. The result is
   * a legible block plan; perpendicular streets keep the graph connected around each lot.
   */
  const route = (a: Point, b: Point, name: string, width: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len < 0.04) return
    if (clear(a, b)) {
      segments.push({ a, b, name, width })
      return
    }
    const n = Math.ceil(len / 0.06)
    let start = -1
    const flush = (endIndex: number) => {
      if (start >= 0 && endIndex - start >= 2) {
        const t0 = start / n
        const t1 = endIndex / n
        segments.push({
          a: [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0],
          b: [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1],
          name,
          width,
        })
      }
      start = -1
    }
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = a[0] + (b[0] - a[0]) * t
      const z = a[1] + (b[1] - a[1]) * t
      const ok = roadable(x, z) && !blocked(x, z)
      if (ok && start < 0) start = i
      else if (!ok && start >= 0) flush(i - 1)
    }
    flush(n)
  }

  const path = (points: Point[], name: string, width: number) => {
    for (let i = 1; i < points.length; i++) route(points[i - 1], points[i], name, width)
  }

  const roundedRing = (cx: number, cz: number, hw: number, hd: number, r: number, per = 6): Point[] => {
    const out: Point[] = []
    const corners: [number, number, number][] = [
      [cx + hw - r, cz - hd + r, -Math.PI / 2],
      [cx + hw - r, cz + hd - r, 0],
      [cx - hw + r, cz + hd - r, Math.PI / 2],
      [cx - hw + r, cz - hd + r, Math.PI],
    ]
    for (const [x, z, start] of corners) {
      for (let i = 0; i <= per; i++) {
        const a = start + (i / per) * (Math.PI / 2)
        out.push([x + Math.cos(a) * r, z + Math.sin(a) * r])
      }
    }
    out.push(out[0])
    return out
  }

  // 1. The moat ring and the outer loop road.
  path(roundedRing(0, 0, 3.2, 2.95, 0.55), 'Sotobori-dori', 0.3)

  // 2. Radials. These are the named roads that make the plan legible from the air.
  path([[3.2, 0.85], [4.2, 0.88], [5.1, 0.92]], 'Chuo-dori', 0.26)
  path([[1.5, 2.95], [1.05, 4.2], [0.6, 5.8], [-0.15, 8.0], [-1.0, 10.4], [-1.7, 12.7], [-2.5, 14.4]], 'Sakurada-dori', 0.26)
  path([[-3.2, 1.15], [-4.35, 2.15], [-5.5, 3.45], [-6.4, 4.6]], 'Meiji-dori', 0.24)
  path([[-2.65, -2.95], [-3.8, -4.0], [-5.0, -5.2], [-6.2, -6.6], [-7.4, -8.1]], 'Yasukuni-dori', 0.24)
  path([[-3.1, -0.55], [-4.2, 0.2], [-5.35, 1.0]], 'Aoyama-dori', 0.25)
  path([[2.25, 2.9], [3.05, 4.4], [3.85, 6.0], [4.45, 7.6], [4.9, 9.0], [5.1, 10.6]], 'Showa-dori', 0.25)
  path([[3.1, -5.4], [3.25, -7.1], [3.4, -9.1], [3.45, -11.2], [3.45, -13.2]], 'Ueno-dori', 0.25)
  path([[6.82, -11.4], [7.55, -11.0], [8.25, -10.8]], 'Kototoi-dori', 0.22)

  // 3. District grids. Each district sweeps its own frame, clipped to land and around reserves.
  const linePoints = (origin: Point, angle: number, fixed: number, alongU: boolean, from: number, to: number) => {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const out: Point[] = []
    for (let t = from; t <= to + 1e-9; t += 0.18) {
      const u = alongU ? t : fixed
      const v = alongU ? fixed : t
      out.push([origin[0] + u * cos - v * sin, origin[1] + u * sin + v * cos])
    }
    return out
  }
  const runs = (points: Point[]) => {
    const out: Point[][] = []
    let run: Point[] = []
    for (const p of points) {
      if (roadable(p[0], p[1])) run.push(p)
      else {
        if (run.length > 1) out.push(run)
        run = []
      }
    }
    if (run.length > 1) out.push(run)
    return out
  }
  for (const d of DISTRICTS) {
    for (let i = 0, v = -d.hv; v <= d.hv; v += d.streetSpacing, i++) {
      for (const run of runs(linePoints([d.cx, d.cz], d.angle, v, true, -d.hu, d.hu))) {
        const name = d.names[i % d.names.length]
        // Chunk long runs so the road can follow a curved coast instead of cutting across it.
        for (let k = 0; k < run.length - 1; k += 9) {
          route(run[k], run[Math.min(k + 9, run.length - 1)], name, 0.18)
        }
      }
    }
    for (let i = 0, u = -d.hu; u <= d.hu; u += d.crossSpacing, i++) {
      for (const run of runs(linePoints([d.cx, d.cz], d.angle, u, false, -d.hv, d.hv))) {
        const name = d.names[(i + 2) % d.names.length]
        for (let k = 0; k < run.length - 1; k += 9) {
          route(run[k], run[Math.min(k + 9, run.length - 1)], name, 0.2)
        }
      }
    }
  }

  // 4. The Sumida promenades, the bay shore and the island loop.
  path([[5.08, -14.6], [5.08, -10.2], [5.06, -6.2], [5.08, -2.2], [5.08, 2.2], [5.08, 3.9]], 'Sumida Promenade', 0.15)
  path([[6.78, -14.6], [6.78, -10.2], [6.76, -6.0], [6.78, -2.0], [6.78, 2.0], [6.78, 3.8]], 'East Bank Promenade', 0.15)
  path(
    [
      [-4.25, 14.25],
      [-2.6, 13.7],
      [-1.2, 12.85],
      [0.05, 11.7],
      [0.85, 10.55],
      [1.55, 9.3],
      [2.2, 8.0],
      [2.95, 6.6],
      [3.65, 5.35],
      [4.25, 4.65],
    ],
    'Kaigan-dori',
    0.24,
  )
  const island = (() => {
    const cx = ODAIBA.reduce((s, p) => s + p[0], 0) / ODAIBA.length
    const cz = ODAIBA.reduce((s, p) => s + p[1], 0) / ODAIBA.length
    return ODAIBA.map(([x, z]) => {
      const dx = x - cx
      const dz = z - cz
      const len = Math.hypot(dx, dz) || 1
      return [x - (dx / len) * 0.28, z - (dz / len) * 0.28] as Point
    })
  })()
  path([...island, island[0]], 'Odaiba Kaihin-dori', 0.22)
  path([[3.65, 11.5], [4.6, 11.3], [5.6, 11.5], [6.5, 11.7]], 'Rainbow Promenade', 0.2)
  path([[4.6, 9.55], [4.55, 10.6], [4.65, 11.4], [4.7, 12.4], [4.8, 13.4]], 'Bay Street', 0.2)

  // 5. Split every crossing into one planar graph.
  const network: RoadNetwork = { nodes: [], edges: [] }
  const ids = new Map<string, number>()
  const node = (p: Point) => {
    const key = `${p[0].toFixed(4)},${p[1].toFixed(4)}`
    if (ids.has(key)) return ids.get(key)!
    const id = network.nodes.length
    ids.set(key, id)
    network.nodes.push({ x: p[0], z: p[1], neighbors: [], signal: id % 2 })
    return id
  }
  const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0]
  const used = new Set<string>()
  const addEdge = (a: number, b: number, name: string, width: number, bridge?: 'sumida' | 'rainbow') => {
    if (a === b) return
    const key = a < b ? `${a},${b}` : `${b},${a}`
    if (used.has(key)) return
    used.add(key)
    network.edges.push({ a, b, name, width, bridge })
    network.nodes[a].neighbors.push(b)
    network.nodes[b].neighbors.push(a)
  }
  for (const s of segments) {
    const dx = s.b[0] - s.a[0]
    const dz = s.b[1] - s.a[1]
    const len2 = dx * dx + dz * dz
    if (len2 < 1e-8) continue
    const ts = [0, 1]
    for (const o of segments) {
      if (o === s) continue
      const q: Point = [o.a[0] - s.a[0], o.a[1] - s.a[1]]
      const v: Point = [o.b[0] - o.a[0], o.b[1] - o.a[1]]
      const r: Point = [dx, dz]
      const den = cross(r, v)
      if (Math.abs(den) > 1e-8) {
        const t = cross(q, v) / den
        const u = cross(q, r) / den
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) ts.push(t)
      } else {
        for (const p of [o.a, o.b]) {
          if (segmentDistance(p[0], p[1], s.a, s.b) < 1e-5) {
            const t = ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / len2
            if (t > 0 && t < 1) ts.push(t)
          }
        }
      }
    }
    ts.sort((a, b) => a - b)
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] - ts[i - 1] < 1e-4) continue
      const a = node([s.a[0] + dx * ts[i - 1], s.a[1] + dz * ts[i - 1]])
      const b = node([s.a[0] + dx * ts[i], s.a[1] + dz * ts[i]])
      addEdge(a, b, s.name, s.width)
    }
  }

  // 6. Bridges join existing bank nodes, so the deck and the graph agree.
  const nearestNode = (p: Point, accept: (x: number, z: number) => boolean) => {
    let best = -1
    let bestD = 1.4
    network.nodes.forEach((n, i) => {
      if (!accept(n.x, n.z)) return
      const d = Math.hypot(n.x - p[0], n.z - p[1])
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }
  for (const b of BRIDGES) {
    if (b.type === 'sumida') {
      const a = nearestNode(b.a, (x) => x < SUMIDA.x0 + 0.02 && x > SUMIDA.x0 - 1.0)
      const c = nearestNode(b.b, (x) => x > SUMIDA.x1 - 0.02 && x < SUMIDA.x1 + 0.7)
      if (a >= 0 && c >= 0) addEdge(a, c, b.name, 0.3, 'sumida')
    } else {
      const a = nearestNode(b.a, (x, z) => onLand(x, z) && !onOdaiba(x, z) && !inMoat(x, z))
      const c = nearestNode(b.b, (x, z) => onOdaiba(x, z))
      if (a >= 0 && c >= 0) addEdge(a, c, b.name, 0.34, 'rainbow')
    }
  }

  // 7. Detached grid fragments become connector streets to the largest component, never hidden.
  const components = () => {
    const seen = new Set<number>()
    const out: number[][] = []
    for (let start = 0; start < network.nodes.length; start++) {
      if (seen.has(start)) continue
      const part = [start]
      seen.add(start)
      for (let i = 0; i < part.length; i++) {
        for (const n of network.nodes[part[i]].neighbors) {
          if (!seen.has(n)) {
            seen.add(n)
            part.push(n)
          }
        }
      }
      out.push(part)
    }
    return out
  }
  for (let k = 0; k < 40; k++) {
    const parts = components()
    if (parts.length <= 1) break
    parts.sort((a, b) => b.length - a.length)
    const main = new Set(parts[0])
    let best: { a: number; b: number; d: number } | null = null
    for (let a = 0; a < network.nodes.length; a++) {
      if (main.has(a)) continue
      const A = network.nodes[a]
      for (const b of parts[0]) {
        const B = network.nodes[b]
        const d = Math.hypot(A.x - B.x, A.z - B.z)
        if (d < 3.4 && (!best || d < best.d) && clear([A.x, A.z], [B.x, B.z])) best = { a, b, d }
      }
    }
    if (!best) break
    addEdge(best.a, best.b, 'Connector', 0.18)
  }

  // Any stray stub that no connector can reach is pruned; the delivered graph is one component.
  {
    const parts = components()
    parts.sort((a, b) => b.length - a.length)
    if (parts.length > 1) {
      const keep = new Set(parts[0])
      const remap = new Map<number, number>()
      parts[0].forEach((id, i) => remap.set(id, i))
      network.nodes = parts[0].map((id) => network.nodes[id])
      network.edges = network.edges
        .filter((e) => keep.has(e.a) && keep.has(e.b))
        .map((e) => ({ ...e, a: remap.get(e.a)!, b: remap.get(e.b)! }))
      network.nodes.forEach((n) => (n.neighbors = []))
      network.edges.forEach((e) => {
        network.nodes[e.a].neighbors.push(e.b)
        network.nodes[e.b].neighbors.push(e.a)
      })
    }
  }

  // 8. Blocks are the faces of the planar graph.
  const blocks: CityBlock[] = []
  const visited = new Set<string>()
  for (let a = 0; a < network.nodes.length; a++) {
    for (const b of network.nodes[a].neighbors) {
      if (visited.has(`${a},${b}`)) continue
      const boundary: Point[] = []
      let u = a
      let v = b
      for (let k = 0; k < network.edges.length * 2; k++) {
        const key = `${u},${v}`
        if (visited.has(key)) break
        visited.add(key)
        const n = network.nodes[u]
        boundary.push([n.x, n.z])
        const at = network.nodes[v]
        const sorted = [...at.neighbors].sort(
          (i, j) =>
            Math.atan2(network.nodes[i].z - at.z, network.nodes[i].x - at.x) -
            Math.atan2(network.nodes[j].z - at.z, network.nodes[j].x - at.x),
        )
        const next = sorted[(sorted.indexOf(u) - 1 + sorted.length) % sorted.length]
        u = v
        v = next
        if (u === a && v === b) break
      }
      const area =
        boundary.reduce((s, p, i) => {
          const q = boundary[(i + 1) % boundary.length]
          return s + p[0] * q[1] - q[0] * p[1]
        }, 0) / 2
      if (area > 0.16 && boundary.length > 2) {
        const cx = boundary.reduce((s, p) => s + p[0], 0) / boundary.length
        const cz = boundary.reduce((s, p) => s + p[1], 0) / boundary.length
        blocks.push({ id: blocks.length, boundary, district: districtAt(cx, cz).id })
      }
    }
  }

  // 9. Parcels. Deterministic sweep per district, with SAT overlap rejection across districts.
  let seed = 8317
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const placed: Parcel[] = []
  const hash = new Map<string, Parcel[]>()
  const cell = 0.7
  const hashKey = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`
  const addToHash = (p: Parcel) => {
    const key = hashKey(p.x, p.z)
    const list = hash.get(key) ?? []
    list.push(p)
    hash.set(key, list)
  }
  const near = (x: number, z: number) => {
    const out: Parcel[] = []
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) out.push(...(hash.get(hashKey(x + i * cell, z + j * cell)) ?? []))
    return out
  }
  const rectCorners = (p: { x: number; z: number; w: number; d: number; rot: number }): Point[] => {
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([sx, sz]) => [p.x + (sx * p.w * c) / 2 - (sz * p.d * s) / 2, p.z + (sx * p.w * s) / 2 + (sz * p.d * c) / 2] as Point)
  }
  const overlaps = (a: Parcel, b: Parcel) => {
    const axes = [a.rot, a.rot + Math.PI / 2, b.rot, b.rot + Math.PI / 2]
    for (const angle of axes) {
      const nx = Math.cos(angle)
      const nz = Math.sin(angle)
      const project = (p: Parcel) => {
        const c = Math.cos(p.rot)
        const s = Math.sin(p.rot)
        const ra = Math.abs((p.w / 2) * (c * nx + s * nz)) + Math.abs((p.d / 2) * (-s * nx + c * nz))
        const center = p.x * nx + p.z * nz
        return [center - ra, center + ra] as const
      }
      const [a0, a1] = project(a)
      const [b0, b1] = project(b)
      if (a1 <= b0 + 1e-6 || b1 <= a0 + 1e-6) return false
    }
    return true
  }

  for (const d of DISTRICTS) {
    const cos = Math.cos(d.angle)
    const sin = Math.sin(d.angle)
    for (let v = -d.hv; v <= d.hv; v += 0.4) {
      for (let u = -d.hu; u <= d.hu; u += 0.43) {
        if (rand() < 0.03) continue
        const x = d.cx + u * cos - v * sin
        const z = d.cz + u * sin + v * cos
        const w = d.id === 'odaiba' ? 0.42 : 0.4
        const dd = d.id === 'odaiba' ? 0.38 : 0.36
        const corners4 = rectCorners({ x, z, w, d: dd, rot: d.angle })
        if (!corners4.every(([px, pz]) => roadable(px, pz))) continue
        if (obstacles.some((b) => Math.abs(x - b.x) < (w + b.w) / 2 + 0.03 && Math.abs(z - b.z) < (dd + b.d) / 2 + 0.03)) continue
        let blockedRoad = false
        for (const e of network.edges) {
          const a = network.nodes[e.a]
          const b = network.nodes[e.b]
          // Exact segment-to-rotated-rectangle distance: endpoint-to-rect plus corner-to-segment.
          const ax = (a.x - x) * cos + (a.z - z) * sin
          const az = -(a.x - x) * sin + (a.z - z) * cos
          const bx = (b.x - x) * cos + (b.z - z) * sin
          const bz = -(b.x - x) * sin + (b.z - z) * cos
          const ptRect = (px: number, pz: number) => Math.hypot(Math.max(Math.abs(px) - w / 2, 0), Math.max(Math.abs(pz) - dd / 2, 0))
          let dist = Math.min(ptRect(ax, az), ptRect(bx, bz))
          for (const [sx, sz] of [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ]) {
            dist = Math.min(dist, segmentDistance((sx * w) / 2, (sz * dd) / 2, [ax, az], [bx, bz]))
          }
          const hw = w / 2
          const hd = dd / 2
          const rect: Point[] = [
            [-hw, -hd],
            [hw, -hd],
            [hw, hd],
            [-hw, hd],
          ]
          if (
            (Math.abs(ax) < hw && Math.abs(az) < hd) ||
            (Math.abs(bx) < hw && Math.abs(bz) < hd) ||
            rect.some((p, i) => segmentsCross([ax, az], [bx, bz], p, rect[(i + 1) % 4]))
          ) {
            dist = 0
          }
          if (dist < e.width / 2 + 0.012) {
            blockedRoad = true
            break
          }
        }
        if (blockedRoad) continue
        const candidate: Parcel = {
          x,
          z,
          w,
          d: dd,
          rot: d.angle,
          height: 0,
          blockId: -1,
          district: d.id,
          family: d.families[Math.floor(rand() * d.families.length)],
          variant: 0,
        }
        if (near(x, z).some((p) => overlaps(candidate, p))) continue
        candidate.height = d.height[0] + rand() * (d.height[1] - d.height[0])
        const block = blocks.find((b) => pointInPolygon(x, z, b.boundary))
        candidate.blockId = block?.id ?? -1
        placed.push(candidate)
        addToHash(candidate)
      }
    }
  }
  // A second, finer pass fills the small blocks and the gaps between the larger parcels. It uses
  // the same district frame and the same overlap hash, so it can never double-plant a lot.
  for (const d of DISTRICTS) {
    const cos = Math.cos(d.angle)
    const sin = Math.sin(d.angle)
    for (let v = -d.hv + 0.18; v <= d.hv; v += 0.32) {
      for (let u = -d.hu + 0.2; u <= d.hu; u += 0.33) {
        const x = d.cx + u * cos - v * sin
        const z = d.cz + u * sin + v * cos
        const w = 0.27
        const dd = 0.25
        const c4 = rectCorners({ x, z, w, d: dd, rot: d.angle })
        if (!c4.every(([px, pz]) => roadable(px, pz))) continue
        if (obstacles.some((b) => Math.abs(x - b.x) < (w + b.w) / 2 + 0.02 && Math.abs(z - b.z) < (dd + b.d) / 2 + 0.02)) continue
        let blockedRoad = false
        for (const e of network.edges) {
          const a = network.nodes[e.a]
          const b = network.nodes[e.b]
          const ax = (a.x - x) * cos + (a.z - z) * sin
          const az = -(a.x - x) * sin + (a.z - z) * cos
          const bx = (b.x - x) * cos + (b.z - z) * sin
          const bz = -(b.x - x) * sin + (b.z - z) * cos
          const ptRect = (px: number, pz: number) => Math.hypot(Math.max(Math.abs(px) - w / 2, 0), Math.max(Math.abs(pz) - dd / 2, 0))
          let dist = Math.min(ptRect(ax, az), ptRect(bx, bz))
          for (const [sx, sz] of [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ]) {
            dist = Math.min(dist, segmentDistance((sx * w) / 2, (sz * dd) / 2, [ax, az], [bx, bz]))
          }
          const hw = w / 2
          const hd = dd / 2
          const rect: Point[] = [
            [-hw, -hd],
            [hw, -hd],
            [hw, hd],
            [-hw, hd],
          ]
          if (
            (Math.abs(ax) < hw && Math.abs(az) < hd) ||
            (Math.abs(bx) < hw && Math.abs(bz) < hd) ||
            rect.some((p, i) => segmentsCross([ax, az], [bx, bz], p, rect[(i + 1) % 4]))
          ) {
            dist = 0
          }
          if (dist < e.width / 2 + 0.004) {
            blockedRoad = true
            break
          }
        }
        if (blockedRoad) continue
        const candidate: Parcel = {
          x,
          z,
          w,
          d: dd,
          rot: d.angle,
          height: 0,
          blockId: -1,
          district: d.id,
          family: d.families[Math.floor(rand() * d.families.length)],
          variant: 0,
        }
        if (near(x, z).some((p) => overlaps(candidate, p))) continue
        candidate.height = d.height[0] + rand() * (d.height[1] - d.height[0])
        const block = blocks.find((b) => pointInPolygon(x, z, b.boundary))
        candidate.blockId = block?.id ?? -1
        placed.push(candidate)
        addToHash(candidate)
      }
    }
  }
  const familyCounts = new Map<string, number>()
  for (const p of placed) {
    const n = familyCounts.get(p.family) ?? 0
    p.variant = n
    familyCounts.set(p.family, n + 1)
  }

  return { network, blocks, parcels: placed, reserved }
}

export function bridgeStats(plan: Plan) {
  return plan.network.edges
    .filter((e) => e.bridge)
    .map((e) => {
      const a = plan.network.nodes[e.a]
      const b = plan.network.nodes[e.b]
      const mx = (a.x + b.x) / 2
      const mz = (a.z + b.z) / 2
      return {
        id: e.name,
        type: e.bridge!,
        a: [a.x, a.z] as Point,
        b: [b.x, b.z] as Point,
        midWater: !onLand(mx, mz),
        startsLand: onLand(a.x, a.z),
        endsLand: onLand(b.x, b.z),
      }
    })
}
