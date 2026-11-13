import * as THREE from 'three'
import { RAIL, ROAD_Y, WATER_Y, bridgeDeckY, type Point } from './geography'
import type { Plan, RoadEdge } from './plan'
import type { Environment } from './environment'

type CarKind = 'taxi' | 'bus' | 'kei' | 'sedan'
type Car = {
  edge: number
  dir: 1 | -1
  t: number
  speed: number
  kind: CarKind
  color: THREE.Color
  lane: number
}

const carSpec: Record<CarKind, { len: number; wid: number; h: number; speed: number; color: string[] }> = {
  taxi: { len: 0.3, wid: 0.105, h: 0.055, speed: 0.34, color: ['#2f3236', '#2f3236', '#29323c', '#e7e3d5'] },
  bus: { len: 0.44, wid: 0.12, h: 0.11, speed: 0.24, color: ['#e4e7df', '#cfd9c8'] },
  kei: { len: 0.26, wid: 0.095, h: 0.06, speed: 0.3, color: ['#e8e6da', '#dfe4e3'] },
  sedan: { len: 0.32, wid: 0.105, h: 0.052, speed: 0.32, color: ['#3b4044', '#5a5f60', '#28313a'] },
}

function pathLength(points: Point[]) {
  const lengths = [0]
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  return lengths
}

function pointAt(points: Point[], lengths: number[], s: number) {
  const total = lengths[lengths.length - 1]
  let d = ((s % total) + total) % total
  let i = 1
  while (i < lengths.length && lengths[i] < d) i++
  const idx = Math.min(i, lengths.length - 1)
  const a = points[idx - 1]
  const b = points[idx]
  const seg = lengths[idx] - lengths[idx - 1] || 1
  const t = (d - lengths[idx - 1]) / seg
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) }
}

export function addCityLife(scene: THREE.Scene, plan: Plan, env: Environment) {
  const rng = (() => {
    let s = 2027
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 4294967296
    }
  })()

  const adjacency: number[][] = plan.network.nodes.map(() => [])
  plan.network.edges.forEach((e, i) => {
    adjacency[e.a].push(i)
    adjacency[e.b].push(i)
  })

  const camerasFor = (e: RoadEdge, dir: 1 | -1) => (dir === 1 ? e.a : e.b)

  const cars: Car[] = []
  for (let i = 0; i < 52; i++) {
    const kind: CarKind = i % 9 === 0 ? 'bus' : i % 4 === 0 ? 'kei' : i % 3 === 0 ? 'sedan' : 'taxi'
    const spec = carSpec[kind]
    const edge = Math.floor(rng() * plan.network.edges.length)
    cars.push({
      edge,
      dir: rng() > 0.5 ? 1 : -1,
      t: rng(),
      speed: spec.speed * (0.72 + rng() * 0.5),
      kind,
      color: new THREE.Color(spec.color[Math.floor(rng() * spec.color.length)]),
      lane: 0.045,
    })
  }

  const bodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.15 }),
    cars.length,
  )
  const windows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#22333d', roughness: 0.35, emissive: '#ffe0a6', emissiveIntensity: 0 }),
    cars.length,
  )
  const lights = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    cars.length * 2,
  )
  const wheels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#232526', roughness: 0.9 }),
    cars.length * 4,
  )
  bodies.castShadow = true
  windows.castShadow = false
  for (const mesh of [bodies, windows, lights, wheels]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    scene.add(mesh)
  }
  cars.forEach((c, i) => bodies.setColorAt(i, c.color))

  // Trains: three green cars each, on the elevated loop, stopping at the five stations.
  const loop = env.loop
  const loopLengths = pathLength(loop)
  const loopTotal = loopLengths[loopLengths.length - 1]
  const stationS = env.stationPoints.map((p) => {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < loop.length; i++) {
      const d = Math.hypot(loop[i][0] - p.x, loop[i][1] - p.z)
      if (d < bestD) {
        bestD = d
        best = loopLengths[i]
      }
    }
    return { s: best, name: p.name }
  })
  const trains = Array.from({ length: 4 }, (_, i) => ({
    s: (i / 4) * loopTotal,
    speed: 0,
    base: 0.5 + i * 0.03,
    dwell: 0,
    next: i,
  }))
  const trainCars = 3
  const trainBodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.2 }),
    trains.length * trainCars,
  )
  const trainWindows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#243740', roughness: 0.3, emissive: '#ffe6b8', emissiveIntensity: 0 }),
    trains.length * trainCars,
  )
  for (const mesh of [trainBodies, trainWindows]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.castShadow = true
    scene.add(mesh)
  }
  trains.forEach((_, i) => {
    for (let c = 0; c < trainCars; c++) trainBodies.setColorAt(i * trainCars + c, new THREE.Color(c === 0 ? '#4f9a68' : '#5fa875'))
  })
  if (trainBodies.instanceColor) trainBodies.instanceColor.needsUpdate = true

  // Boats: two lantern-lit yakatabune on the Sumida, a water bus in the bay, a barge off Odaiba.
  type Boat = {
    group: THREE.Group
    path: Point[]
    lengths: number[]
    s: number
    speed: number
    y: number
    glow: THREE.MeshStandardMaterial[]
  }
  const boats: Boat[] = []
  const makeYakatabune = () => {
    const g = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: '#4a3527', roughness: 0.7 }))
    hull.position.y = 0.05
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.19), new THREE.MeshStandardMaterial({ color: '#3d3a31', roughness: 0.9 }))
    roof.position.y = 0.2
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.16), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 0.8 }))
    cabin.position.y = 0.14
    g.add(hull, roof, cabin)
    const glow: THREE.MeshStandardMaterial[] = []
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: '#ffb45c', emissive: '#ff8a35', emissiveIntensity: 0.2, roughness: 0.6 })
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), mat)
      lantern.position.set(-0.18 + i * 0.12, 0.19, 0.11)
      g.add(lantern)
      glow.push(mat)
    }
    return { group: g, glow }
  }
  const addBoat = (path: Point[], speed: number, y: number, factory: () => { group: THREE.Group; glow: THREE.MeshStandardMaterial[] }) => {
    const { group, glow } = factory()
    group.position.y = y
    scene.add(group)
    const lengths = pathLength(path)
    boats.push({ group, path, lengths, s: rng() * lengths[lengths.length - 1], speed, y, glow })
  }
  addBoat(
    [
      [5.85, 3.2],
      [5.85, -4.2],
      [5.9, -9.0],
      [5.85, -12.6],
    ],
    0.13,
    WATER_Y + 0.01,
    makeYakatabune,
  )
  addBoat(
    [
      [6.05, -10.4],
      [6.05, -2.0],
      [6.0, 2.6],
    ],
    0.1,
    WATER_Y + 0.01,
    makeYakatabune,
  )
  const makeWaterBus = () => {
    const g = new THREE.Group()
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.09, 0.26),
      new THREE.MeshStandardMaterial({ color: '#eef1ea', roughness: 0.4, metalness: 0.2 }),
    )
    hull.position.y = 0.05
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.1, 0.22),
      new THREE.MeshStandardMaterial({ color: '#d9e7e5', roughness: 0.35, metalness: 0.3 }),
    )
    top.position.y = 0.13
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.225), new THREE.MeshStandardMaterial({ color: '#3e7f9c', roughness: 0.5 }))
    band.position.y = 0.16
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.045, 0.23),
      new THREE.MeshStandardMaterial({ color: '#456d7a', emissive: '#cfefff', emissiveIntensity: 0.2 }),
    )
    glass.position.y = 0.19
    g.add(hull, top, band, glass)
    return { group: g, glow: [glass.material as THREE.MeshStandardMaterial] }
  }
  addBoat(
    [
      [2.2, 13.3],
      [4.0, 13.0],
      [5.8, 12.7],
      [7.1, 12.0],
      [7.2, 10.8],
      [6.0, 10.2],
      [4.4, 10.1],
      [3.0, 10.9],
      [2.2, 12.0],
    ],
    0.16,
    WATER_Y + 0.02,
    makeWaterBus,
  )
  const makeBarge = () => {
    const g = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.22), new THREE.MeshStandardMaterial({ color: '#5c6360', roughness: 0.8 }))
    hull.position.y = 0.05
    const load = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.16), new THREE.MeshStandardMaterial({ color: '#8d8571', roughness: 1 }))
    load.position.set(0.03, 0.12, 0)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.15), new THREE.MeshStandardMaterial({ color: '#c4bca4', roughness: 0.8 }))
    cabin.position.set(-0.18, 0.11, 0)
    g.add(hull, load, cabin)
    return { group: g, glow: [] }
  }
  addBoat(
    [
      [6.9, 13.2],
      [5.4, 13.5],
      [4.2, 13.3],
    ],
    0.05,
    WATER_Y + 0.01,
    makeBarge,
  )

  // Pedestrians: routes through the crossing, the temple street, Ginza, the river and the island.
  const routes: { pts: Point[]; count: number; spread: number }[] = [
    { pts: [[-7.9, 6.1], [-7.2, 5.0], [-6.5, 4.1], [-6.9, 3.2], [-7.5, 4.2], [-7.9, 5.1]], count: 84, spread: 0.13 },
    { pts: [[7.75, -9.8], [7.55, -8.4], [7.4, -7.1]], count: 34, spread: 0.12 },
    { pts: [[3.0, 3.6], [4.4, 2.1], [5.3, 1.0]], count: 20, spread: 0.1 },
    { pts: [[4.85, 3.5], [4.85, -2.0], [4.85, -7.0], [4.85, -13.4]], count: 20, spread: 0.06 },
    { pts: [[-3.4, 1.1], [-1.0, 2.2], [1.3, 1.1], [0.9, -1.7], [-1.4, -2.5], [-3.2, -1.0]], count: 16, spread: 0.08 },
    { pts: [[4.1, 10.8], [5.5, 11.2], [6.5, 12.2]], count: 14, spread: 0.1 },
    { pts: [[-8.0, -3.2], [-6.2, -3.0], [-4.3, -2.6]], count: 16, spread: 0.08 },
    { pts: [[4.9, 4.2], [2.0, 5.8], [-0.4, 8.4], [-1.8, 11.5]], count: 14, spread: 0.07 },
  ]
  const walkers: { route: (typeof routes)[number]; lengths: number[]; s: number; speed: number; off: number; tone: THREE.Color; h: number }[] = []
  const bodyMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
    routes.reduce((s, r) => s + r.count, 0),
  )
  const headMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
    routes.reduce((s, r) => s + r.count, 0),
  )
  bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  scene.add(bodyMesh, headMesh)
  const clothes = ['#2f3438', '#4d5660', '#704c45', '#b9b2a3', '#3f5a70', '#e4dfd2', '#5b4d63']
  const skins = ['#d8b18d', '#c49a75', '#8e6548', '#e2c4a6']
  let wi = 0
  for (const route of routes) {
    const lengths = pathLength(route.pts)
    for (let i = 0; i < route.count; i++) {
      walkers.push({
        route,
        lengths,
        s: rng() * lengths[lengths.length - 1],
        speed: 0.05 + rng() * 0.06,
        off: (rng() - 0.5) * route.spread,
        tone: new THREE.Color(clothes[Math.floor(rng() * clothes.length)]),
        h: 0.036 + rng() * 0.012,
      })
      bodyMesh.setColorAt(wi, walkers[walkers.length - 1].tone)
      headMesh.setColorAt(wi, new THREE.Color(skins[Math.floor(rng() * skins.length)]))
      wi++
    }
  }

  const dummy = new THREE.Object3D()
  let elapsed = 0
  let nightValue = 0

  function updateCars(dt: number) {
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i]
      let edge = plan.network.edges[car.edge]
      let from = car.dir === 1 ? edge.a : edge.b
      let to = car.dir === 1 ? edge.b : edge.a
      let a = plan.network.nodes[from]
      let b = plan.network.nodes[to]
      let len = Math.hypot(b.x - a.x, b.z - a.z) || 0.1
      car.t += (car.speed * dt) / len
      if (car.t >= 1) {
        car.t -= 1
        const at = to
        const back = from
        const options = adjacency[at].filter((ei) => {
          const f = plan.network.edges[ei]
          const other = f.a === at ? f.b : f.a
          return other !== back
        })
        const straight = options.filter((ei) => {
          const f = plan.network.edges[ei]
          const f0 = f.a === at ? f.a : f.b
          const f1 = f.a === at ? f.b : f.a
          const n0 = plan.network.nodes[f0]
          const n1 = plan.network.nodes[f1]
          return (b.x - a.x) * (n1.x - n0.x) + (b.z - a.z) * (n1.z - n0.z) > 0
        })
        const pool = straight.length && rng() > 0.25 ? straight : options.length ? options : adjacency[at]
        const nextEdge = pool[Math.floor(rng() * pool.length)]
        const ne = plan.network.edges[nextEdge]
        car.edge = nextEdge
        car.dir = ne.a === at ? 1 : -1
        edge = ne
        from = car.dir === 1 ? ne.a : ne.b
        to = car.dir === 1 ? ne.b : ne.a
        a = plan.network.nodes[from]
        b = plan.network.nodes[to]
        len = Math.hypot(b.x - a.x, b.z - a.z) || 0.1
      }
      const px = a.x + (b.x - a.x) * car.t
      const pz = a.z + (b.z - a.z) * car.t
      const angle = Math.atan2(b.z - a.z, b.x - a.x)
      const lx = Math.sin(angle) * car.lane
      const lz = -Math.cos(angle) * car.lane
      const spec = carSpec[car.kind]
      const y = bridgeDeckY(edge.bridge, car.t) + spec.h / 2 + 0.035
      dummy.position.set(px + lx, y, pz + lz)
      dummy.rotation.set(0, -angle, 0)
      dummy.scale.set(spec.len, spec.h, spec.wid)
      dummy.updateMatrix()
      bodies.setMatrixAt(i, dummy.matrix)
      dummy.position.y = y + spec.h * 0.18
      dummy.scale.set(spec.len * 0.62, spec.h * 0.32, spec.wid * 1.01)
      dummy.updateMatrix()
      windows.setMatrixAt(i, dummy.matrix)
      // head and tail lights
      for (let k = 0; k < 2; k++) {
        const dirSign = k === 0 ? 1 : -1
        const fx = Math.cos(angle) * spec.len * 0.48 * dirSign
        const fz = -Math.sin(angle) * spec.len * 0.48 * dirSign
        dummy.position.set(px + lx + fx, y + 0.005, pz + lz + fz)
        dummy.rotation.set(0, -angle, 0)
        dummy.scale.set(0.012, 0.014, spec.wid * 0.7)
        dummy.updateMatrix()
        lights.setMatrixAt(i * 2 + k, dummy.matrix)
        lights.setColorAt(i * 2 + k, new THREE.Color(k === 0 ? '#fff1c4' : '#ff5b4d'))
      }
      // wheels
      for (let w = 0; w < 4; w++) {
        const fx = (w < 2 ? 0.3 : -0.3) * spec.len
        const sz = (w % 2 ? 0.42 : -0.42) * spec.wid
        const wx = Math.cos(angle) * fx - Math.sin(angle) * sz
        const wz = Math.sin(angle) * fx + Math.cos(angle) * sz
        dummy.position.set(px + lx + wx, y - spec.h * 0.36, pz + lz + wz)
        dummy.rotation.set(0, -angle, 0)
        dummy.scale.set(0.032, 0.028, 0.018)
        dummy.updateMatrix()
        wheels.setMatrixAt(i * 4 + w, dummy.matrix)
      }
    }
    bodies.instanceMatrix.needsUpdate = true
    windows.instanceMatrix.needsUpdate = true
    lights.instanceMatrix.needsUpdate = true
    wheels.instanceMatrix.needsUpdate = true
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
    if (lights.instanceColor) lights.instanceColor.needsUpdate = true
  }

  function updateTrains(dt: number) {
    for (let i = 0; i < trains.length; i++) {
      const t = trains[i]
      if (t.dwell > 0) {
        t.dwell -= dt
        if (t.dwell <= 0) {
          t.dwell = 0
          t.next = (t.next + 1) % stationS.length
          t.speed = 0.08
        }
      } else {
        t.speed = Math.min(t.base, t.speed + dt * 0.5)
        t.s += t.speed * dt
        const target = stationS[t.next].s
        let ahead = target - t.s
        if (ahead < 0) ahead += loopTotal
        if (ahead < 0.22) {
          t.s = target
          t.speed = 0
          t.dwell = 2.2
        }
      }
      for (let c = 0; c < trainCars; c++) {
        const s = t.s - c * 0.42
        const p = pointAt(loop, loopLengths, s)
        dummy.position.set(p.x, RAIL.y + 0.075, p.z)
        dummy.rotation.set(0, -p.angle, 0)
        dummy.scale.set(0.4, 0.14, 0.12)
        dummy.updateMatrix()
        trainBodies.setMatrixAt(i * trainCars + c, dummy.matrix)
        dummy.position.y = RAIL.y + 0.092
        dummy.scale.set(0.28, 0.05, 0.123)
        dummy.updateMatrix()
        trainWindows.setMatrixAt(i * trainCars + c, dummy.matrix)
      }
    }
    trainBodies.instanceMatrix.needsUpdate = true
    trainWindows.instanceMatrix.needsUpdate = true
  }

  function updateBoats(dt: number) {
    for (const b of boats) {
      b.s += b.speed * dt
      const p = pointAt(b.path, b.lengths, b.s)
      b.group.position.x = p.x
      b.group.position.z = p.z
      b.group.rotation.y = -p.angle
      for (const m of b.glow) m.emissiveIntensity = 0.15 + nightValue * 1.4
    }
  }

  function updatePeople(dt: number) {
    let i = 0
    for (const w of walkers) {
      w.s += w.speed * dt
      const p = pointAt(w.route.pts, w.lengths, w.s)
      const nx = -Math.sin(p.angle) * w.off
      const nz = Math.cos(p.angle) * w.off
      const bob = Math.sin(elapsed * 8 + i) * 0.004
      dummy.position.set(p.x + nx, ROAD_Y + w.h * 0.5 + 0.062 + bob, p.z + nz)
      dummy.rotation.set(0, -p.angle, 0)
      dummy.scale.set(w.h * 0.42, w.h, w.h * 0.34)
      dummy.updateMatrix()
      bodyMesh.setMatrixAt(i, dummy.matrix)
      dummy.position.y = ROAD_Y + w.h + 0.066 + bob
      dummy.scale.set(w.h * 0.28, w.h * 0.28, w.h * 0.28)
      dummy.updateMatrix()
      headMesh.setMatrixAt(i, dummy.matrix)
      i++
    }
    bodyMesh.instanceMatrix.needsUpdate = true
    headMesh.instanceMatrix.needsUpdate = true
  }

  return {
    vehicles: cars,
    trains,
    people: walkers,
    boats,
    update: (dt: number, time: number, night: number) => {
      elapsed = time
      nightValue = night
      updateCars(dt)
      updateTrains(dt)
      updateBoats(dt)
      updatePeople(dt)
      ;(windows.material as THREE.MeshStandardMaterial).emissiveIntensity = night * 1.2
      ;(trainWindows.material as THREE.MeshStandardMaterial).emissiveIntensity = night * 2.0
      ;(lights.material as THREE.MeshBasicMaterial).color.setScalar(0.45 + night * 0.55)
    },
  }
}

export type CityLife = ReturnType<typeof addCityLife>
