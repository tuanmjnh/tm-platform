import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, compileScript } from '@vue/compiler-sfc'

// Hand-writing one .d.ts per component drifts from the SFC the first time a prop
// is added. These declarations are derived from the component's own defineProps
// so the published types cannot disagree with the compiled template.
//
// The props interface is emitted verbatim (it is already TypeScript), and the
// component is declared as a DefineComponent so `import { X } from '@tuanmjnh/tm-ui'`
// type-checks in an app without the SFC compiler on the consumer side.

const EMIT_RE = /defineEmits<\s*\{([\s\S]*?)\}\s*>/

function extractProps(source) {
  const generic = source.match(/defineProps<\s*\{([\s\S]*?)\n\s*\}\s*>\(/)
  return generic ? generic[1] : ''
}

function extractModelProps(source) {
  const models = [...source.matchAll(/defineModel<([^>]+)>(?:\(\s*'([^']+)'\s*\))?/g)]
  return models.map(m => ({ type: m[1], name: m[2] || 'modelValue' }))
}

function extractEmits(source) {
  const m = source.match(EMIT_RE)
  if (!m) return []
  const body = m[1]
  const out = []
  for (const line of body.split('\n')) {
    const ev = line.match(/^\s*(?:'|")?([\w:-]+)(?:'|")?\s*[?:]/)
    if (ev) out.push(ev[1])
  }
  return [...new Set(out)]
}

export function generateDeclaration(file, interfaceBase) {
  const source = readFileSync(file, 'utf8')
  const { descriptor } = parse(source, { filename: file })
  const script = descriptor.scriptSetup?.content || descriptor.script?.content || ''
  const propsBody = extractProps(script)
  const models = extractModelProps(script)
  const emits = extractEmits(script)

  // A declaration must stand on its own: any type named in the props body that
  // comes from a library has to be imported here too, or the consumer sees
  // "Cannot find name 'DropdownMenuItem'".
  const needed = new Set()
  for (const m of propsBody.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)) {
    const t = m[1]
    if (['Record', 'Partial', 'Readonly', 'Array', 'Promise', 'String', 'Number', 'Boolean', 'Date', 'Function', 'Object', 'HTMLElement', 'Element', 'unknown', 'any'].includes(t)) continue
    needed.add(t)
  }

  const lines = [`import type { DefineComponent } from 'vue'`]
  if (needed.size) {
    lines.push(`import type { ${[...needed].sort().join(', ')} } from '@nuxt/ui'`)
  }
  lines.push('')

  const interfaces = []

  if (propsBody.trim()) {
    interfaces.push(`export interface ${interfaceBase}Props {${propsBody}\n}`)
  } else {
    interfaces.push(`export interface ${interfaceBase}Props {\n  [key: string]: unknown\n}`)
  }

  for (const model of models) {
    interfaces.push(`export interface ${interfaceBase}Model {\n  ${model.name}: ${model.type.trim()}\n}`)
  }

  lines.push(...interfaces)

  // Vue's EmitsOptions requires an index signature; a mapped object literal of
  // named handlers does not satisfy it. Record<string, any[]> is what an SFC's
  // own generated type resolves to as well.
  const emitShape = emits.length ? 'Record<string, unknown[]>' : '{}'

  lines.push(
    '',
    `declare const ${interfaceBase}: DefineComponent<${interfaceBase}Props, {}, {}, {}, {}, {}, {}, ${emitShape}>`,
    `export default ${interfaceBase}`,
    ''
  )

  return lines.join('\n')
}

// Only used when the caller wants to know whether a hand-written file exists.
export function hasHandWritten(typesDir, name) {
  return existsSync(join(typesDir, `${name}.d.ts`))
}

export function writeGenerated(typesDir, name, content) {
  writeFileSync(join(typesDir, `${name}.d.ts`), content)
}
