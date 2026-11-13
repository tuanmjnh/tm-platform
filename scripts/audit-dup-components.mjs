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

// Normalise formatting noise so "identical but reformatted" compares equal,
// without hiding real differences.
const norm = s => s
  .replace(/\r\n/g, '\n')
  .replace(/^\s*(?:\/\/.*|\/\*[\s\S]*?\*\/)\s*$/gm, '')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .trim()

const files = []
for (const app of APPS) {
  for (const f of walk(path.join(ROOT, app, 'app/components'))) {
    const raw = fs.readFileSync(f, 'utf8')
    files.push({
      app,
      rel: path.relative(path.join(ROOT, app, 'app/components'), f).replace(/\\/g, '/'),
      raw,
      norm: norm(raw),
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

const dupGroups = [...byHash.values()]
  .filter(g => new Set(g.map(x => x.app)).size > 1)
  .sort((a, b) => b.length - a.length || b[0].lines - a[0].lines)

let reclaim = 0
console.log(`Identical (formatting-normalised) components shared across apps: ${dupGroups.length} groups\n`)
for (const g of dupGroups) {
  const apps = [...new Set(g.map(x => x.app))]
  const names = [...new Set(g.map(x => x.rel))]
  reclaim += g[0].lines * (g.length - 1)
  console.log(`[${apps.join('+')}] ${names.join(' | ')}  (${g[0].lines} lines, ${g.length} copies)`)
}
console.log(`\nLines duplicated in extra copies: ${reclaim}`)

// Near-duplicates: same basename in 2+ apps but not byte-identical.
const byName = new Map()
for (const f of files) {
  const key = path.basename(f.rel).toLowerCase()
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key).push(f)
}
const near = [...byName.entries()]
  .filter(([, g]) => new Set(g.map(x => x.app)).size > 1 && new Set(g.map(x => x.hash)).size > 1)
  .sort((a, b) => b[1].length - a[1].length)

console.log(`\nSame filename, different content: ${near.length}`)
for (const [name, g] of near) {
  const parts = g.map(x => `${x.app}:${x.lines}L`).join('  ')
  console.log(`  ${name.padEnd(28)} ${parts}`)
}
