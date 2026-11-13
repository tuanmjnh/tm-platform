#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Switch the three apps between the linked workspace copy of @tuanmjnh/tm-ui
 * and the published registry version.
 *
 *   pnpm tm-ui:link      -> link:../tm-platform/packages/tm-ui
 *   pnpm tm-ui:registry  -> ^<version> (version read from the package manifest)
 *
 * The Vite `fs.allow` entry and the Tailwind `@source` line are harmless under
 * a registry install: the package is then inside the app's own node_modules.
 */
const ROOT = process.env.TM_APPS_ROOT || 'D:/Applications'
const PKG = 'D:/Applications/tm-platform/packages/tm-ui/package.json'
const APPS = ['tm-hub', 'tm-tools', 'tm-studio']

const mode = process.argv[2]
if (mode !== 'link' && mode !== 'registry') {
  console.error('usage: switch-tm-ui.mjs <link|registry>')
  process.exit(1)
}

const version = JSON.parse(readFileSync(PKG, 'utf8')).version
const spec = mode === 'link'
  ? 'link:../tm-platform/packages/tm-ui'
  : `^${version}`

for (const app of APPS) {
  const dir = join(ROOT, app)
  if (!existsSync(join(dir, 'package.json'))) {
    console.log(`${app}: not found, skipped`)
    continue
  }
  console.log(`\n${app} -> @tuanmjnh/tm-ui@${spec}`)
  const result = spawnSync('pnpm', ['add', '-w', `@tuanmjnh/tm-ui@${spec}`], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (result.status !== 0) {
    console.error(`${app}: install failed`)
    process.exitCode = 1
  }
}

console.log(`\nDone. tm-ui ${mode === 'link' ? 'linked' : `pinned to ^${version}`} in ${APPS.length} apps.`)
