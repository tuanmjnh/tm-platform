import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/Applications'
const APPS = ['tm-hub', 'tm-tools', 'tm-studio']
const DIRS = ['base', 'admin', 'shared', 'gridlist']

const norm = s => s.replace(/\r\n/g, '\n')

const HARDCODED = /\b(bg|text|border|ring)-(gray|slate|zinc|white|black)(-\d{2,3})?(\/\d+)?\b/g
const TOKEN = /\b(bg|text|border|ring)-(default|elevated|muted|dimmed|highlighted|toned|inverted|primary|secondary|success|info|warning|error|accent)\b/g

function score(src) {
  const s = norm(src)
  return {
    lines: s.split('\n').length,
    hardcoded: (s.match(HARDCODED) || []).length,
    tokens: (s.match(TOKEN) || []).length,
    props: new Set([...s.matchAll(/^\s{2}([a-zA-Z]+)\??:/gm)].map(m => m[1])).size,
    emits: (s.match(/defineEmits/g) || []).length,
    slots: (s.match(/<slot\b/g) || []).length,
    aria: (s.match(/\baria-[a-z]+/g) || []).length,
    branches: (s.match(/\bv-if\b|\bv-else\b/g) || []).length
  }
}

const TARGETS = [
  'base/ResponsiveModal', 'base/ResponsiveSlideover', 'base/ConfirmModal',
  'base/Table', 'base/BentoCard', 'base/BentoGrid', 'base/AppBackdrop',
  'base/FormModal', 'base/SettingsPage', 'base/HeaderActions', 'base/PasswordInput',
  'base/SectionNav', 'admin/RowActions', 'admin/ViewModeToggle',
  'admin/FilterPopover', 'admin/EmptyState', 'gridlist/SwipeCard',
  'shared/HeTreeMenu', 'gridlist/Index'
]

for (const rel of TARGETS) {
  const found = []
  for (const app of APPS) {
    const p = path.join(ROOT, app, 'app/components', `${rel}.vue`)
    if (fs.existsSync(p)) found.push({ app, src: fs.readFileSync(p, 'utf8') })
  }
  if (!found.length) continue

  console.log(`\n${rel}`)
  const scored = found.map(f => ({ app: f.app, ...score(f.src) }))
  for (const s of scored) {
    console.log(`  ${s.app.padEnd(9)} ${String(s.lines).padStart(4)}L  tokens=${String(s.tokens).padStart(3)} hardcoded=${String(s.hardcoded).padStart(2)} props=${String(s.props).padStart(2)} slots=${s.slots} aria=${s.aria}`)
  }
  // Prefer tokens over hardcoded, then more props/slots/aria, then fewer lines.
  const ranked = [...scored].sort((a, b) =>
    (a.hardcoded - b.hardcoded) ||
    (b.tokens - a.tokens) ||
    (b.props + b.slots + b.aria - (a.props + a.slots + a.aria)) ||
    (a.lines - b.lines)
  )
  console.log(`  -> pick: ${ranked[0].app}`)
}
