import assert from 'node:assert/strict'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { ModelSelect, providerIconFor, classifyFailure, classifyThrown, interpolate, createLabelResolver } from '../dist/index.js'

// @nuxt/ui is a peer dependency; these stand-ins reproduce the prop names the
// component passes so the assertions test our contract, not the theme.
const USelectMenu = {
  props: ['modelValue', 'items', 'loading', 'disabled', 'valueKey', 'labelKey', 'searchInput', 'placeholder', 'size', 'virtualize', 'ignoreFilter'],
  setup: (props, { attrs }) => () => h('div', {
    class: ['uselect', attrs.class],
    'data-items': JSON.stringify(props.items),
    'data-disabled': String(!!props.disabled),
    'data-placeholder': props.searchInput?.placeholder || props.placeholder || ''
  })
}

const UButton = {
  props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled'],
  setup: (props, { attrs }) => () => h('button', {
    class: ['ubutton', `ubutton-${props.color}`],
    'data-icon': props.icon || null,
    'data-disabled': String(!!props.disabled),
    'data-aria': attrs['aria-label'] || null
  })
}

const UIcon = {
  props: ['name'],
  setup: props => () => h('span', { class: ['uicon', props.name], 'data-icon': props.name })
}

// UPopover/UTooltip only matter for which branch renders; both expose content.
const makeSlotWrapper = name => ({
  name,
  setup: (_, { slots }) => () => h('div', { class: name.toLowerCase() }, [
    slots.default?.(),
    slots.content?.()
  ])
})

const render = async (props, extra = {}) => {
  const app = createSSRApp({ render: () => h(ModelSelect, props) })
  app.component('USelectMenu', USelectMenu)
  app.component('UButton', UButton)
  app.component('UIcon', UIcon)
  app.component('UPopover', makeSlotWrapper('UPopover'))
  app.component('UTooltip', makeSlotWrapper('UTooltip'))
  for (const [name, comp] of Object.entries(extra.components || {})) app.component(name, comp)
  return renderToString(app)
}

const models = [
  { connectionId: 'c1', connectionName: 'OpenAI prod', provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', isPrimary: true },
  { connectionId: 'c2', connectionName: 'Local', provider: 'ollama', modelId: 'llama3', displayName: 'Llama 3' }
]

// 1. Options carry the `connectionId:modelId` key every call site persists
{
  const html = await render({ modelValue: '', models })
  const match = html.match(/data-items="([^"]*)"/)
  assert.ok(match, 'select menu rendered')
  const items = JSON.parse(match[1].replace(/&quot;/g, '"'))
  assert.deepEqual(items.map(i => i.value), ['c1:gpt-4o', 'c2:llama3'])
  assert.deepEqual(items.map(i => i.label), ['GPT-4o', 'Llama 3'])
  // default icon map applies
  assert.equal(items[0].icon, 'i-simple-icons-openai')
  assert.equal(items[1].icon, 'i-simple-icons-ollama')
}

// 2. A selected model outside the search results still appears (no blank trigger)
{
  const html = await render({ modelValue: 'c2:llama3', models })
  const items = JSON.parse(html.match(/data-items="([^"]*)"/)[1].replace(/&quot;/g, '"'))
  assert.ok(items.some(i => i.value === 'c2:llama3'))
}

// 3. Labels are props: the placeholder and the check tooltip follow them
{
  const html = await render({
    modelValue: 'c1:gpt-4o',
    models,
    checkModel: async () => ({ ok: true, latencyMs: 12 }),
    labels: { placeholder: 'Chọn model', tooltip: 'Kiểm tra kết nối' }
  })
  assert.match(html, /data-placeholder="Chọn model"/)
  assert.match(html, /Kiểm tra kết nối/)
}

// 4. Without a transport the check button is not rendered at all
{
  const withTransport = await render({ modelValue: 'c1:gpt-4o', models, checkModel: async () => ({ ok: true }) })
  const without = await render({ modelValue: 'c1:gpt-4o', models })
  assert.match(withTransport, /i-lucide-activity/)
  assert.doesNotMatch(without, /i-lucide-activity/)
}

// 5. showCheck=false hides the button even when a transport exists
{
  const html = await render({ modelValue: 'c1:gpt-4o', models, showCheck: false, checkModel: async () => ({ ok: true }) })
  assert.doesNotMatch(html, /i-lucide-activity/)
}

// 6. A disabled or empty model list disables the select
{
  const empty = await render({ modelValue: '', models: [] })
  assert.match(empty, /data-disabled="true"/)
  const disabled = await render({ modelValue: '', models, disabled: true })
  assert.match(disabled, /data-disabled="true"/)
}

// 7. providerIcon overrides the built-in map without touching the component
{
  const html = await render({ modelValue: '', models, providerIcon: p => `custom-${p}` })
  const items = JSON.parse(html.match(/data-items="([^"]*)"/)[1].replace(/&quot;/g, '"'))
  assert.equal(items[0].icon, 'custom-openai')
  assert.equal(items[1].icon, 'custom-ollama')
}

// 8. The default icon map covers the providers the apps actually ship
{
  assert.equal(providerIconFor('OpenAI'), 'i-simple-icons-openai')
  assert.equal(providerIconFor('anthropic'), 'i-simple-icons-anthropic')
  assert.equal(providerIconFor('google-vertex'), 'i-simple-icons-google')
  assert.equal(providerIconFor('groq-cloud'), 'i-lucide-zap')
  assert.equal(providerIconFor('deepseek'), 'i-simple-icons-deepseek')
  assert.equal(providerIconFor('mistral'), 'i-simple-icons-mistralai')
  assert.equal(providerIconFor('ollama'), 'i-simple-icons-ollama')
  assert.equal(providerIconFor('openrouter'), 'i-simple-icons-openrouter')
  assert.equal(providerIconFor('nvidia'), 'i-simple-icons-nvidia')
  assert.equal(providerIconFor('amd_radeon'), 'i-simple-icons-amd')
  assert.equal(providerIconFor('github_models'), 'i-simple-icons-github')
  assert.equal(providerIconFor('freellmapi'), 'i-lucide-route')
  assert.equal(providerIconFor(''), 'i-lucide-bot')
  assert.equal(providerIconFor('mystery'), 'i-lucide-bot')
}

// 9. Failure classification is pure and covers the cases the dialog shows
{
  const labels = {
    quotaExceeded: 'Quota exceeded (HTTP 429)',
    quotaExceededHint: 'Check billing.',
    timeout: 'Request timed out',
    timeoutHint: 'Try again.',
    unauthorized: 'Unauthorized (HTTP {status})',
    unauthorizedHint: 'Invalid key.',
    notFound: 'Model not found (HTTP 404)',
    overloaded: 'Overloaded (HTTP {status})',
    unavailable: 'Check failed ({status})',
    genericError: 'No response.'
  }
  const label = createLabelResolver(labels)

  assert.equal(classifyFailure({ ok: false, status: 429 }, label).title, 'Quota exceeded (HTTP 429)')
  assert.equal(classifyFailure({ ok: false, reasonCode: 'quota_exceeded', status: 400 }, label).desc, 'Check billing.')
  assert.equal(classifyFailure({ ok: false, status: 504 }, label).title, 'Request timed out')
  assert.equal(classifyFailure({ ok: false, status: 401 }, label).title, 'Unauthorized (HTTP 401)')
  assert.equal(classifyFailure({ ok: false, reasonCode: 'invalid_key', status: 500 }, label).title, 'Unauthorized (HTTP 500)')
  assert.equal(classifyFailure({ ok: false, status: 404, error: 'no such model' }, label).desc, 'no such model')
  assert.equal(classifyFailure({ ok: false, status: 502 }, label).title, 'Overloaded (HTTP 502)')
  assert.equal(classifyFailure({ ok: false, status: 418 }, label).title, 'Check failed (418)')

  // A thrown transport error follows the same vocabulary
  assert.equal(classifyThrown({ statusCode: 429, message: 'rate limit' }, label).title, 'Quota exceeded (HTTP 429)')
  assert.equal(classifyThrown({ name: 'AbortError', message: 'aborted' }, label).title, 'Request timed out')
  assert.equal(classifyThrown({ statusCode: 500, message: 'socket hang up' }, label).desc, 'socket hang up')
  assert.equal(classifyThrown({ statusCode: 500, message: '' }, label).desc, 'No response.')

  // Placeholders interpolate and unknown names survive
  assert.equal(interpolate('HTTP {status}', { status: 503 }), 'HTTP 503')
  assert.equal(interpolate('a {x} b', {}), 'a {x} b')
  assert.equal(classifyFailure({ ok: false, reasonCode: 'timeout' }, label).raw, '')

  // A function label receives the values, so a host can call its own t()
  const fnLabel = createLabelResolver({
    available: ({ ms }) => `Reachable in ${ms}ms`,
    unauthorized: ({ status }) => `Denied ${status}`
  })
  assert.equal(fnLabel('available', { ms: 42 }), 'Reachable in 42ms')
  assert.equal(fnLabel('unauthorized', { status: 403 }), 'Denied 403')
  // Unset keys fall back to the built-in English copy
  assert.equal(fnLabel('timeout'), 'Request timed out (HTTP 408)')
}

// 10. A zero-model list still renders a placeholder-capable select
{
  const html = await render({ modelValue: '', models: [], labels: { placeholder: 'Pick' } })
  assert.match(html, /data-placeholder="Pick"/)
}

// 11. Shadowed rows never reach the picker, even as the selected value
{
  const shadowed = [
    { connectionId: 'app:local', connectionName: '127.0.0.1:11434', provider: 'nvidia', providerName: 'NVIDIA NIM', modelId: 'nemotron', displayName: 'Nemotron', source: 'app' },
    { connectionId: 'hub-key', connectionName: 'Hub NVIDIA', provider: 'nvidia', modelId: 'nemotron', displayName: 'Nemotron', source: 'hub', shadowed: true }
  ]
  const html = await render({ modelValue: 'hub-key:nemotron', models: shadowed })
  const items = JSON.parse(html.match(/data-items="([^"]*)"/)[1].replace(/&quot;/g, '"'))
  assert.deepEqual(items.map(i => i.value), ['app:local:nemotron'])
}

// 12. Duplicate providers get a secondary line; a cross-source provider gets a chip
{
  const dupes = [
    { connectionId: 'app:a', connectionName: '127.0.0.1:11434', provider: 'nvidia', providerName: 'NVIDIA NIM', modelId: 'nemotron', displayName: 'Nemotron', source: 'app' },
    { connectionId: 'hub-b', connectionName: 'NVIDIA cloud', provider: 'nvidia', providerName: 'NVIDIA NIM', modelId: 'llama-3.1', displayName: 'Llama 3.1', source: 'hub' },
    { connectionId: 'hub-c', connectionName: 'OpenAI prod', provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', source: 'hub' }
  ]
  const html = await render({ modelValue: '', models: dupes, labels: { sourceHub: 'HUB', sourceApp: 'APP' } })
  const items = JSON.parse(html.match(/data-items="([^"]*)"/)[1].replace(/&quot;/g, '"'))
  assert.equal(items[0].description, 'NVIDIA NIM · 127.0.0.1:11434')
  assert.equal(items[1].description, 'NVIDIA NIM · NVIDIA cloud')
  assert.equal(items[0].chip.text, 'APP')
  assert.equal(items[1].chip.text, 'HUB')
  // A provider with a single connection stays clean: no meta line, no chip
  assert.equal(items[2].description, undefined)
  assert.equal(items[2].chip, undefined)
}

console.log('ModelSelect tests passed')
