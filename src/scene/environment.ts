import * as THREE from 'three'
import {
  BRIDGES,
  LAND_Y,
  MAIN_LAND,
  MOAT,
  ODAIBA,
  PALACE_ISLAND,
  PARKS,
  RAIL,
  ROAD_Y,
  TRAY,
  WATER_Y,
  bridgeDeckY,
  railLoop,
  type Point,
} from './geography'
import type { Parcel, Plan, RoadEdge } from './plan'
import { Kit } from './kit'

const tmpObject = new THREE.Object3D()

function roundedShape(w: number, d: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -d / 2)
  s.lineTo(w / 2 - r, -d / 2)
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r)
  s.lineTo(w / 2, d / 2 - r)
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2)
  s.lineTo(-w / 2 + r, d / 2)
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r)
  s.lineTo(-w / 2, -d / 2 + r)
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2)
  return s
}

function shapeFrom(points: Point[], hole?: { x: number; z: number; w: number; d: number }) {
  const shape = new THREE.Shape()
  points.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)))
  shape.closePath()
  if (hole) {
    const h = new THREE.Path()
    const x0 = hole.x - hole.w / 2
    const x1 = hole.x + hole.w / 2
    const z0 = hole.z - hole.d / 2
    const z1 = hole.z + hole.d / 2
    h.moveTo(x0, z0)
    h.lineTo(x1, z0)
    h.lineTo(x1, z1)
    h.lineTo(x0, z1)
    h.closePath()
    shape.holes.push(h)
  }
  return shape
}

function extrudeLand(points: Point[], hole?: { x: number; z: number; w: number; d: number }) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(points, hole), {
    depth: 0.42,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.03,
    bevelSegments: 1,
  })
  return geo
}

export function buildEnvironment(scene: THREE.Scene, plan: Plan) {
  const kit = new Kit()
  let seed = 991
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  // Tray, land, island, moat island.
  const tray = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(TRAY.w - 1.0, TRAY.d - 1.0, 1.5), {
      depth: 0.55,
      bevelEnabled: true,
      bevelSize: 0.1,
      bevelThickness: 0.08,
      bevelSegments: 2,
    }),
    new THREE.MeshStandardMaterial({ color: '#686252', roughness: 0.95, dithering: true }),
  )
  tray.rotation.x = -Math.PI / 2
  tray.position.y = -0.72
  tray.receiveShadow = true
  scene.add(tray)

  const landMat = new THREE.MeshStandardMaterial({ color: '#817b67', roughness: 0.94, dithering: true })
  const main = new THREE.Mesh(extrudeLand(MAIN_LAND, MOAT), landMat)
  main.rotation.x = Math.PI / 2
  main.position.y = LAND_Y
  main.castShadow = true
  main.receiveShadow = true
  scene.add(main)
  const island = new THREE.Mesh(extrudeLand(ODAIBA), landMat)
  island.rotation.x = Math.PI / 2
  island.position.y = LAND_Y
  island.castShadow = true
  island.receiveShadow = true
  scene.add(island)

  const palace = new THREE.Mesh(
    new THREE.BoxGeometry(PALACE_ISLAND.w, 0.34, PALACE_ISLAND.d),
    new THREE.MeshStandardMaterial({ color: '#8e9a6b', roughness: 1 }),
  )
  palace.position.set(PALACE_ISLAND.x, LAND_Y - 0.11, PALACE_ISLAND.z)
  palace.receiveShadow = true
  scene.add(palace)

  // Bay and river water, with a light shimmer pass.
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#356d7c',
    roughness: 0.4,
    metalness: 0.26,
    dithering: true,
  })
  const water = new THREE.Mesh(new THREE.PlaneGeometry(TRAY.w + 3, TRAY.d + 3, 1, 1), waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.y = WATER_Y
  water.receiveShadow = false
  scene.add(water)
  const shimmerMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTint: { value: new THREE.Color('#d9f1ee') },
      uOpacity: { value: 0.55 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uTint; uniform float uOpacity;
      void main(){
        vec2 p = vUv * vec2(120.0, 215.0);
        float w = sin(p.x*0.55 + uTime*0.55) + sin(p.y*0.72 - uTime*0.4) + sin((p.x+p.y)*0.31 + uTime*0.24);
        float line = smoothstep(0.55, 1.0, w * 0.18 + 0.5);
        gl_FragColor = vec4(uTint, line * 0.07 * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const shimmer = new THREE.Mesh(new THREE.PlaneGeometry(TRAY.w + 3, TRAY.d + 3), shimmerMat)
  shimmer.rotation.x = -Math.PI / 2
  shimmer.position.y = WATER_Y + 0.006
  scene.add(shimmer)

  // Seawalls: every land boundary gets a low stone edge.
  const shore = (points: Point[], loop = true, y = 0.3) => {
    const n = loop ? points.length : points.length - 1
    for (let i = 0; i < n; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
      kit.box((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, len + 0.02, 0.3, 0.07, '#a49d88', angle)
    }
  }
  shore(MAIN_LAND)
  shore(ODAIBA)
  const moatPts: Point[] = [
    [MOAT.x - MOAT.w / 2, MOAT.z - MOAT.d / 2],
    [MOAT.x + MOAT.w / 2, MOAT.z - MOAT.d / 2],
    [MOAT.x + MOAT.w / 2, MOAT.z + MOAT.d / 2],
    [MOAT.x - MOAT.w / 2, MOAT.z + MOAT.d / 2],
  ]
  shore(moatPts)
  const palacePts: Point[] = [
    [-PALACE_ISLAND.w / 2, -PALACE_ISLAND.d / 2],
    [PALACE_ISLAND.w / 2, -PALACE_ISLAND.d / 2],
    [PALACE_ISLAND.w / 2, PALACE_ISLAND.d / 2],
    [-PALACE_ISLAND.w / 2, PALACE_ISLAND.d / 2],
  ]
  shore(palacePts, true, 0.34)

  // Roads: pale underlay, asphalt, and a small number of centre lines.
  const roadMatrices: THREE.Matrix4[] = []
  const walkMatrices: THREE.Matrix4[] = []
  const lineMatrices: THREE.Matrix4[] = []
  const roadColors: THREE.Color[] = []
  const push = (arr: THREE.Matrix4[], colors: THREE.Color[] | null, x: number, z: number, angle: number, len: number, w: number, y: number) => {
    tmpObject.position.set(x, y, z)
    tmpObject.rotation.set(0, -angle, 0)
    tmpObject.scale.set(Math.max(len, 0.02), 0.026, Math.max(w, 0.02))
    tmpObject.updateMatrix()
    arr.push(tmpObject.matrix.clone())
    if (colors) colors.push(new THREE.Color().setHSL(0.55, 0.03, 0.16 + rand() * 0.05))
  }
  for (const e of plan.network.edges) {
    const a = plan.network.nodes[e.a]
    const b = plan.network.nodes[e.b]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    if (len < 0.05) continue
    const angle = Math.atan2(dz, dx)
    if (!e.bridge) {
      push(walkMatrices, null, (a.x + b.x) / 2, (a.z + b.z) / 2, angle, len + 0.035, e.width + 0.1, ROAD_Y - 0.004)
      push(roadMatrices, roadColors, (a.x + b.x) / 2, (a.z + b.z) / 2, angle, len + 0.02, e.width, ROAD_Y)
      if (e.width >= 0.27) push(lineMatrices, null, (a.x + b.x) / 2, (a.z + b.z) / 2, angle, len * 0.42, 0.012, ROAD_Y + 0.016)
    } else {
      const steps = 12
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps
        const t1 = (i + 1) / steps
        const x0 = a.x + dx * t0
        const z0 = a.z + dz * t0
        const x1 = a.x + dx * t1
        const z1 = a.z + dz * t1
        const y = bridgeDeckY(e.bridge, (t0 + t1) / 2)
        push(roadMatrices, roadColors, (x0 + x1) / 2, (z0 + z1) / 2, angle, len / steps + 0.02, e.width + 0.05, y)
        for (const side of [-1, 1]) {
          const nx = -Math.sin(angle) * side * (e.width / 2 + 0.03)
          const nz = Math.cos(angle) * side * (e.width / 2 + 0.03)
          kit.box((x0 + x1) / 2 + nx, y + 0.11, (z0 + z1) / 2 + nz, len / steps + 0.03, 0.16, 0.025, '#d8d9d1', angle)
          if (i % 3 === 0) kit.lamp((x0 + x1) / 2 + nx, y + 0.22, (z0 + z1) / 2 + nz, 0.02, 0.03, 0.02, '#ffe2ae')
        }
      }
      // piers under the span
      for (const t of [0.28, 0.72]) {
        const x = a.x + dx * t
        const z = a.z + dz * t
        const y = bridgeDeckY(e.bridge, t)
        kit.cyl(x, (WATER_Y + y) / 2, z, e.bridge === 'rainbow' ? 0.09 : 0.055, y - WATER_Y, '#b9bcb4')
      }
      if (e.bridge === 'sumida') {
        for (const t of [0.5]) {
          const x = a.x + dx * t
          const z = a.z + dz * t
          const y = bridgeDeckY(e.bridge, t)
          kit.beam([x - 0.12, y - 0.2, z], [x + 0.12, y - 0.2, z], 0.04, '#c04a3c')
        }
      }
    }
  }
  const createInstanced = (
    matrices: THREE.Matrix4[],
    colors: THREE.Color[] | null,
    material: THREE.Material,
    shadow = true,
  ) => {
    if (!matrices.length) return
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, matrices.length)
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m)
      if (colors) mesh.setColorAt(i, colors[i])
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.castShadow = shadow
    mesh.receiveShadow = shadow
    scene.add(mesh)
  }
  createInstanced(walkMatrices, null, new THREE.MeshStandardMaterial({ color: '#9c9787', roughness: 1 }))
  createInstanced(roadMatrices, roadColors, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }))
  createInstanced(lineMatrices, null, new THREE.MeshStandardMaterial({ color: '#d9d2b9', roughness: 0.9 }), false)

  // Parks: lawns, paths, water and trees.
  const lawn = new THREE.MeshStandardMaterial({ color: '#526d42', roughness: 1 })
  for (const park of PARKS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(park.w, 0.035, park.d), lawn)
    m.position.set(park.x, ROAD_Y + 0.005, park.z)
    m.receiveShadow = true
    scene.add(m)
    // raked path
    kit.box(park.x, ROAD_Y + 0.02, park.z, park.w * 0.14, 0.02, park.d * 0.94, '#c6bda5')
    const trees = Math.max(6, Math.floor(park.w * park.d * 9))
    for (let i = 0; i < trees; i++) {
      const x = park.x + (rand() - 0.5) * park.w * 0.84
      const z = park.z + (rand() - 0.5) * park.d * 0.84
      if (park.id === 'meiji' && Math.hypot(x + 6.35, z + 0.45) < 0.95) continue
      if (park.id === 'ueno' && z > -10.2 && x > 0.1 && x < 1.0) continue
      const h = 0.16 + rand() * 0.3
      kit.cyl(x, ROAD_Y + 0.12, z, 0.014, 0.18, '#5a4936')
      if (park.id === 'meiji' || park.id === 'ueno') {
        if (rand() > 0.7) {
          kit.pyramid(x, ROAD_Y + 0.16, z, 0.16 + h * 0.4, h * 1.7, 0.16 + h * 0.4, '#3d6548')
        } else {
          kit.sphere(x, ROAD_Y + 0.16 + h * 0.8, z, h * 0.75, h * 0.7, h * 0.75, rand() > 0.4 ? '#426f4d' : '#527d55')
          if (rand() > 0.5) kit.sphere(x + 0.05, ROAD_Y + 0.14 + h * 0.55, z + 0.04, h * 0.45, h * 0.4, h * 0.45, '#3c6747')
        }
      } else if (park.id === 'sumida' || park.id === 'shiba') {
        kit.sphere(x, ROAD_Y + 0.17 + h * 0.65, z, h * 0.72, h * 0.58, h * 0.72, rand() > 0.5 ? '#d8a7ab' : '#c9959b')
      } else {
        kit.sphere(x, ROAD_Y + 0.17 + h * 0.65, z, h * 0.65, h * 0.55, h * 0.65, rand() > 0.5 ? '#5f7e4b' : '#6e8c55')
      }
    }
  }
  // Ueno pond and a small Odaiba beach edge
  kit.box(-0.55, ROAD_Y + 0.02, -10.4, 0.9, 0.02, 0.55, '#4d7f88')

  // Palace grounds: pines and gravel around the moat.
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2
    const r = 1.9 + rand() * 0.55
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    kit.cyl(x, LAND_Y + 0.12, z, 0.018, 0.2, '#55432f')
    kit.pyramid(x, LAND_Y + 0.18, z, 0.19, 0.26 + rand() * 0.18, 0.19, i % 3 ? '#3c6248' : '#496f4f')
    if (i % 4 === 0) kit.sphere(x, LAND_Y + 0.34, z, 0.15, 0.12, 0.15, '#426b4a')
  }

  // A tree ring around the outer moat, and cherries along the Sumida.
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2
    const x = Math.cos(a) * 2.92
    const z = Math.sin(a) * 2.68
    kit.cyl(x, LAND_Y + 0.1, z, 0.012, 0.14, '#5a4936')
    if (i % 3 === 0) kit.sphere(x, LAND_Y + 0.2, z, 0.13, 0.1, 0.13, '#4e6f4a')
    else kit.pyramid(x, LAND_Y + 0.14, z, 0.14, 0.22, 0.14, '#3f624a')
  }

  // Cherry trees along the Sumida promenade and the moat ring.
  for (let i = 0; i < 34; i++) {
    const z = -13.5 + i * 0.48
    if (z > 3.4) break
    const x = 4.86 + (rand() - 0.5) * 0.14
    kit.cyl(x, ROAD_Y + 0.1, z, 0.012, 0.16, '#5a4936')
    kit.sphere(x, ROAD_Y + 0.18, z, 0.16, 0.12, 0.16, i % 2 ? '#d8a8ac' : '#cf989e')
  }

  // Street furniture: lamps at selected nodes, vending machines near corners.
  const lampNodes = plan.network.nodes.filter((_, i) => i % 17 === 3)
  for (const n of lampNodes) {
    const x = n.x + 0.1
    const z = n.z + 0.1
    kit.cyl(x, ROAD_Y + 0.16, z, 0.008, 0.32, '#5e6662')
    kit.lamp(x, ROAD_Y + 0.33, z, 0.045, 0.035, 0.045, '#ffdb9e')
    kit.box(x, ROAD_Y + 0.36, z, 0.12, 0.012, 0.02, '#5e6662')
  }
  for (let i = 0; i < 46; i++) {
    const n = plan.network.nodes[Math.floor(rand() * plan.network.nodes.length)]
    const x = n.x + (rand() - 0.5) * 0.3
    const z = n.z + (rand() - 0.5) * 0.3
    kit.block(x, ROAD_Y + 0.01, z, 0.09, 0.17, 0.06, i % 3 ? '#e9e6d8' : '#d8e3e3')
    kit.lamp(x, ROAD_Y + 0.1, z + 0.033, 0.06, 0.09, 0.008, i % 3 ? '#fff3cf' : '#c8f1ff')
  }

  // Utility poles with sagging wires in Asakusa and Shinjuku.
  const poleLines: [number, number][][] = [
    [[6.92, -13.4], [6.92, -4.2]],
    [[-8.1, -6.5], [-8.1, 0.4]],
  ]
  for (const line of poleLines) {
    const [a, b] = line
    const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.1)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = a[0] + (b[0] - a[0]) * t
      const z = a[1] + (b[1] - a[1]) * t
      kit.cyl(x, ROAD_Y + 0.3, z, 0.012, 0.6, '#6b6355')
      kit.box(x, ROAD_Y + 0.47, z, 0.26, 0.02, 0.035, '#6b6355')
      kit.box(x, ROAD_Y + 0.53, z, 0.34, 0.02, 0.035, '#6b6355')
      if (i < n) {
        const t2 = (i + 1) / n
        const x2 = a[0] + (b[0] - a[0]) * t2
        const z2 = a[1] + (b[1] - a[1]) * t2
        for (const dx of [-0.13, 0, 0.13]) {
          kit.beam([x + dx, ROAD_Y + 0.53, z], [x2 + dx, ROAD_Y + 0.53 - 0.06, z2], 0.004, '#3e3b35')
          kit.beam([x + dx, ROAD_Y + 0.47, z], [x2 + dx, ROAD_Y + 0.41, z2], 0.004, '#3e3b35')
        }
      }
    }
  }

  // Piers on the Sumida and the bay.
  for (const [x, z, w, d, color] of [
    [5.14, 2.9, 0.34, 0.9, '#8a7153'],
    [5.14, -2.4, 0.3, 0.7, '#8a7153'],
    [2.05, 12.2, 0.55, 0.42, '#9a9382'],
    [6.4, 13.1, 0.5, 0.36, '#9a9382'],
  ] as [number, number, number, number, string][]) {
    kit.block(x, WATER_Y + 0.12, z, w, 0.07, d, color)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) kit.cyl(x + sx * (w / 2 - 0.04), WATER_Y + 0.05, z + sz * (d / 2 - 0.04), 0.02, 0.2, '#5c4b38')
    kit.lamp(x, WATER_Y + 0.25, z + d / 2, 0.03, 0.03, 0.03, '#ffc37a')
  }

  // Yamanote line: viaduct, rails, stations.
  const loop = railLoop(7)
  for (let i = 1; i < loop.length; i++) {
    const a = loop[i - 1]
    const b = loop[i]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    kit.box((a[0] + b[0]) / 2, RAIL.y - 0.11, (a[1] + b[1]) / 2, len + 0.02, 0.22, 0.13, '#a8a79b', angle)
    kit.box((a[0] + b[0]) / 2, RAIL.y + 0.01, (a[1] + b[1]) / 2, len + 0.02, 0.02, 0.14, '#8e918b', angle)
    for (const side of [-1, 1]) {
      const nx = -Math.sin(angle) * side * 0.055
      const nz = Math.cos(angle) * side * 0.055
      kit.box((a[0] + b[0]) / 2 + nx, RAIL.y + 0.025, (a[1] + b[1]) / 2 + nz, len + 0.02, 0.015, 0.018, '#4c524f', angle)
    }
    if (i % 3 === 0) {
      kit.cyl((a[0] + b[0]) / 2, (ROAD_Y + RAIL.y - 0.11) / 2, (a[1] + b[1]) / 2, 0.03, RAIL.y - 0.11 - ROAD_Y, '#9b9a8d')
    }
  }
  const stations: [number, number, string][] = [
    [2.3, 2.6, 'Tokyo'],
    [-5.2, -4.2, 'Shinjuku'],
    [-5.2, 4.9, 'Shibuya'],
    [3.4, -5.2, 'Ueno'],
    [4.9, 1.6, 'Yurakucho'],
  ]
  const stationPoints: { x: number; z: number; name: string }[] = []
  for (const [x, z, name] of stations) {
    let best = loop[0]
    let bestD = Infinity
    for (const p of loop) {
      const d = Math.hypot(p[0] - x, p[1] - z)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    const angle = Math.atan2(best[1] - z, best[0] - x)
    kit.block(best[0], RAIL.y + 0.03, best[1], 0.9, 0.06, 0.3, '#d6d2c1', angle)
    kit.block(best[0], RAIL.y + 0.09, best[1], 0.94, 0.02, 0.34, '#eee9d7', angle)
    for (const side of [-1, 1]) {
      const nx = -Math.sin(angle) * side * 0.16
      const nz = Math.cos(angle) * side * 0.16
      kit.cyl(best[0] + nx, RAIL.y + 0.22, best[1] + nz, 0.014, 0.26, '#8b8e86')
    }
    kit.box(best[0], RAIL.y + 0.36, best[1], 0.98, 0.025, 0.4, '#7d827b', angle)
    kit.lamp(best[0], RAIL.y + 0.18, best[1], 0.32, 0.1, 0.015, '#f4f7ea')
    stationPoints.push({ x: best[0], z: best[1], name })
  }

  const details = kit.finish(scene)

  const setNight = (night: number) => {
    waterMat.color.set('#356d7c').lerp(new THREE.Color('#0d2438'), night)
    waterMat.roughness = 0.36 - night * 0.1
    landMat.color.set('#817b67').lerp(new THREE.Color('#232d3a'), night * 0.9)
    ;(palace.material as THREE.MeshStandardMaterial).color
      .set('#8e9a6b')
      .lerp(new THREE.Color('#20352c'), night * 0.8)
    ;(tray.material as THREE.MeshStandardMaterial).color
      .set('#686252')
      .lerp(new THREE.Color('#1b2533'), night)
    shimmerMat.uniforms.uTint.value.set('#d9f1ee').lerp(new THREE.Color('#6db8e8'), night)
    shimmerMat.uniforms.uOpacity.value = 0.55 + night * 0.9
  }

  return {
    update: (time: number, night: number) => {
      shimmerMat.uniforms.uTime.value = time
      setNight(night)
    },
    details,
    stationPoints,
    loop,
    setNight,
  }
}

export type Environment = ReturnType<typeof buildEnvironment>
