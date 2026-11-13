// Fails when a class that only @tuanmjnh/tm-ui uses never reached the app's
// built stylesheet — the signature of a wrong `@source` path or a class name
// that does not exist in Nuxt UI's theme. Build the app first, then run:
//   node ../tm-platform/scripts/check-tmui-css.mjs   (from the app directory)
// A hand-picked class is not enough: `min-h-8` looks package-specific but
// @nuxt/ui uses it too, so its presence proves nothing.
import fs from 'node:fs'
import path from 'node:path'

const appDir = process.argv[2] || process.cwd()
const pkgRoot = fs.realpathSync(path.join(appDir, 'node_modules/@tuanmjnh/tm-ui'))
// On a link: install the package root holds source and the compiled modules sit
// in dist/; the published tarball is the contents of dist, so the root is flat.
const P = fs.existsSync(path.join(pkgRoot, 'dist', 'index.js')) ? path.join(pkgRoot, 'dist') : pkgRoot

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

// Tailwind escapes every character CSS treats as structural, and the minifier
// then rewrites numeric values (.18 -> .18, 0.18 -> .18). Comparing the raw
// class text against the built CSS therefore reports false misses for exactly
// the arbitrary-value utilities that matter most. Normalise both sides instead.
const CSS_ESCAPABLE = /[:[\]()./,%#!&*+~'"<>=@^`|{}?;]/g
const escapeClass = c => c.replace(CSS_ESCAPABLE, ch => '\\' + ch)
const normaliseNumber = s => s.replace(/(?<![\d.])0\.(\d)/g, '.$1')

// A class only needs a rule of its own when something defines it. A bare hook
// (`tree-menu`, `he-tree-root`) carries no styles anywhere, including in the
// pre-extraction app, so its absence from the stylesheet is not a regression.
const HOOK_ONLY = new Set(['tree-menu', 'he-tree-root'])

const cssNormalised = normaliseNumber(css)
const present = []
const missing = []
for (const c of only) {
  if (HOOK_ONLY.has(c)) continue
  if (cssNormalised.includes('.' + normaliseNumber(escapeClass(c)))) present.push(c)
  else missing.push(c)
}

console.log(`published package: ${P}`)
console.log(`tm-ui-only classes: ${only.length}`)
console.log(`PRESENT in built CSS (${present.length}): ${present.join(', ') || '-'}`)
console.log(`MISSING from built CSS (${missing.length}): ${missing.join(', ') || '-'}`)
if (missing.length) process.exitCode = 1

