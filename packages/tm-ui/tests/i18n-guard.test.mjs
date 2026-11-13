import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The package must stay free of i18n: strings arrive as props, so a component
// that calls useI18n() silently reintroduces a dependency every consumer then
// has to satisfy. This test fails on the source, not on a rendered label.

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'src')

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(vue|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) acc.push(full)
  }
  return acc
}

const files = walk(src)
assert.ok(files.length > 0, 'no source files found')

const failures = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const rel = file.slice(src.length + 1).split('\\').join('/')

  // A comment may mention useI18n to explain the contract; strip comments first.
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  for (const banned of ['useI18n(', '$t(', 'useNuxtApp(', 'useState(']) {
    if (code.includes(banned)) failures.push(`${rel} calls ${banned})`.replace('))', ')'))
  }
}

assert.deepEqual(failures, [], `i18n/Nuxt coupling found:\n${failures.join('\n')}`)

console.log(`i18n guard: ${files.length} source files clean`)
