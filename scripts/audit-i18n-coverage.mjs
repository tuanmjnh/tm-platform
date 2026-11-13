import fs from 'node:fs'
import path from 'node:path'

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

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' ? flat(v, p + k + '.') : [p + k])

const keys = {}
for (const app of APPS) {
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, app, 'i18n/locales/en.json'), 'utf8'))
  keys[app] = new Set(flat(en))
}

// Components present in 2+ apps under the same relative path.
const byRel = new Map()
for (const app of APPS) {
  for (const f of walk(path.join(ROOT, app, 'app/components'))) {
    const rel = path.relative(path.join(ROOT, app, 'app/components'), f).replace(/\\/g, '/').toLowerCase()
    if (!byRel.has(rel)) byRel.set(rel, [])
    byRel.get(rel).push({ app, file: f })
  }
}

const shared = [...byRel.entries()].filter(([, g]) => new Set(g.map(x => x.app)).size >= 2)

const KEY_RE = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g

const rows = []
for (const [rel, group] of shared) {
  const apps = [...new Set(group.map(g => g.app))]
  const usedKeys = new Set()
  for (const g of group) {
    const src = fs.readFileSync(g.file, 'utf8')
    for (const m of src.matchAll(KEY_RE)) usedKeys.add(m[1])
  }
  if (!usedKeys.size) {
    rows.push({ rel, apps, total: 0, missing: [] })
    continue
  }
  const missing = [...usedKeys].filter(k => !apps.every(a => keys[a].has(k)))
  rows.push({ rel, apps, total: usedKeys.size, missing })
}

const withKeys = rows.filter(r => r.total > 0)
const clean = withKeys.filter(r => r.missing.length === 0)
const dirty = withKeys.filter(r => r.missing.length > 0)
const noKeys = rows.filter(r => r.total === 0)

console.log(`Shared components (2+ apps): ${rows.length}`)
console.log(`  no i18n at all: ${noKeys.length}`)
console.log(`  use i18n and every key exists in every consuming app: ${clean.length}`)
console.log(`  use i18n with at least one missing key: ${dirty.length}`)

console.log(`\nMISSING KEYS (would break if the component moved into the package):`)
for (const r of dirty.sort((a, b) => b.missing.length - a.missing.length)) {
  console.log(`  ${r.rel}  [${r.apps.join('+')}]  ${r.missing.length}/${r.total} missing`)
  console.log(`     ${r.missing.slice(0, 8).join(', ')}${r.missing.length > 8 ? ' …' : ''}`)
}
