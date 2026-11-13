// window.__scene: inspection and control surface for the cover recorder and verification.
import { flushSync } from 'react-dom'
import type { CityAPI } from './scene/scene'
import { LANDMARK_IDS, SLUG, VERSION, type LandmarkId, type QualityTier } from './config'
import { params, reducedMotion } from './params'

export interface Handlers {
  selectLandmark: (i: number) => void
  closeLandmark: () => void
  setNight: (value: boolean) => void
  setRotate: (value: boolean) => void
  reset: () => void
  zoom: (factor: number) => void
}

export const runtime: {
  city: CityAPI | null
  handlers: Handlers | null
  selected: LandmarkId | null
  layout: 'full' | 'compact'
  quality: QualityTier
} = { city: null, handlers: null, selected: null, layout: 'full', quality: 'high' }

const errorLog: string[] = []
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => errorLog.push(String(e.message ?? e)))
  window.addEventListener('unhandledrejection', (e) => errorLog.push(String(e.reason?.message ?? e.reason)))
}

export interface Inspect {
  quality: QualityTier
  audio: 'none'
  errors: number
  facts: {
    landmarks: number
    roadEdges: number
    parcels: number
    buildings: number
    vehicles: number
    trains: number
    pedestrians: number
    boats: number
    bridges: number
    triangles: number
    drawCalls: number
    reducedMotion: boolean
  }
  state: {
    selected: LandmarkId | null
    night: number
    targetNight: 0 | 1
    rotating: boolean
    azimuth: number
    polar: number
    distance: number
    target: [number, number, number]
    transition: boolean
    cameraClear: boolean
    layout: 'full' | 'compact'
    embed: boolean
    time: number
  }
}

export function inspect(): Inspect {
  const city = runtime.city
  const f = city?.facts
  const s = city?.state()
  return {
    quality: runtime.quality,
    audio: 'none',
    errors: errorLog.length,
    facts: {
      landmarks: LANDMARK_IDS.length,
      roadEdges: f?.roadEdges ?? 0,
      parcels: f?.parcels ?? 0,
      buildings: f?.buildings ?? 0,
      vehicles: f?.vehicles ?? 0,
      trains: f?.trains ?? 0,
      pedestrians: f?.pedestrians ?? 0,
      boats: f?.boats ?? 0,
      bridges: f?.bridges ?? 0,
      triangles: f?.triangles ?? 0,
      drawCalls: f?.drawCalls ?? 0,
      reducedMotion,
    },
    state: {
      selected: runtime.selected,
      night: s?.night ?? 0,
      targetNight: s?.targetNight ?? 0,
      rotating: s?.rotating ?? false,
      azimuth: s?.azimuth ?? 0,
      polar: s?.polar ?? 0,
      distance: s?.distance ?? 0,
      target: s?.target ?? [0, 0, 0],
      transition: s?.transition ?? false,
      cameraClear: s?.cameraClear ?? true,
      layout: runtime.layout,
      embed: params.embed,
      time: s?.time ?? 0,
    },
  }
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
function pair(name: string, arg: unknown): [number, number] {
  if (!Array.isArray(arg) || arg.length !== 2 || !arg.every(finite)) throw new Error(`${name} needs two finite numbers`)
  return [arg[0], arg[1]]
}

export function act(name: string, arg?: unknown): Inspect {
  const h = runtime.handlers
  const city = runtime.city
  if (!h || !city) throw new Error('scene not ready')
  if (name === 'landmark') {
    const i =
      typeof arg === 'string'
        ? (LANDMARK_IDS as readonly string[]).indexOf(arg)
        : Number.isInteger(arg)
          ? (arg as number)
          : -1
    if (i < 0 || i >= LANDMARK_IDS.length) throw new Error(`unknown landmark ${String(arg)}`)
    flushSync(() => h.selectLandmark(i))
  } else if (name === 'close') flushSync(() => h.closeLandmark())
  else if (name === 'night' || name === 'rotate') {
    if (arg !== undefined && typeof arg !== 'boolean') throw new Error(`${name} needs a boolean`)
    const s = city.state()
    const v = arg ?? (name === 'night' ? s.targetNight === 0 : !s.rotating)
    flushSync(() => (name === 'night' ? h.setNight(v) : h.setRotate(v)))
  } else if (name === 'reset') flushSync(() => h.reset())
  else if (name === 'zoom') {
    if (!finite(arg) || arg <= 0) throw new Error('zoom needs a finite positive factor')
    flushSync(() => h.zoom(Math.min(5, Math.max(0.2, arg))))
  } else if (name === 'orbit') city.orbitBy(...pair(name, arg))
  else if (name === 'pan') city.panBy(...pair(name, arg))
  else throw new Error(`unknown action ${name}`)
  return inspect()
}

const COVER_CUES: [number, string, unknown?][] = [
  [3.0, 'landmark', 'tokyo-tower'],
  [5.7, 'landmark', 'skytree'],
  [8.2, 'night', true],
  [8.45, 'reset'],
]
export const COVER = { fps: 30, frames: 360, posterAt: 1.5 } as const
const DRIFT = 0.045

export interface SceneApi {
  slug: string
  version: string
  ready: boolean
  cover: typeof COVER
  inspect: () => Inspect
  errorLog: string[]
  act: (name: string, arg?: unknown) => Inspect
  pointer: (nx: number, ny: number) => void
  press: () => void
  release: () => void
  step?: (frames?: number, dt?: number) => Inspect
  script?: (t: number) => void
}
declare global {
  interface Window {
    __scene?: SceneApi
  }
}

export function installScene() {
  const pointer = { x: 0, y: 0, down: false }
  window.__scene = {
    slug: SLUG,
    version: VERSION,
    ready: false,
    cover: COVER,
    inspect,
    errorLog,
    act,
    pointer: (nx, ny) => {
      if (!finite(nx) || !finite(ny)) throw new Error('pointer needs two finite numbers')
      if (pointer.down) runtime.city?.orbitBy((-(nx - pointer.x) / 2) * Math.PI, ((ny - pointer.y) / 2) * Math.PI * 0.5)
      pointer.x = nx
      pointer.y = ny
    },
    press: () => {
      pointer.down = true
    },
    release: () => {
      pointer.down = false
    },
  }
}

export function attachCity(city: CityAPI) {
  runtime.city = city
  const api = window.__scene!
  if (!params.capture) return
  let last = -1
  let start = city.state().azimuth
  api.step = (frames = 1, dt = 1 / 30) => {
    if (!Number.isInteger(frames) || frames < 0 || !finite(dt) || dt <= 0) throw new Error('step needs a frame count and a positive dt')
    for (let i = 0; i < frames; i++) city.tick(dt)
    return inspect()
  }
  api.script = (t: number) => {
    if (!finite(t)) throw new Error('script needs a finite time')
    if (t < last - 1e-6) {
      flushSync(() => {
        runtime.handlers?.closeLandmark()
        runtime.handlers?.setRotate(false)
      })
      city.home()
      start = city.state().azimuth
      last = -1
    }
    for (const [at, name, arg] of COVER_CUES) if (at > last + 1e-9 && at <= t + 1e-9) act(name, arg)
    const drift = t < 3 ? t : t >= 8.9 ? t - 8.9 : null
    if (drift !== null && !city.state().transition) city.orbitBy(start + DRIFT * drift - city.state().azimuth, 0)
    last = t
  }
  requestAnimationFrame(() => {
    city.tick(1 / 30)
    api.ready = true
  })
}

export function signalReady() {
  if (!params.capture && window.__scene) window.__scene.ready = true
  if (window.parent === window) return
  setTimeout(() => window.parent.postMessage({ type: `${SLUG}:ready`, version: VERSION }, '*'), 0)
}

export function signalError() {
  if (window.parent !== window) window.parent.postMessage({ type: `${SLUG}:error`, code: 'webgl' }, '*')
}
