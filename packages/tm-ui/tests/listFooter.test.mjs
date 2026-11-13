import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { ListFooter } from '../dist/index.js'

// UIcon is a peer-supplied component; a minimal stand-in is enough to prove the
// footer asks for the right icon in each state.
const UIcon = {
  props: ['name'],
  setup: (props, { attrs }) => () => h('span', {
    class: ['uicon', props.name, attrs.class],
    'data-icon': props.name
  })
}

const render = async (props, slots) => {
  const app = createSSRApp({
    render: () => h(ListFooter, props, slots)
  })
  app.component('UIcon', UIcon)
  return renderToString(app)
}

// 1. The count is rendered, with a trailing + while more pages exist
{
  const plain = await render({ count: 7 })
  assert.match(plain, /7/)
  assert.match(plain, /Record\(s\)/)

  const more = await render({ count: 7, hasMore: true })
  assert.match(more, /7\+/)
}

// 2. Labels are props, not hardcoded copy, so the app supplies translations
{
  const html = await render({
    count: 3,
    loading: true,
    recordsLabel: 'Bản ghi',
    loadingLabel: 'Đang tải...',
    noMoreLabel: 'Đã tải hết'
  })
  assert.match(html, /Bản ghi/)
  assert.match(html, /Đang tải\.\.\./)
}

// 3. Loading shows a spinner and never the no-more line
{
  const html = await render({ count: 3, loading: true, showNoMore: true })
  assert.match(html, /animate-spin/)
  assert.match(html, /i-lucide-loader-2/)
  assert.doesNotMatch(html, /i-lucide-check-circle-2/)
}

// 4. No-more only appears with showNoMore, a finished list and a non-zero count
{
  const shown = await render({ count: 2, showNoMore: true })
  assert.match(shown, /i-lucide-check-circle-2/)
  assert.match(shown, /No more data/)

  const noProp = await render({ count: 2 })
  assert.doesNotMatch(noProp, /i-lucide-check-circle-2/)

  const empty = await render({ count: 0, showNoMore: true })
  assert.doesNotMatch(empty, /i-lucide-check-circle-2/)

  const stillMore = await render({ count: 2, hasMore: true, showNoMore: true })
  assert.doesNotMatch(stillMore, /i-lucide-check-circle-2/)
}

// 5. Both slots render where the call sites put their filters and actions
{
  const html = await render({ count: 1 }, {
    left: () => h('span', { id: 'left-slot' }, 'left'),
    right: () => h('span', { id: 'right-slot' }, 'right')
  })
  assert.match(html, /id="left-slot"/)
  assert.match(html, /id="right-slot"/)
}

// 6. The footer keeps the row height the sidebars are aligned to
{
  const html = await render({ count: 1 })
  assert.match(html, /min-h-8/)
}

console.log('ListFooter tests passed')
