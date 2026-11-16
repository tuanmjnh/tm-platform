// Walks an app's routes in a real browser and reports what a static gate cannot:
// console errors, failed network requests, unresolved custom elements, and
// whether each page actually painted content.
//
// usage: node smoke-app.mjs <appUrl> <appId> <routes,comma,separated> [--wait]
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire('D:/Applications/tm-studio/node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/package.json')
const { chromium } = require('D:/Applications/tm-studio/node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core')

const [appUrl, appId, routeList] = process.argv.slice(2)
if (!appUrl || !appId || !routeList) {
  throw new Error('usage: node smoke-app.mjs <appUrl> <appId> <routes>')
}
const routes = routeList.split(',').filter(Boolean)

const seed = readFileSync('D:/Applications/tm-hub/scripts/seed/shared.ts', 'utf8')
const email = seed.match(/email:\s*'(root@[^']+)'/)[1]
const password = seed.match(/root:\s*'([^']+)'/)[1]

const login = await fetch('http://localhost:4000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'X-App-Id': appId },
  body: JSON.stringify({ email, password, appId, device: { name: 'smoke', type: 'desktop' } })
})
if (!login.ok) throw new Error(`login ${login.status} ${await login.text()}`)
const { data } = await login.json()

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
})
const ctx = await browser.newContext({ viewport: { width: 1480, height: 920 } })
const origin = new URL(appUrl).origin
await ctx.addCookies([
  { url: origin, name: 'accessToken', value: data.accessToken, sameSite: 'Lax' },
  { url: origin, name: 'refreshToken', value: data.refreshToken, sameSite: 'Lax' }
])
const page = await ctx.newPage()

// Errors page-by-page, so one noisy route does not hide another.
let failed = 0
for (const route of routes) {
  const consoleErrors = []
  const pageErrors = []
  const badRequests = []

  const onConsole = m => { if (m.type() === 'error') consoleErrors.push(m.text()) }
  const onPageError = e => pageErrors.push(e.message)
  const onResponse = r => {
    const s = r.status()
    if (s >= 400 && !r.url().includes('/auth/refresh')) badRequests.push(`${s} ${r.url().replace(origin, '')}`)
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('response', onResponse)

  await page.goto(appUrl + route, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {})
  await page.waitForTimeout(3500)

  const probe = await page.evaluate(() => {
    const NATIVE = new Set(['u', 'ul'])
    const unresolved = new Set()
    for (const el of document.querySelectorAll('body *')) {
      const t = el.tagName.toLowerCase()
      if (/^u[a-z]/.test(t) && !NATIVE.has(t)) unresolved.add(t)
    }
    const nuxt = document.querySelector('#__nuxt')
    const text = nuxt?.innerText ?? ''
    const styled = [...document.querySelectorAll('[class]')].filter(el => el.className.trim()).length
    const errPage = /Internal Server Error|500/.test(text.slice(0, 200)) && text.length < 400
    return { unresolved: [...unresolved], textLen: text.length, styled, errPage, title: document.title }
  })

  page.off('console', onConsole)
  page.off('pageerror', onPageError)
  page.off('response', onResponse)

  const ok = probe.unresolved.length === 0
    && !probe.errPage
    && probe.textLen > 20
    && pageErrors.length === 0
    && consoleErrors.length === 0
  if (!ok) failed++

  console.log(`${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(34)} text=${String(probe.textLen).padEnd(6)} styled=${String(probe.styled).padEnd(4)} unresolved=[${probe.unresolved.join(',') || 'none'}]`)
  if (probe.errPage) console.log('        500 error page')
  for (const e of pageErrors.slice(0, 3)) console.log(`        pageerror: ${e.slice(0, 200)}`)
  for (const e of consoleErrors.slice(0, 3)) console.log(`        console: ${e.slice(0, 200)}`)
  // A failed asset or API call is a real signal; list it but only fail on 5xx.
  const fatal = badRequests.filter(r => /^5\d\d/.test(r))
  for (const r of badRequests.slice(0, 4)) console.log(`        ${fatal.includes(r) ? 'request' : 'request(info)'}: ${r}`)
  if (fatal.length) failed++
}

await browser.close()
console.log(failed ? `\n${failed} route(s) failed` : '\nall routes passed')
process.exit(failed ? 1 : 0)
