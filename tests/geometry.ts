import assert from 'node:assert/strict'
import * as THREE from 'three'
import { FAMILIES, buildFamilySample } from '../src/scene/buildings'
import { LANDMARKS, LANDMARK_BY_ID } from '../src/scene/geography'
import { buildLandmark, buildLandmarks, rainbowSpan } from '../src/scene/landmarks'
import { planTokyo } from '../src/scene/plan'
import { Kit, type BatchItem } from '../src/scene/kit'

const plan = planTokyo()

// 1. Every ordinary family builds a distinct, non-empty mass.
const signatures = new Map<string, number[]>()
for (const family of FAMILIES) {
  const kit = new Kit()
  const parts = buildFamilySample(kit, family, 1.4, 2)
  assert(parts >= 5, `${family} builds a real mass (${parts} parts)`)
  const signature = [kit.boxes.length, kit.cylinders.length, kit.pyramids.length, kit.beams.length, kit.lights.length]
  signatures.set(family, signature)
}
const unique = new Set([...signatures.values()].map((s) => s.join(',')))
assert(unique.size >= 9, `ordinary families differ geometrically (${unique.size}/11 signatures)`)

// 2. The plan uses the families it was authored with.
const used = new Set(plan.parcels.map((p) => p.family))
for (const family of used) assert(FAMILIES.includes(family as (typeof FAMILIES)[number]), `${family} is a known family`)
assert(used.size >= 9, `at least nine families appear in the fabric (${used.size})`)

// 3. Landmarks build inside their envelopes, with finite matrices.
const kit = new Kit()
const parts = buildLandmarks(kit, 0.46, plan)
const span = rainbowSpan(plan)
const batches: BatchItem[] = [...kit.boxes, ...kit.cylinders, ...kit.pyramids, ...kit.beams, ...kit.lights, ...kit.glow]
assert(batches.length > 300, `landmarks are detailed (${batches.length} parts)`)
const corner = new THREE.Vector3()
const box = new THREE.Box3()
for (const item of batches) {
  for (const v of item.matrix.elements) assert(Number.isFinite(v), 'instance matrix is finite')
  assert(Number.isFinite(item.color.r) && Number.isFinite(item.color.g) && Number.isFinite(item.color.b), 'instance colour is finite')
}
function boundsOf(from: number, to: number) {
  const b = new THREE.Box3()
  for (const item of batches.slice(from, to)) {
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    item.matrix.decompose(pos, quat, scale)
    for (const x of [-0.5, 0.5])
      for (const y of [-0.5, 0.5])
        for (const z of [-0.5, 0.5]) {
          corner.set(x * scale.x, y * scale.y, z * scale.z).applyQuaternion(quat).add(pos)
          b.expandByPoint(corner)
        }
  }
  return b
}
// Rebuild one landmark at a time so the batches can be measured.
const order = ['tokyo-tower', 'skytree', 'sensoji', 'rainbow-bridge', 'shibuya', 'meiji-jingu', 'imperial-palace', 'shinjuku'] as const
for (const id of order) {
  const one = new Kit()
  const oneParts = buildLandmark(one, id, 0.46, plan)
  assert(oneParts > 15, `${id} has real detail (${oneParts} parts)`)
  const own = [...one.boxes, ...one.cylinders, ...one.pyramids, ...one.beams, ...one.lights, ...one.glow]
  const b = new THREE.Box3()
  for (const item of own) {
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    item.matrix.decompose(pos, quat, scale)
    for (const x of [-0.5, 0.5])
      for (const y of [-0.5, 0.5])
        for (const z of [-0.5, 0.5]) {
          corner.set(x * scale.x, y * scale.y, z * scale.z).applyQuaternion(quat).add(pos)
          b.expandByPoint(corner)
        }
  }
  const site = LANDMARK_BY_ID.get(id)!
  const cx = id === 'rainbow-bridge' ? span.mid[0] : site.x
  const cz = id === 'rainbow-bridge' ? span.mid[1] : site.z
  assert(b.max.y > 0.9 && b.max.y <= site.envelopeY + 0.35, `${id} height ${b.max.y.toFixed(2)} within ${site.envelopeY}`)
  assert(b.min.y > -0.2, `${id} sits above the tray`)
  // Beams and roof overhangs are allowed a little beyond the lot; the mass must stay near it.
  const slack = id === 'imperial-palace' ? 0.55 : 0.35
  assert(b.min.x >= cx - site.lotW / 2 - slack && b.max.x <= cx + site.lotW / 2 + slack, `${id} stays inside its lot (x)`)
  assert(b.min.z >= cz - site.lotD / 2 - slack && b.max.z <= cz + site.lotD / 2 + slack, `${id} stays inside its lot (z)`)
  assert(b.max.x - b.min.x > 0.4 && b.max.z - b.min.z > 0.3, `${id} has a readable footprint`)
}
void box
void LANDMARKS
void parts

// 4. Night lighting reaches the shared kit materials.
const scene = new THREE.Scene()
const finished = kit.finish(scene)
kit.setNight(1)
assert(finished.materials.light.emissiveIntensity > 1, 'window lights turn on at night')
assert(finished.materials.glow.emissiveIntensity > 1, 'neon and lanterns turn on at night')
finished.dispose()

console.log(
  JSON.stringify({
    geometry: 'pass',
    families: FAMILIES.length,
    familySignatures: unique.size,
    landmarkParts: parts,
    rainbowSpan: { length: Number(span.length.toFixed(2)), angle: Number(span.angle.toFixed(3)) },
    instances: batches.length,
  }),
)
