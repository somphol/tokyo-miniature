// Deterministic browser check for the single-file build: capture mode, virtual time, no network.
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from 'playwright-core'

const file = process.argv[2] ?? 'dist-single/index.html'
const html = readFileSync(file)
const server = createServer((req, res) => {
  const p = (req.url ?? '/').split('?')[0]
  if (p !== '/' && p !== '/index.html') return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: [`--use-angle=${process.env.SHOOT_ANGLE ?? 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

const checks = []
const check = (id, ok, value) => {
  checks.push({ id, ok: !!ok, value })
  if (!ok) console.log('FAIL', id, JSON.stringify(value))
}

const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
page.setDefaultTimeout(90000)
const errors = []
let external = 0
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('request', (r) => {
  if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external++
})
await page.goto(`${base}?capture=1&quality=low`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 90000 })

const step = (n, dt = 1 / 30) => page.evaluate(([a, b]) => window.__scene.step(a, b), [n, dt])
const act = (name, arg) => page.evaluate(([n, a]) => window.__scene.act(n, a), [name, arg])
const state = () => page.evaluate(() => window.__scene.inspect().state)
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

const targets = [
  ['tokyo-tower', [-1.6, 3.2, 7.1]],
  ['skytree', [7.55, 6.0, -12.8]],
  ['sensoji', [7.6, 1.3, -8.4]],
  ['rainbow-bridge', [2.2, 1.3, 11.05]],
  ['shibuya', [-7.05, 0.8, 4.65]],
  ['meiji-jingu', [-6.35, 0.8, -0.45]],
  ['imperial-palace', [0, 1.0, 0]],
  ['shinjuku', [-6.6, 4.0, -4.3]],
]

await step(2)
for (const [id, target] of targets) {
  await act('landmark', id)
  await step(50)
  const s = await state()
  check(`landmark-${id}`, s.selected === id && !s.transition && dist(s.target, target) < 0.05 && s.cameraClear, {
    target: s.target.map((v) => Math.round(v * 100) / 100),
    expected: target,
    transition: s.transition,
    clear: s.cameraClear,
  })
  const card = await page.evaluate(() => ({
    chosen: document.querySelector('.landmark-buttons button.chosen')?.getAttribute('data-landmark') ?? null,
    card: document.querySelector('.landmark-info h2')?.textContent ?? null,
    pressed: document.querySelector('.landmark-buttons button.chosen')?.getAttribute('aria-pressed') ?? null,
  }))
  check(`card-${id}`, card.chosen === id && !!card.card && card.pressed === 'true', card)
}

await act('night', true)
await step(85)
let s = await state()
check('night', s.night > 0.9, { night: Math.round(s.night * 100) / 100 })
await act('night', false)
await step(85)
s = await state()
check('day', s.night < 0.1, { night: Math.round(s.night * 100) / 100 })

await act('reset')
await step(55)
s = await state()
check('reset', !s.transition && s.selected === null, { target: s.target.map((v) => Math.round(v * 100) / 100) })

const d0 = (await state()).distance
await act('zoom', 0.8)
await step(50)
const d1 = (await state()).distance
check('zoom', d1 < d0 - 0.5, { before: d0, after: d1 })

const a0 = (await state()).azimuth
await act('orbit', [0.35, 0])
await step(2)
check('orbit', Math.abs((await state()).azimuth - a0) > 0.2, { before: a0, after: (await state()).azimuth })

const t0 = (await state()).target
await act('pan', [0.3, 0])
await step(2)
const t1 = (await state()).target
check('pan', Math.hypot(t1[0] - t0[0], t1[2] - t0[2]) > 0.2, { before: t0, after: t1 })

await act('rotate', true)
const r0 = (await state()).azimuth
await step(45)
check('rotate', Math.abs((await state()).azimuth - r0) > 0.01, { before: r0, after: (await state()).azimuth })
await act('rotate', false)

const facts = await page.evaluate(() => window.__scene.inspect().facts)
check(
  'facts',
  facts.landmarks === 8 &&
    facts.roadEdges > 600 &&
    facts.parcels > 350 &&
    facts.vehicles > 20 &&
    facts.trains === 4 &&
    facts.boats >= 3 &&
    facts.bridges === 6,
  facts,
)
check('no-console-errors', errors.length === 0, errors.slice(0, 3))
check('no-external-requests', external === 0, { external })

const shot = await page.screenshot({ type: 'png' })
check('screenshot', shot.length > 50000, { bytes: shot.length })
await page.close()

for (const [lang, needles] of [
  ['en', ['Imperial Palace', 'Senso-ji']],
  ['ja', ['皇居', '浅草寺']],
]) {
  const p = await browser.newPage({ viewport: { width: 900, height: 600 } })
  await p.goto(`${base}?capture=1&quality=low&lang=${lang}`, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 90000 })
  const label = await p.evaluate(() => document.querySelector('.landmark-bar')?.textContent ?? '')
  check(`lang-${lang}`, needles.every((n) => label.includes(n)), { label: label.slice(0, 90) })
  await p.close()
}

const embed = await browser.newPage({ viewport: { width: 345, height: 345 }, hasTouch: true })
await embed.goto(`${base}?capture=1&embed=1&quality=low`, { waitUntil: 'load' })
await embed.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 90000 })
const embedOk = await embed.evaluate(() => {
  const hidden = !document.querySelector('header') && !document.querySelector('.intro')
  const buttons = [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
  const inside = buttons.every((b) => {
    const r = b.getBoundingClientRect()
    return r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5
  })
  return { hidden, count: buttons.length, inside }
})
check('embed-345', embedOk.hidden && embedOk.count >= 8 && embedOk.inside, embedOk)
await embed.close()

await browser.close()
server.close()
const passed = checks.filter((c) => c.ok).length
console.log(`\n${passed}/${checks.length} checks passed`)
if (passed !== checks.length) process.exitCode = 1
