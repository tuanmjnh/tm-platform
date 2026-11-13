#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Adopt `@tuanmjnh/tm-ui` in the three apps, once it is on the registry.
 *
 * Every call site keeps its `<AdminStatusBadge>` markup; only the import moves,
 * because an explicit import wins over the auto-imported local component. That
 * makes the migration one line per file and trivially reversible.
 *
 * Idempotent: re-running skips files that already import the package.
 */
const APPS = {
  'tm-hub': [
    'app/pages/administration/apps/index.vue',
    'app/pages/administration/configs.vue',
    'app/pages/administration/content.vue',
    'app/pages/administration/roles.vue',
    'app/pages/administration/routes.vue',
    'app/pages/administration/users.vue',
    'app/pages/index.vue',
    'app/pages/resources/notifications.vue',
    'app/pages/resources/queues.vue'
  ],
  'tm-tools': [
    'app/pages/administration/roles.vue',
    'app/pages/administration/routes.vue',
    'app/pages/resources/notifications.vue',
    'app/pages/resources/queues.vue'
  ],
  'tm-studio': [
    'app/pages/resources/notifications.vue'
  ]
}

const ROOT = process.env.TM_APPS_ROOT || 'D:/Applications'

const IMPORT_LINE = "import { StatusBadge as AdminStatusBadge } from '@tuanmjnh/tm-ui'"
// `TM_UI_SPEC=file:../tm-platform/packages/tm-ui` while the package is local.
const SPEC = process.env.TM_UI_SPEC || `@tuanmjnh/tm-ui@${process.env.TM_UI_VERSION || '^0.1.0'}`

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    encoding: 'utf8'
  })
  return result.status === 0
}

function addImport(repoDir, relativePath) {
  const file = join(repoDir, relativePath)
  if (!existsSync(file)) {
    console.log(`  skip (missing) ${relativePath}`)
    return false
  }
  const source = readFileSync(file, 'utf8')
  if (source.includes(IMPORT_LINE)) {
    console.log(`  already ${relativePath}`)
    return false
  }
  const opening = source.match(/<script setup[^>]*>\r?\n/)
  if (!opening) {
    console.log(`  SKIP (no <script setup>) ${relativePath}`)
    return false
  }
  const eol = opening[0].endsWith('\r\n') ? '\r\n' : '\n'
  const at = opening.index + opening[0].length
  writeFileSync(file, source.slice(0, at) + IMPORT_LINE + eol + source.slice(at))
  console.log(`  migrated ${relativePath}`)
  return true
}

let changed = 0
for (const [app, files] of Object.entries(APPS)) {
  const repoDir = join(ROOT, app)
  if (!existsSync(join(repoDir, 'package.json'))) {
    console.log(`\n${app}: not found at ${repoDir}, skipped`)
    continue
  }
  console.log(`\n${app}`)
  for (const file of files) {
    if (addImport(repoDir, file)) changed += 1
  }
  console.log(`  installing ${SPEC}`)
  const spec = SPEC.startsWith('@tuanmjnh/tm-ui@') ? SPEC : `@tuanmjnh/tm-ui@${SPEC}`
  if (!run('pnpm', ['add', '-w', spec], repoDir)) {
    console.error(`  FAILED to install in ${app}`)
    process.exitCode = 1
  }
}

console.log(`\n${changed} file(s) migrated`)
if (changed === 0) console.log('nothing to do')
