import { BRIDGES, LANDMARK_BY_ID, LANDMARKS, bridgeDeckY, type Point } from './geography'
import { Frame, type Kit } from './kit'
import type { Plan } from './plan'

const orange = '#e2552f'
const white = '#efeade'
const paleSteel = '#cfdadd'
const glass = '#7f9aa2'
const darkGlass = '#334e59'
const vermilion = '#bf3f2c'
const wood = '#6b4a35'
const tile = '#3f4644'
const stone = '#958c79'
const pine = '#335c42'
const neon = ['#ff4f9a', '#57d8ff', '#ffb14d', '#f4f1de']

/** A point on the bridge from its two graph endpoints, so the model always sits on the deck. */
export function rainbowSpan(plan: Plan): { a: Point; b: Point; mid: Point; angle: number; length: number } {
  const edge = plan.network.edges.find((e) => e.bridge === 'rainbow')
  const a: Point = edge ? [plan.network.nodes[edge.a].x, plan.network.nodes[edge.a].z] : BRIDGES[5].a
  const b: Point = edge ? [plan.network.nodes[edge.b].x, plan.network.nodes[edge.b].z] : BRIDGES[5].b
  const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return { a, b, mid, angle: Math.atan2(b[1] - a[1], b[0] - a[0]), length: Math.hypot(b[0] - a[0], b[1] - a[1]) }
}

function tokyoTower(f: Frame) {
  f.block(0, 0, 0, 1.0, 0.3, 1.0, '#5a5e5a')
  f.block(0, 0.3, 0, 0.72, 0.16, 0.72, '#6d706b')
  const tops: [number, number, number][] = []
  const corners: [number, number][] = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ]
  const bands = [orange, white, orange, white]
  for (const [sx, sz] of corners) {
    let ax = sx
    let az = sz
    for (let i = 0; i < 4; i++) {
      const t0 = i / 4
      const t1 = (i + 1) / 4
      const x0 = sx * (1 - t0 * 0.68)
      const z0 = sz * (1 - t0 * 0.68)
      const x1 = sx * (1 - t1 * 0.68)
      const z1 = sz * (1 - t1 * 0.68)
      f.beam([x0, 0.28 + t0 * 2.75, z0], [x1, 0.28 + t1 * 2.75, z1], 0.045, bands[i])
      if (i === 3) tops.push([x1, 3.03, z1])
      ax = x1
      az = z1
    }
  }
  // horizontal frames and face diagonals, in the tower's orange/white rhythm
  for (let i = 0; i < 5; i++) {
    const y = 0.55 + i * 0.52
    const s = 1 - ((y - 0.28) / 2.75) * 0.68
    const c = i % 2 ? white : orange
    for (let k = 0; k < 4; k++) {
      const a: [number, number, number] = [corners[k][0] * s, y, corners[k][1] * s]
      const b: [number, number, number] = [corners[(k + 1) % 4][0] * s, y, corners[(k + 1) % 4][1] * s]
      f.beam(a, b, 0.028, c)
      const s2 = 1 - ((y + 0.45 - 0.28) / 2.75) * 0.68
      f.beam(a, [corners[(k + 1) % 4][0] * s2, y + 0.45, corners[(k + 1) % 4][1] * s2], 0.016, c)
    }
  }
  // main and top decks, with lit window bands
  f.block(0, 2.72, 0, 0.64, 0.17, 0.64, white)
  f.lamp(0, 2.72, 0, 0.58, 0.07, 0.58, '#ffdca4')
  f.block(0, 3.41, 0, 0.44, 0.15, 0.44, white)
  f.lamp(0, 3.41, 0, 0.39, 0.06, 0.39, '#ffe6bb')
  // upper shaft and antenna
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    f.beam([sx * 0.16, 3.03, sz * 0.16], [sx * 0.055, 5.65, sz * 0.055], 0.035, white)
    f.beam([sx * 0.075, 5.65, sz * 0.075], [sx * 0.028, 6.05, sz * 0.028], 0.024, orange)
  }
  for (let i = 0; i < 4; i++) {
    const y = 3.5 + i * 0.55
    const s = 0.16 - (i / 4) * 0.1
    for (let k = 0; k < 4; k++) {
      const a: [number, number, number] = [corners[k][0] * s, y, corners[k][1] * s]
      const b: [number, number, number] = [corners[(k + 1) % 4][0] * s, y, corners[(k + 1) % 4][1] * s]
      f.beam(a, b, 0.018, orange)
    }
  }
  f.cyl(0, 6.05, 0, 0.025, 0.5, orange, 0.008)
  f.lamp(0, 6.3, 0, 0.035, 0.035, 0.035, '#ff4a3d')
  // the interior floodlight that makes the lattice glow at night
}

function skirtree(f: Frame) {
  f.block(0, 0, 0, 1.15, 0.36, 1.15, '#6f7c7e')
  f.block(0, 0.36, 0, 0.78, 0.22, 0.78, '#859496')
  f.block(0, 0.04, 0, 1.3, 0.03, 1.3, '#b8b5a6')
  const legs = 3
  const baseR = 0.7
  const topR = 0.14
  for (let l = 0; l < legs; l++) {
    const a = Math.PI / 2 + (l * Math.PI * 2) / legs
    const x = Math.cos(a) * baseR
    const z = Math.sin(a) * baseR
    const x1 = Math.cos(a) * topR
    const z1 = Math.sin(a) * topR
    const segs = 5
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs
      const t1 = (s + 1) / segs
      f.beam(
        [x + (x1 - x) * t0, 0.7 + t0 * 6.7, z + (z1 - z) * t0],
        [x + (x1 - x) * t1, 0.7 + t1 * 6.7, z + (z1 - z) * t1],
        0.036,
        s % 2 ? '#b6c8cd' : '#dbe5e7',
      )
    }
  }
  for (let s = 1; s <= 5; s++) {
    const y = 0.7 + (s / 5) * 6.7
    const r = baseR + (topR - baseR) * (s / 5)
    for (let l = 0; l < 3; l++) {
      const a0 = Math.PI / 2 + (l * Math.PI * 2) / 3
      const a1 = Math.PI / 2 + ((l + 1) * Math.PI * 2) / 3
      f.beam([Math.cos(a0) * r, y, Math.sin(a0) * r], [Math.cos(a1) * r, y, Math.sin(a1) * r], 0.018, paleSteel)
    }
  }
  // diagonals between the three legs make the tripod read as a lattice
  for (let s = 0; s < 5; s++) {
    const y0 = 0.7 + (s / 5) * 6.7
    const y1 = 0.7 + ((s + 1) / 5) * 6.7
    const r0 = baseR + (topR - baseR) * (s / 5)
    const r1 = baseR + (topR - baseR) * ((s + 1) / 5)
    for (let l = 0; l < 3; l++) {
      const a0 = Math.PI / 2 + (l * Math.PI * 2) / 3
      const a1 = Math.PI / 2 + ((l + 1) * Math.PI * 2) / 3
      f.beam([Math.cos(a0) * r0, y0, Math.sin(a0) * r0], [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], 0.012, '#c9d7da')
      f.beam([Math.cos(a1) * r0, y0, Math.sin(a1) * r0], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], 0.012, '#c9d7da')
    }
  }
  f.cyl(0, 5.2, 0, 0.28, 0.18, glass, 0.28)
  f.cyl(0, 5.29, 0, 0.285, 0.025, '#e9f2f2', 0.285)
  f.lamp(0, 5.2, 0, 0.31, 0.09, 0.31, '#e5f6ff')
  f.cyl(0, 6.15, 0, 0.23, 0.16, glass, 0.23)
  f.cyl(0, 6.23, 0, 0.235, 0.022, '#e9f2f2', 0.235)
  f.lamp(0, 6.15, 0, 0.24, 0.08, 0.24, '#dff4ff')
  for (let i = 0; i < 4; i++) {
    f.cyl(0, 7.5 + i * 1.15, 0, 0.075 - i * 0.012, 1.15, i % 2 ? white : '#e2552f', 0.01)
  }
  f.cyl(0, 12.15, 0, 0.014, 0.28, '#e8ecea', 0.01)
  f.lamp(0, 12.3, 0, 0.025, 0.025, 0.025, '#ff5a4a')
}

function sensoJi(f: Frame) {
  f.block(0, 0, 0, 2.0, 0.07, 1.7, '#bfb6a0')
  // Kaminarimon, the south gate
  for (const sx of [-1, 1]) {
    f.block(sx * 0.36, 0.07, 0.66, 0.085, 0.46, 0.085, vermilion)
    f.block(sx * 0.4, 0.52, 0.66, 0.12, 0.06, 0.12, '#8b3a2c')
  }
  f.block(0, 0.53, 0.66, 0.92, 0.1, 0.16, vermilion)
  f.pyramid(0, 0.63, 0.66, 1.08, 0.16, 0.36, tile)
  f.block(0, 0.79, 0.66, 0.78, 0.03, 0.24, '#353b39')
  f.cyl(0, 0.32, 0.71, 0.155, 0.3, '#c4382a', 0.155)
  f.block(0, 0.17, 0.71, 0.18, 0.03, 0.18, '#2e2a23')
  f.lamp(0, 0.34, 0.71, 0.26, 0.22, 0.22, '#ff9d54')
  for (const sx of [-1, 1]) {
    f.lamp(sx * 0.49, 0.31, 0.7, 0.09, 0.16, 0.09, '#ff9a4d')
    f.block(sx * 0.49, 0.2, 0.7, 0.12, 0.02, 0.12, '#3b3329')
  }
  // main hall
  f.block(0, 0.07, -0.18, 1.02, 0.12, 0.58, '#b9b0a0')
  f.block(0, 0.19, -0.18, 0.78, 0.34, 0.44, '#e6dfcd')
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) f.block(sx * 0.34, 0.19, -0.18 + sz * 0.19, 0.06, 0.34, 0.06, vermilion)
  f.block(0, 0.53, -0.18, 0.94, 0.04, 0.52, '#3b3630')
  f.pyramid(0, 0.57, -0.18, 1.24, 0.3, 0.72, tile)
  f.block(0, 0.87, -0.18, 0.86, 0.03, 0.06, '#333836')
  f.lamp(0, 0.33, 0.06, 0.36, 0.1, 0.02, '#ffcd85')
  // five-storey pagoda at the west
  f.block(-0.66, 0.07, -0.44, 0.38, 0.16, 0.38, '#a89f8d')
  let y = 0.23
  for (let i = 0; i < 5; i++) {
    const bodyH = 0.2
    f.block(-0.66, y, -0.44, 0.26 - i * 0.012, bodyH, 0.26 - i * 0.012, i % 2 ? '#d9d2c2' : '#e4ddcb')
    f.block(-0.66, y + bodyH, -0.44, 0.38 - i * 0.018, 0.035, 0.38 - i * 0.018, '#373d3b')
    f.pyramid(-0.66, y + bodyH + 0.035, -0.44, 0.46 - i * 0.025, 0.08, 0.46 - i * 0.025, tile)
    y += bodyH + 0.11
  }
  f.cyl(-0.66, y + 0.08, -0.44, 0.02, 0.26, '#b89a5c', 0.01)
  // Nakamise stalls, east side of the gate
  for (let i = 0; i < 2; i++) {
    const z = 0.26 + i * 0.17
    f.block(0.62, 0.1, z, 0.22, 0.18, 0.12, '#d9c8a8')
    f.block(0.62, 0.28, z, 0.28, 0.04, 0.17, tile)
    f.lamp(0.62, 0.24, z + 0.06, 0.06, 0.08, 0.03, '#ffab5f')
  }
  // stone lanterns
  for (const [x, z] of [
    [0.46, 0.44],
    [-0.46, 0.44],
    [0.52, -0.06],
  ]) {
    f.cyl(x, 0.07, z, 0.035, 0.18, stone, 0.035)
    f.block(x, 0.25, z, 0.11, 0.05, 0.11, stone)
    f.lamp(x, 0.27, z, 0.05, 0.05, 0.05, '#ffd79b')
  }
}

function rainbowBridge(f: Frame, length: number) {
  const half = Math.max(1.0, length / 2)
  const deckAt = (lx: number) => bridgeDeckY('rainbow', (lx + half) / (2 * half)) - 0.46
  const towerTop = 2.88
  const towerX = Math.min(half * 0.55, half - 0.3)
  const t0 = towerX / half
  // two white towers standing on the deck shoulders
  for (const sx of [-towerX, towerX]) {
    const deck = Math.max(0.4, deckAt(sx))
    f.block(sx, deck - 0.02, 0, 0.065, towerTop - deck, 0.17, white)
    f.block(sx, towerTop - 0.08, 0, 0.085, 0.08, 0.2, '#e4e8e2')
    f.block(sx, deck + 0.5, 0, 0.08, 0.035, 0.22, '#e4e8e2')
    f.lamp(sx, towerTop + 0.01, 0, 0.02, 0.025, 0.02, '#ff5a4d')
  }
  const deckEnd = 0.2
  const cableY = (lx: number) => {
    const t = Math.abs(lx) / half
    if (t <= t0) return deckEnd + (towerTop - deckEnd) * (t / t0)
    if (t >= 1 - t0) return deckEnd + (towerTop - deckEnd) * ((1 - t) / t0)
    return towerTop - 0.55 * Math.sin((Math.PI * (t - t0)) / (1 - 2 * t0))
  }
  for (const z of [-0.15, 0.15]) {
    for (let i = 0; i < 24; i++) {
      const x0 = -half + (i / 24) * 2 * half
      const x1 = -half + ((i + 1) / 24) * 2 * half
      f.beam([x0, cableY(x0), z], [x1, cableY(x1), z], 0.012, paleSteel)
    }
    for (let x = -half + 0.12; x < half; x += 0.24) {
      const top = cableY(x)
      const deck = deckAt(x)
      if (top > deck + 0.04) f.beam([x, top, z], [x, deck + 0.02, z], 0.005, '#d7e0df')
    }
  }
  // railings and deck edge follow the arch
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const x0 = -half + (i / 20) * 2 * half
      const x1 = -half + ((i + 1) / 20) * 2 * half
      f.beam([x0, deckAt(x0), sz * 0.17], [x1, deckAt(x1), sz * 0.17], 0.014, white)
      f.beam([x0, deckAt(x0) + 0.11, sz * 0.17], [x1, deckAt(x1) + 0.11, sz * 0.17], 0.008, '#e8ece7')
      if (i % 2 === 0) f.lamp(x0, deckAt(x0) + 0.13, sz * 0.17, 0.022, 0.022, 0.022, '#ffe3b0')
    }
  }
  for (const sx of [-half, half]) {
    f.block(sx, 0.06, 0, 0.16, Math.max(0.1, deckAt(sx) - 0.06), 0.38, '#c6cdc9')
  }
  // anchor blocks at the cable ends
  for (const sx of [-half, half]) {
    f.block(sx, 0.06, 0, 0.2, 0.22, 0.46, '#b9c0bc')
  }
}

function shibuyaCrossing(f: Frame) {
  f.block(0, 0.005, 0, 2.3, 0.03, 1.9, '#33373a')
  const stripe = (x: number, z: number, w: number, d: number) => f.block(x, 0.025, z, w, 0.012, d, '#e8e5d8')
  for (let i = -3; i <= 3; i++) {
    stripe(i * 0.13, -0.84, 0.065, 0.44)
    stripe(i * 0.13, 0.84, 0.065, 0.44)
    stripe(-0.95, i * 0.11, 0.44, 0.06)
    stripe(0.95, i * 0.11, 0.44, 0.06)
  }
  for (let i = -7; i <= 7; i++) {
    f.block(i * 0.065, 0.028, i * 0.055, 0.05, 0.012, 0.07, '#e8e5d8')
    f.block(i * 0.065, 0.029, -i * 0.055, 0.05, 0.012, 0.07, '#e8e5d8')
  }
  const corners: [number, number, number, number, number][] = [
    [-1.02, -0.76, 0.5, 1.25, 0],
    [1.0, -0.74, 0.52, 1.5, 1],
    [-1.04, 0.78, 0.44, 0.95, 2],
    [1.0, 0.76, 0.5, 1.35, 3],
  ]
  for (const [x, z, w, h, i] of corners) {
    f.block(x, 0.03, z, w, h, 0.44, i % 2 ? '#4c5054' : '#5c5f61')
    f.block(x, h + 0.02, z, w * 0.92, 0.04, 0.4, '#33373a')
    for (let s = 0; s < 4; s++) {
      f.block(x, 0.18 + s * h * 0.2, z + 0.225, w * 0.78, 0.045, 0.015, '#2a2e33')
      f.lamp(x - w * 0.2, 0.19 + s * h * 0.2, z + 0.232, w * 0.18, 0.025, 0.012, '#ffe0a6')
    }
    f.neon(x, h * 0.55, z + 0.232, w * 0.56, h * 0.26, 0.015, neon[i % neon.length])
    f.block(x, h * 0.55, z + 0.226, w * 0.6, h * 0.29, 0.012, '#25292d')
    for (let s = 0; s < 3; s++) {
      f.neon(x + w * 0.38, h * (0.32 + s * 0.2), z + 0.24, 0.055, h * 0.15, 0.018, neon[(i + s) % neon.length])
      f.block(x + w * 0.38, h * (0.31 + s * 0.2), z + 0.233, 0.075, h * 0.16, 0.014, '#2b2f33')
    }
  }
  // 109: pale cylinder, dark band, red sign
  f.cyl(-1.1, 1.02, 0.05, 0.15, 1.0, '#c6c6bf', 0.15)
  f.cyl(-1.1, 1.2, 0.05, 0.152, 0.12, '#c94b3a', 0.152)
  for (let i = 0; i < 4; i++) f.cyl(-1.1, 0.72 + i * 0.2, 0.05, 0.151, 0.03, '#4b4f52', 0.151)
  f.neon(-1.1, 1.4, 0.19, 0.16, 0.11, 0.018, '#ff4f9a')
  f.neon(-1.1, 1.4, -0.09, 0.16, 0.11, 0.018, '#ff4f9a')
  f.lamp(-1.1, 1.1, 0.2, 0.12, 0.08, 0.018, '#ffffff')
  // signals and guard rails at the four corners
  for (const [x, z] of [
    [-0.45, -0.45],
    [0.45, 0.45],
    [-0.45, 0.45],
    [0.45, -0.45],
  ]) {
    f.block(x, 0.03, z, 0.025, 0.3, 0.025, '#5d6262')
    f.lamp(x, 0.31, z, 0.05, 0.045, 0.05, '#65d68e')
  }
  for (const [x, z, w, d] of [
    [0, -0.95, 0.7, 0.02],
    [0, 0.95, 0.7, 0.02],
    [-1.12, 0, 0.02, 0.7],
    [1.12, 0, 0.02, 0.7],
  ]) {
    f.block(x, 0.05, z, w, 0.015, d, '#8b8f8c')
    f.block(x, 0.1, z, w, 0.015, d, '#8b8f8c')
  }
  // The scramble fills in bursts; a static slice of the crowd keeps the crossing alive at any
  // capture moment. The moving walkers in traffic.ts supply the rest.
  const crowd = ['#2f3438', '#5b4d63', '#b9b2a3', '#3f5a70', '#704c45', '#e4dfd2', '#8b6f5a']
  const skin = ['#d8b18d', '#c49a75', '#8e6548']
  for (let i = 0; i < 34; i++) {
    const x = ((i * 37) % 23) / 12 - 0.95
    const z = ((i * 53) % 19) / 11 - 0.85
    if (Math.abs(x) < 0.16 && Math.abs(z) < 0.2) continue
    f.block(x, 0.03, z, 0.018, 0.042, 0.012, crowd[i % crowd.length])
    f.block(x, 0.076, z, 0.02, 0.02, 0.02, skin[i % skin.length])
  }
  // window rows on the camera-facing sides, so the corner blocks are not black monoliths
  for (const [x, z, w, h, i] of corners) {
    for (let s = 0; s < 3; s++) {
      f.lamp(x + w / 2 + 0.01, 0.24 + s * h * 0.22, z, 0.012, 0.035, 0.28, '#ffe0a6')
      f.lamp(x, 0.24 + s * h * 0.22, z - 0.225, 0.3, 0.03, 0.012, '#ffe0a6')
    }
    void i
  }
  // parked taxis at the kerb
  for (const [x, z] of [
    [-1.35, -0.2],
    [1.32, 0.32],
    [-0.3, 1.18],
  ] as [number, number][]) {
    f.block(x, 0.05, z, 0.16, 0.045, 0.07, '#2f3236')
    f.block(x, 0.095, z, 0.08, 0.02, 0.05, '#2f3236')
    f.lamp(x, 0.105, z, 0.035, 0.012, 0.03, '#fff1c4')
  }
}

function meijiTorii(f: Frame) {
  const k = 1.35
  f.block(0, 0, 0, 0.8 * k, 0.03, 1.0 * k, '#cfc7b4')
  f.block(0, 0.03, -0.2 * k, 1.4 * k, 0.02, 0.55 * k, '#bdb49f')
  for (const sx of [-1, 1]) {
    f.cyl(sx * 0.21 * k, 0.3 * k, 0, 0.036 * k, 0.56 * k, '#8c3a2b', 0.03 * k)
    f.block(sx * 0.21 * k, 0.03, 0, 0.11 * k, 0.045, 0.11 * k, stone)
  }
  f.beam([-0.31 * k, 0.59 * k, 0], [0.31 * k, 0.59 * k, 0], 0.04 * k, '#8c3a2b')
  f.beam([-0.35 * k, 0.63 * k, 0], [-0.21 * k, 0.59 * k, 0], 0.026 * k, '#8c3a2b')
  f.beam([0.35 * k, 0.63 * k, 0], [0.21 * k, 0.59 * k, 0], 0.026 * k, '#8c3a2b')
  f.beam([-0.25 * k, 0.48 * k, 0], [0.25 * k, 0.48 * k, 0], 0.03 * k, '#8c3a2b')
  f.block(0, 0.5 * k, 0, 0.06 * k, 0.1 * k, 0.028 * k, '#3d3027')
  f.block(0, 0.46 * k, 0.022 * k, 0.04 * k, 0.014 * k, 0.012 * k, '#c9a95c')
  for (const [x, z] of [
    [-0.34 * k, 0.32 * k],
    [0.34 * k, 0.32 * k],
  ]) {
    f.cyl(x, 0.15 * k, z, 0.032 * k, 0.1 * k, stone, 0.028 * k)
    f.block(x, 0.2 * k, z, 0.08 * k, 0.04 * k, 0.08 * k, stone)
    f.lamp(x, 0.22 * k, z, 0.035 * k, 0.03 * k, 0.035 * k, '#ffd69a')
  }
  // a raked gravel approach
  f.block(0, 0.035, 0.45, 0.45, 0.015, 0.85, '#c4baa4')
}

function imperialPalace(f: Frame) {
  // stone retaining wall and the raised palace ground
  f.block(0, 0, 1.39, 3.3, 0.12, 0.1, '#8f8877')
  f.block(0, 0, -1.39, 3.3, 0.12, 0.1, '#8f8877')
  f.block(1.62, 0, 0, 0.1, 0.12, 2.85, '#8f8877')
  f.block(-1.62, 0, 0, 0.1, 0.12, 2.85, '#8f8877')
  f.block(0, 0.12, 0, 3.15, 0.03, 2.7, '#5f7a4a')
  for (const [x, z, w, d] of [
    [0, 1.42, 3.3, 0.12],
    [0, -1.42, 3.3, 0.12],
    [1.65, 0, 0.12, 2.85],
    [-1.65, 0, 0.12, 2.85],
  ]) {
    f.block(x, 0.18, z, w, 0.12, d, stone)
  }
  f.block(0, 0.3, 0, 3.15, 0.06, 2.7, '#a9a48f')
  // gravel court and pines
  f.block(-0.2, 0.16, 0.1, 1.5, 0.02, 1.1, '#c8c1aa')
  const pines: [number, number, number][] = [
    [-1.3, -0.9, 0.22],
    [-0.9, -1.1, 0.18],
    [1.25, -0.95, 0.24],
    [1.35, 0.3, 0.2],
    [-1.35, 0.85, 0.19],
    [0.95, 1.15, 0.16],
    [1.55, 1.05, 0.14],
    [-0.2, -1.15, 0.2],
  ]
  for (const [x, z, h] of pines) {
    f.cyl(x, 0.42, z, 0.024, 0.12, '#5e4932', 0.03)
    f.pyramid(x, 0.46, z, 0.3, h, 0.3, pine)
    f.pyramid(x, 0.58, z, 0.22, h * 0.7, 0.22, '#3f6b4a')
  }
  // Fushimi-yagura: stone base, white two-tier turret, dark roofs
  f.block(0.6, 0.36, -0.65, 0.54, 0.3, 0.44, '#8b8474')
  f.block(0.6, 0.66, -0.65, 0.4, 0.22, 0.32, '#e8e3d4')
  f.block(0.6, 0.88, -0.65, 0.5, 0.035, 0.4, '#444a47')
  f.pyramid(0.6, 0.915, -0.65, 0.58, 0.09, 0.48, tile)
  f.block(0.6, 0.98, -0.65, 0.29, 0.2, 0.24, '#e8e3d4')
  f.pyramid(0.6, 1.18, -0.65, 0.44, 0.13, 0.36, tile)
  f.block(0.6, 1.31, -0.65, 0.3, 0.03, 0.05, '#333836')
  for (const sx of [-1, 1]) f.lamp(0.6 + sx * 0.1, 0.75, -0.49, 0.05, 0.06, 0.01, '#ffe1ac')
  // palace hall with a broad irimoya roof
  f.block(-0.45, 0.36, 0.38, 1.0, 0.28, 0.55, '#ddd6c4')
  f.block(-0.45, 0.64, 0.38, 1.08, 0.035, 0.62, '#454b48')
  f.pyramid(-0.45, 0.675, 0.38, 1.3, 0.27, 0.8, tile)
  f.block(-0.45, 0.94, 0.38, 0.95, 0.03, 0.05, '#333836')
  f.lamp(-0.45, 0.5, 0.66, 0.4, 0.06, 0.015, '#ffdda8')
  // Nijubashi, the double bridge on the south-east edge
  const bx = 1.1
  const bz = 1.62
  f.block(bx, 0.18, bz, 0.72, 0.06, 0.3, '#a59c88')
  for (const sx of [-0.26, 0.26]) f.cyl(bx + sx, 0.2, bz, 0.07, 0.14, stone, 0.07)
  for (const sz of [-1, 1]) {
    f.block(bx, 0.24, bz + sz * 0.12, 0.72, 0.035, 0.03, '#e4dfd2')
    for (let i = -3; i <= 3; i++) f.block(bx + i * 0.1, 0.27, bz + sz * 0.12, 0.02, 0.07, 0.02, '#d7d2c5')
  }
}

function shinjukuTowers(f: Frame) {
  f.block(0, 0, 0, 1.18, 0.5, 1.02, '#8b8e8b')
  f.block(0, 0.5, 0, 0.94, 0.08, 0.8, '#a4a49b')
  const towers: [number, number][] = [
    [-0.43, 3.5],
    [0.43, 3.82],
  ]
  for (const [x, h] of towers) {
    f.block(x, 0.58, 0, 0.33, h, 0.38, '#6e838c')
    f.block(x, 0.58, 0.195, 0.28, h * 0.9, 0.02, darkGlass)
    for (let i = 1; i < 12; i++) f.block(x, 0.58 + (h * i) / 12, 0.205, 0.3, 0.012, 0.014, '#b9c4c4')
    for (let i = 0; i <= 4; i++) f.block(x + (i - 2) * 0.062, 0.58, 0.207, 0.008, h * 0.9, 0.012, '#acb7b7')
    f.block(x, 0.58 + h, 0, 0.36, 0.1, 0.42, '#98a5a4')
    f.block(x, 0.68 + h, 0, 0.2, 0.14, 0.24, '#7c8988')
    f.cyl(x, 0.82 + h, 0, 0.014, 0.28, '#8e9998', 0.012)
    f.lamp(x, 0.96 + h, 0, 0.025, 0.025, 0.025, '#ff5a4a')
    f.lamp(x, 0.66, 0.21, 0.24, 0.05, 0.015, '#ffd8a1')
    for (let i = 0; i < 3; i++) f.lamp(x + 0.12, 1.0 + i * h * 0.22, 0.208, 0.02, 0.08, 0.012, '#dff3ff')
  }
  f.block(0, 2.5, 0, 0.5, 0.1, 0.3, '#7e8b8a')
  for (const sz of [-1, 1]) f.block(0.43, 2.62, sz * 0.12, 0.22, 0.05, 0.15, '#a7b2b0')
  // low neon neighbours
  for (const [x, z, w, h, i] of [
    [-0.72, 0.55, 0.34, 1.4, 0],
    [0.7, 0.6, 0.32, 1.15, 1],
    [0.72, -0.5, 0.3, 1.7, 2],
  ] as [number, number, number, number, number][]) {
    f.block(x, 0.05, z, w, h, 0.34, '#555a5c')
    for (let s = 0; s < 3; s++) f.neon(x, 0.25 + s * 0.28, z + 0.175, w * 0.75, 0.06, 0.015, neon[(i + s) % neon.length])
  }
}

export function buildLandmark(kit: Kit, id: string, ground: number, plan: Plan) {
  const count = () => kit.boxes.length + kit.cylinders.length + kit.pyramids.length + kit.beams.length + kit.lights.length + kit.glow.length
  const before = count()
  const at = (key: Parameters<typeof LANDMARK_BY_ID.get>[0]) => LANDMARK_BY_ID.get(key)!
  const span = rainbowSpan(plan)
  switch (id) {
    case 'tokyo-tower': {
      const s = at('tokyo-tower')
      tokyoTower(new Frame(kit, s.x, ground, s.z, 0))
      break
    }
    case 'skytree': {
      const s = at('skytree')
      skirtree(new Frame(kit, s.x, ground, s.z, 0.16))
      break
    }
    case 'sensoji': {
      const s = at('sensoji')
      sensoJi(new Frame(kit, s.x, ground, s.z, 0.16))
      break
    }
    case 'rainbow-bridge':
      rainbowBridge(new Frame(kit, span.mid[0], ground, span.mid[1], span.angle), span.length)
      break
    case 'shibuya': {
      const s = at('shibuya')
      shibuyaCrossing(new Frame(kit, s.x, ground, s.z, -0.22))
      break
    }
    case 'meiji-jingu': {
      const s = at('meiji-jingu')
      meijiTorii(new Frame(kit, s.x, ground, s.z, -0.15))
      break
    }
    case 'imperial-palace':
      imperialPalace(new Frame(kit, 0, ground, 0, 0))
      break
    case 'shinjuku': {
      const s = at('shinjuku')
      shinjukuTowers(new Frame(kit, s.x, ground, s.z, -0.42))
      break
    }
    default:
      throw new Error(`unknown landmark ${id}`)
  }
  return count() - before
}

export function buildLandmarks(kit: Kit, ground: number, plan: Plan) {
  const parts: Record<string, number> = {}
  for (const id of LANDMARK_ORDER) parts[id] = buildLandmark(kit, id, ground, plan)
  return parts
}

export const LANDMARK_ORDER = LANDMARKS.map((l) => l.id)
