import fs from 'node:fs'

const PATH = {
  cms: 'D:/Applications/nuxt4-cms/shared/utils/helper.ts',
  hub: 'D:/Applications/tm-hub/app/shared/utils/helper.ts',
  tools: 'D:/Applications/tm-tools/app/shared/utils/helper.ts',
  studio: 'D:/Applications/tm-studio/app/shared/utils/helper.ts',
}

// Split a TS module into top-level `export const NAME = ...` / `export function NAME(...)`
// blocks by tracking brace depth from the keyword to its matching close.
function extractExports(src) {
  const out = new Map()
  const re = /^export (?:const|function|async function)\s+(\w+)/gm
  let m
  while ((m = re.exec(src))) {
    const name = m[1]
    const start = m.index
    let depth = 0
    let i = src.indexOf('{', start)
    if (i === -1) continue
    let seen = false
    for (; i < src.length; i++) {
      const ch = src[i]
      if (ch === '{') { depth++; seen = true }
      else if (ch === '}') {
        depth--
        if (seen && depth === 0) { i++; break }
      }
    }
    out.set(name, src.slice(start, i).trim())
  }
  return out
}

const sig = s => s.replace(/\s+/g, ' ').replace(/,\s*\)/g, ')').trim()

const srcs = {}
const exportsBy = {}
for (const [k, p] of Object.entries(PATH)) {
  srcs[k] = fs.readFileSync(p, 'utf8')
  exportsBy[k] = extractExports(srcs[k])
}

const all = new Set(Object.values(exportsBy).flatMap(e => [...e.keys()]))

const rows = []
for (const name of [...all].sort()) {
  const present = Object.keys(exportsBy).filter(k => exportsBy[k].has(name))
  const bodies = present.map(k => sig(exportsBy[k].get(name)))
  const unique = new Set(bodies)
  rows.push({ name, present, unique: unique.size })
}

const cmsOnly = rows.filter(r => r.present.length === 1 && r.present[0] === 'cms')
const same = rows.filter(r => r.present.length > 1 && r.unique === 1)
const differ = rows.filter(r => r.present.length > 1 && r.unique > 1)
const missingInCms = rows.filter(r => !r.present.includes('cms'))

console.log(`Total distinct exports across projects: ${all.size}\n`)
console.log(`A. Only in cms (${cmsOnly.length}): ${cmsOnly.map(r => r.name).join(', ')}`)
console.log(`\nB. Identical everywhere they appear (${same.length})`)
console.log(`\nC. DIFFER between projects (${differ.length}):`)

for (const r of differ) {
  console.log(`\n  ${r.name}  [${r.present.join(', ')}]  ${r.unique} distinct bodies`)
  const groups = new Map()
  for (const k of r.present) {
    const b = sig(exportsBy[k].get(r.name))
    if (!groups.has(b)) groups.set(b, [])
    groups.get(b).push(k)
  }
  for (const [body, who] of groups) {
    console.log(`    ${who.join('+').padEnd(18)} ${body.length} chars  ${body.slice(0, 90)}${body.length > 90 ? '…' : ''}`)
  }
}

console.log(`\nD. Missing from cms (${missingInCms.length}): ${missingInCms.map(r => `${r.name}[${r.present.join('+')}]`).join(', ') || 'none'}`)
