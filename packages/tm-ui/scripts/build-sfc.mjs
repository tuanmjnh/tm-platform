import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, watch } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from '@vue/compiler-sfc'
import { transform } from 'esbuild'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
const src = join(root, 'src')
const watchMode = process.argv.includes('--watch')
mkdirSync(dist, { recursive: true })

// Local imports are written with the runtime `.js` extension so the emitted
// modules resolve without a bundler resolving TypeScript paths.
const stripTsExtension = code => code.replace(/(from\s+['"]\.\/[^'"]+)\.ts['"]/g, "$1.js'")

async function build() {
  const components = readdirSync(src)
    .filter(f => f.endsWith('.vue'))
    .sort()

  if (!components.length) throw new Error('no .vue components found in src/')

  const names = []
  for (const file of components) {
    const name = file.replace(/\.vue$/, '')
    names.push(name)

    const source = readFileSync(join(src, file), 'utf8')
    const { descriptor, errors } = parse(source, { filename: file })
    if (errors.length) {
      throw new Error(`${file} failed to parse: ${errors.map(e => e.message).join('; ')}`)
    }

    // inlineTemplate emits a complete component in one module, so the template
    // and the setup state cannot drift apart the way a hand-assembled pair can.
    const compiled = compileScript(descriptor, { id: `tm-ui-${name.toLowerCase()}`, inlineTemplate: true })

    // compileScript keeps the TypeScript annotations; esbuild strips them. `vue`
    // stays a bare import because it is a peer dependency supplied by the app, and
    // UBadge/UIcon resolve through Nuxt UI's auto-import at runtime.
    const { code: esm } = await transform(compiled.content, {
      loader: 'ts',
      format: 'esm',
      target: 'es2022'
    })

    writeFileSync(join(dist, `${name}.js`), `${stripTsExtension(esm)}\n`)
    console.log(`✓ ${name} compiled`)
  }

  // Plain .ts helpers ship as their own modules so a component can import them
  // without the SFC compiler inlining anything. index.ts is the barrel below.
  const helpers = readdirSync(src).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'index.ts')
  for (const file of helpers) {
    const base = file.replace(/\.ts$/, '')
    const source = readFileSync(join(src, file), 'utf8')
    const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'es2022' })
    writeFileSync(join(dist, `${base}.js`), `${stripTsExtension(code)}\n`)

    const declaration = join(src, 'types', `${base}.d.ts`)
    if (existsSync(declaration)) {
      writeFileSync(join(dist, `${base}.d.ts`), readFileSync(declaration, 'utf8'))
    }
    console.log(`✓ ${base} compiled`)
  }

  for (const name of names) {
    const dts = readFileSync(join(src, 'types', `${name}.d.ts`), 'utf8')
    writeFileSync(join(dist, `${name}.d.ts`), dts)
  }

  const exportLines = names.map(name => `export { default as ${name} } from './${name}.js'`).join('\n')
  const typeLines = names.map(name => `export type * from './${name}.js'`).join('\n')
  const helperLines = readdirSync(src)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'index.ts')
    .map(f => `export * from './${f.replace(/\.ts$/, '')}.js'`)
    .join('\n')
  writeFileSync(join(dist, 'index.js'), `${exportLines}\n${helperLines}\n`)
  writeFileSync(join(dist, 'index.d.ts'), `${exportLines}\n${typeLines}\n${helperLines}\n`)
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
