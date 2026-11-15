import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// A peer marked optional promises "importing the package works without it". The
// barrel re-exports every component, so a module that imports a peer statically
// is reached by `import { StatusBadge } from '@tuanmjnh/tm-ui'` even when the
// caller never renders the component that needs the peer — and the import
// throws ERR_MODULE_NOT_FOUND before any of that. Measured: the published
// tarball failed to import in a scratch consumer that had only `vue`.

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

assert.ok(existsSync(dist), 'run `pnpm build` first — this test reads dist/*.js')

const optional = Object.entries(pkg.peerDependenciesMeta ?? {})
  .filter(([, meta]) => meta?.optional)
  .map(([name]) => name)

const staticImports = new Map()
for (const file of readdirSync(dist).filter(f => f.endsWith('.js'))) {
  const code = readFileSync(join(dist, file), 'utf8')
  for (const match of code.matchAll(/^\s*import[^'"]*["']([^."'][^"']*)["']/gm)) {
    const spec = match[1]
    const name = spec.startsWith('@')
      ? spec.split('/').slice(0, 2).join('/')
      : spec.split('/')[0]
    if (!staticImports.has(name)) staticImports.set(name, [])
    staticImports.get(name).push(file)
  }
}

const violations = optional
  .filter(name => staticImports.has(name))
  .map(name => `${name} is optional but imported by ${[...new Set(staticImports.get(name))].join(', ')}`)

assert.deepEqual(
  violations,
  [],
  `An optional peer must not be statically imported:\n${violations.join('\n')}`
)

const required = Object.keys(pkg.peerDependencies ?? {})
for (const name of required) {
  assert.ok(
    name === 'vue' || name === '@nuxt/ui' || staticImports.has(name),
    `${name} is a required peer but nothing in dist imports it`
  )
}

console.log(`peer guard: ${required.length} peers, ${optional.length} optional, no static optional imports`)
