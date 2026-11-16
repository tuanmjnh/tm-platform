import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  ConfirmModal,
  EmptyState,
  FilterPopover,
  HeaderActions,
  PasswordInput,
  Table,
  ViewModeToggle,
  mobileActionLayout,
  UtilitiesRandomPanel,
  UtilitiesToolTabs,
  UtilitiesTextPane
} from '../dist/index.js'

// Peer primitives are stubbed so the assertions are about this package's
// contract (which prop reaches the primitive), not about Nuxt UI's internals.
const kebab = key => key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)

const passthrough = (tag, inherit = ['label', 'icon', 'aria-label', 'aria-pressed', 'ariaLabel', 'ariaPressed', 'type', 'modelValue', 'model-value', 'indeterminate', 'items', 'data', 'columns', 'total', 'itemsPerPage']) => ({
  inheritAttrs: false,
  props: inherit,
  setup: (props, { attrs, slots }) => () => {
    // Declared props are rendered as kebab-case attributes too, so an assertion
    // on `aria-label` sees what the browser would.
    const declared = Object.fromEntries(
      Object.entries(props).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [kebab(k), String(v)])
    )
    return h(
      tag,
      { ...declared, ...attrs, 'data-props': JSON.stringify(props) },
      Object.entries(slots).map(([name, slot]) => h('div', { 'data-slot': name }, slot?.()))
    )
  }
})

const stubs = {
  UModal: passthrough('div'),
  UButton: passthrough('button'),
  UIcon: passthrough('i'),
  // A div, not an <input>: input is a void tag, so SSR discards its slot children
  // and the trailing #trailing slot would vanish from the output.
  UInput: passthrough('div'),
  UDropdownMenu: passthrough('div'),
  UFieldGroup: passthrough('div'),
  UPopover: passthrough('div'),
  UTable: passthrough('div'),
  UPagination: passthrough('nav'),
  UTabs: passthrough('div'),
  USlider: passthrough('div'),
  UCheckbox: passthrough('div'),
  UBadge: passthrough('span')
}

const mount = async (component, props, slots) => {
  const app = createSSRApp({ render: () => h(component, props, slots) })
  for (const [name, stub] of Object.entries(stubs)) app.component(name, stub)
  return renderToString(app)
}

// 1. Localised labels arrive as props — no i18n inside the package
{
  const html = await mount(ConfirmModal, {
    open: true,
    title: 'Delete app',
    description: 'This cannot be undone',
    confirmLabel: 'Xoá',
    cancelLabel: 'Huỷ'
  })
  assert.match(html, /Xoá/)
  assert.match(html, /Huỷ/)
  assert.doesNotMatch(html, /Confirm/)
  assert.doesNotMatch(html, /Cancel/)
}

// 2. Label defaults keep a component usable without a wrapper
{
  const html = await mount(ConfirmModal, { open: true, title: 'x', description: 'y' })
  assert.match(html, /Confirm/)
  assert.match(html, /Cancel/)
}

// 3. ViewModeToggle exposes translated aria labels and pressed state
{
  const html = await mount(ViewModeToggle, { modelValue: 'grid', listLabel: 'Danh sách', gridLabel: 'Lưới' })
  assert.match(html, /Danh sách/)
  assert.match(html, /Lưới/)
  assert.match(html, /aria-pressed/)
}

// 4. PasswordInput forwards the toggle label and never hardcodes one
{
  const html = await mount(PasswordInput, { showLabel: 'Hiện mật khẩu', hideLabel: 'Ẩn mật khẩu' })
  assert.match(html, /Hiện mật khẩu/)
  assert.doesNotMatch(html, /Show password/)
}

// 5. Table renders the footer summary from a template rather than t()
{
  const html = await mount(Table, {
    data: [{ id: 1 }, { id: 2 }],
    columns: [{ accessorKey: 'id', header: 'ID' }],
    total: 40,
    showingTemplate: 'Hiển thị {count}/{total}'
  })
  assert.match(html, /Hiển thị 2\/40/)
}

// 6. FilterPopover takes its accessible name from a prop
{
  const html = await mount(FilterPopover, { popover: true, label: 'Bộ lọc' })
  assert.match(html, /Bộ lọc/)
}

// 7. EmptyState actions render as given
{
  const html = await mount(EmptyState, {
    title: 'Chưa có dữ liệu',
    description: 'Tạo mục đầu tiên',
    actions: [{ label: 'Tạo mới' }]
  })
  assert.match(html, /Chưa có dữ liệu/)
  assert.match(html, /Tạo mới/)
}

// 8. HeaderActions splits primary/secondary/overflow by the documented rule
{
  const html = await mount(HeaderActions, {
    moreLabel: 'Thêm',
    actions: [
      { key: 'add', icon: 'i-lucide-plus', label: 'Thêm', primary: true },
      { key: 'export', icon: 'i-lucide-download', label: 'Xuất' }
    ]
  })
  assert.match(html, /Thêm/)
  assert.match(html, /Xuất/)
}

// 9. mobileActionLayout keeps every non-primary action in the overflow
{
  const layout = mobileActionLayout([
    { icon: 'a', label: 'Add', primary: true },
    { icon: 'b', label: 'Export', children: [{ label: 'CSV' }] },
    { icon: 'c', label: 'Refresh' }
  ])
  assert.deepEqual(layout.inline.map(a => a.label), ['Add'])
  assert.deepEqual(layout.overflow.map(a => a.label), ['Export', 'Refresh'])
  assert.equal(layout.overflow[0].children[0].label, 'CSV')
}

// 10. Progressive disclosure: an action with children can never inline
{
  const layout = mobileActionLayout([{ icon: 'x', label: 'Export', primary: true, children: [{ label: 'CSV' }] }])
  assert.equal(layout.inline.length, 0)
  assert.equal(layout.overflow.length, 1)
}

// 11. Utility panels translate through the `t` prop, not useI18n
{
  const t = key => `T:${key}`
  const html = await mount(UtilitiesRandomPanel, { t })
  assert.match(html, /T:utilities\.random\.types\.password/, 'the panel asks the host for its text')
  assert.match(html, /T:utilities\.random\.generate/, 'and for every label it renders')
}

// 12. UtilitiesToolTabs renders host-supplied items as tabs
{
  const html = await mount(UtilitiesToolTabs, {
    active: 'text',
    items: [
      { label: 'Văn bản', value: 'text', icon: 'i-lucide-type' },
      { label: 'Mã hoá', value: 'encode', icon: 'i-lucide-lock' }
    ]
  })
  assert.match(html, /Văn bản/, 'tab labels come from the host')
  assert.match(html, /Mã hoá/, 'and are not hard-coded in the package')
}

// 13. UtilitiesTextPane counts characters from the value it was given
{
  const html = await mount(UtilitiesTextPane, {
    t: key => key,
    label: 'Input',
    modelValue: 'hello world'
  })
  assert.match(html, /11/, 'the character count is the value length')
  assert.match(html, /Input/, 'the label renders')
}

console.log('base components tests passed')
