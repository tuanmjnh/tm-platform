// Fails when a class that only @tuanmjnh/tm-ui uses never reached the app's
// built stylesheet — the signature of a wrong `@source` path or a class name
// that does not exist in Nuxt UI's theme. Build the app first, then run:
//   node ../tm-platform/scripts/check-tmui-css.mjs   (from the app directory)
// A hand-picked class is not enough: `min-h-8` looks package-specific but
// @nuxt/ui uses it too, so its presence proves nothing.
import fs from 'node:fs'
import path from 'node:path'

const appDir = process.argv[2] || process.cwd()
const P = fs.realpathSync(path.join(appDir, 'node_modules/@tuanmjnh/tm-ui'))

const classes = new Set()
for (const f of fs.readdirSync(P).filter(f => f.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(P, f), 'utf8')
  for (const m of s.matchAll(/class:\s*"([^"]+)"/g)) m[1].split(/\s+/).forEach(c => c && classes.add(c))
  for (const m of s.matchAll(/class:\s*_normalizeClass\(\["([^"]+)"/g)) m[1].split(/\s+/).forEach(c => c && classes.add(c))
}

const walk = (d, acc = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(vue|ts|css)$/.test(e.name)) acc.push(p)
  }
  return acc
}
const appSrc = walk(path.join(appDir, 'app')).map(f => fs.readFileSync(f, 'utf8')).join('\n')

const uiDir = path.join(appDir, 'node_modules/.cache/nuxt/.nuxt/ui')
const nuxtUi = fs.existsSync(uiDir)
  ? fs.readdirSync(uiDir).map(f => fs.readFileSync(path.join(uiDir, f), 'utf8')).join('\n')
  : ''

const cssDir = path.join(appDir, '.output/public/_nuxt')
const css = fs.existsSync(cssDir)
  ? fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')
  : ''

const tokens = s => new Set(s.match(/[A-Za-z0-9_:\/\[\]\.\-\(\)%]+/g) || [])
const appTokens = tokens(appSrc)
const uiTokens = tokens(nuxtUi)

const only = [...classes].filter(c => !appTokens.has(c) && !uiTokens.has(c)).sort()
const cssEscaped = c => c.replace(/:/g, '\\:').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\./g, '\\.').replace(/\//g, '\\/')

const present = []
const missing = []
for (const c of only) {
  const escaped = '.' + cssEscaped(c)
  if (css.includes(escaped)) present.push(c)
  else missing.push(c)
}

console.log(`published package: ${P}`)
console.log(`tm-ui-only classes: ${only.length}`)
console.log(`PRESENT in built CSS (${present.length}): ${present.join(', ') || '-'}`)
console.log(`MISSING from built CSS (${missing.length}): ${missing.join(', ') || '-'}`)
