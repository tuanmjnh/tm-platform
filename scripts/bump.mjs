#!/usr/bin/env node
/**
 * Bumps the version of every package that has changed since the last release,
 * rebuilds its `dist/`, and records a CHANGELOG entry.
 *
 * The bump is patch by default. Pass minor/major to widen it.
 *
 * Why this exists: the apps install these packages straight from GitHub at a
 * pinned commit, so a release is "bump + commit + pin". This script does the
 * bump and the rebuild; `scripts/pin-apps.mjs` does the pin after the commit.
 *
 *   node scripts/bump.mjs                 # patch every changed package
 *   node scripts/bump.mjs minor           # widen the increment
 *   node scripts/bump.mjs --dry-run       # show what would change
 *   node scripts/bump.mjs --since <ref>   # compare against another base
 *   node scripts/bump.mjs tm-ui tm-core   # limit to named packages
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGES_DIR = join(ROOT, 'packages')
const VALID_BUMPS = ['patch', 'minor', 'major']

const argv = process.argv.slice(2)
const flags = argv.filter(a => a.startsWith('--'))
const positional = argv.filter(a => !a.startsWith('--'))
const dryRun = flags.includes('--dry-run')
const force = flags.includes('--force')

const sinceIndex = argv.indexOf('--since')
const since = sinceIndex >= 0 ? argv[sinceIndex + 1] : null

const bumpType = positional.find(a => VALID_BUMPS.includes(a)) || 'patch'
const named = positional.filter(a => !VALID_BUMPS.includes(a))

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code, text) => (USE_COLOR ? `\u001b[${code}m${text}\u001b[0m` : text)
const ok = text => console.log(paint(32, `  ok    ${text}`))
const info = text => console.log(paint(36, `  ·     ${text}`))
const warn = text => console.log(paint(33, `  warn  ${text}`))
const fail = text => console.log(paint(31, `  FAIL  ${text}`))

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) return ''
  return String(result.stdout || '').trim()
}

/** The commit to compare against. Defaults to HEAD: a release is normally taken
 *  straight after editing, so only uncommitted work counts. A tag, when one
 *  exists, would silently skip packages edited before it. */
function baseRef() {
  if (since) return since
  return 'HEAD'
}

function changedFiles(base) {
  // Both committed-since-base and uncommitted changes count: a release is
  // usually taken straight after editing, before the commit lands.
  const committed = git(['diff', '--name-only', `${base}..HEAD`, '--', 'packages']).split('\n')
  const pending = git(['diff', '--name-only', 'HEAD', '--', 'packages']).split('\n')
  const untracked = git(['ls-files', '--others', '--exclude-standard', '--', 'packages']).split('\n')
  return [...new Set([...committed, ...pending, ...untracked].filter(Boolean))]
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(n => Number.parseInt(n, 10))
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const base = baseRef()
const files = changedFiles(base)
info(`base: ${base}`)

// No package names on the command line means "every changed package"; an empty
// array would read as a filter that matches nothing.
const restrictTo = named.length > 0 ? new Set(named) : null

/** Collect packages whose source (not dist) changed. */
const touched = new Map()
for (const file of files) {
  const match = file.match(/^packages\/([^/]+)\/(.*)$/)
  if (!match) continue
  const [, folder, rest] = match
  if (rest.startsWith('dist/')) continue
  if (!existsSync(join(PACKAGES_DIR, folder, 'package.json'))) continue
  if (restrictTo && !restrictTo.has(folder)) continue
  touched.set(folder, true)
}

if (touched.size === 0 && !force) {
  info('no package changed — nothing to bump')
  process.exit(0)
}

// --force names packages explicitly: dist is being committed for the first time,
// so there is no source change to detect, but the version must still move or the
// pin would point at a commit whose dist is labelled with an older version.
if (force) {
  for (const folder of named) {
    if (existsSync(join(PACKAGES_DIR, folder, 'package.json'))) touched.set(folder, true)
  }
  if (touched.size === 0) {
    fail('--force needs package names, e.g. `bump.mjs --force tm-core tm-utils`')
    process.exit(1)
  }
}

const results = []
for (const folder of [...touched.keys()].sort()) {
  const manifestPath = join(PACKAGES_DIR, folder, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const from = manifest.version
  const to = bumpVersion(from, bumpType)

  info(`${manifest.name}: ${from} → ${to}`)
  if (dryRun) {
    results.push({ folder, name: manifest.name, from, to, dryRun: true })
    continue
  }

  manifest.version = to
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const changelogPath = join(PACKAGES_DIR, folder, 'CHANGELOG.md')
  const heading = `## ${to}\n\n### ${bumpType === 'patch' ? 'Patch' : bumpType === 'minor' ? 'Minor' : 'Major'} Changes\n\n- Rebuild for the next pinned release.\n`
  if (existsSync(changelogPath)) {
    const current = readFileSync(changelogPath, 'utf8')
    const firstHeading = current.indexOf('\n## ')
    const head = firstHeading === -1 ? `${current.trimEnd()}\n\n` : `${current.slice(0, firstHeading + 1)}\n`
    const tail = firstHeading === -1 ? '' : current.slice(firstHeading + 1)
    writeFileSync(changelogPath, `${head}${heading}\n${tail}`)
  } else {
    writeFileSync(changelogPath, `# ${manifest.name}\n\n${heading}`)
  }

  // dist/ is committed so a git install needs no build; a stale dist would ship
  // code that does not match the version it is labelled with.
  const build = process.platform === 'win32'
    ? spawnSync(`pnpm --dir "${folder}" run build`, { cwd: PACKAGES_DIR, stdio: 'inherit', shell: true })
    : spawnSync('pnpm', ['--dir', folder, 'run', 'build'], { cwd: PACKAGES_DIR, stdio: 'inherit' })
  if (build.status !== 0) {
    fail(`${manifest.name}: build failed — version bumped, dist NOT rebuilt`)
    process.exitCode = 1
    results.push({ folder, name: manifest.name, from, to, built: false })
    continue
  }
  ok(`${manifest.name}@${to} built`)
  results.push({ folder, name: manifest.name, from, to, built: true })
}

if (dryRun) {
  console.log(`\n${paint(1, 'dry run — nothing written')}`)
  process.exit(0)
}

console.log(`\n${paint(1, 'next')}`)
console.log('  1. review and commit the version + dist changes')
console.log('  2. node scripts/pin-apps.mjs   # repoints every app at the new commit')
