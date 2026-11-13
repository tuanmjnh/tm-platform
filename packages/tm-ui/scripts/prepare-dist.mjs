import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: './index.js',
  module: './index.js',
  types: './index.d.ts',
  exports: {
    '.': {
      types: './index.d.ts',
      import: './index.js'
    },
    // The same specifier works on a link: install (where the package root holds
    // source) and on the published tarball (which is the contents of dist).
    './style.css': './style.css',
    './package.json': './package.json'
  },
  files: ['*'],
  keywords: pkg.keywords,
  author: pkg.author,
  license: pkg.license,
  publishConfig: pkg.publishConfig,
  peerDependencies: pkg.peerDependencies,
  peerDependenciesMeta: pkg.peerDependenciesMeta
}

writeFileSync(join(dist, 'package.json'), JSON.stringify(distPkg, null, 2) + '\n')

const readme = join(root, 'README.md')
if (existsSync(readme)) copyFileSync(readme, join(dist, 'README.md'))

console.log('✓ dist/package.json prepared for publish')
