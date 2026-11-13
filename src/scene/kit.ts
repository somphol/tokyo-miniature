import * as THREE from 'three'

export type BatchItem = { matrix: THREE.Matrix4; color: THREE.Color }
export type BatchName = 'boxes' | 'cylinders' | 'pyramids' | 'spheres' | 'beams' | 'lights' | 'glow' | 'neon'
export type KitMaterials = {
  solid: THREE.MeshStandardMaterial
  light: THREE.MeshStandardMaterial
  glow: THREE.MeshStandardMaterial
}

const up = new THREE.Vector3(0, 1, 0)
const tmpPos = new THREE.Vector3()
const tmpQuat = new THREE.Quaternion()
const tmpScale = new THREE.Vector3()
const tmpDir = new THREE.Vector3()

/**
 * Batches every small part into a handful of instanced meshes. Landmarks use the same kit as the
 * ordinary city, so a tower leg and a balcony rail cost the same.
 */
export class Kit {
  readonly boxes: BatchItem[] = []
  readonly cylinders: BatchItem[] = []
  readonly pyramids: BatchItem[] = []
  readonly spheres: BatchItem[] = []
  readonly beams: BatchItem[] = []
  readonly lights: BatchItem[] = []
  readonly glow: BatchItem[] = []
  readonly signs: BatchItem[] = []
  private materials: KitMaterials | null = null
  private meshes: THREE.InstancedMesh[] = []

  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
    rot = 0,
    batch: BatchItem[] = this.boxes,
  ) {
    tmpPos.set(x, y, z)
    tmpQuat.setFromAxisAngle(up, -rot)
    tmpScale.set(Math.max(w, 0.002), Math.max(h, 0.002), Math.max(d, 0.002))
    batch.push({
      matrix: new THREE.Matrix4().compose(tmpPos.clone(), tmpQuat.clone(), tmpScale.clone()),
      color: new THREE.Color(color),
    })
  }

  /** Box with `y` as the bottom face. */
  block(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
    rot = 0,
    batch: BatchItem[] = this.boxes,
  ) {
    this.box(x, y + h / 2, z, w, h, d, color, rot, batch)
  }

  cyl(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: THREE.ColorRepresentation,
    rot = 0,
    batch: BatchItem[] = this.cylinders,
    rTop = r,
  ) {
    tmpPos.set(x, y, z)
    tmpQuat.setFromAxisAngle(up, -rot)
    tmpScale.set(Math.max(r, 0.002), Math.max(h, 0.002), Math.max(rTop, 0.002))
    batch.push({
      matrix: new THREE.Matrix4().compose(tmpPos.clone(), tmpQuat.clone(), tmpScale.clone()),
      color: new THREE.Color(color),
    })
  }

  /** Four-sided roof or pyramid; y is the bottom of the roof. */
  pyramid(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
    rot = 0,
    batch: BatchItem[] = this.pyramids,
  ) {
    tmpPos.set(x, y + h / 2, z)
    tmpQuat.setFromAxisAngle(up, -rot + Math.PI / 4)
    tmpScale.set(Math.max(w / Math.SQRT2, 0.002), Math.max(h, 0.002), Math.max(d / Math.SQRT2, 0.002))
    batch.push({
      matrix: new THREE.Matrix4().compose(tmpPos.clone(), tmpQuat.clone(), tmpScale.clone()),
      color: new THREE.Color(color),
    })
  }

  /** Soft canopy or dome. */
  sphere(
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    color: THREE.ColorRepresentation,
    batch: BatchItem[] = this.spheres,
  ) {
    tmpPos.set(x, y, z)
    tmpQuat.identity()
    tmpScale.set(Math.max(rx, 0.002), Math.max(ry, 0.002), Math.max(rz, 0.002))
    batch.push({
      matrix: new THREE.Matrix4().compose(tmpPos.clone(), tmpQuat.clone(), tmpScale.clone()),
      color: new THREE.Color(color),
    })
  }

  beam(
    a: [number, number, number],
    b: [number, number, number],
    t: number,
    color: THREE.ColorRepresentation,
    batch: BatchItem[] = this.beams,
  ) {
    tmpPos.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    tmpDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const length = tmpDir.length()
    if (length < 1e-5) return
    tmpQuat.setFromUnitVectors(up, tmpDir.clone().normalize())
    tmpScale.set(Math.max(t, 0.002), length, Math.max(t, 0.002))
    batch.push({
      matrix: new THREE.Matrix4().compose(tmpPos.clone(), tmpQuat.clone(), tmpScale.clone()),
      color: new THREE.Color(color),
    })
  }

  /** Small emissive tag: window bar, lantern, signal, cable light. */
  lamp(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
    rot = 0,
    batch: BatchItem[] = this.lights,
  ) {
    this.box(x, y, z, w, h, d, color, rot, batch)
  }

  /** Flat coloured sign: vivid by day, self-lit at night, never washed out by the sun. */
  neon(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
    rot = 0,
  ) {
    this.box(x, y, z, w, h, d, color, rot, this.signs)
  }

  finish(scene: THREE.Scene) {
    const solid = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.06,
    })
    const light = new THREE.MeshStandardMaterial({
      color: 0x2a3038,
      roughness: 0.5,
      metalness: 0.1,
      emissive: new THREE.Color('#ffd49a'),
      emissiveIntensity: 0,
    })
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0,
    })
    const neon = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    this.materials = { solid, light, glow }
    const boxGeo = new THREE.BoxGeometry(1, 1, 1)
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10)
    const pyGeo = new THREE.ConeGeometry(1, 1, 4, 1)
    const sphereGeo = new THREE.SphereGeometry(1, 8, 6)
    const jobs: [BatchItem[], THREE.BufferGeometry, THREE.Material, boolean][] = [
      [this.boxes, boxGeo, solid, true],
      [this.cylinders, cylGeo, solid, true],
      [this.pyramids, pyGeo, solid, true],
      [this.spheres, sphereGeo, solid, true],
      [this.beams, boxGeo, solid, true],
      [this.lights, boxGeo, light, false],
      [this.glow, boxGeo, glow, false],
      [this.signs, boxGeo, neon, false],
    ]
    for (const [batch, geometry, material, shadow] of jobs) {
      if (!batch.length) continue
      const mesh = new THREE.InstancedMesh(geometry, material, batch.length)
      batch.forEach((item, i) => {
        mesh.setMatrixAt(i, item.matrix)
        mesh.setColorAt(i, item.color)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.castShadow = shadow
      mesh.receiveShadow = shadow
      mesh.frustumCulled = true
      scene.add(mesh)
      this.meshes.push(mesh)
    }
    return {
      materials: this.materials,
      counts: {
        boxes: this.boxes.length,
        cylinders: this.cylinders.length,
        pyramids: this.pyramids.length,
        spheres: this.spheres.length,
        beams: this.beams.length,
        lights: this.lights.length,
        glow: this.glow.length,
        neon: this.signs.length,
      },
      dispose: () => {
        for (const mesh of this.meshes) {
          mesh.geometry.dispose()
          scene.remove(mesh)
        }
        for (const material of Object.values(this.materials ?? {})) material.dispose()
      },
    }
  }

  setNight(night: number) {
    if (!this.materials) return
    this.materials.light.emissiveIntensity = night * 2.6
    this.materials.glow.emissiveIntensity = night * 3.2
    this.materials.light.color.set('#2a3038').lerp(new THREE.Color('#ffd49a'), night * 0.85)
    this.materials.glow.color.set('#ffffff').lerp(new THREE.Color('#7fd8ff'), night * 0.2)
  }
}

/** Local frame helper: place parts relative to a building or landmark with its own yaw. */
export class Frame {
  constructor(
    private kit: Kit,
    public x: number,
    public y: number,
    public z: number,
    public rot = 0,
  ) {}
  private world(lx: number, lz: number): [number, number] {
    const c = Math.cos(this.rot)
    const s = Math.sin(this.rot)
    return [this.x + lx * c - lz * s, this.z + lx * s + lz * c]
  }
  box(lx: number, ly: number, lz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation) {
    const [x, z] = this.world(lx, lz)
    this.kit.box(x, this.y + ly, z, w, h, d, color, this.rot)
  }
  block(lx: number, ly: number, lz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation) {
    const [x, z] = this.world(lx, lz)
    this.kit.block(x, this.y + ly, z, w, h, d, color, this.rot)
  }
  beam(a: [number, number, number], b: [number, number, number], t: number, color: THREE.ColorRepresentation) {
    const [ax, az] = this.world(a[0], a[2])
    const [bx, bz] = this.world(b[0], b[2])
    this.kit.beam([ax, this.y + a[1], az], [bx, this.y + b[1], bz], t, color)
  }
  pyramid(lx: number, ly: number, lz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation) {
    const [x, z] = this.world(lx, lz)
    this.kit.pyramid(x, this.y + ly, z, w, h, d, color, this.rot)
  }
  cyl(lx: number, ly: number, lz: number, r: number, h: number, color: THREE.ColorRepresentation, rTop = r) {
    const [x, z] = this.world(lx, lz)
    this.kit.cyl(x, this.y + ly, z, r, h, color, this.rot, this.kit.cylinders, rTop)
  }
  lamp(lx: number, ly: number, lz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation) {
    const [x, z] = this.world(lx, lz)
    this.kit.lamp(x, this.y + ly, z, w, h, d, color, this.rot)
  }
  glow(lx: number, ly: number, lz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation) {
    const [x, z] = this.world(lx, lz)
    this.kit.box(x, this.y + ly, z, w, h, d, color, this.rot, this.kit.glow)
  }
  neon(lx: number, ly: number, lz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation) {
    const [x, z] = this.world(lx, lz)
    this.kit.neon(x, this.y + ly, z, w, h, d, color, this.rot)
  }
}
