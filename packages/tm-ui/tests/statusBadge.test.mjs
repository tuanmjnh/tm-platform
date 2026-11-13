import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { StatusBadge } from '../dist/index.js'

// @nuxt/ui is a peer dependency, so the package is tested against minimal
// stand-ins that exercise the same prop contract instead of the real theme.
const UBadge = {
  props: ['label', 'color', 'icon', 'variant', 'size'],
  setup: props => () => h('span', {
    class: ['ubadge', `ubadge-${props.color}`, `ubadge-${props.variant}`, `ubadge-${props.size}`],
    'data-icon': props.icon || null
  }, props.label)
}

const UIcon = {
  props: ['name', 'class'],
  setup: props => () => h('span', {
    class: ['uicon', props.name, props.class],
    'data-icon': props.name
  })
}

const render = async props => {
  const app = createSSRApp({ render: () => h(StatusBadge, props) })
  app.component('UBadge', UBadge)
  app.component('UIcon', UIcon)
  return renderToString(app)
}

// 1. The label is forwarded, and the icon only when one is passed
{
  const html = await render({ label: 'Connected', color: 'success', icon: 'i-lucide-circle-check' })
  assert.match(html, /Connected/)
  assert.match(html, /i-lucide-circle-check/)
  assert.match(html, /ubadge-success/)
  assert.match(html, /ubadge-subtle/)

  const plain = await render({ label: 'No icon' })
  assert.match(plain, /No icon/)
  assert.doesNotMatch(plain, /data-icon/)
}

// 2. The tone map only drives the clickable button; a plain badge delegates
//    colour to UBadge, which is where the theme applies it.
{
  const button = await render({ label: 'Broken', color: 'error', clickable: true })
  assert.match(button, /text-error/)
  assert.match(button, /bg-error\/10/)
  assert.doesNotMatch(button, /red-500/)

  const badge = await render({ label: 'Broken', color: 'error' })
  assert.match(badge, /ubadge-error/)
  assert.doesNotMatch(badge, /red-500/)
}

// 2b. The clickable geometry matches the pill the apps already ship, so the
//     only visible change at a migrated call site is the colour source.
{
  const html = await render({ label: 'Active', clickable: true, color: 'success' })
  assert.match(html, /rounded-full/)
  assert.match(html, /active:scale-95/)
}

// 3. Every documented tone renders, so an unknown colour cannot silently blank out
{
  for (const color of ['success', 'neutral', 'warning', 'info', 'error', 'primary', 'secondary']) {
    const html = await render({ label: color, color, clickable: true })
    assert.match(html, /class="[^"]*(bg-|text-muted)/, `tone ${color} rendered no styling`)
  }
}

// 4. Clickable renders a real button, not a div
{
  const html = await render({ label: 'Retry', clickable: true })
  assert.match(html, /<button/)
  assert.match(html, /type="button"/)
}

// 5. loading disables the button and shows a spinner instead of the icon
{
  const html = await render({ label: 'Busy', clickable: true, loading: true, icon: 'i-lucide-refresh-cw' })
  assert.match(html, /<button[^>]*disabled/)
  assert.match(html, /animate-spin/)
  assert.doesNotMatch(html, /i-lucide-refresh-cw/)
}

// 6. disabled disables the button too
{
  const html = await render({ label: 'Off', clickable: true, disabled: true })
  assert.match(html, /<button[^>]*disabled/)
}

// 7. The clickable branch defaults to the neutral tone
{
  const html = await render({ label: 'Default' })
  assert.match(html, /ubadge-neutral/)
}

console.log('tm-ui tests passed')
