import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = 'D:/Applications'
const APPS = ['tm-hub', 'tm-tools', 'tm-studio']

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (e.name.endsWith('.vue')) acc.push(p)
  }
  return acc
}

const norm = s => s
  .replace(/\r\n/g, '\n')
  .replace(/^\s*(?:\/\/.*|\/\*[\s\S]*?\*\/)\s*$/gm, '')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .trim()

// What makes a component *not* portable into a dependency-light package.
const MARKERS = [
  [/\buseI18n\b|\$t\(|\bt\('/, 'i18n'],
  [/\buseAuth\b|\buseHub\b|\$fetch|\buseState\b|\$api\b/, 'app-state/network'],
  [/\buseToast\b|\buseNotify\b|\buseColorMode\b/, 'app-ui-runtime'],
  [/from ['"]#|from ['"]~|from ['"]@\//, 'app-alias-import'],
  [/\bdefinePageMeta\b|\buseRoute\b|\buseRouter\b|\bnavigateTo\b/, 'routing'],
  [/\buseAppConfig\b|\buseRuntimeConfig\b/, 'config'],
  [/\bNuxtLink\b|\b<Nuxt/, 'nuxt-component'],
]

const files = []
for (const app of APPS) {
  for (const f of walk(path.join(ROOT, app, 'app/components'))) {
    const raw = fs.readFileSync(f, 'utf8')
    files.push({
      app,
      rel: path.relative(path.join(ROOT, app, 'app/components'), f).replace(/\\/g, '/'),
      raw,
      hash: crypto.createHash('sha1').update(norm(raw)).digest('hex'),
      lines: raw.split('\n').length,
    })
  }
}

const byHash = new Map()
for (const f of files) {
  if (!byHash.has(f.hash)) byHash.set(f.hash, [])
  byHash.get(f.hash).push(f)
}

const rows = []
for (const g of byHash.values()) {
  const apps = [...new Set(g.map(x => x.app))]
  if (apps.length < 2) continue
  const markers = MARKERS.filter(([re]) => re.test(g[0].raw)).map(([, n]) => n)
  rows.push({ name: [...new Set(g.map(x => x.rel))].join(' | '), apps, lines: g[0].lines, markers })
}

rows.sort((a, b) => a.markers.length - b.markers.length || b.lines - a.lines)

const clean = rows.filter(r => r.markers.length === 0)
const dirty = rows.filter(r => r.markers.length > 0)

console.log(`PORTABLE AS-IS (${clean.length} groups, ${clean.reduce((s, r) => s + r.lines, 0)} source lines):`)
for (const r of clean) console.log(`  ${r.name}  (${r.lines}L) [${r.apps.join('+')}]`)

console.log(`\nNEEDS WORK (${dirty.length} groups):`)
for (const r of dirty) console.log(`  ${r.name}  (${r.lines}L) [${r.apps.join('+')}] -> ${r.markers.join(', ')}`)

console.log(`\nTotal identical-line mass: ${rows.reduce((s, r) => s + r.lines * (new Set(r.apps).size - 1), 0)} duplicated lines`)
