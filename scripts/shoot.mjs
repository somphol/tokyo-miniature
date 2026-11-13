// Visual review shots for the single-file build. Not a pass/fail gate.
import { mkdirSync, readFileSync } from 'node:fs'
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
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(120000)
await page.goto(`${base}?capture=1&quality=low`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 120000 })
mkdirSync('shots', { recursive: true })
const step = (n) => page.evaluate((a) => window.__scene.step(a), n)
const act = (name, arg) => page.evaluate(([n, a]) => window.__scene.act(n, a), [name, arg])
const settle = (ms = 450) => page.waitForTimeout(ms)

await step(3)
await settle()
await page.screenshot({ path: 'shots/overview-day.png' })
const ids = ['tokyo-tower', 'skytree', 'sensoji', 'rainbow-bridge', 'shibuya', 'meiji-jingu', 'imperial-palace', 'shinjuku']
for (const id of ids) {
  await act('landmark', id)
  await step(55)
  await settle()
  await page.screenshot({ path: `shots/landmark-${id}.png` })
}
await act('reset')
await step(80)
await act('night', true)
await step(150)
await settle(900)
await page.screenshot({ path: 'shots/overview-night.png' })

const embed = await browser.newPage({ viewport: { width: 345, height: 345 }, deviceScaleFactor: 2, hasTouch: true })
await embed.goto(`${base}?capture=1&embed=1&quality=low`, { waitUntil: 'load' })
await embed.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 120000 })
await embed.evaluate(() => window.__scene.step(2))
await embed.screenshot({ path: 'shots/embed-345.png' })

await browser.close()
server.close()
console.log('shots: overview-day, 8 landmarks, overview-night, embed-345')
