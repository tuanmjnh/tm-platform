<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useMobileBar, headerActionsToMobile, type MobileAction } from './mobileBar.js'
import type { HeaderAction } from './headerActions.js'
import HeaderActions from './HeaderActions.vue'
import ListFooter from './ListFooter.vue'
import ViewModeToggle from './ViewModeToggle.vue'

const props = withDefaults(defineProps<{
  id: string
  title: string
  description?: string
  navbarUi?: Record<string, unknown>
  flush?: boolean
  compact?: boolean
  /** Single action source for both desktop #right and the mobile bar. */
  actions?: HeaderAction[]
  /** Two-way search string. Providing it (even '') renders the toolbar search. */
  search?: string
  searchPlaceholder?: string
  /** Two-way list/grid mode. Providing it renders the toolbar view toggle. */
  viewMode?: 'list' | 'grid'
  /** Record count. Providing it renders the footer + registers mobile info. */
  count?: number
  hasMore?: boolean
  loading?: boolean
  /** Refresh handler — added to the overflow ⋯, never a standalone button. */
  refresh?: () => unknown
  labels?: {
    search?: string
    refresh?: string
    actions?: string
    list?: string
    grid?: string
    records?: string
    loading?: string
    noMore?: string
  }
}>(), {
  actions: undefined,
  search: undefined,
  searchPlaceholder: undefined,
  viewMode: undefined,
  count: undefined,
  hasMore: false,
  loading: false,
  refresh: undefined,
  labels: () => ({})
})

const emit = defineEmits<{
  'update:search': [value: string]
  'update:viewMode': [value: 'list' | 'grid']
}>()

const slots = useSlots()
const mobileBar = useMobileBar()

const panelUi = computed(() => {
  const ui: Record<string, string> = { root: 'min-h-full' }
  if (props.flush) ui.body = 'p-0 sm:p-0 gap-0 sm:gap-0'
  else if (props.compact) ui.body = 'p-2 sm:p-3'
  return ui
})

const mobileActions = computed<MobileAction[]>(() => {
  const list = props.actions ? headerActionsToMobile(props.actions) : []
  if (props.refresh) {
    list.push({
      icon: 'i-lucide-refresh-cw',
      label: props.labels.refresh ?? 'Refresh',
      disabled: props.loading,
      onSelect: () => props.refresh?.()
    })
  }
  return list
})

// Opt-in: only register when the page drives chrome through props. Pages that
// register manually (no actions/refresh/count props) keep their own wiring.
if (props.actions || props.refresh) {
  mobileBar.registerActions(mobileActions)
}
if (props.count !== undefined) {
  mobileBar.registerInfo(computed(() => ({
    count: props.count,
    hasMore: props.hasMore,
    loading: props.loading
  })))
}

const hasToolbar = computed(() =>
  props.search !== undefined
  || props.viewMode !== undefined
  || !!slots.filters
  || !!slots['toolbar-left']
  || !!slots['toolbar-right']
)

const hasFooter = computed(() =>
  props.count !== undefined
  || !!slots.footer
  || !!slots['footer-left']
  || !!slots['footer-right']
)
</script>

<template>
  <UDashboardPanel :id="id" :ui="panelUi">
    <template #header>
      <div class="shrink-0 tm-chrome-glass">
        <UDashboardNavbar :title="title" :toggle="false" class="border-b border-default/70"
          :ui="{ title: description ? 'flex flex-col items-start justify-center gap-px h-full truncate' : undefined, ...navbarUi }">
          <template v-if="description" #title>
            <span class="truncate">{{ title }}</span>
            <span class="truncate text-xs font-normal text-muted">{{ description }}</span>
          </template>
          <template #leading>
            <slot name="leading">
              <UDashboardSidebarCollapse class="hidden lg:inline-flex" />
            </slot>
          </template>
          <template v-if="$slots.left" #left>
            <slot name="left" />
          </template>
          <template #right>
            <div class="hidden lg:flex items-center gap-2">
              <!-- Pages without their own #right get the unified registered actions. -->
              <slot name="right">
                <HeaderActions v-if="actions?.length" :actions="actions" :more-label="labels.actions" />
              </slot>
              <!-- App chrome (bell, settings) is injected here so the package owns no auth state. -->
              <slot name="chrome" />
            </div>
          </template>
        </UDashboardNavbar>

        <slot name="toolbar">
          <UDashboardToolbar v-if="hasToolbar">
            <template #left>
              <div class="flex items-center gap-2 w-full min-w-0 sm:w-auto">
                <UInput v-if="search !== undefined" :model-value="search" icon="i-lucide-search"
                  :placeholder="searchPlaceholder || labels.search || 'Search'" size="sm"
                  class="flex-1 min-w-0 sm:flex-none sm:w-64" @update:model-value="emit('update:search', $event)" />
                <slot name="filters" />
                <slot name="toolbar-left" />
              </div>
            </template>
            <template #right>
              <ViewModeToggle v-if="viewMode !== undefined" :model-value="viewMode" :list-label="labels.list"
                :grid-label="labels.grid" @update:model-value="emit('update:viewMode', $event)" />
              <slot name="toolbar-right" />
            </template>
          </UDashboardToolbar>
        </slot>
      </div>
    </template>

    <template #body>
      <div class="flex-1 min-h-0 flex flex-col">
        <slot />
      </div>
    </template>

    <template #footer>
      <div v-if="hasFooter"
        class="hidden sm:block shrink-0 border-t border-default/70 tm-chrome-overlay px-4 sm:px-6 py-1 z-10 empty:hidden">
        <slot name="footer">
          <ListFooter :count="count" :has-more="hasMore" :loading="loading"
            :records-label="labels.records" :loading-label="labels.loading" :no-more-label="labels.noMore">
            <template #left>
              <slot name="footer-left" />
            </template>
            <template #right>
              <slot name="footer-right" />
            </template>
          </ListFooter>
        </slot>
      </div>
    </template>
  </UDashboardPanel>
</template>
