import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from '@vue/compiler-sfc'
import { transform } from 'esbuild'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })

const source = readFileSync(join(root, 'src', 'StatusBadge.vue'), 'utf8')
const { descriptor, errors } = parse(source, { filename: 'StatusBadge.vue' })
if (errors.length) {
  throw new Error(`StatusBadge.vue failed to parse: ${errors.map(e => e.message).join('; ')}`)
}

// inlineTemplate emits a complete component in one module, so the template and
// the setup state cannot drift apart the way a hand-assembled pair can.
const compiled = compileScript(descriptor, { id: 'tm-ui-status-badge', inlineTemplate: true })

// compileScript keeps the TypeScript annotations; esbuild strips them. `vue`
// stays a bare import because it is a peer dependency supplied by the app, and
// UBadge/UIcon resolve through Nuxt UI's auto-import at runtime.
const { code: esm } = await transform(compiled.content, {
  loader: 'ts',
  format: 'esm',
  target: 'es2022'
})

writeFileSync(join(dist, 'StatusBadge.js'), `${esm}\n`)
writeFileSync(join(dist, 'StatusBadge.d.ts'), `import type { DefineComponent } from 'vue'

export interface StatusBadgeProps {
  label: string
  color?: 'success' | 'neutral' | 'warning' | 'info' | 'error' | 'primary' | 'secondary'
  icon?: string
  size?: 'xs' | 'sm'
  clickable?: boolean
  loading?: boolean
  disabled?: boolean
}

declare const StatusBadge: DefineComponent<StatusBadgeProps, {}, {}, {}, {}, {}, {}, { click: () => void }>
export default StatusBadge
`)

writeFileSync(join(dist, 'index.js'), `export { default as StatusBadge } from './StatusBadge.js'\n`)
writeFileSync(join(dist, 'index.d.ts'), `export { default as StatusBadge } from './StatusBadge.js'\nexport type { StatusBadgeProps } from './StatusBadge.js'\n`)

console.log('✓ StatusBadge compiled')
