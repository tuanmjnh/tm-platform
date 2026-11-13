import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// Run from the app directory: its node_modules supplies playwright-core when the
// app declares it, otherwise fall back to a sibling that does. Candidates come
// from the working directory (an app) and from this script's parent (tm-platform,
// so the probe also runs from there). The seed file is always tm-hub's — every
// app's root account is the same record.
const appDir = process.cwd()
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const candidateRoots = [
  appDir,
  path.resolve(appDir, '..', 'tm-studio'),
  path.resolve(appDir, '..', 'tm-tools'),
  path.resolve(here, '..'),
  path.resolve(here, '..', '..', 'tm-studio'),
  path.resolve(here, '..', '..', 'tm-tools'),
]
const playwrightRoot = candidateRoots.find(r => existsSync(path.join(r, 'node_modules', 'playwright-core')))
if (!playwrightRoot) throw new Error(`playwright-core not found; tried:\n  ${candidateRoots.join('\n  ')}`)
const require = createRequire(path.join(playwrightRoot, 'index.js'))
const { chromium } = require('playwright-core')

const APP_URL = process.env.PROBE_APP_URL || 'http://localhost:4002'
const ROUTES = (process.env.PROBE_ROUTES || '/chat').split(',')
const APP_ID = process.env.PROBE_APP_ID || 'tm-tools_bae5xz'
const OPEN_SELECT = process.env.PROBE_OPEN_SELECT === '1'
const EDGE = process.env.PROBE_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const seedCandidates = [
  path.resolve(appDir, '..', 'tm-hub', 'scripts', 'seed', 'shared.ts'),
  path.resolve(here, '..', '..', 'tm-hub', 'scripts', 'seed', 'shared.ts'),
]
const SEED_FILE = process.env.PROBE_SEED_FILE || seedCandidates.find(f => existsSync(f))
if (!SEED_FILE) throw new Error(`seed file not found; tried:\n  ${seedCandidates.join('\n  ')}`)

const shared = await readFile(SEED_FILE, 'utf8')
const email = shared.match(/email:\s*'(root@[^']+)'/)[1]
const password = shared.match(/root:\s*'([^']+)'/)[1]

const res = await fetch('http://localhost:4000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'X-App-Id': APP_ID },
  body: JSON.stringify({ email, password, appId: APP_ID, device: { name: 'probe', type: 'desktop' } }),
})
if (!res.ok) throw new Error(`login ${res.status} ${await res.text()}`)
const { data } = await res.json()

const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const ctx = await browser.newContext({ viewport: { width: 1480, height: 920 } })
const origin = new URL(APP_URL).origin
await ctx.addCookies([
  { url: origin, name: 'accessToken', value: data.accessToken, sameSite: 'Lax' },
  { url: origin, name: 'refreshToken', value: data.refreshToken, sameSite: 'Lax' },
])
const page = await ctx.newPage()

function scan() {
  return page.evaluate(() => {
    // `u` and `ul` are native HTML elements; everything else matching /^u[a-z]/ is an
    // unresolved Nuxt UI component rendered as a custom element.
    const NATIVE = new Set(['u', 'ul'])
    const unresolved = new Map()
    for (const el of document.querySelectorAll('body *')) {
      const tag = el.tagName.toLowerCase()
      if (!/^u[a-z]/.test(tag) || NATIVE.has(tag)) continue
      unresolved.set(tag, (unresolved.get(tag) || 0) + 1)
    }
    const components = document.querySelector('#__nuxt')?.__vue_app__?._context?.components || {}
    return {
      tags: Object.fromEntries(unresolved),
      registered: ['UBadge', 'UIcon', 'UButton', 'USelectMenu', 'UTooltip', 'UPopover', 'UInput'].filter(n => n in components),
      icons: document.querySelectorAll('svg[class*="i-lucide"], span[class*="i-lucide"], svg[class*="i-simple-icons"]').length,
      textLen: (document.querySelector('#__nuxt')?.innerText || '').length,
    }
  })
}

let failed = false
for (const route of ROUTES) {
  await page.goto(APP_URL + route, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {})
  await page.waitForTimeout(3500)

  let report = await scan()

  if (OPEN_SELECT) {
    const trigger = page.locator('button', { hasText: /Auto|model|Select/i }).first()
    if (await trigger.count()) {
      await trigger.click().catch(() => {})
      await page.waitForTimeout(900)
      const open = await scan()
      report = { ...open, tags: { ...report.tags, ...open.tags }, icons: open.icons }
      const options = await page.evaluate(() => document.querySelectorAll('[role=option]').length)
      report.options = options
      await page.keyboard.press('Escape').catch(() => {})
    }
  }

  const tags = Object.keys(report.tags)
  const ok = tags.length === 0 && report.textLen > 0
  if (!ok) failed = true
  console.log(`${ok ? 'PASS' : 'FAIL'} ${route}  unresolved=[${tags.join(',') || 'none'}]  registered=[${report.registered.join(',')}]  icons=${report.icons}  text=${report.textLen}${report.options !== undefined ? `  options=${report.options}` : ''}`)
}

await browser.close()
process.exit(failed ? 1 : 0)
