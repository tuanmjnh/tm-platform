import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// A non-semantic element can be a click target, but it only reaches a keyboard
// when it is focusable and handles Enter/Space itself. The consuming app guards
// its own rows; the rows that ship from this package are guarded here, in the
// repository that owns the files, because an app's checkout has no copy of them.

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'src')

const CLICKABLE = /<(div|li|span|td|tr|p)\b((?:[^>"']|"[^"]*"|'[^']*')*?)>/g

function components(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) components(full, acc)
    else if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

const rows = []
for (const file of components(src)) {
  const rel = file.slice(src.length + 1).split('\\').join('/')
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(CLICKABLE)) {
    const attrs = match[2] ?? ''
    const click = attrs.match(/@click(?:\.\w+)*\s*=\s*"([^"]*)"/)
    if (!click) continue
    const expr = click[1].trim()
    // Bare @click.stop/@click.prevent only name the event; they are not targets.
    if (/^(?:stop|prevent)(?:\.(?:stop|prevent))*$/.test(expr)) continue
    rows.push({
      rel,
      line: text.slice(0, match.index).split('\n').length,
      tag: match[1],
      expr,
      attrs,
      tabindex: /\btabindex\s*=/.test(attrs),
      keydown: /@keydown\.(?:enter|space)/.test(attrs),
      keydownSelf: /@keydown\.(?:enter|space)\.self|@keydown\.self/.test(attrs)
    })
  }
}

const gaps = rows
  .filter(r => !(r.tabindex && r.keydown))
  .map(r => `${r.rel}:${r.line} <${r.tag}> (${r.expr})`)

assert.deepEqual(
  gaps,
  [],
  `a clickable row in this package must be focusable and handle Enter/Space:\n${gaps.join('\n')}`
)

// A row whose slot can hold a button must scope the key handler to itself, or
// an Enter on the inner button would also fire the row action. SwipeCard's slot
// is the case here; a new nested-control row has to be listed on purpose.
const SELF_REQUIRED = new Set(['gridlist/SwipeCard.vue::handleContentClick'])

const unscoped = rows
  .filter(r => SELF_REQUIRED.has(`${r.rel}::${r.expr}`) && !r.keydownSelf)
  .map(r => `${r.rel}:${r.line} <${r.tag}> (${r.expr})`)

assert.deepEqual(
  unscoped,
  [],
  `use @keydown.enter.self so an inner button keeps its own Enter:\n${unscoped.join('\n')}`
)

assert.ok(
  rows.length >= 4,
  `expected at least the four known rows (GridList, SwipeCard, HeTreeMenu x2), found ${rows.length}`
)

console.log(`keyboard guard: ${rows.length} clickable rows wired across ${components(src).length} components`)
