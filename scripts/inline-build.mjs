#!/usr/bin/env node
// Inlines the Vite bundle and CSS into one offline HTML file.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const [distArg, outArg] = process.argv.slice(2)
if (!distArg || !outArg) {
  console.error('usage: node scripts/inline-build.mjs dist dist-single/index.html')
  process.exit(2)
}
const dist = resolve(distArg)
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const script = /<script type="module" crossorigin src="\.\/assets\/([^"]+\.js)"><\/script>/.exec(html)
const style = /<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+\.css)">/.exec(html)
if (!script) {
  console.error('inline-build: no module script found in dist/index.html')
  process.exit(1)
}
const js = readFileSync(join(dist, 'assets', script[1]), 'utf8')
const css = style ? readFileSync(join(dist, 'assets', style[1]), 'utf8') : ''
const notices = (() => {
  try {
    return readFileSync(join(dist, 'THIRD_PARTY_NOTICES.txt'), 'utf8')
  } catch {
    return 'React (MIT), Three.js (MIT), Vite (MIT).'
  }
})()
const escapeScript = (s) => s.replace(/<\/script/gi, () => '<\\/script').replace(/<!--/g, () => '\\x3C!--')
const escapeStyle = (s) => s.replace(/<\/style/gi, () => '<\\/style')
const comment = notices.replaceAll('--', '- -')

let out = html
  .replace(/<script type="module" crossorigin src="\.\/assets\/[^"]+\.js"><\/script>/, '')
  .replace(/<link rel="stylesheet" crossorigin href="\.\/assets\/[^"]+\.css">/, '')
  .replace(/<\/head>/i, () => `${style ? `<style>${escapeStyle(css)}</style>\n` : ''}</head>`)
  .replace(/<\/body>/i, () => `<script type="module">${escapeScript(js)}</script>\n</body>`)
  .replace(/<meta\s+charset=["']?utf-8["']?\s*\/?>/i, (tag) => `${tag}\n<!--\nThird-party notices\n${comment}\n-->`)

if (/src="(?:https?:)?\/\//i.test(out) || /href="(?:https?:)?\/\/(?!www\.w3\.org)/i.test(out)) {
  console.error('inline-build: the output still references a remote asset')
  process.exit(1)
}
if (/<script[^>]+src=/i.test(out) || /<link[^>]+rel="stylesheet"/i.test(out)) {
  console.error('inline-build: an external script or stylesheet remains')
  process.exit(1)
}
const file = resolve(outArg)
mkdirSync(dirname(file), { recursive: true })
const bytes = Buffer.from(out, 'utf8')
writeFileSync(file, bytes)
console.log(`inline-build: ${outArg} (${(bytes.length / 1024).toFixed(0)} kB)`)
