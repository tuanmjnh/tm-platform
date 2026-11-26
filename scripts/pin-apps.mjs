#!/usr/bin/env node
/**
 * Repoints every consuming app at a commit of this repository.
 *
 * The apps install the shared packages straight from GitHub (`git+https://…`),
 * because `dist/` is committed and pnpm then needs no build step. pnpm records
 * the resolved commit in its lockfile, so the pin must name a commit that is
 * already pushed — this script writes it and prints the install command, but
 * never runs an install on your behalf.
 *
 *   node scripts/pin-apps.mjs                 # pin to HEAD
 *   node scripts/pin-apps.mjs <sha>           # pin to a specific commit
 *   node scripts/pin-apps.mjs --dry-run       # print the specifiers only
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REPO_SLUG = 'tuanmjnh/tm-platform'
const PACKAGES_DIR = join(ROOT, 'packages')

// Apps that consume the shared packages. Kept here rather than discovered so a
// new app is an explicit addition, not a silent omission.
const APPS = [
  { name: 'tm-hub', dir: '../tm-hub' },
  { name: 'tm-tools', dir: '../tm-tools' },
  { name: 'tm-studio', dir: '../tm-studio' },
  { name: 'tm-websites/tm-cms', dir: '../tm-websites/tm-cms' },
  { name: 'tm-social-hub', dir: '../tm-social-hub' }
]

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const explicit = argv.find(a => !a.startsWith('--'))

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code, text) => (USE_COLOR ? `\u001b[${code}m${text}\u001b[0m` : text)
const ok = text => console.log(paint(32, `  ok    ${text}`))
const info = text => console.log(paint(36, `  ·     ${text}`))
const warn = text => console.log(paint(33, `  warn  ${text}`))

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  return result.status === 0 ? String(result.stdout || '').trim() : ''
}

const sha = explicit || git(['rev-parse', 'HEAD'])
if (!sha) {
  console.error('cannot resolve a commit to pin')
  process.exit(1)
}

// Pinning an unpushed commit produces a dependency no other machine can fetch.
// The check is best-effort: no network access still produces a usable specifier.
const remote = git(['ls-remote', 'origin', 'refs/heads/main'])
if (remote) {
  const remoteSha = remote.split(/\s+/)[0]
  const isAncestor = git(['merge-base', '--is-ancestor', sha, remoteSha]) !== '' || sha === remoteSha
  if (!isAncestor) {
    warn(`${sha.slice(0, 8)} is not on origin/main — push before installing, or the install will fail elsewhere`)
  }
}

info(`pinning ${REPO_SLUG} to ${sha}`)

const specifierFor = folder =>
  `git+https://github.com/${REPO_SLUG}.git#${sha}&path:/packages/${folder}`

// Package name → folder. Derived from each manifest because the folder name does
// not follow from the package name (`@tuanmjnh/tm-core` lives in `tm-core`).
const folderByName = new Map()
for (const folder of readdirSync(PACKAGES_DIR)) {
  const manifestPath = join(PACKAGES_DIR, folder, 'package.json')
  if (!existsSync(manifestPath)) continue
  const { name } = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (name) folderByName.set(name, folder)
}

for (const app of APPS) {
  const appDir = resolve(ROOT, app.dir)
  const manifestPath = join(appDir, 'package.json')
  if (!existsSync(manifestPath)) {
    warn(`${app.name}: package.json not found, skipped`)
    continue
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const deps = { ...manifest.dependencies, ...manifest.devDependencies }
  const shared = Object.keys(deps)
    .filter(name => folderByName.has(name))
    .map(name => ({ name, folder: folderByName.get(name) }))

  if (shared.length === 0) continue

  const lines = shared.map(entry =>
    `pnpm --dir ${app.dir} add "${entry.name}@${specifierFor(entry.folder)}"`)

  ok(`${app.name}: ${shared.map(e => e.name).join(', ')}`)
  if (dryRun) {
    for (const line of lines) console.log(`        ${line}`)
  }
}

if (dryRun) {
  console.log(`\n${paint(1, 'dry run — run the commands above to apply')}`)
} else {
  console.log(`\n${paint(1, 'next')}`)
  console.log('  run the printed `pnpm add` commands, then commit the manifests and lockfiles')
}
