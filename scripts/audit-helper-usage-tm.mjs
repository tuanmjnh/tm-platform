import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/Applications'
const APPS = {
  hub: 'tm-hub',
  tools: 'tm-tools',
  studio: 'tm-studio',
}
const SKIP = 'shared/utils/helper.ts'

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.nuxt', '.output', 'dist'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(vue|ts|js|mjs)$/.test(e.name)) acc.push(p)
  }
  return acc
}

const corpus = {}
for (const [key, dir] of Object.entries(APPS)) {
  const base = path.join(ROOT, dir)
  const files = [...walk(path.join(base, 'app')), ...walk(path.join(base, 'server'))]
    .filter(f => !f.split(path.sep).join('/').endsWith(SKIP))
  corpus[key] = files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
}

const cmsHelper = path.join(ROOT, 'nuxt4-cms', 'shared', 'utils', 'helper.ts')
const names = [...fs.readFileSync(cmsHelper, 'utf8').matchAll(/export (?:const|function|async function)\s+(\w+)/g)]
  .map(m => m[1])

const rows = names.map(n => {
  const re = new RegExp(`\\b${n}\\b`)
  return { name: n, apps: Object.entries(corpus).filter(([, t]) => re.test(t)).map(([k]) => k) }
})

const shared = rows.filter(r => r.apps.length >= 2)
const single = rows.filter(r => r.apps.length === 1)
const none = rows.filter(r => r.apps.length === 0)

console.log(`Used by 2+ tm apps (${shared.length}):`)
for (const r of shared) console.log(`  ${r.name.padEnd(26)} ${r.apps.join('+')}`)
console.log(`\nUsed by exactly one tm app (${single.length}):`)
for (const r of single) console.log(`  ${r.name.padEnd(26)} ${r.apps[0]}`)
console.log(`\nUsed by no tm app (${none.length}):`)
console.log('  ' + none.map(r => r.name).join(', '))
