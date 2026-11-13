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

// Signals of "more complete": more props, more emits, more template branches.
function richness(src) {
  const count = re => (src.match(re) || []).length
  return {
    lines: src.split('\n').length,
    props: count(/defineProps|defineModel/g) ? count(/^\s{2}[a-zA-Z]+\??:/gm) : 0,
    emits: count(/defineEmits/g),
    slots: count(/<slot|\b#\w+[=>]/g),
    vIf: count(/\bv-if\b|\bv-else\b|\bv-else-if\b/g),
    vFor: count(/\bv-for\b/g),
  }
}

for (const [rel, per] of byRel) {
  const apps = Object.keys(per)
  if (apps.length < 2) continue
  const raw = Object.fromEntries(apps.map(a => [a, fs.readFileSync(per[a], 'utf8')]))
  const identical = new Set(apps.map(a => raw[a].replace(/\r\n/g, '\n').trim())).size === 1
  if (identical) continue

  const stats = Object.fromEntries(apps.map(a => [a, richness(raw[a])]))
  // score = weighted; more lines and more branches = richer
  const score = s => s.lines + s.vIf * 4 + s.slots * 5 + s.props * 3 + s.emits * 3
  const ranked = apps.map(a => ({ app: a, s: stats[a], score: score(stats[a]) })).sort((x, y) => y.score - x.score)

  console.log(`\n${rel}`)
  for (const r of ranked) {
    const mark = r.app === ranked[0].app ? ' <-- fullest' : ''
    console.log(`  ${r.app.padEnd(10)} ${String(r.s.lines).padStart(4)}L  if=${r.s.vIf} for=${r.s.vFor} slots=${r.s.slots} emits=${r.s.emits}  score=${r.score}${mark}`)
  }
}
