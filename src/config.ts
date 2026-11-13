export const SLUG = 'tokyo-miniature'
export const VERSION = '0.1.0'

export const LANDMARK_IDS = [
  'tokyo-tower',
  'skytree',
  'sensoji',
  'rainbow-bridge',
  'shibuya',
  'meiji-jingu',
  'imperial-palace',
  'shinjuku',
] as const

export type LandmarkId = (typeof LANDMARK_IDS)[number]

/** `tokyo-tower` → `tokyoTower`, the prefix of its i18n keys. */
export function landmarkKey(id: string) {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

export const QUALITY = {
  high: { pixelRatio: 2, shadowMap: 2048 },
  low: { pixelRatio: 1, shadowMap: 512 },
} as const

export type QualityTier = keyof typeof QUALITY

export function isLikelyMobile() {
  return matchMedia('(pointer: coarse)').matches || innerWidth < 720
}

export const COORDS = '35.6762° N\u00a0\u00a0 139.6503° E'
