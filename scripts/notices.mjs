#!/usr/bin/env node
// Writes the licence texts for the production dependency closure.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const deps = Object.keys(pkg.dependencies ?? {})
const lines = []
for (const dep of deps) {
  const dir = join(root, 'node_modules', ...dep.split('/'))
  const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const licenceFile = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'].find((f) => existsSync(join(dir, f)))
  lines.push(`--- ${dep} ${meta.version} — ${meta.license ?? 'see package'} ---`)
  if (licenceFile) lines.push(readFileSync(join(dir, licenceFile), 'utf8').trim())
  lines.push('')
}
const out = process.argv[2] ?? 'dist/THIRD_PARTY_NOTICES.txt'
writeFileSync(out, lines.join('\n'))
console.log(`notices: ${out}`)
