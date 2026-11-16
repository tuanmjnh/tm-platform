// The utility panels are package code, so a green build proves nothing about
// whether they render. This asks the DOM: did each route draw its controls, and
// is any package tag left unresolved?
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire('D:/Applications/tm-studio/node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/package.json')
const { chromium } = require('D:/Applications/tm-studio/node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core')

const token = readFileSync('C:/Users/tuanmjnh/AppData/Local/Temp/hub-token.txt', 'utf8').trim()
const APP = process.env.APP_URL || 'http://localhost:4000'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
})
const ctx = await browser.newContext({ viewport: { width: 1480, height: 920 } })
await ctx.addCookies([{ url: APP, name: 'accessToken', value: token, sameSite: 'Lax' }])
const page = await ctx.newPage()

const routes = [
  { path: '/utilities/text', name: 'text panel', expect: () => ({ textareas: document.querySelectorAll('textarea').length, buttons: document.querySelectorAll('button').length }) },
  { path: '/utilities/encode', name: 'encode panel', expect: () => ({ textareas: document.querySelectorAll('textarea').length, buttons: document.querySelectorAll('button').length }) },
  { path: '/utilities/icons', name: 'icons panel', expect: () => ({ buttons: document.querySelectorAll('button').length, gridCells: document.querySelectorAll('button[title]').length }) },
  { path: '/utilities/random', name: 'random panel', expect: () => ({ buttons: document.querySelectorAll('button').length, sliders: document.querySelectorAll('[role=slider]').length }) }
]

let failed = 0
for (const r of routes) {
  await page.goto(APP + r.path, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {})
  await page.waitForTimeout(3000)

  const counts = await page.evaluate(r.expect)
  // Anything matching /^u[a-z]/ that is not the native u/ul tag means a Nuxt UI
  // primitive did not resolve — the failure mode the plugin exists to prevent.
  const unresolved = await page.evaluate(() => {
    const native = new Set(['u', 'ul'])
    const tags = new Set()
    for (const el of document.querySelectorAll('body *')) {
      const t = el.tagName.toLowerCase()
      if (/^u[a-z]/.test(t) && !native.has(t)) tags.add(t)
    }
    return [...tags]
  })

  const drew = Object.values(counts).some(v => v > 0)
  const ok = drew && unresolved.length === 0
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.path.padEnd(20)} ${JSON.stringify(counts)}  unresolved=[${unresolved.join(',') || 'none'}]`)
}

await browser.close()
process.exit(failed ? 1 : 0)
