import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, watch } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, compileScript, compileStyle } from '@vue/compiler-sfc'
import { transform } from 'esbuild'
import { generateDeclaration } from './generate-dts.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
const src = join(root, 'src')
const watchMode = process.argv.includes('--watch')
// A renamed or deleted source leaves its compiled module behind, and the stale
// module still resolves for any consumer that imported the old name.
rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

// Component names must stay unique across folders, because the package barrel
// exports them flat and the app wrappers import them by bare name.
function collectVue(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'types' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collectVue(full, acc)
    else if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

function collectTs(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collectTs(full, acc)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && entry.name !== 'index.ts') acc.push(full)
  }
  return acc
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true })
}

// Local imports are written with the runtime `.js` extension so the emitted
// modules resolve without a bundler resolving TypeScript paths. dist is flat, so
// a sibling SFC import has to land on the component's own module name rather than
// on the folder it sits in.
const stripTsExtension = code => code
  .replace(/(from\s+['"]\.\/[^'"]+)\.ts['"]/g, "$1.js'")
  .replace(/(from\s+['"])\.\/(?:[^'"]*\/)?([A-Za-z0-9_-]+)\.vue(['"])/g, "$1./$2.js$3")

async function build() {
  const componentFiles = collectVue(src).sort()

  if (!componentFiles.length) throw new Error('no .vue components found in src/')

  const names = []
  const nameToFile = new Map()
  const styleChunks = []
  for (const full of componentFiles) {
    const file = full.slice(src.length + 1).split('\\').join('/')
    const name = file.replace(/\.vue$/, '').split('/').pop()
    if (names.includes(name)) throw new Error(`duplicate component name "${name}" (from ${file})`)
    names.push(name)
    nameToFile.set(name, full)

    const source = readFileSync(full, 'utf8')
    const { descriptor, errors } = parse(source, { filename: file })
    if (errors.length) {
      throw new Error(`${file} failed to parse: ${errors.map(e => e.message).join('; ')}`)
    }

    // inlineTemplate emits a complete component in one module, so the template
    // and the setup state cannot drift apart the way a hand-assembled pair can.
    // genDefaultAs names the component so a scope id can be attached below.
    const scopeId = `data-v-tmui-${name.toLowerCase()}`
    const compiled = compileScript(descriptor, {
      id: scopeId,
      inlineTemplate: true,
      genDefaultAs: '__sfc_main'
    })
    const hasScopedStyle = descriptor.styles.some(s => s.scoped)

    // compileScript inlines the render function but not the scope attribute, so
    // a scoped component has to declare its id itself. Without this the styles
    // compile to `.x[data-v-…]` and no element ever carries that attribute.
    let content = `${compiled.content}\nexport default __sfc_main\n`
    if (hasScopedStyle) {
      content += `__sfc_main.__scopeId = ${JSON.stringify(scopeId)}\n`
    }

    // compileScript keeps the TypeScript annotations; esbuild strips them. `vue`
    // stays a bare import because it is a peer dependency supplied by the app, and
    // UBadge/UIcon resolve through Nuxt UI's auto-import at runtime.
    const { code: esm } = await transform(content, {
      loader: 'ts',
      format: 'esm',
      target: 'es2022'
    })

    for (const style of descriptor.styles) {
      const result = compileStyle({
        source: style.content,
        filename: file,
        id: scopeId,
        scoped: style.scoped
      })
      if (result.errors.length) {
        throw new Error(`${file} <style> failed: ${result.errors.map(e => e.message).join('; ')}`)
      }
      styleChunks.push(result.code)
    }

    writeFileSync(join(dist, `${name}.js`), `${stripTsExtension(esm)}\n`)
    console.log(`✓ ${name} compiled (${file})`)
  }

  // One stylesheet for the whole package. A component's <style> is not part of
  // its JS module, so the app imports the stylesheet once (Nuxt: a css entry or
  // an @import in main.css) and Tailwind still sees the class strings through
  // the @source directive.
  //
  // HeTreeMenu renders @he-tree/vue's Draggable, whose layout rules ship as a
  // separate CSS file. Importing that file from the component would break any
  // Node consumer (no CSS loader) and any SSR test, so it is concatenated here.
  const heTreeCss = join(root, 'node_modules', '@he-tree', 'vue', 'style', 'default.css')
  if (existsSync(heTreeCss)) styleChunks.unshift(readFileSync(heTreeCss, 'utf8'))

  // Package-owned rules (not <style> blocks, not Tailwind utilities) travel with
  // the components so no app has to copy them to get the intended rendering.
  const baseCss = join(src, 'styles', 'base.css')
  if (existsSync(baseCss)) styleChunks.push(readFileSync(baseCss, 'utf8'))

  writeFileSync(join(dist, 'style.css'), `${styleChunks.join('\n')}\n`)

  // Plain .ts modules ship as their own modules so a component can import them
  // without the SFC compiler inlining anything. index.ts is the barrel below.
  const helpers = collectTs(src)
  const helperPaths = []
  for (const full of helpers) {
    const file = full.slice(src.length + 1).split('\\').join('/')
    const base = file.replace(/\.ts$/, '')
    const source = readFileSync(full, 'utf8')
    const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'es2022' })

    const outFile = join(dist, `${base}.js`)
    ensureDir(outFile)
    writeFileSync(outFile, `${stripTsExtension(code)}\n`)
    helperPaths.push(base)

    const declaration = join(src, 'types', `${base.split('/').pop()}.d.ts`)
    if (existsSync(declaration)) {
      writeFileSync(join(dist, `${base}.d.ts`), readFileSync(declaration, 'utf8'))
    }
    console.log(`✓ ${base} compiled`)
  }

  // Type-only modules (no runtime JS) have to reach dist as well: the barrel and
  // several components reference them by path, and a missing file is a silent
  // `any` for every consumer.
  const typeDir = join(src, 'types')
  if (existsSync(typeDir)) {
    for (const entry of readdirSync(typeDir)) {
      if (!entry.endsWith('.d.ts')) continue
      const outFile = join(dist, 'types', entry)
      ensureDir(outFile)
      writeFileSync(outFile, readFileSync(join(typeDir, entry), 'utf8'))
    }
    console.log('✓ type declarations copied')
  }

  for (const name of names) {
    const handWritten = join(src, 'types', `${name}.d.ts`)
    const dts = existsSync(handWritten)
      ? readFileSync(handWritten, 'utf8')
      : generateDeclaration(nameToFile.get(name), name)
    writeFileSync(join(dist, `${name}.d.ts`), dts)
  }

  const exportLines = names.map(name => `export { default as ${name} } from './${name}.js'`).join('\n')
  const typeLines = names.map(name => `export type * from './${name}.js'`).join('\n')
  const helperLines = helperPaths.map(p => `export * from './${p}.js'`).join('\n')
  const sharedTypes = existsSync(join(src, 'types'))
    ? readdirSync(join(src, 'types'))
        .filter(f => f.endsWith('.d.ts') && ['HeaderActions.d.ts', 'GridList.d.ts', 'EmptyState.d.ts'].includes(f))
        .map(f => `export type * from './types/${f.replace(/\.d\.ts$/, '')}'`)
        .join('\n')
    : ''
  writeFileSync(join(dist, 'index.js'), `${exportLines}\n${helperLines}\n`)
  writeFileSync(join(dist, 'index.d.ts'), `${exportLines}\n${typeLines}\n${helperLines}\n${sharedTypes}\n`)

  // Precompiled components call resolveComponent() at runtime, which bypasses the
  // app's build-time auto-imports. Every Nuxt UI primitive a compiled module asks
  // for must be registered on the app's Vue instance or it renders as a dead
  // custom element — with build, typecheck and SSR tests all green.
  const primitives = new Set()
  for (const name of names) {
    const compiled = readFileSync(join(dist, `${name}.js`), 'utf8')
    for (const m of compiled.matchAll(/resolveComponent\(\s*["']([^"']+)["']\s*\)/g)) {
      if (/^[A-Z]/.test(m[1])) primitives.add(m[1])
    }
  }
  const sorted = [...primitives].sort()
  writeFileSync(join(dist, 'primitives.json'), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`✓ primitives.json lists ${sorted.length}: ${sorted.join(', ')}`)

  // The app plugin is generated, never hand-edited: a component added later
  // cannot be forgotten, and the checked-in diff shows the new registrations.
  // UTable is generic over the row type, so its component type is not assignable
  // to Vue's non-generic Component for registration — hence the cast, not a
  // weakened type.
  const registrations = sorted
    .map(n => `  nuxtApp.vueApp.component('${n}', ${n} as unknown as Component)`)
    .join('\n')
  const plugin = `// Generated by @tuanmjnh/tm-ui's build from dist/primitives.json — do not edit.
//
// The package ships precompiled components, so their \`resolveComponent('U…')\`
// calls bypass Nuxt's build-time auto-imports and fall through to this app's
// global registry. A missing registration renders a dead custom element with a
// green build. After upgrading the package, copy dist/tm-ui-globals.client.ts.txt
// over this file.
import type { Component } from 'vue'
import {
${sorted.map(n => `  ${n},`).join('\n')}
} from '#components'

export default defineNuxtPlugin((nuxtApp) => {
${registrations}
})
`
  writeFileSync(join(dist, 'tm-ui-globals.client.ts.txt'), plugin)
}

await build()

if (watchMode) {
  console.log('watching src/ for changes')
  let timer = null
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      build().catch(err => console.error(`build failed: ${err.message}`))
    }, 120)
  }
  watch(src, { recursive: true }, schedule)
}
