import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// A precompiled SFC cannot rely on the host's auto-imports. Under `link:` Vite
// resolves `ref`/`computed` through the app and the panel works; once the package
// is installed from the registry the same panel throws `ReferenceError: ref is
// not defined` at setup, and nothing in build or typecheck says a word. Two
// panels shipped with exactly that defect, so this guard reads the source.

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'src')

const VUE_APIS = [
  'ref', 'computed', 'watch', 'watchEffect', 'reactive', 'readonly',
  'onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount',
  'nextTick', 'provide', 'inject', 'toRef', 'toRefs', 'shallowRef', 'markRaw'
]

function components(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) components(full, acc)
    else if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

const failures = []
for (const file of components(src)) {
  const text = readFileSync(file, 'utf8')
  const rel = file.slice(src.length + 1).split('\\').join('/')
  const script = text.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''

  const imported = new Set()
  for (const match of script.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]vue['"]/g)) {
    for (const name of match[1].split(',')) imported.add(name.trim().split(/\s+as\s+/).pop())
  }

  for (const api of VUE_APIS) {
    // `onMounted(` counts; `props.ref` and a string containing "ref" do not.
    const used = new RegExp(`(?<![.\\w])${api}\\s*\\(`).test(script)
    if (used && !imported.has(api)) failures.push(`${rel} uses ${api}() but does not import it from 'vue'`)
  }
}

assert.deepEqual(failures, [], `a precompiled SFC must import its Vue APIs:\n${failures.join('\n')}`)

console.log(`vue import guard: ${components(src).length} components clean`)
