// Emits thin app-side wrappers: each one imports the packaged component and
// supplies this app's translations, so call sites keep their existing names and
// the package keeps its no-i18n contract.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const appRoot = process.argv[2]
if (!appRoot) throw new Error('usage: node make-wrappers.mjs <app-root>')

const write = (relPath, content) => {
  writeFileSync(join(appRoot, relPath), content)
  console.log(`✓ ${relPath}`)
}

const slots = `    <template v-for="(_, name) in $slots" #[name]="data">
      <slot :name="name" v-bind="data ?? {}" />
    </template>`

// Plain pass-through: props and slots forwarded, no model, no i18n.
const plain = (sharedName, importName) => `<script setup lang="ts">
import { ${importName} as Tm${importName} } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Tm${importName} v-bind="$attrs">
${slots}
  </Tm${importName}>
</template>
`

write('app/components/base/BentoCard.vue', plain('base', 'BentoCard'))
write('app/components/base/BentoGrid.vue', plain('base', 'BentoGrid'))
write('app/components/base/AppBackdrop.vue', plain('base', 'AppBackdrop'))
write('app/components/admin/EmptyState.vue', plain('admin', 'EmptyState'))

write('app/components/admin/RowActions.vue', `<script setup lang="ts">
import { RowActions as TmRowActions } from '@tuanmjnh/tm-ui'
import type { DropdownMenuItem } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  items: DropdownMenuItem[][]
  align?: 'start' | 'center' | 'end'
}>(), {
  align: 'end'
})

const { t } = useI18n()
</script>

<template>
  <TmRowActions :items="items" :align="align" :label="t('common.actions')" v-bind="$attrs" />
</template>
`)

write('app/components/admin/FilterPopover.vue', `<script setup lang="ts">
import { FilterPopover as TmFilterPopover } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ popover?: boolean }>(), {
  popover: false
})

const { t } = useI18n()
</script>

<template>
  <TmFilterPopover :popover="popover" :label="t('common.filter')" v-bind="$attrs">
${slots}
  </TmFilterPopover>
</template>
`)

write('app/components/admin/ViewModeToggle.vue', `<script setup lang="ts">
import { ViewModeToggle as TmViewModeToggle } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

defineProps<{ modelValue?: 'list' | 'grid' }>()
const emit = defineEmits<{ 'update:modelValue': [('list' | 'grid')] }>()

const { t } = useI18n()
</script>

<template>
  <TmViewModeToggle :model-value="modelValue" :list-label="t('common.list')" :grid-label="t('common.grid')"
    v-bind="$attrs" @update:model-value="emit('update:modelValue', $event)" />
</template>
`)

write('app/components/base/PasswordInput.vue', `<script setup lang="ts">
import { PasswordInput as TmPasswordInput } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
  autocomplete?: string
}>(), {
  placeholder: '',
  size: 'md',
  ariaLabel: '',
  autocomplete: undefined
})

const { t } = useI18n()
</script>

<template>
  <TmPasswordInput v-model="model" :placeholder="placeholder" :size="size" :aria-label="ariaLabel"
    :autocomplete="autocomplete" :show-label="t('auth.showPassword')" :hide-label="t('auth.hidePassword')"
    v-bind="$attrs" />
</template>
`)

write('app/components/base/SectionNav.vue', `<script setup lang="ts">
import { SectionNav as TmSectionNav } from '@tuanmjnh/tm-ui'
import type { NavigationMenuItem } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })

defineProps<{ items: NavigationMenuItem[] }>()

const { t } = useI18n()
</script>

<template>
  <TmSectionNav :items="items" :aria-label="t('common.navigation')" v-bind="$attrs">
${slots}
  </TmSectionNav>
</template>
`)

write('app/components/base/ConfirmModal.vue', `<script setup lang="ts">
import { ConfirmModal as TmConfirmModal } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  color?: 'primary' | 'neutral' | 'error' | 'warning' | 'success'
  confirmLabel?: string
  cancelLabel?: string
  confirmIcon?: string
  loading?: boolean
}>(), {
  title: '',
  description: '',
  icon: 'i-lucide-alert-triangle',
  color: 'error',
  confirmLabel: '',
  cancelLabel: '',
  confirmIcon: '',
  loading: false
})

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { t } = useI18n()
</script>

<template>
  <TmConfirmModal v-model:open="open" :title="title" :description="description" :icon="icon" :color="color"
    :confirm-icon="confirmIcon" :loading="loading" :cancel-label="cancelLabel || t('global.cancel')"
    :confirm-label="confirmLabel || t('global.confirm')" v-bind="$attrs" @confirm="emit('confirm')"
    @cancel="emit('cancel')">
${slots}
  </TmConfirmModal>
</template>
`)

write('app/components/base/FormModal.vue', `<script setup lang="ts">
import { FormModal as TmFormModal } from '@tuanmjnh/tm-ui'
import type { FormSubmitEvent } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })

defineProps<{
  title: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
  state: Record<string, unknown>
  loading?: boolean
  submitLabel?: string
  cancelLabel?: string
  ui?: Record<string, unknown>
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  submit: [event: FormSubmitEvent<Record<string, unknown>>]
  cancel: []
}>()

const { t } = useI18n()
</script>

<template>
  <TmFormModal v-model:open="open" :title="title" :description="description" :schema="schema" :state="state"
    :loading="loading" :ui="ui" :cancel-label="cancelLabel || t('global.cancel')"
    :submit-label="submitLabel || t('global.save')" v-bind="$attrs" @submit="emit('submit', $event)"
    @cancel="emit('cancel')">
${slots}
  </TmFormModal>
</template>
`)

write('app/components/base/ResponsiveModal.vue', `<script setup lang="ts">
import { ResponsiveModal as TmResponsiveModal } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: boolean
  open?: boolean
  title?: string
  description?: string
  modal?: boolean
  fullscreen?: boolean
  loading?: boolean
  disabled?: boolean
  dismissible?: boolean
  close?: boolean
  icon?: string
  ui?: { title?: string, description?: string, [key: string]: unknown }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue' | 'update:open', value: boolean): void
  (e: 'close'): void
}>()

const { t } = useI18n()
</script>

<template>
  <TmResponsiveModal :model-value="modelValue" :open="open" :title="title" :description="description" :modal="modal"
    :fullscreen="fullscreen" :loading="loading" :disabled="disabled" :dismissible="dismissible" :close="close"
    :icon="icon" :ui="ui" :back-label="t('common.back')" v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)" @update:open="emit('update:open', $event)"
    @close="emit('close')">
${slots}
  </TmResponsiveModal>
</template>
`)

write('app/components/base/ResponsiveSlideover.vue', `<script setup lang="ts">
import { ResponsiveSlideover as TmResponsiveSlideover } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: boolean
  open?: boolean
  title?: string
  description?: string
  loading?: boolean
  disabled?: boolean
  dismissible?: boolean
  close?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  icon?: string
  ui?: { title?: string, description?: string, [key: string]: unknown }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue' | 'update:open', value: boolean): void
  (e: 'close'): void
}>()

const { t } = useI18n()
</script>

<template>
  <TmResponsiveSlideover :model-value="modelValue" :open="open" :title="title" :description="description"
    :loading="loading" :disabled="disabled" :dismissible="dismissible" :close="close" :side="side" :icon="icon"
    :ui="ui" :back-label="t('common.back')" v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)" @update:open="emit('update:open', $event)"
    @close="emit('close')">
${slots}
  </TmResponsiveSlideover>
</template>
`)

write('app/components/base/Table.vue', `<script setup lang="ts" generic="T">
import { Table as TmTable } from '@tuanmjnh/tm-ui'
import type { TableColumn } from '@nuxt/ui'

defineOptions({ inheritAttrs: false })

defineProps<{
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  total?: number
  pageSize?: number
  page?: number
  styled?: boolean
  ui?: Record<string, unknown>
}>()

const emit = defineEmits<{ 'update:page': [page: number] }>()

const { t } = useI18n()
</script>

<template>
  <TmTable :data="data" :columns="columns" :loading="loading" :total="total" :page-size="pageSize" :page="page"
    :styled="styled" :ui="ui" :showing-template="t('global.showingCount')" v-bind="$attrs"
    @update:page="emit('update:page', $event)">
${slots}
  </TmTable>
</template>
`)

write('app/components/base/HeaderActions.vue', `<script setup lang="ts">
import { HeaderActions as TmHeaderActions } from '@tuanmjnh/tm-ui'
import type { HeaderAction } from '@tuanmjnh/tm-ui'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  actions: HeaderAction[]
  maxInline?: number
}>(), {
  maxInline: 3
})

const { t } = useI18n()

export type { HeaderAction }
</script>

<template>
  <TmHeaderActions :actions="actions" :max-inline="maxInline" :more-label="t('common.more')" v-bind="$attrs" />
</template>
`)
