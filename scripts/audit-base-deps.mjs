import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/Applications'
const APPS = ['tm-hub', 'tm-tools', 'tm-studio']
const DIRS = ['base', 'admin', 'shared', 'gridlist', 'table']

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (e.name.endsWith('.vue')) acc.push(p)
  }
  return acc
}

const byRel = new Map()
for (const app of APPS) {
  for (const d of DIRS) {
    for (const f of walk(path.join(ROOT, app, 'app/components', d))) {
      const rel = path.relative(path.join(ROOT, app, 'app/components'), f).replace(/\\/g, '/')
      if (!byRel.has(rel)) byRel.set(rel, {})
      byRel.get(rel)[app] = f
    }
  }
}

// Which *app-local* components / composables / utils each base component pulls in.
// Anything not in this set (vue, lucide, @nuxt/ui primitives) is portable as-is.
const localRef = src => {
  const refs = new Set()
  for (const m of src.matchAll(/import\s+[^'"]*from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    if (spec.startsWith('.') || spec.startsWith('~') || spec.startsWith('@/')) refs.add(spec)
  }
  for (const m of src.matchAll(/<((?:Lazy)?[A-Z][A-Za-z0-9]+)/g)) refs.add('<comp:' + m[1] + '>')
  return [...refs]
}

const rows = []
for (const [rel, per] of byRel) {
  const apps = Object.keys(per)
  if (apps.length < 2) continue
  const allRefs = new Set()
  for (const a of apps) for (const r of localRef(fs.readFileSync(per[a], 'utf8'))) allRefs.add(r)
  rows.push({ rel, apps, refs: [...allRefs].sort() })
}

rows.sort((a, b) => b.refs.length - a.refs.length)
console.log(`Base components and their app-local dependencies (${rows.length})\n`)
for (const r of rows) {
  const comps = r.refs.filter(x => x.startsWith('<comp:'))
  console.log(`${r.rel}  [${r.apps.map(a => a.replace('tm-', '')).join('+')}]`)
  console.log(`   imports: ${r.refs.filter(x => !x.startsWith('<comp:')).join(', ') || 'none'}`)
  console.log(`   child components: ${comps.map(c => c.slice(6, -1)).join(', ') || 'none'}`)
}
