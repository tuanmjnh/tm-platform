import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/Applications'
const APPS = ['tm-hub', 'tm-tools', 'tm-studio']

const TARGETS = [
  'base/Page.vue', 'base/ResponsiveModal.vue', 'base/ResponsiveSlideover.vue',
  'base/ConfirmModal.vue', 'base/FormModal.vue', 'base/Table.vue',
  'base/HeaderActions.vue', 'base/PasswordInput.vue', 'base/SectionNav.vue',
  'base/SettingsPage.vue', 'base/BentoCard.vue', 'base/BentoGrid.vue',
  'base/AppBackdrop.vue', 'admin/RowActions.vue', 'admin/ViewModeToggle.vue',
  'admin/FilterPopover.vue', 'admin/EmptyState.vue', 'gridlist/Index.vue',
  'gridlist/SwipeCard.vue', 'shared/ListFooter.vue', 'shared/HeTreeMenu.vue'
]

const findComponent = (app, name) => {
  const dirs = ['base', 'admin', 'shared', 'gridlist', 'table', 'dashboard', 'media', 'inputs', 'docs', 'inbox', 'editor', 'chat', 'logs', 'home', 'ui']
  for (const d of dirs) {
    const p = path.join(ROOT, app, 'app/components', d, `${name}.vue`)
    if (fs.existsSync(p)) return p
  }
  return null
}

const findComposable = (app, name) => {
  const p = path.join(ROOT, app, 'app/composables', `${name}.ts`)
  return fs.existsSync(p) ? p : null
}

// local (non-Nuxt-UI) dependencies of a component, one level deep
function directDeps(file) {
  const src = fs.readFileSync(file, 'utf8')
  const deps = new Set()
  for (const m of src.matchAll(/import\s+(?:type\s+)?[^'"]*from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    if (/^\.\.?\//.test(spec) || spec.startsWith('~/') || spec.startsWith('@/')) {
      const base = path.basename(spec).replace(/\.vue$/, '')
      deps.add(base)
    }
  }
  // Components rendered without an import resolve via auto-import
  for (const m of src.matchAll(/<(Lazy)?([A-Z][A-Za-z0-9]+)/g)) {
    const name = m[2]
    if (/^(U|Dashboard|Icon)/.test(name)) continue
    if (['ComponentPublicInstance', 'HTMLElement', 'Record', 'Props', 'TData', 'TNode', 'Sortable', 'Teleport'].includes(name)) continue
    deps.add(name)
  }
  return [...deps]
}

// closure: everything that would also have to move
function closure(app, startFile) {
  const seen = new Set()
  const queue = [startFile]
  const missing = []

  while (queue.length) {
    const file = queue.pop()
    const key = file.split(path.sep).join('/')
    if (seen.has(key)) continue
    seen.add(key)

    for (const dep of directDeps(file)) {
      if (dep === path.basename(file).replace(/\.vue$/, '')) continue
      const comp = findComponent(app, dep)
      if (comp) { queue.push(comp); continue }
      const compo = findComposable(app, dep)
      if (compo) { queue.push(compo); continue }
      missing.push(dep)
    }
  }

  return {
    files: [...seen],
    external: [...new Set(missing)]
  }
}

console.log('Dependency closure per target (tm-hub is the superset base):\n')
for (const rel of TARGETS) {
  const file = path.join(ROOT, 'tm-hub/app/components', rel)
  if (!fs.existsSync(file)) { console.log(`?? ${rel} — not in tm-hub`); continue }
  const { files, external } = closure('tm-hub', file)
  const others = files.filter(f => f !== file.split(path.sep).join('/') && f.endsWith('.vue'))
  const composables = files.filter(f => f.endsWith('.ts'))
  console.log(`${rel}`)
  console.log(`   also needs: ${[...others, ...composables].map(f => path.basename(f)).join(', ') || 'nothing'}`)
  if (external.length) console.log(`   unresolved (app-level): ${external.join(', ')}`)
}
