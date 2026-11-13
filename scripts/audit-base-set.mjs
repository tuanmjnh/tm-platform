import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = 'D:/Applications'
const APPS = ['tm-hub', 'tm-tools', 'tm-studio']
// The "base set": layout primitives, admin list furniture, shared UI.
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

const norm = s => s
  .replace(/\r\n/g, '\n')
  .replace(/^\s*(?:\/\/.*|\/\*[\s\S]*?\*\/)\s*$/gm, '')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .trim()

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' ? flat(v, p + k + '.') : [p + k])

const keys = {}
for (const app of APPS) {
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, app, 'i18n/locales/en.json'), 'utf8'))
  keys[app] = new Set(flat(en))
}

const byRel = new Map()
for (const app of APPS) {
  for (const d of DIRS) {
    for (const f of walk(path.join(ROOT, app, 'app/components', d))) {
      const rel = path.relative(path.join(ROOT, app, 'app/components'), f).replace(/\\/g, '/')
      if (!byRel.has(rel)) byRel.set(rel, [])
      byRel.get(rel).push({ app, file: f })
    }
  }
}

const KEY_RE = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g
const DEP_RE = [/\buseI18n\b/, /\buseToast\b|\buseNotify\b/, /\$fetch\b|\buseAuth\b|\buseHub\b/, /\buseRoute\b|\buseRouter\b|\bnavigateTo\b/, /\buseRuntimeConfig\b|\buseAppConfig\b/]

const rows = []
for (const [rel, group] of byRel) {
  const apps = [...new Set(group.map(g => g.app))]
  if (apps.length < 2) continue
  const srcs = group.map(g => fs.readFileSync(g.file, 'utf8'))
  const hashes = new Set(srcs.map(s => crypto.createHash('sha1').update(norm(s)).digest('hex')))
  const usedKeys = new Set()
  for (const s of srcs) for (const m of s.matchAll(KEY_RE)) usedKeys.add(m[1])
  const missing = [...usedKeys].filter(k => !apps.every(a => keys[a].has(k)))
  const deps = DEP_RE.filter(re => srcs.some(s => re.test(s))).length
  rows.push({
    rel, apps,
    identical: hashes.size === 1,
    lines: Math.max(...srcs.map(s => s.split('\n').length)),
    keys: usedKeys.size,
    missing,
    deps,
  })
}

rows.sort((a, b) => a.keys - b.keys || b.lines - a.lines)

console.log(`Base-set components shared by 2+ apps: ${rows.length}\n`)
const noI18n = rows.filter(r => r.keys === 0)
const cleanI18n = rows.filter(r => r.keys > 0 && r.missing.length === 0)
const brokenI18n = rows.filter(r => r.missing.length > 0)

const show = r => `${r.identical ? 'SAME' : 'DIFF'} ${String(r.lines).padStart(4)}L  keys=${String(r.keys).padStart(2)}  [${r.apps.map(a => a.replace('tm-', '')).join('+')}]`

console.log(`A. No i18n at all (${noI18n.length}) — cleanest to move:`)
for (const r of noI18n) console.log(`   ${r.rel.padEnd(32)} ${show(r)}`)

console.log(`\nB. Uses i18n, all keys present in every app (${cleanI18n.length}):`)
for (const r of cleanI18n) console.log(`   ${r.rel.padEnd(32)} ${show(r)}`)

console.log(`\nC. Uses i18n with missing keys (${brokenI18n.length}) — needs props or a key fix:`)
for (const r of brokenI18n) {
  console.log(`   ${r.rel.padEnd(32)} ${show(r)}  missing: ${r.missing.slice(0, 5).join(', ')}${r.missing.length > 5 ? ' …' : ''}`)
}
