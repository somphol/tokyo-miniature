import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { LANDMARKS, LANDMARK_BY_ID, LAND_Y, type Point } from './geography'
import { planTokyo } from './plan'
import { Kit } from './kit'
import { Architecture, effectiveHeight, type Family } from './buildings'
import { buildLandmarks, rainbowSpan } from './landmarks'
import { buildEnvironment } from './environment'
import { addCityLife } from './traffic'
import { QUALITY, type LandmarkId, type QualityTier } from '../config'

export interface CityState {
  azimuth: number
  polar: number
  distance: number
  target: [number, number, number]
  night: number
  targetNight: 0 | 1
  rotating: boolean
  transition: boolean
  cameraClear: boolean
  time: number
}

export interface CityFacts {
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
}

export type CityAPI = {
  tick: (dt: number) => void
  state: () => CityState
  facts: CityFacts
  setNight: (value: boolean) => void
  setRotate: (value: boolean) => void
  reset: () => void
  home: () => void
  focus: (i: number) => void
  zoom: (factor: number) => void
  orbitBy: (dTheta: number, dPhi: number) => void
  panBy: (dx: number, dz: number) => void
  screenshot: () => string
  dispose: () => void
}

export interface CityOptions {
  quality: QualityTier
  reducedMotion: boolean
  live: boolean
  view: string | null
  viewOffset: () => boolean
  onFrame: () => void
}

const INTRO = {
  position: new THREE.Vector3(20, 21, 26),
  target: new THREE.Vector3(0, 0.8, 0),
}

const VIEWS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  topdown: { position: [0, 58, 0.01], target: [0, 0.8, 0] },
  bay: { position: [14, 9, 22], target: [2, 1.2, 10] },
  west: { position: [-20, 10, 12], target: [-6.5, 1.4, 0] },
  tower: { position: [3.5, 6, 13], target: [-1.6, 3.4, 7.1] },
  asakusa: { position: [3.2, 6.5, -4.5], target: [7.2, 1.4, -9] },
}

export function createCity(container: HTMLDivElement, options: CityOptions): CityAPI {
  const tier = QUALITY[options.quality]
  const scene = new THREE.Scene()
  const dayBg = new THREE.Color('#d7e3e4')
  const nightBg = new THREE.Color('#0b1424')
  scene.background = dayBg.clone()
  scene.fog = new THREE.Fog(dayBg, 78, 175)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.3
  pmrem.dispose()

  const narrow = container.clientWidth < 700
  const camera = new THREE.PerspectiveCamera(narrow ? 46 : 38, container.clientWidth / container.clientHeight, 0.05, 220)
  const initial = INTRO.position.clone().multiplyScalar(narrow ? 1.45 : 1)
  const initialTarget = INTRO.target.clone().add(new THREE.Vector3(0, narrow ? 0.4 : 0, narrow ? 2 : 0))
  const debug = options.view ? VIEWS[options.view] : undefined
  camera.position.copy(debug ? new THREE.Vector3().fromArray(debug.position) : initial)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(debug ? new THREE.Vector3().fromArray(debug.target) : initialTarget)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 3.0
  controls.maxDistance = 92
  controls.maxPolarAngle = Math.PI * 0.47
  controls.minPolarAngle = 0.02
  controls.autoRotateSpeed = 0.42
  controls.zoomSpeed = 0.75
  controls.panSpeed = 0.7
  controls.screenSpacePanning = false
  controls.listenToKeyEvents(window)
  controls.keyPanSpeed = 20

  const hemi = new THREE.HemisphereLight('#d8eef8', '#8f967f', 1.0)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff1d0', 1.9)
  sun.position.set(-16, 34, 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(tier.shadowMap, tier.shadowMap)
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 26, bottom: -26, near: 1, far: 90 })
  sun.shadow.normalBias = 0.03
  sun.shadow.bias = -0.0002
  sun.shadow.radius = 3
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#7fb0ff', 0.5)
  fill.position.set(20, 11, -16)
  scene.add(fill)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    new THREE.MeshStandardMaterial({ color: '#d9ded7', roughness: 1, dithering: true }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.25
  ground.receiveShadow = true
  scene.add(ground)

  // The plan comes first, then the ordinary fabric, then the icons on top.
  const plan = planTokyo()
  const architecture = new Architecture(new Kit())
  let seed = 5521
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const buildingTops: { x: number; z: number; w: number; d: number; h: number }[] = []
  for (const parcel of plan.parcels) {
    const h = Math.min(effectiveHeight(parcel.family as Family, parcel.height, parcel.variant), Math.max(0.34, parcel.w * 4.6))
    architecture.at(parcel.x, parcel.z, LAND_Y, parcel.rot)
    architecture.building(parcel.family, parcel.w, parcel.d, h, parcel.variant)
    buildingTops.push({
      x: parcel.x,
      z: parcel.z,
      w: parcel.w,
      d: parcel.d,
      h,
    })
  }
  const landmarkParts = buildLandmarks(architecture.kit, LAND_Y, plan)
  const details = architecture.kit.finish(scene)

  const env = buildEnvironment(scene, plan)
  const life = addCityLife(scene, plan, env)

  // Collision and camera guard envelopes: axis-aligned, generous enough for eaves and balconies.
  const blockers: THREE.Box3[] = []
  for (const b of buildingTops) {
    blockers.push(
      new THREE.Box3(
        new THREE.Vector3(b.x - b.w / 2 - 0.02, LAND_Y, b.z - b.d / 2 - 0.02),
        new THREE.Vector3(b.x + b.w / 2 + 0.02, LAND_Y + b.h + 0.2, b.z + b.d / 2 + 0.02),
      ),
    )
  }
  for (const l of LANDMARKS) {
    blockers.push(
      new THREE.Box3(
        new THREE.Vector3(l.x - l.lotW / 2, 0, l.z - l.lotD / 2),
        new THREE.Vector3(l.x + l.lotW / 2, l.envelopeY, l.z + l.lotD / 2),
      ),
    )
  }
  const maxBlockerY = blockers.reduce((m, b) => Math.max(m, b.max.y), 0)

  const facts: CityFacts = {
    roadEdges: plan.network.edges.length,
    parcels: plan.parcels.length,
    buildings: plan.parcels.length + LANDMARKS.length,
    vehicles: life.vehicles.length + life.trains.length * 3,
    trains: life.trains.length,
    pedestrians: life.people.length,
    boats: life.boats.length,
    bridges: plan.network.edges.filter((e) => e.bridge).length,
    triangles: 0,
    drawCalls: 0,
  }

  // Dataset facts for the plan/geometry test page and for debugging.
  container.dataset.roadEdges = String(plan.network.edges.length)
  container.dataset.parcels = String(plan.parcels.length)
  container.dataset.landmarks = String(LANDMARKS.length)
  container.dataset.bridges = JSON.stringify(plan.network.edges.filter((e) => e.bridge).map((e) => e.name))
  container.dataset.buildingFamilies = JSON.stringify(architecture.counts)
  container.dataset.landmarkParts = JSON.stringify(landmarkParts)
  container.dataset.rainbowSpan = JSON.stringify(rainbowSpan(plan))
  container.dataset.sumoCrossing = String(plan.parcels.filter((p) => p.district === 'shibuya').length)

  const TRANSITION = options.reducedMotion ? 0 : 1.5
  let night = 0
  let targetNight = 0
  let simTime = 0
  let frames = 0
  let disposed = false
  let cameraClear = true
  let transition: {
    from: THREE.Vector3
    to: THREE.Vector3
    targetFrom: THREE.Vector3
    targetTo: THREE.Vector3
    elapsed: number
    duration: number
    arc: boolean
    clearance: number
  } | null = null
  controls.addEventListener('start', () => {
    transition = null
  })
  const bg = dayBg.clone()
  const cameraPrevious = camera.position.clone()
  const smooth = (v: number) => {
    const u = THREE.MathUtils.clamp(v, 0, 1)
    return u * u * (3 - 2 * u)
  }
  let lastShadow = -1

  function applyTransition(dt: number) {
    if (!transition) return
    transition.elapsed += dt
    const t = transition.duration > 0 ? Math.min(transition.elapsed / transition.duration, 1) : 1
    const ease = smooth(t)
    camera.position.lerpVectors(transition.from, transition.to, ease)
    if (transition.arc && t < 1) {
      camera.position.lerpVectors(transition.from, transition.to, smooth((t - 0.22) / 0.56))
      const up = t < 0.22 ? smooth(t / 0.22) : t > 0.78 ? smooth((1 - t) / 0.22) : 1
      camera.position.y = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(transition.from.y, transition.to.y, ease),
        transition.clearance,
        up,
      )
    }
    controls.target.lerpVectors(transition.targetFrom, transition.targetTo, ease)
    if (t === 1) transition = null
  }

  function applyNight() {
    night = options.reducedMotion ? targetNight : THREE.MathUtils.damp(night, targetNight, 1.9, 1 / 60)
    if (Math.abs(night - targetNight) < 1e-4) night = targetNight
  }

  function tick(dt: number) {
    if (disposed) return
    simTime += dt
    night = options.reducedMotion ? targetNight : THREE.MathUtils.damp(night, targetNight, 1.9, dt)
    if (Math.abs(night - targetNight) < 1e-4) night = targetNight
    bg.copy(dayBg).lerp(nightBg, night)
    scene.background = bg
    ;(scene.fog as THREE.Fog).color.copy(bg)
    hemi.intensity = 0.98 - 0.42 * night
    sun.intensity = 1.85 - 1.77 * night
    sun.color.set('#fff1d0').lerp(new THREE.Color('#8eacff'), night)
    fill.intensity = 0.45 + night * 1.0
    renderer.toneMappingExposure = 0.92 + night * 0.04
    scene.environmentIntensity = 0.45 - night * 0.34
    ;(ground.material as THREE.MeshStandardMaterial).color.set('#d9ded7').lerp(new THREE.Color('#121c2b'), night)
    architecture.kit.setNight(night)
    env.update(simTime, night)
    life.update(dt, simTime, night)
    applyTransition(dt)
    controls.target.y = Math.max(0.55, controls.target.y)
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -11, 11)
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -19, 19)
    controls.update(dt)
    for (const b of blockers) {
      if (b.containsPoint(camera.position)) camera.position.y = Math.max(camera.position.y, b.max.y + 0.15)
    }
    cameraClear = !blockers.some((b) => b.containsPoint(camera.position))
    cameraPrevious.copy(camera.position)
    // Live shadows refresh a few times a second; capture mode renders them once and reuses the map,
    // which keeps deterministic stepping usable under SwiftShader.
    if (lastShadow < 0 || (options.live && simTime - lastShadow >= 1 / 8)) {
      renderer.shadowMap.enabled = night < 0.55
      renderer.shadowMap.needsUpdate = true
      lastShadow = simTime
    }
    renderer.render(scene, camera)
    if (frames++ === 0) {
      facts.triangles = renderer.info.render.triangles
      facts.drawCalls = renderer.info.render.calls
      options.onFrame()
    }
  }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    if (options.viewOffset() && w > 850) camera.setViewOffset(w, h, -Math.min(160, w * 0.085), 0, w, h)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  let frame = 0
  let last = -1
  let fpsCount = 0
  let fpsStart = -1
  function loop(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(loop)
    const dt = last < 0 ? 1 / 60 : Math.min((now - last) / 1000, 0.05)
    last = now
    tick(dt)
    if (fpsStart < 0) fpsStart = now
    fpsCount++
    if (now - fpsStart > 2000) {
      container.dataset.fps = String(Math.round((fpsCount * 1000) / (now - fpsStart)))
      fpsCount = 0
      fpsStart = now
    }
  }
  if (options.live) frame = requestAnimationFrame(loop)

  function settleControls() {
    const damping = controls.enableDamping
    const rotating = controls.autoRotate
    controls.autoRotate = false
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
    controls.autoRotate = rotating
  }
  function move(to: THREE.Vector3, target: THREE.Vector3, arc = false) {
    settleControls()
    if (arc) controls.autoRotate = false
    transition = {
      from: camera.position.clone(),
      to,
      targetFrom: controls.target.clone(),
      targetTo: target,
      elapsed: 0,
      duration: TRANSITION,
      arc,
      clearance: Math.min(14, maxBlockerY + 1.0),
    }
    if (TRANSITION === 0) {
      applyTransition(0)
      controls.update()
    }
  }

  const offset = new THREE.Vector3()
  const spherical = new THREE.Spherical()
  return {
    tick,
    facts,
    state: () => {
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target))
      return {
        azimuth: spherical.theta,
        polar: spherical.phi,
        distance: spherical.radius,
        target: controls.target.toArray() as [number, number, number],
        night,
        targetNight: targetNight as 0 | 1,
        rotating: controls.autoRotate,
        transition: transition !== null,
        cameraClear,
        time: simTime,
      }
    },
    setNight: (v) => {
      targetNight = v ? 1 : 0
      if (options.reducedMotion) night = targetNight
    },
    setRotate: (v) => (controls.autoRotate = v),
    reset: () => move(initial.clone(), initialTarget.clone(), true),
    home: () => {
      settleControls()
      transition = null
      controls.autoRotate = false
      camera.position.copy(initial)
      controls.target.copy(initialTarget)
      controls.update()
      cameraPrevious.copy(camera.position)
      targetNight = 0
      night = 0
    },
    focus: (i) => {
      const l = LANDMARKS[i]
      const target = new THREE.Vector3(l.x, l.look, l.z)
      move(target.clone().add(new THREE.Vector3(...l.offset)), target, true)
    },
    zoom: (factor) => {
      const o = camera.position.clone().sub(controls.target)
      o.multiplyScalar(factor)
      o.clampLength(3.0, 92)
      move(controls.target.clone().add(o), controls.target.clone())
    },
    orbitBy: (dTheta, dPhi) => {
      settleControls()
      transition = null
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target))
      spherical.theta += dTheta
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, controls.minPolarAngle, controls.maxPolarAngle)
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      controls.update()
      cameraPrevious.copy(camera.position)
    },
    panBy: (dx, dz) => {
      settleControls()
      transition = null
      offset.set(dx, 0, dz)
      controls.target.add(offset)
      camera.position.add(offset)
      controls.update()
      cameraPrevious.copy(camera.position)
    },
    screenshot: () => {
      renderer.render(scene, camera)
      return renderer.domElement.toDataURL('image/png')
    },
    dispose: () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      details.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => m.dispose())
        }
      })
      environment.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}

export const landmarkSites = LANDMARKS
export const landmarkSite = (id: LandmarkId) => LANDMARK_BY_ID.get(id)!
