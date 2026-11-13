import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/Applications'
const PROJECTS = {
  cms: { dir: 'nuxt4-cms', helper: 'shared/utils/helper.ts', src: ['app', 'shared', 'server'], skip: ['shared/utils/helper.ts'] },
  hub: { dir: 'tm-hub', helper: 'app/shared/utils/helper.ts', src: ['app', 'server'], skip: ['app/shared/utils/helper.ts'] },
  tools: { dir: 'tm-tools', helper: 'app/shared/utils/helper.ts', src: ['app', 'server'], skip: ['app/shared/utils/helper.ts'] },
  studio: { dir: 'tm-studio', helper: 'app/shared/utils/helper.ts', src: ['app', 'server'], skip: ['app/shared/utils/helper.ts'] },
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.nuxt' || e.name === '.output') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(vue|ts|js|mjs)$/.test(e.name)) acc.push(p)
  }
  return acc
}

const exportsOf = p => [...fs.readFileSync(p, 'utf8').matchAll(/export (?:const|function|async function)\s+(\w+)/g)].map(m => m[1])

// For each project, collect source text outside its own helper file.
const corpus = {}
for (const [key, cfg] of Object.entries(PROJECTS)) {
  const base = path.join(ROOT, cfg.dir)
  const files = cfg.src.flatMap(d => walk(path.join(base, d)))
    .filter(f => !cfg.skip.some(s => f.endsWith(s.replace(/\//g, path.sep))))
  corpus[key] = files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
}

const cmsHelper = path.join(ROOT, PROJECTS.cms.dir, PROJECTS.cms.helper)
const names = exportsOf(cmsHelper)

// A helper is "used" if its identifier appears outside the helper file.
const rows = names.map(name => {
  const usedBy = {}
  for (const key of Object.keys(PROJECTS)) {
    const re = new RegExp(`\\b${name}\\b`)
    usedBy[key] = re.test(corpus[key])
  }
  return { name, usedBy }
})

const live = rows.filter(r => Object.values(r.usedBy).some(Boolean))
const dead = rows.filter(r => !Object.values(r.usedBy).some(Boolean))

console.log(`cms helper exports: ${names.length}`)
console.log(`  used somewhere outside helper.ts: ${live.length}`)
console.log(`  never referenced anywhere: ${dead.length}\n`)

console.log('USED (with the projects that reference it):')
for (const r of live) {
  const who = Object.entries(r.usedBy).filter(([, v]) => v).map(([k]) => k).join('+')
  console.log(`  ${r.name.padEnd(30)} ${who}`)
}

console.log(`\nUNUSED in all four projects (${dead.length}):`)
console.log('  ' + dead.map(r => r.name).join(', '))
