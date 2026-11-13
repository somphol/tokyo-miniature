// Tokyo's compressed geography. North is −z, east is +x, up is +y.
// Water bodies are holes or outside the land outlines; the palace island is a raised green plate.
import type { LandmarkId } from '../config'

export type Point = [number, number]
export type Rect = { x: number; z: number; w: number; d: number }

export const TRAY = { w: 19.6, d: 35.8 }
export const LAND_Y = 0.46
export const WATER_Y = 0.11
export const ROAD_Y = 0.475

/** Deck profile: flat on the approaches, rising to a low arch over the water. */
export function bridgeDeckY(type: 'sumida' | 'rainbow' | undefined, t: number) {
  if (!type) return ROAD_Y
  const peak = type === 'sumida' ? 0.8 : 1.4
  return ROAD_Y + (peak - ROAD_Y) * Math.sin(Math.PI * Math.max(0, Math.min(1, t)))
}

/** West/central/north mass, with the Sumida notch open to the bay at its south end. */
export const MAIN_LAND: Point[] = [
  [-8.6, -16.2],
  [0.2, -16.3],
  [8.7, -16.2],
  [9.0, -13.0],
  [8.85, -9.5],
  [9.0, -6.0],
  [8.8, -2.5],
  [8.95, 0.5],
  [8.6, 3.4],
  [7.3, 4.15],
  [6.5, 4.1],
  [6.48, 1.0],
  [6.45, -3.0],
  [6.5, -7.0],
  [6.45, -11.0],
  [6.5, -14.2],
  [6.45, -15.1],
  [5.35, -15.1],
  [5.38, -14.0],
  [5.33, -10.0],
  [5.38, -6.0],
  [5.33, -2.0],
  [5.38, 2.0],
  [5.35, 4.1],
  [4.5, 5.5],
  [3.9, 6.7],
  [3.2, 7.9],
  [2.6, 9.0],
  [2.0, 10.1],
  [1.2, 11.5],
  [0.2, 12.7],
  [-1.0, 13.8],
  [-2.3, 14.7],
  [-3.9, 15.3],
  [-5.6, 15.5],
  [-8.5, 15.3],
  [-8.7, 10.0],
  [-8.6, 4.0],
  [-8.7, -2.0],
  [-8.6, -8.0],
  [-8.7, -12.0],
]

/** Reclaimed island in the bay, joined to the mainland by the Rainbow Bridge. */
export const ODAIBA: Point[] = [
  [3.55, 9.7],
  [5.0, 9.2],
  [6.4, 9.0],
  [7.5, 9.9],
  [7.8, 11.4],
  [7.5, 12.8],
  [6.6, 13.8],
  [5.0, 14.0],
  [3.7, 13.2],
  [3.2, 11.8],
  [3.2, 10.6],
]

export const MOAT = { x: 0, z: 0, w: 5.6, d: 5.0 }
export const PALACE_ISLAND = { x: 0, z: 0, w: 3.6, d: 3.1 }

export function inPolygon(x: number, z: number, poly: Point[]) {
  let yes = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) yes = !yes
  }
  return yes
}

export function inRect(x: number, z: number, r: Rect, margin = 0) {
  return Math.abs(x - r.x) <= r.w / 2 + margin && Math.abs(z - r.z) <= r.d / 2 + margin
}

export const onMainLand = (x: number, z: number) => inPolygon(x, z, MAIN_LAND)
export const onOdaiba = (x: number, z: number) => inPolygon(x, z, ODAIBA)
export const inMoat = (x: number, z: number) => inRect(x, z, MOAT)
export const onPalaceIsland = (x: number, z: number) => inRect(x, z, PALACE_ISLAND)

/** Land for drawing and for parcel placement. */
export function onLand(x: number, z: number) {
  return onMainLand(x, z) || onOdaiba(x, z)
}

/** Water is everything that is not land, plus the moat cut through the palace block. */
export function inWater(x: number, z: number) {
  return !onLand(x, z) || (inMoat(x, z) && !onPalaceIsland(x, z))
}

/** The palace island is land, but no vehicles or parcels go there. */
export function roadable(x: number, z: number) {
  return onLand(x, z) && !inMoat(x, z)
}

/** Sumida river span, between the two bank promenades. */
export const SUMIDA = { x0: 5.35, x1: 6.45 }

export type District = {
  id: string
  label: string
  angle: number
  cx: number
  cz: number
  hu: number
  hv: number
  streetSpacing: number
  crossSpacing: number
  families: string[]
  height: [number, number]
  names: string[]
}

/**
 * District grids are rotated against each other. No single angle is allowed to become the city's
 * grid: Asakusa, Shinjuku and Shibuya each keep their own.
 */
export const DISTRICTS: District[] = [
  {
    id: 'asakusa',
    label: 'Asakusa',
    angle: 0.16,
    cx: 7.75,
    cz: -11.25,
    hu: 1.15,
    hv: 3.75,
    streetSpacing: 1.6,
    crossSpacing: 1.65,
    families: ['machiya', 'asakusa-shop', 'asakusa-shop', 'temple-school', 'apartment'],
    height: [0.45, 0.8],
    names: ['Kaminarimon-dori', 'Nakamise-dori', 'Asakusa-dori', 'Hanayashiki-dori'],
  },
  {
    id: 'ueno',
    label: 'Ueno',
    angle: 0.06,
    cx: 3.95,
    cz: -11.25,
    hu: 1.35,
    hv: 3.75,
    streetSpacing: 1.7,
    crossSpacing: 1.6,
    families: ['machiya', 'apartment', 'temple-school', 'konbini', 'danchi'],
    height: [0.45, 0.95],
    names: ['Ueno-dori', 'Chuo-dori', 'Shinobazu-dori', 'Kappabashi-dori'],
  },
  {
    id: 'ginza',
    label: 'Ginza',
    angle: 0.1,
    cx: 4.15,
    cz: 1.0,
    hu: 1.3,
    hv: 3.9,
    streetSpacing: 1.6,
    crossSpacing: 1.55,
    families: ['department', 'office', 'department', 'konbini', 'office'],
    height: [0.7, 1.35],
    names: ['Chuo-dori', 'Ginza-dori', 'Harumi-dori', 'Sotobori-dori', 'Namiki-dori'],
  },
  {
    id: 'marunouchi',
    label: 'Marunouchi',
    angle: 0,
    cx: 4.15,
    cz: -5.0,
    hu: 1.3,
    hv: 2.5,
    streetSpacing: 1.7,
    crossSpacing: 1.555,
    families: ['office', 'office', 'tower', 'department', 'konbini'],
    height: [0.9, 2.0],
    names: ['Marunouchi-dori', 'Otemachi-dori', 'Eitai-dori', 'Nijubashi-dori'],
  },
  {
    id: 'shinjuku',
    label: 'Shinjuku',
    angle: -0.42,
    cx: -6.7,
    cz: -4.0,
    hu: 2.25,
    hv: 4.0,
    streetSpacing: 1.6,
    crossSpacing: 1.5,
    families: ['tower', 'office', 'apartment', 'konbini', 'office'],
    height: [1.1, 2.8],
    names: ['Yasukuni-dori', 'Shinjuku-dori', 'Kabukicho-dori', 'Meiji-dori'],
  },
  {
    id: 'shibuya',
    label: 'Shibuya',
    angle: -0.22,
    cx: -6.6,
    cz: 5.65,
    hu: 2.35,
    hv: 2.85,
    streetSpacing: 1.6,
    crossSpacing: 1.5,
    families: ['shibuya-shop', 'office', 'konbini', 'apartment', 'department'],
    height: [0.65, 1.65],
    names: ['Meiji-dori', 'Dogenzaka', 'Shibuya-dori', 'Omotesando'],
  },
  {
    id: 'chiyoda',
    label: 'Chiyoda',
    angle: 0,
    cx: -0.7,
    cz: 1.2,
    hu: 3.6,
    hv: 4.0,
    streetSpacing: 1.75,
    crossSpacing: 1.55,
    families: ['office', 'apartment', 'temple-school', 'danchi', 'konbini'],
    height: [0.55, 1.2],
    names: ['Uchibori-dori', 'Sakurada-dori', 'Hibiya-dori', 'Yasukuni-dori'],
  },
  {
    id: 'minato',
    label: 'Minato',
    angle: 0.05,
    cx: -0.7,
    cz: 9.1,
    hu: 3.6,
    hv: 3.9,
    streetSpacing: 1.7,
    crossSpacing: 1.555,
    families: ['office', 'apartment', 'apartment', 'office', 'konbini'],
    height: [0.6, 1.5],
    names: ['Sakurada-dori', 'Shiba-dori', 'Kaigan-dori', 'Shibaura-dori'],
  },
  {
    id: 'odaiba',
    label: 'Odaiba',
    angle: 0.12,
    cx: 5.5,
    cz: 11.6,
    hu: 2.05,
    hv: 1.9,
    streetSpacing: 1.65,
    crossSpacing: 1.55,
    families: ['warehouse', 'apartment', 'office', 'warehouse', 'konbini'],
    height: [0.6, 1.4],
    names: ['Odaiba Kaihin-dori', 'Rainbow Promenade', 'Bay Street'],
  },
  {
    id: 'residential',
    label: 'Yoyogi',
    angle: -0.15,
    cx: -8.0,
    cz: -11.5,
    hu: 0.9,
    hv: 3.5,
    streetSpacing: 1.6,
    crossSpacing: 1.55,
    families: ['danchi', 'apartment', 'machiya', 'konbini', 'danchi'],
    height: [0.45, 0.9],
    names: ['Yoyogi-dori', 'Tomigaya-dori', 'Sangubashi-dori'],
  },
  {
    id: 'north',
    label: 'Kita',
    angle: 0.02,
    cx: -3.2,
    cz: -13.75,
    hu: 5.7,
    hv: 2.25,
    streetSpacing: 1.75,
    crossSpacing: 1.555,
    families: ['danchi', 'machiya', 'apartment', 'temple-school', 'konbini'],
    height: [0.4, 0.8],
    names: ['Yanaka-dori', 'Komagome-dori', 'Tabata-dori'],
  },
  {
    id: 'fukagawa',
    label: 'Fukagawa',
    angle: 0.12,
    cx: 7.7,
    cz: 0.4,
    hu: 1.1,
    hv: 3.6,
    streetSpacing: 1.6,
    crossSpacing: 1.55,
    families: ['warehouse', 'danchi', 'office', 'machiya', 'konbini'],
    height: [0.45, 1.0],
    names: ['Eitai-dori', 'Monzen-nakacho', 'Kiyosumi-dori'],
  },
  {
    id: 'kuramae',
    label: 'Kuramae',
    angle: 0.1,
    cx: 7.7,
    cz: -5.35,
    hu: 1.15,
    hv: 2.15,
    streetSpacing: 1.45,
    crossSpacing: 1.45,
    families: ['machiya', 'warehouse', 'apartment', 'asakusa-shop', 'konbini'],
    height: [0.45, 0.95],
    names: ['Kuramae-dori', 'Torikoe-dori', 'Mukojima-dori'],
  },
  {
    id: 'kanda',
    label: 'Kanda',
    angle: 0.08,
    cx: 0.0,
    cz: -6.9,
    hu: 2.8,
    hv: 4.3,
    streetSpacing: 1.6,
    crossSpacing: 1.55,
    families: ['office', 'apartment', 'machiya', 'konbini', 'danchi'],
    height: [0.5, 1.1],
    names: ['Kanda-dori', 'Jimbocho-dori', 'Ogawamachi-dori'],
  },
  {
    id: 'southwest',
    label: 'Meguro',
    angle: -0.08,
    cx: -6.8,
    cz: 11.75,
    hu: 2.45,
    hv: 3.25,
    streetSpacing: 1.65,
    crossSpacing: 1.555,
    families: ['apartment', 'danchi', 'office', 'konbini', 'machiya'],
    height: [0.5, 1.0],
    names: ['Meguro-dori', 'Ebisu-dori', 'Nakameguro-dori'],
  },
]

export type LandmarkSite = {
  id: LandmarkId
  x: number
  z: number
  lotW: number
  lotD: number
  look: number
  offset: [number, number, number]
  envelopeY: number
  overWater?: boolean
}

export const LANDMARKS: LandmarkSite[] = [
  { id: 'tokyo-tower', x: -1.6, z: 7.1, lotW: 1.7, lotD: 1.7, look: 3.2, offset: [7.5, 5.5, 9.5], envelopeY: 7.1 },
  { id: 'skytree', x: 7.55, z: -12.8, lotW: 1.9, lotD: 1.9, look: 6.0, offset: [16.0, 13.0, 11.0], envelopeY: 12.8 },
  { id: 'sensoji', x: 7.6, z: -8.4, lotW: 2.2, lotD: 1.9, look: 1.3, offset: [-5.0, 4.2, 5.5], envelopeY: 2.9 },
  { id: 'rainbow-bridge', x: 2.2, z: 11.05, lotW: 3.8, lotD: 1.6, look: 1.3, offset: [6.5, 5.2, 8.0], envelopeY: 3.5, overWater: true },
  { id: 'shibuya', x: -7.05, z: 4.65, lotW: 2.6, lotD: 2.2, look: 0.8, offset: [-5.0, 6.2, 4.8], envelopeY: 2.1 },
  { id: 'meiji-jingu', x: -6.35, z: -0.45, lotW: 1.8, lotD: 1.5, look: 0.8, offset: [-4.6, 4.0, 5.0], envelopeY: 1.2 },
  { id: 'imperial-palace', x: 0, z: 0, lotW: 6.2, lotD: 5.6, look: 1.0, offset: [8.0, 6.2, 8.0], envelopeY: 2.6 },
  { id: 'shinjuku', x: -6.6, z: -4.3, lotW: 1.9, lotD: 1.8, look: 4.0, offset: [-7.5, 7.2, 6.8], envelopeY: 5.3 },
]

export const LANDMARK_BY_ID = new Map(LANDMARKS.map((l) => [l.id, l]))

/** Green reserves. Each is an obstacle to roads and parcels. */
export const PARKS: (Rect & { id: string })[] = [
  { id: 'ueno', x: 2.35, z: -10.7, w: 2.7, d: 2.7 },
  { id: 'meiji', x: -6.35, z: -0.45, w: 3.3, d: 3.3 },
  { id: 'sumida', x: 4.62, z: -6.4, w: 0.5, d: 3.4 },
  { id: 'shiba', x: -1.6, z: 7.1, w: 1.6, d: 1.5 },
  { id: 'odaiba', x: 6.5, z: 12.7, w: 2.0, d: 1.5 },
  { id: 'yoyogi', x: -7.9, z: 1.3, w: 1.1, d: 2.2 },
]

/** Sumida road bridges, low over the water; the Rainbow Bridge is the long bay crossing. */
export const BRIDGES: {
  id: string
  a: Point
  b: Point
  type: 'sumida' | 'rainbow'
  name: string
}[] = [
  { id: 'azuma', a: [5.1, -12.6], b: [6.78, -12.6], type: 'sumida', name: 'Azuma-bashi' },
  { id: 'komagata', a: [5.1, -8.8], b: [6.78, -8.8], type: 'sumida', name: 'Komagata-bashi' },
  { id: 'kuramae', a: [5.1, -5.2], b: [6.78, -5.2], type: 'sumida', name: 'Kuramae-bashi' },
  { id: 'ryogoku', a: [5.1, -1.6], b: [6.78, -1.6], type: 'sumida', name: 'Ryogoku-bashi' },
  { id: 'eitai', a: [5.1, 1.6], b: [6.78, 1.6], type: 'sumida', name: 'Eitai-bashi' },
  { id: 'rainbow', a: [1.05, 11.45], b: [3.3, 10.7], type: 'rainbow', name: 'Rainbow Bridge' },
]

/** Summit and deck heights, used by the scene, traffic and tests. */
export const BRIDGE_HEIGHT = { sumida: 0.8, rainbow: 1.4 } as const

/** The elevated Yamanote loop, a rounded rectangle around the palace. */
export const RAIL = {
  x0: -5.7,
  x1: 5.3,
  z0: -5.9,
  z1: 5.7,
  radius: 1.15,
  y: 1.35,
}

export function railLoop(samplesPerCorner = 10): Point[] {
  const { x0, x1, z0, z1, radius: r } = RAIL
  const pts: Point[] = []
  const corners: [number, number, number][] = [
    [x1 - r, z0 + r, -Math.PI / 2],
    [x1 - r, z1 - r, 0],
    [x0 + r, z1 - r, Math.PI / 2],
    [x0 + r, z0 + r, Math.PI],
  ]
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= samplesPerCorner; i++) {
      const a = start + (i / samplesPerCorner) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
    }
  }
  pts.push(pts[0])
  return pts
}

/** Landmark anchors in bar order. */
export const landmarkAnchor = (id: LandmarkId) => {
  const site = LANDMARK_BY_ID.get(id)!
  return { x: site.x, z: site.z, look: site.look }
}
