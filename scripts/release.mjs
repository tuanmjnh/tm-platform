#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGES_DIR = join(ROOT, 'packages')
const COMMANDS = ['login', 'build', 'list', 'publish', 'publish-one', 'help']

const args = process.argv.slice(2)
const flags = new Set(args.filter(a => a.startsWith('--')))
const positional = args.filter(a => !a.startsWith('--'))
const command = positional.find(a => COMMANDS.includes(a))
const targets = positional.filter(a => a !== command)

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code, text) => (USE_COLOR ? `\u001b[${code}m${text}\u001b[0m` : text)
const ok = text => console.log(paint(32, `  ok    ${text}`))
const info = text => console.log(paint(36, `  ·     ${text}`))
const warn = text => console.log(paint(33, `  warn  ${text}`))
const fail = text => console.log(paint(31, `  FAIL  ${text}`))
const head = text => console.log(`\n${paint(1, text)}`)

const NEEDS_SHELL = process.platform === 'win32'

function quoteArg(value) {
  const text = String(value)
  if (!/[\s"&|<>^]/.test(text)) return text
  return `"${text.replace(/"/g, '\\"')}"`
}

// Windows resolves npm/pnpm through .cmd shims, which needs a shell. Passing an
// args array together with `shell: true` is deprecated, so argv is joined here.
function spawnWith(bin, binArgs, options) {
  if (!NEEDS_SHELL) return spawnSync(bin, binArgs, options)
  return spawnSync([bin, ...binArgs.map(quoteArg)].join(' '), { ...options, shell: true })
}

function run(bin, binArgs, options = {}) {
  return spawnWith(bin, binArgs, {
    cwd: options.cwd || ROOT,
    stdio: options.stdio || 'inherit',
    encoding: 'utf8'
  })
}

function capture(bin, binArgs) {
  const result = spawnWith(bin, binArgs, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  })
  return {
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim()
  }
}

function allPackages() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const dir = join(PACKAGES_DIR, entry.name)
      const manifestPath = join(dir, 'package.json')
      if (!existsSync(manifestPath)) return null
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      return {
        folder: entry.name,
        dir,
        name: manifest.name,
        version: manifest.version,
        private: manifest.private === true,
        scripts: manifest.scripts || {}
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function distState(pkg) {
  const distManifest = join(pkg.dir, 'dist', 'package.json')
  if (!existsSync(distManifest)) return { state: 'missing' }
  try {
    const built = JSON.parse(readFileSync(distManifest, 'utf8'))
    if (built.name !== pkg.name || built.version !== pkg.version) {
      return { state: 'stale', built }
    }
    return { state: 'ready', built }
  } catch {
    return { state: 'broken' }
  }
}

function registryVersion(name) {
  const result = capture('npm', ['view', name, 'version'])
  if (result.status !== 0) return null
  return result.stdout.split('\n').pop().trim() || null
}

function selectedPackages() {
  const all = allPackages()
  if (targets.length === 0) return all
  const picked = []
  const unknown = []
  for (const target of targets) {
    const match = all.find(p => p.folder === target || p.name === target)
    if (match) picked.push(match)
    else unknown.push(target)
  }
  if (unknown.length) {
    fail(`unknown package(s): ${unknown.join(', ')}`)
    info(`known: ${all.map(p => p.folder).join(', ')}`)
    process.exit(1)
  }
  return picked
}

function requiresCleanTree() {
  const status = capture('git', ['status', '--porcelain'])
  if (status.status !== 0) {
    warn('not a git repo, skipping the clean-tree check')
    return true
  }
  if (!status.stdout) {
    ok('working tree is clean')
    return true
  }
  if (flags.has('--force-tree')) {
    warn('working tree is dirty, continuing because of --force-tree')
    for (const line of status.stdout.split('\n').slice(0, 5)) console.log(`        ${line}`)
    return true
  }
  fail('working tree is dirty — commit or stash first (npm refuses to publish otherwise)')
  for (const line of status.stdout.split('\n').slice(0, 15)) console.log(`        ${line}`)
  return false
}

function whoami() {
  const result = capture('npm', ['whoami'])
  if (result.status !== 0) return null
  return result.stdout.split('\n').pop()
}

function buildPackages(packages) {
  const filters = packages.flatMap(p => ['--filter', p.name])
  const result = run('pnpm', [...filters, '--workspace-concurrency=1', 'run', 'build'])
  return result.status === 0
}

function verifyPackage(pkg) {
  const steps = ['typecheck', 'test'].filter(step => pkg.scripts[step])
  for (const step of steps) {
    info(`${pkg.name}: ${step}`)
    const result = run('pnpm', ['--filter', pkg.name, 'run', step])
    if (result.status !== 0) {
      fail(`${pkg.name}: ${step} failed`)
      return false
    }
  }
  return true
}

function commandLogin() {
  head('npm login')
  const user = whoami()
  if (user) {
    info(`already signed in as ${paint(1, user)}`)
    return 0
  }
  const result = run('npm', ['login'], { stdio: 'inherit' })
  if (result.status !== 0) {
    fail('login failed')
    return result.status || 1
  }
  const after = whoami()
  if (!after) {
    fail('still not signed in')
    return 1
  }
  ok(`signed in as ${after}`)
  return 0
}

function commandBuild() {
  const packages = selectedPackages()
  if (packages.length === 0) {
    fail('no packages found')
    return 1
  }
  head(packages.length === 1 ? `build ${packages[0].name}` : `build ${packages.length} packages`)
  if (!buildPackages(packages)) {
    fail('build failed')
    return 1
  }
  ok('build finished')
  return 0
}

function commandList() {
  const rows = allPackages().map(pkg => {
    const dist = pkg.private ? 'private' : distState(pkg).state
    const published = pkg.private ? '—' : registryVersion(pkg.name) || 'unpublished'
    const action = pkg.private
      ? 'skipped'
      : published === pkg.version
        ? 'up to date'
        : dist === 'ready'
          ? 'ready to publish'
          : dist === 'stale'
            ? 'rebuild needed'
            : 'build needed'
    return { pkg, dist, published, action }
  })

  head('packages')
  const width = (values, min) => Math.max(...values.map(v => v.length), min)
  const nameWidth = width(rows.map(r => r.pkg.folder), 'package'.length)
  const verWidth = width(rows.map(r => r.pkg.version), 'version'.length)
  const distWidth = width(rows.map(r => r.dist), 'dist'.length)
  const regWidth = width(rows.map(r => r.published), 'registry'.length)
  console.log(`  ${paint(1, 'package'.padEnd(nameWidth))}  ${paint(1, 'version'.padEnd(verWidth))}  ${paint(1, 'dist'.padEnd(distWidth))}  ${paint(1, 'registry'.padEnd(regWidth))}  ${paint(1, 'action')}`)
  for (const row of rows) {
    const line = [
      row.pkg.folder.padEnd(nameWidth),
      row.pkg.version.padEnd(verWidth),
      row.dist.padEnd(distWidth),
      row.published.padEnd(regWidth),
      row.action
    ].join('  ')
    console.log(`  ${row.action === 'ready to publish' ? paint(32, line) : line}`)
  }
  console.log('')
  return 0
}

function publishOne(pkg, dryRun) {
  const dist = distState(pkg)
  if (dist.state !== 'ready') {
    fail(`${pkg.name}: dist is ${dist.state} for ${pkg.name}@${pkg.version} — run \`pnpm release:build ${pkg.folder}\``)
    return 'failed'
  }

  const publishArgs = ['publish', './dist', '--access', 'public']
  if (dryRun) publishArgs.push('--dry-run')

  info(`${pkg.name}@${pkg.version}${dryRun ? ' (dry run)' : ''}`)
  const result = run('npm', publishArgs, { cwd: pkg.dir, stdio: dryRun ? 'pipe' : 'inherit' })

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' ')
    fail(`${pkg.name}@${pkg.version}: ${detail || 'publish failed'}`)
    return 'failed'
  }
  if (dryRun) {
    const size = String(result.stdout).match(/package size:\s*([\d.]+\s*[kMB]+)/i)
    ok(`${pkg.name}@${pkg.version}${size ? ` (${size[1]})` : ''}`)
    return 'dry'
  }
  if (registryVersion(pkg.name) !== pkg.version) {
    warn(`${pkg.name}@${pkg.version}: published but the registry has not caught up yet`)
  } else {
    ok(`${pkg.name}@${pkg.version} published`)
  }
  return 'published'
}

function publishPackages(packages, dryRun) {
  head(dryRun ? 'publish (dry run)' : 'publish')

  if (!dryRun) {
    if (!requiresCleanTree()) {
      info('re-run after committing, or pass --force-tree to ignore this check')
      return 1
    }
    const user = whoami()
    if (!user) {
      fail('not signed in — run `pnpm release:login` first')
      return 1
    }
    info(`signed in as ${user}`)
  }

  for (const pkg of packages.filter(p => p.private)) {
    info(`${pkg.name}: private, skipped`)
  }
  const publishable = packages.filter(pkg => !pkg.private)
  if (publishable.length === 0) {
    fail('nothing publishable selected')
    return 1
  }

  if (flags.has('--verify')) {
    for (const pkg of publishable) {
      if (!verifyPackage(pkg)) return 1
    }
  }

  const toBuild = flags.has('--build')
    ? publishable
    : publishable.filter(pkg => distState(pkg).state !== 'ready')
  if (toBuild.length > 0) {
    info(`building ${toBuild.map(p => p.name).join(', ')}`)
    if (!buildPackages(toBuild)) {
      fail('build failed')
      return 1
    }
  }

  const tally = { published: 0, dry: 0, skipped: 0, failed: 0 }
  for (const pkg of publishable) {
    if (registryVersion(pkg.name) === pkg.version) {
      info(`${pkg.name}@${pkg.version}: already on the registry, skipped`)
      tally.skipped += 1
      continue
    }
    tally[publishOne(pkg, dryRun)] += 1
  }

  head('summary')
  if (dryRun) {
    console.log(`  checked ${tally.dry} · skipped ${tally.skipped} · failed ${tally.failed}`)
    info('nothing was published — drop --dry-run to publish for real')
  } else {
    console.log(`  published ${tally.published} · skipped ${tally.skipped} · failed ${tally.failed}`)
  }
  return tally.failed === 0 ? 0 : 1
}

async function pickPackages() {
  const packages = allPackages().filter(pkg => !pkg.private)
  if (packages.length === 0) {
    fail('no publishable packages found')
    return null
  }
  if (!process.stdin.isTTY) {
    fail('publish-one needs an interactive terminal — pass a name instead: `pnpm release:publish tm-ai-client`')
    return null
  }

  head('choose a package')
  packages.forEach((pkg, index) => {
    const dist = distState(pkg).state
    const published = registryVersion(pkg.name)
    const state = published === pkg.version ? 'up to date' : dist === 'ready' ? 'ready' : `dist ${dist}`
    const label = `${String(index + 1).padStart(2)}. ${pkg.name}@${pkg.version}`
    console.log(`  ${label.padEnd(44)} ${paint(state === 'ready' ? 32 : 2, state)}`)
  })
  console.log('')

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question('  number, comma separated, or "all": ')).trim().toLowerCase()
    if (!answer) return null
    if (answer === 'all') return packages

    const picked = []
    for (const part of answer.split(/[\s,]+/).filter(Boolean)) {
      const index = Number(part)
      if (!Number.isInteger(index) || index < 1 || index > packages.length) {
        fail(`"${part}" is not a valid number`)
        return null
      }
      picked.push(packages[index - 1])
    }
    return [...new Set(picked)]
  } finally {
    rl.close()
  }
}

async function commandPublishOne() {
  const packages = targets.length > 0 ? selectedPackages() : await pickPackages()
  if (!packages || packages.length === 0) return 1
  return publishPackages(packages, flags.has('--dry-run'))
}

function commandHelp() {
  console.log(`
${paint(1, 'tm-platform release')}

  pnpm release:login                     npm login (no-op when already signed in)
  pnpm release:list                      version, dist and registry state per package
  pnpm release:build                     build every package (sequential)
  pnpm release:build tm-ai-client        build one package

  pnpm release:publish                   publish every package not already on npm
  pnpm release:publish --dry-run         preview only, nothing is published
  pnpm release:publish tm-ai-client      publish one package
  pnpm release:publish @tuanmjnh/tm-cut-core @tuanmjnh/tm-utils

  pnpm release:publish:ai-client         one alias per package
  pnpm release:publish:types               types · utils · validators
  pnpm release:publish:cut-core            cut-core · hub-client · ui
  pnpm release:publish:one               pick a package interactively, then publish

${paint(1, 'flags')}
  --dry-run      preview only (npm publish --dry-run), nothing is published
  --build        rebuild the selected package(s) first
  --verify       run typecheck + test of the selected package(s) first
  --force-tree   skip the clean-working-tree check
  --help         this text

${paint(1, 'notes')}
  · publishing for real is the default: it needs npm login and a clean tree
  · packages publish from dist/, never from the package root
  · a stale or missing dist is rebuilt automatically before publishing
  · a version already on the registry is skipped, so re-running is safe
  · a scoped package is published with --access public
`)
}

if (flags.has('--help') || command === 'help' || args.length === 0) {
  commandHelp()
  process.exit(0)
}

let exitCode = 0
if (command === 'login') exitCode = commandLogin()
else if (command === 'build') exitCode = commandBuild()
else if (command === 'list') exitCode = commandList()
else if (command === 'publish') exitCode = publishPackages(selectedPackages(), flags.has('--dry-run'))
else if (command === 'publish-one') exitCode = await commandPublishOne()
else {
  fail(`unknown command: ${command || positional[0]}`)
  commandHelp()
  exitCode = 1
}
process.exit(exitCode)
