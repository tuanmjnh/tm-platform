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

const norm = s => s
  .replace(/\r\n/g, '\n')
  .replace(/^\s*(?:\/\/.*|\/\*[\s\S]*?\*\/)\s*$/gm, '')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .trim()

// Line-level Jaccard on normalised non-empty lines; a rough "how much drift".
function similarity(a, b) {
  const A = new Set(norm(a).split('\n').map(s => s.trim()).filter(Boolean))
  const B = new Set(norm(b).split('\n').map(s => s.trim()).filter(Boolean))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / new Set([...A, ...B]).size
}

const files = []
for (const app of APPS) {
  for (const f of walk(path.join(ROOT, app, 'app/components'))) {
    files.push({
      app,
      rel: path.relative(path.join(ROOT, app, 'app/components'), f).replace(/\\/g, '/'),
      raw: fs.readFileSync(f, 'utf8'),
    })
  }
}

const byName = new Map()
for (const f of files) {
  const key = path.basename(f.rel).toLowerCase()
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key).push(f)
}

const rows = []
for (const [name, g] of byName) {
  // one representative per app (the largest), so a page's own index.vue doesn't
  // compete with itself
  const perApp = new Map()
  for (const f of g) {
    const cur = perApp.get(f.app)
    if (!cur || f.raw.length > cur.raw.length) perApp.set(f.app, f)
  }
  if (perApp.size < 2) continue
  const reps = [...perApp.values()]
  let minSim = 1
  for (let i = 0; i < reps.length; i++) {
    for (let j = i + 1; j < reps.length; j++) {
      minSim = Math.min(minSim, similarity(reps[i].raw, reps[j].raw))
    }
  }
  rows.push({
    name,
    apps: [...perApp.keys()],
    lines: reps.map(r => `${r.app}:${r.raw.split('\n').length}`).join(' '),
    sim: Math.round(minSim * 100),
    maxLines: Math.max(...reps.map(r => r.raw.split('\n').length)),
  })
}

rows.sort((a, b) => b.sim - a.sim || b.maxLines - a.maxLines)

const buckets = [
  ['>=90% (same component, drifted)', r => r.sim >= 90],
  ['75-89% (clear common core)', r => r.sim >= 75 && r.sim < 90],
  ['50-74% (shared shell only)', r => r.sim >= 50 && r.sim < 75],
  ['<50% (different component, same name)', r => r.sim < 50],
]

for (const [label, test] of buckets) {
  const group = rows.filter(test)
  console.log(`\n${label}: ${group.length}`)
  for (const r of group) console.log(`  ${String(r.sim).padStart(3)}%  ${r.name.padEnd(28)} [${r.apps.join('+')}] ${r.lines}`)
}
