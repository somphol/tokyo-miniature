import { Frame, type Kit } from './kit'

export const FAMILIES = [
  'machiya',
  'danchi',
  'office',
  'department',
  'tower',
  'asakusa-shop',
  'apartment',
  'konbini',
  'temple-school',
  'warehouse',
  'shibuya-shop',
] as const
export type Family = (typeof FAMILIES)[number]

const palette = {
  plaster: '#c9bfa8',
  cream: '#d3c8ae',
  wood: '#5a4636',
  darkwood: '#3b2f27',
  concrete: '#a4a49a',
  pale: '#c1c0b4',
  stone: '#aea38e',
  glass: '#46606c',
  darkglass: '#263c48',
  steel: '#768183',
  tile: '#3d4442',
  red: '#c94b3a',
  vermilion: '#c4472f',
  green: '#3e6b52',
  roof: '#4a4f4c',
  white: '#ddd9ca',
  blue: '#3a5f80',
  indigo: '#2c3f5c',
  warm: '#e8b46b',
  neonPink: '#ff4f9a',
  neonCyan: '#57d8ff',
  neonAmber: '#ffb14d',
}

const glows = [palette.neonPink, palette.neonCyan, palette.neonAmber, '#ffffff']

const pick = (j: number, colors: string[]) => colors[Math.floor(j * colors.length) % colors.length]

function hash(n: number) {
  let x = (n * 2654435761) >>> 0
  x ^= x >>> 15
  x = Math.imul(x, 2246822519) >>> 0
  x ^= x >>> 13
  return (x >>> 0) / 4294967296
}

export function effectiveHeight(family: Family, raw: number, variant: number) {
  const j = hash(variant + family.length * 97)
  switch (family) {
    case 'machiya':
      return 0.34 + j * 0.07 + Math.min(0.09, raw * 0.05)
    case 'asakusa-shop':
      return 0.42 + j * 0.09 + Math.min(0.12, raw * 0.07)
    case 'konbini':
      return 0.25 + j * 0.05
    case 'temple-school':
      return 0.52 + j * 0.09 + Math.min(0.11, raw * 0.05)
    case 'danchi':
      return Math.min(1.1, 0.62 + j * 0.18 + raw * 0.13)
    case 'apartment':
      return Math.min(1.3, 0.56 + j * 0.2 + raw * 0.14)
    case 'warehouse':
      return Math.min(0.8, 0.42 + j * 0.12 + raw * 0.1)
    case 'department':
      return Math.min(1.2, 0.64 + j * 0.14 + raw * 0.12)
    case 'shibuya-shop':
      return Math.min(1.4, 0.56 + j * 0.18 + raw * 0.14)
    case 'office':
      return Math.min(1.95, 0.78 + j * 0.22 + raw * 0.26)
    case 'tower':
      return Math.min(2.9, 1.3 + j * 0.28 + raw * 0.28)
  }
}

/** Builds one ordinary building at the origin of a fresh kit; used by the geometry test. */
export function buildFamilySample(kit: Kit, family: Family, h = 1.2, variant = 0) {
  const before = kit.boxes.length + kit.cylinders.length + kit.pyramids.length + kit.beams.length
  buildFamily(kit, family, 0.3, 0.28, h, variant, 0, 0, 0.46, 0)
  return kit.boxes.length + kit.cylinders.length + kit.pyramids.length + kit.beams.length - before
}

function buildFamily(
  kit: Kit,
  family: Family,
  w: number,
  d: number,
  h: number,
  variant: number,
  x: number,
  z: number,
  ground: number,
  rot: number,
) {
  const f = new Frame(kit, x, ground, z, rot)
  const j = (n: number) => hash(variant * 31 + n + family.length * 131)
  const bodyW = w * 0.88
  const bodyD = d * 0.86
  f.block(0, 0, 0, bodyW * 1.06, 0.04, bodyD * 1.06, '#a8a498')

  switch (family) {
    case 'machiya': {
      const wall = pick(j(1), ['#c9bfa8', '#b99a72', '#8a6a4c', '#d3c6ae', '#a58a65'])
      f.block(0, 0.04, 0, bodyW, h, bodyD, wall)
      // timber posts and the front lattice
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) f.block((sx * bodyW) / 2.05, 0.04, (sz * bodyD) / 2.05, 0.055, h, 0.055, palette.darkwood)
      }
      for (let i = -2; i <= 2; i++) f.block((i * bodyW) / 6, h * 0.18, bodyD / 2 + 0.012, 0.018, h * 0.55, 0.025, palette.wood)
      // deep tiled roof and ridge
      f.pyramid(0, h + 0.04, 0, bodyW * 1.3, 0.2 + j(2) * 0.05, bodyD * 1.28, palette.tile)
      f.block(0, h + 0.23, 0, bodyW * 1.05, 0.035, 0.07, '#33383a')
      // noren and a lantern
      f.block(0, h * 0.55, bodyD / 2 + 0.03, bodyW * 0.36, 0.16, 0.02, palette.indigo)
      f.lamp(bodyW * 0.34, h * 0.55, bodyD / 2 + 0.08, 0.05, 0.09, 0.05, '#ffb45c')
      break
    }
    case 'danchi': {
      f.block(0, 0.04, 0, bodyW, h, bodyD * 0.9, pick(j(1), ['#a4a49a', '#9aa4a8', '#b0aa9c', '#8f9a9e']))
      const floors = Math.max(3, Math.round(h / 0.24))
      for (let i = 1; i < floors; i++) {
        const y = (h * i) / floors
        f.block(0, y, bodyD * 0.46, bodyW * 1.02, 0.025, bodyD * 0.14, palette.pale)
        f.block(0, y + 0.01, bodyD * 0.53, bodyW * 0.98, 0.014, 0.015, palette.steel)
        for (let k = -3; k <= 3; k++) f.block((k * bodyW) / 7.5, y + 0.05, bodyD * 0.46, 0.018, 0.09, 0.018, palette.steel)
      }
      f.block(bodyW / 2 - 0.03, 0.04, -bodyD * 0.36, 0.12, h + 0.04, bodyD * 0.22, '#a5a79d')
      f.block(0, h + 0.03, 0, bodyW * 0.3, 0.16, bodyD * 0.3, '#9fa29b')
      f.block(0, h + 0.19, 0, 0.09, 0.04, 0.09, '#7f8580')
      f.lamp(bodyW * 0.28, h * 0.6, bodyD * 0.46, 0.18, 0.03, 0.02, '#e3d7b8')
      break
    }
    case 'office': {
      f.block(0, 0.04, 0, bodyW * 1.04, 0.26, bodyD * 1.04, palette.stone)
      const shaftH = h - 0.26
      f.block(0, 0.3, 0, bodyW * 0.88, shaftH, bodyD * 0.88, pick(j(1), ['#a8a294', '#8f9696', '#b3ab98', '#7c878b']))
      const pane = pick(j(2), ['#46606c', '#5b7078', '#3f5964'])
      f.block(0, 0.46, bodyD * 0.44, bodyW * 0.74, shaftH * 0.78, 0.02, pane)
      for (let i = 0; i <= 5; i++) {
        f.block((i - 2.5) * (bodyW * 0.74) / 6, 0.46, bodyD * 0.452, 0.012, shaftH * 0.78, 0.018, palette.steel)
      }
      for (let i = 1; i < 5; i++) f.block(0, 0.46 + (shaftH * 0.78 * i) / 5, bodyD * 0.452, bodyW * 0.76, 0.012, 0.018, '#d8d4c6')
      f.block(0, h - 0.08, 0, bodyW * 0.7, 0.16, bodyD * 0.7, '#848a85')
      f.block(bodyW * 0.18, h + 0.06, -bodyD * 0.15, 0.14, 0.1, 0.14, '#757d79')
      f.lamp(0, h * 0.58, bodyD * 0.55, bodyW * 0.5, 0.06, 0.02, '#ffd9a8')
      if (j(31) > 0.55) f.neon(bodyW * 0.28, h + 0.13, bodyD * 0.36, bodyW * 0.28, 0.1, 0.02, glows[variant % glows.length])
      break
    }
    case 'department': {
      f.block(0, 0.04, 0, bodyW, h, bodyD, pick(j(1), ['#d3c8ae', '#c2b195', '#b9a98f', '#cbb894']))
      f.block(0, h - 0.22, 0, bodyW * 1.06, 0.12, bodyD * 1.06, palette.stone)
      f.block(0, 0.28, bodyD / 2 + 0.05, bodyW * 0.96, 0.05, 0.26, '#7d7464')
      f.block(-bodyW * 0.34, 0.2, bodyD / 2 + 0.04, bodyW * 0.18, h * 0.8, 0.02, palette.darkglass)
      f.block(bodyW * 0.36, 0.2, bodyD / 2 + 0.04, bodyW * 0.18, h * 0.8, 0.02, palette.darkglass)
      // bronze vertical sign, lit at night
      f.neon(bodyW * 0.47, h * 0.5, bodyD / 2 + 0.08, 0.09, h * 0.55, 0.02, palette.neonAmber)
      f.block(bodyW * 0.47, h * 0.5, bodyD / 2 + 0.065, 0.14, h * 0.58, 0.02, '#6f5d43')
      f.block(0, h + 0.06, 0, bodyW * 0.5, 0.22, bodyD * 0.22, palette.stone)
      f.lamp(0, h * 0.14, bodyD / 2 + 0.05, bodyW * 0.8, 0.12, 0.02, '#ffe1ac')
      break
    }
    case 'tower': {
      f.block(0, 0.04, 0, bodyW * 1.08, 0.3, bodyD * 1.08, palette.stone)
      const lower = h * 0.62
      f.block(0, 0.34, 0, bodyW * 0.82, lower, bodyD * 0.82, pick(j(1), ['#6e838c', '#5f737d', '#7a8a90']))
      f.block(0, 0.5, bodyD * 0.41, bodyW * 0.7, lower * 0.86, 0.02, palette.darkglass)
      for (let i = 0; i <= 6; i++) f.block((i - 3) * (bodyW * 0.7) / 6, 0.5, bodyD * 0.422, 0.01, lower * 0.86, 0.016, '#9fa9a8')
      for (let i = 1; i < 6; i++) f.block(0, 0.5 + (lower * 0.86 * i) / 6, bodyD * 0.422, bodyW * 0.71, 0.01, 0.016, '#c9cfcc')
      const upper = h - lower - 0.34
      f.block(0, 0.34 + lower, 0, bodyW * 0.58, Math.max(0.2, upper), bodyD * 0.58, '#596e78')
      f.block(0, h - 0.12, 0, bodyW * 0.66, 0.16, bodyD * 0.66, '#84928f')
      f.lamp(0, h - 0.04, 0, bodyW * 0.62, 0.05, bodyD * 0.62, palette.neonCyan)
      f.block(0, h + 0.06, 0, 0.05, 0.22, 0.05, palette.steel)
      f.lamp(0, h + 0.19, 0, 0.04, 0.04, 0.04, '#ff6152')
      f.lamp(0, h * 0.55, bodyD * 0.54, bodyW * 0.6, 0.05, 0.02, '#ffd9a8')
      break
    }
    case 'asakusa-shop': {
      f.block(0, 0.04, 0, bodyW, h, bodyD, pick(j(1), ['#cbbd9f', '#b98a63', '#c47a5a', '#d8c8a6']))
      f.block(0, 0.04, bodyD / 2 + 0.01, bodyW * 0.92, h * 0.55, 0.02, palette.darkwood)
      f.block(0, h * 0.2, bodyD / 2 + 0.03, bodyW * 0.8, h * 0.3, 0.02, '#f2e3bd')
      // deep eave
      f.block(0, h + 0.02, 0, bodyW * 1.22, 0.05, bodyD * 1.2, palette.darkwood)
      f.pyramid(0, h + 0.07, 0, bodyW * 1.16, 0.2, bodyD * 1.14, palette.tile)
      f.block(0, h + 0.26, 0, bodyW * 0.95, 0.03, 0.05, '#343a3a')
      // red sign and lantern
      f.block(0, h * 0.7, bodyD / 2 + 0.06, bodyW * 0.58, 0.11, 0.02, palette.vermilion)
      f.lamp(0, h * 0.7, bodyD / 2 + 0.075, bodyW * 0.5, 0.055, 0.012, '#ffca85')
      for (const sx of [-1, 1])
        f.lamp((sx * bodyW) / 2.5, h * 0.45, bodyD / 2 + 0.08, 0.07, 0.13, 0.07, '#ff9a4d')
      break
    }
    case 'apartment': {
      f.block(0, 0.04, 0, bodyW, h, bodyD, pick(j(1), ['#b3ab9c', '#c1b6a4', '#a7a89e', '#b9a793']))
      const floors = Math.max(3, Math.round(h / 0.28))
      for (let i = 1; i < floors; i++) {
        const y = (h * i) / floors
        f.block(0, y, bodyD * 0.46, bodyW * 1.02, 0.026, bodyD * 0.16, palette.white)
        for (let k = -2; k <= 2; k++) f.block((k * bodyW) / 5.5, y + 0.06, bodyD * 0.53, 0.02, 0.11, 0.02, '#a7aaa2')
        if (j(i + 4) > 0.5) f.block(bodyW * 0.28, y + 0.03, bodyD * 0.55, 0.09, 0.07, 0.06, '#d7d5c9')
      }
      f.block(0, h + 0.02, 0, bodyW * 1.02, 0.04, bodyD * 0.94, '#9b9c92')
      f.block(bodyW * 0.3, h + 0.03, -bodyD * 0.25, 0.1, 0.13, 0.1, '#8f958f')
      f.block(-bodyW * 0.32, h + 0.03, 0, 0.04, 0.5, 0.04, palette.steel)
      f.block(bodyW / 2 - 0.02, 0.04, 0, 0.1, h + 0.02, bodyD * 0.28, '#a8a89c')
      f.lamp(-bodyW * 0.2, h * 0.6, bodyD * 0.55, 0.16, 0.03, 0.02, '#eadfc4')
      if (j(32) > 0.72) f.neon(bodyW * 0.38, h * 0.55, bodyD * 0.52, 0.06, h * 0.24, 0.02, glows[variant % glows.length])
      break
    }
    case 'konbini': {
      f.block(0, 0.04, 0, bodyW, h, bodyD, palette.white)
      f.block(0, 0.18, bodyD / 2 + 0.01, bodyW * 0.86, h * 0.55, 0.02, '#fff6d9')
      f.lamp(0, 0.2, bodyD / 2 + 0.03, bodyW * 0.78, h * 0.42, 0.012, '#ffffff')
      f.block(0, h * 0.78, bodyD / 2 + 0.02, bodyW, 0.05, 0.02, '#3e8f5b')
      f.block(0, h * 0.72, bodyD / 2 + 0.02, bodyW, 0.05, 0.02, '#2f6da8')
      f.block(bodyW * 0.62, h + 0.04, 0, 0.05, 0.4, 0.05, palette.steel)
      f.lamp(bodyW * 0.62, h + 0.26, 0, 0.16, 0.14, 0.02, '#eaf7ff')
      break
    }
    case 'temple-school': {
      f.block(0, 0.04, 0, bodyW, h * 0.62, bodyD, palette.plaster)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) f.block((sx * bodyW) / 2.2, 0.04, (sz * bodyD) / 2.2, 0.07, h * 0.62, 0.07, palette.vermilion)
      f.block(0, h * 0.62, 0, bodyW * 1.08, 0.05, bodyD * 1.1, palette.darkwood)
      f.pyramid(0, h * 0.67, 0, bodyW * 1.28, 0.26, bodyD * 1.24, palette.tile)
      f.block(0, h * 0.93, 0, bodyW * 1.0, 0.035, 0.06, '#33383a')
      // low precinct wall and gate posts
      f.block(-bodyW * 0.8, 0.04, bodyD / 2 + 0.04, 0.12, 0.22, 0.06, '#8f8b7b')
      f.block(bodyW * 0.8, 0.04, bodyD / 2 + 0.04, 0.12, 0.22, 0.06, '#8f8b7b')
      f.lamp(0, h * 0.42, bodyD / 2 + 0.015, bodyW * 0.3, 0.08, 0.02, '#ffcf8a')
      break
    }
    case 'warehouse': {
      f.block(0, 0.04, 0, bodyW, h, bodyD, pick(j(1), ['#9aa09c', '#8e9a99', '#a7a394']))
      for (let i = -4; i <= 4; i++) f.block((i * bodyW) / 9, 0.1, bodyD / 2 + 0.012, 0.018, h * 0.82, 0.02, '#7e8885')
      f.block(-bodyW * 0.18, 0.04, bodyD / 2 + 0.02, bodyW * 0.36, h * 0.55, 0.03, '#5b6664')
      f.block(bodyW * 0.28, h * 0.55, bodyD / 2 + 0.05, bodyW * 0.22, 0.04, 0.12, '#6e7b78')
      f.block(0, h + 0.02, 0, bodyW * 0.22, 0.1, bodyD * 0.3, '#76817e')
      f.block(bodyW * 0.3, h + 0.02, -bodyD * 0.2, 0.04, 0.18, 0.04, '#6c7774')
      f.lamp(bodyW * 0.18, h * 0.62, bodyD / 2 + 0.03, 0.15, 0.05, 0.02, '#dfe9e2')
      break
    }
    case 'shibuya-shop': {
      f.block(0, 0.04, 0, bodyW, h, bodyD, pick(j(1), ['#5a5d62', '#74716a', '#484b50', '#6b625c']))
      const bands = Math.max(2, Math.min(5, Math.round(h / 0.32)))
      for (let i = 1; i < bands; i++) {
        const y = (h * i) / bands
        f.block(0, y, bodyD / 2 + 0.015, bodyW * 1.02, 0.03, 0.03, '#3f4246')
      }
      // stacked vertical signs on the street corner
      for (let i = 0; i < 3; i++) {
        const y = h * (0.25 + i * 0.2)
        f.neon(bodyW * 0.42, y, bodyD / 2 + 0.07, 0.13, h * 0.15, 0.02, glows[(variant + i) % glows.length])
        f.block(bodyW * 0.42, y - h * 0.08, bodyD / 2 + 0.035, 0.17, h * 0.16, 0.02, '#3a3b3c')
      }
      // a screen on the front face
      f.neon(0, h * 0.55, bodyD / 2 + 0.045, bodyW * 0.5, h * 0.28, 0.02, glows[variant % glows.length])
      f.block(0, h * 0.55, bodyD / 2 + 0.03, bodyW * 0.56, h * 0.32, 0.02, '#22252a')
      f.block(0, h + 0.02, 0, bodyW * 0.9, 0.05, bodyD * 0.9, '#4a4d50')
      f.block(0, h * 0.1, bodyD / 2 + 0.05, bodyW * 0.9, 0.05, 0.18, '#2f3338')
      break
    }
  }
  // Dark roof caps give the low-rise fabric a readable grain from above.
  if (family !== 'machiya' && family !== 'temple-school' && family !== 'tower') {
    f.block(0, h + 0.006, 0, bodyW * 1.06, 0.03, bodyD * 1.06, j(12) > 0.5 ? '#51554f' : '#5d605a')
  }
  if (family === 'machiya' || family === 'asakusa-shop' || family === 'warehouse' || family === 'konbini') {
    f.lamp(0, Math.min(h * 0.38, 0.2), bodyD / 2 + 0.018, bodyW * 0.55, 0.055, 0.012, '#ffd9a2')
  }
  // A small roof utility mark keeps the skyline from looking extruded.
  if (family !== 'tower' && family !== 'machiya' && family !== 'temple-school') {
    f.block(bodyW * 0.22, h + 0.01, -bodyD * 0.18, 0.06, 0.08 + j(9) * 0.1, 0.06, '#7c827c')
  }
}

export class Architecture {
  readonly kit: Kit
  readonly counts: Record<string, number> = {}
  constructor(kit: Kit) {
    this.kit = kit
  }
  at(x: number, z: number, ground: number, rot: number) {
    this._x = x
    this._z = z
    this._ground = ground
    this._rot = rot
  }
  private _x = 0
  private _z = 0
  private _ground = 0.46
  private _rot = 0
  building(family: string, w: number, d: number, height: number, variant: number) {
    const f = family as Family
    this.counts[f] = (this.counts[f] ?? 0) + 1
    buildFamily(this.kit, f, w, d, height, variant, this._x, this._z, this._ground, this._rot)
  }
  /** Direct placement, used by landmarks that share the kit but not the family table. */
  frame(x: number, ground: number, z: number, rot = 0) {
    return new Frame(this.kit, x, ground, z, rot)
  }
}
