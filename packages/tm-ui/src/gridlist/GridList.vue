<script setup lang="ts" generic="T extends object">
import { computed, onMounted, onUnmounted, ref, useSlots, watch } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import Sortable, { type SortableEvent } from 'sortablejs'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { GridColumn, GridListLabels, GridSwipeAction } from './types/GridList'
import { useAdminGridView } from './gridView.js'
import SwipeCard from './SwipeCard.vue'

/**
 * Hybrid list/table: rows that stay column-aligned on desktop and become cards
 * below `lg`. Supports sortable headers, swipe actions, selection, drag reorder,
 * context menus, infinite scroll and per-column slots.
 */
const props = withDefaults(defineProps<{
  items: T[]
  columns: GridColumn[]
  loading?: boolean
  selected?: T[]
  itemKey?: string
  selectable?: boolean
  actionOptions?: (item: T) => DropdownMenuItem[] | DropdownMenuItem[][]
  swipeLeftActions?: (item: T) => GridSwipeAction<T>[]
  swipeRightActions?: (item: T) => GridSwipeAction<T>[]
  mobileActionMode?: 'swipe' | 'dropdown' | 'context'
  viewMode?: 'list' | 'grid'
  gridCols?: string
  skeletonCount?: number
  draggable?: boolean
  storageKey?: string
  hideHeader?: boolean
  uiScrollArea?: { root?: string, viewport?: string }
  actionsButtonVisibility?: 'always' | 'list' | 'grid' | 'never'
  canLoadMore?: boolean
  labels?: GridListLabels
}>(), {
  loading: false,
  selected: () => [],
  itemKey: undefined,
  selectable: false,
  actionOptions: undefined,
  swipeLeftActions: undefined,
  swipeRightActions: undefined,
  mobileActionMode: 'context',
  draggable: false,
  viewMode: 'list',
  gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  skeletonCount: 20,
  storageKey: undefined,
  hideHeader: false,
  uiScrollArea: undefined,
  actionsButtonVisibility: 'always',
  canLoadMore: true,
  labels: () => ({})
})

const emit = defineEmits<{
  'update:selected': [value: T[]]
  'update:viewMode': [value: 'list' | 'grid']
  'sort': [column: GridColumn]
  'click': [item: T]
  'refresh': []
  'load-more': []
  'update:items': [items: T[]]
}>()

const selectedItems = computed({
  get: () => props.selected ?? [],
  set: (val: T[]) => emit('update:selected', val)
})

const currentViewMode = computed({
  get: () => props.viewMode ?? 'list',
  set: (val: 'list' | 'grid') => emit('update:viewMode', val)
})

// Empty storageKey means "do not persist" — otherwise every list on the app
// would share one preference and stomp each other.
const { viewMode: storedView } = useAdminGridView(props.storageKey || 'default', props.viewMode ?? 'list')
if (props.storageKey && props.viewMode === undefined) {
  currentViewMode.value = storedView.value
}
watch(currentViewMode, (val) => {
  if (props.storageKey) storedView.value = val
})
watch(storedView, (val) => {
  if (props.storageKey && val) currentViewMode.value = val
})

const mergedUi = computed(() => {
  const defaults = {
    root: 'flex-1',
    viewport: 'h-full w-full rounded-[inherit] outline-none'
  }
  if (!props.uiScrollArea) return defaults
  return {
    ...defaults,
    ...props.uiScrollArea,
    root: [defaults.root, props.uiScrollArea.root].filter(Boolean).join(' '),
    viewport: [defaults.viewport, props.uiScrollArea.viewport].filter(Boolean).join(' ')
  }
})

const scrollEl = ref<{ $el?: HTMLElement } | null>(null)
const scrollTarget = computed<HTMLElement | undefined>(() => {
  const root = scrollEl.value?.$el
  return root?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') || root
})

useInfiniteScroll(scrollTarget, () => {
  if (!props.loading && props.canLoadMore) emit('load-more')
}, { distance: 10 })

const openCardId = ref<string | number | null>(null)

const isAllSelected = computed(() => props.items.length > 0 && selectedItems.value.length === props.items.length)
const isIndeterminate = computed(() => selectedItems.value.length > 0 && selectedItems.value.length < props.items.length)

const toggleAll = (val: boolean | 'indeterminate') => {
  selectedItems.value = val === true ? [...props.items] : []
}

const fieldValue = (item: T, key: string): unknown => (item as Record<string, unknown>)[key]
const itemId = (item: T): string | number => fieldValue(item, props.itemKey || '_id') as string | number

const toggleSelect = (item: T, val: boolean | 'indeterminate') => {
  const key = props.itemKey || '_id'
  const id = fieldValue(item, key)
  if (val === true) {
    if (!selectedItems.value.find(i => fieldValue(i, key) === id)) {
      selectedItems.value = [...selectedItems.value, item]
    }
  } else {
    selectedItems.value = selectedItems.value.filter(i => fieldValue(i, key) !== id)
  }
}

const isSelected = (item: T) => {
  const key = props.itemKey || '_id'
  return !!selectedItems.value.find(i => fieldValue(i, key) === fieldValue(item, key))
}

const dragEl = ref<HTMLElement | null>(null)
const isDraggable = computed(() => props.draggable)
const sortableInstance = ref<Sortable | null>(null)

const initSortable = () => {
  if (sortableInstance.value) return
  if (!isDraggable.value || !dragEl.value) return

  sortableInstance.value = new Sortable(dragEl.value, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    fallbackClass: 'sortable-fallback',
    forceFallback: true,
    swapThreshold: 0.65,
    onUpdate: (evt: SortableEvent) => {
      const from = evt.oldIndex ?? -1
      const to = evt.newIndex ?? -1
      if (from < 0 || to < 0) return
      const newItems = [...props.items]
      const [moved] = newItems.splice(from, 1)
      if (!moved) return
      newItems.splice(to, 0, moved)
      emit('update:items', newItems)
    }
  })
}

const destroySortable = () => {
  sortableInstance.value?.destroy()
  sortableInstance.value = null
}

onMounted(initSortable)
onUnmounted(destroySortable)

watch(() => [props.items.length, isDraggable.value, dragEl.value], () => {
  if (isDraggable.value && props.items.length > 0 && dragEl.value) initSortable()
  else if (!isDraggable.value) destroySortable()
}, { flush: 'post' })

const contextMenu = ref({
  isOpen: false,
  x: 0,
  y: 0,
  items: [] as DropdownMenuItem[] | DropdownMenuItem[][]
})

const handleContextMenu = (item: T, event: MouseEvent) => {
  if (!props.actionOptions) return
  contextMenu.value = { isOpen: true, x: event.clientX, y: event.clientY, items: props.actionOptions(item) }
}

const handleLongPress = (payload: { item: T, clientX: number, clientY: number }) => {
  if (!props.actionOptions) return
  contextMenu.value = { isOpen: true, x: payload.clientX, y: payload.clientY, items: props.actionOptions(payload.item) }
}

const slots = useSlots()

const showActions = computed(() => {
  if (props.actionsButtonVisibility === 'never') return false
  if (props.actionsButtonVisibility === 'list') return currentViewMode.value === 'list'
  if (props.actionsButtonVisibility === 'grid') return currentViewMode.value === 'grid'
  return true
})

const isActionCol = (key: string) => key === 'actions' || key === 'action'
const actionsCol = computed(() => props.columns.find(c => isActionCol(c.key)))
const displayColumns = computed(() => props.columns.filter(c => !isActionCol(c.key)))
const hasActions = computed(() =>
  showActions.value && (!!props.actionOptions || !!slots.actions || !!slots.action || !!actionsCol.value)
)

const actionsClass = computed(() => {
  if (actionsCol.value?.class?.split(' ').some(c => c.startsWith('w-') || c.startsWith('min-w-'))) {
    return actionsCol.value.class.includes('shrink-0') ? actionsCol.value.class : `${actionsCol.value.class} shrink-0`
  }
  if (slots.actions || slots.action) return 'w-24 shrink-0'
  return 'w-14 shrink-0'
})

const mo = computed(() => props.labels.more ?? 'More')
const emptyTitle = computed(() => props.labels.emptyTitle ?? 'No data')
const emptyDescription = computed(() => props.labels.emptyDescription ?? '')
const refreshLabel = computed(() => props.labels.refresh ?? 'Refresh')
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-transparent">
    <!-- Header: desktop list mode only -->
    <div
      v-if="currentViewMode === 'list' && !hideHeader"
      class="hidden lg:flex items-center pl-0.75 pr-3.25 py-3 mb-1 text-xs font-bold uppercase tracking-wider text-muted border-b border-default bg-transparent"
    >
      <div v-if="isDraggable" class="w-8 shrink-0" />

      <div v-if="selectable" class="w-8 shrink-0 flex items-center justify-center mr-2">
        <UCheckbox
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          :aria-label="labels.selectAll ?? 'Select all'"
          @update:model-value="toggleAll"
        />
      </div>

      <div
        v-for="col in displayColumns"
        :key="col.key"
        class="flex items-center min-w-0 px-2"
        :class="[
          (!col.class || !col.class.split(' ').some(c => c.startsWith('w-') || c.startsWith('flex-'))) ? 'flex-1' : '',
          col.class || '',
          col.headerClass || ''
        ]"
      >
        <div
          v-if="col.sortable"
          class="cursor-pointer select-none flex items-center hover:text-primary-500 transition-colors"
          role="button"
          tabindex="0"
          @click="emit('sort', col)"
          @keydown.enter.prevent="emit('sort', col)"
          @keydown.space.prevent="emit('sort', col)"
        >
          {{ col.label }}
          <UIcon
            :name="(col.sort === 'asc' || col.sort === 1) ? 'i-lucide-arrow-up-narrow-wide' : (col.sort === 'desc' || col.sort === -1) ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-down'"
            class="w-4 h-4 ml-1"
            :class="col.sort ? 'text-primary-500' : 'text-dimmed'"
          />
        </div>
        <span v-else>{{ col.label }}</span>
      </div>

      <div
        v-if="hasActions"
        class="shrink-0 flex items-center justify-end px-2"
        :class="[actionsClass, actionsCol?.headerClass || '']"
      >
        <span v-if="actionsCol?.label">{{ actionsCol.label }}</span>
      </div>
    </div>

    <UScrollArea ref="scrollEl" :ui="mergedUi">
      <!-- Loading: skeletons keep the row height so the shell does not jump -->
      <div
        v-if="loading && items.length === 0"
        :class="currentViewMode === 'list' ? 'space-y-3 pr-3 pl-0.5' : `grid ${gridCols} gap-4 pb-4 pr-3 pl-0.5`"
        class="w-full h-full"
      >
        <USkeleton
          v-for="i in skeletonCount"
          :key="i"
          :class="[currentViewMode === 'list' ? 'h-20' : 'h-48', 'w-full rounded-xl bg-muted/60']"
        />
      </div>

      <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-20 text-muted">
        <slot name="empty">
          <UEmpty
            size="xl"
            icon="i-lucide-package-open"
            :title="emptyTitle"
            :description="emptyDescription"
            :actions="[{ label: refreshLabel, onClick: () => emit('refresh'), variant: 'soft' }]"
          />
        </slot>
      </div>

      <div
        v-else
        ref="dragEl"
        :class="currentViewMode === 'list' ? 'space-y-2 pb-4 pr-3 pl-0.5' : `grid ${gridCols} gap-4 pb-4 pr-3 pl-0.5`"
      >
        <slot name="first-item" />
        <div v-for="item in items" :key="itemId(item)">
          <SwipeCard
            :id="itemId(item)"
            :item="item"
            :open-id="openCardId"
            :disabled="false"
            :mobile-mode="mobileActionMode"
            :draggable="isDraggable"
            :class="['h-full transition-all duration-200', { 'bg-blue-50/50! dark:bg-sky-300/20! border-sky-500/50 dark:border-sky-800/50': isSelected(item) }]"
            @update:open-id="openCardId = $event"
            @click="emit('click', item)"
            @long-press="handleLongPress"
            @contextmenu.prevent="(e: MouseEvent) => handleContextMenu(item, e)"
          >
            <template v-if="isDraggable" #left />
            <template #default>
              <div class="w-full h-full">
                <div
                  v-if="$slots['mobile-content']"
                  :class="[currentViewMode === 'grid' ? 'block' : 'block lg:hidden', 'p-4 relative group/mobile']"
                >
                  <slot name="mobile-content" :item="item" />

                  <div
                    v-if="showActions && mobileActionMode === 'dropdown' && actionOptions"
                    class="absolute top-2 right-2"
                  >
                    <UDropdownMenu :items="actionOptions(item)" :popper="{ placement: 'bottom-end' }">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-ellipsis-vertical"
                        size="sm"
                        :aria-label="mo"
                      />
                    </UDropdownMenu>
                  </div>
                </div>

                <div v-if="currentViewMode === 'list'" class="hidden lg:flex items-center py-3 h-full w-full overflow-hidden">
                  <div v-if="selectable" class="w-8 shrink-0 flex items-center justify-center mr-2" @click.stop>
                    <UCheckbox
                      :model-value="isSelected(item)"
                      :aria-label="labels.selectRow ?? 'Select row'"
                      @update:model-value="(val) => toggleSelect(item, val)"
                    />
                  </div>

                  <div
                    v-for="col in displayColumns"
                    :key="col.key"
                    class="min-w-0 flex items-center px-2"
                    :class="[
                      (!col.class || !col.class.split(' ').some(c => c.startsWith('w-') || c.startsWith('flex-'))) ? 'flex-1' : '',
                      col.class || '',
                      col.rowClass || ''
                    ]"
                  >
                    <slot v-if="col.slot || $slots[col.key]" :name="col.slot || col.key" :item="item">
                      <div class="truncate text-xs text-toned">
                        {{ fieldValue(item, col.key) }}
                      </div>
                    </slot>
                    <div v-else class="truncate text-sm text-toned">
                      {{ fieldValue(item, col.key) }}
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #right>
              <div
                v-if="hasActions"
                class="hidden lg:flex items-center justify-end px-2 h-full shrink-0"
                :class="[actionsClass, actionsCol?.rowClass || '']"
                @click.stop
              >
                <slot name="actions" :item="item">
                  <slot name="action" :item="item">
                    <UDropdownMenu
                      v-if="actionOptions"
                      :items="actionOptions(item)"
                      :popper="{ placement: 'bottom-end' }"
                    >
                      <UButton
                        icon="i-lucide-ellipsis-vertical"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :aria-label="mo"
                      />
                    </UDropdownMenu>
                  </slot>
                </slot>
              </div>
            </template>

            <template #actions="{ close }">
              <div class="flex h-full">
                <slot name="swipe-actions" :item="item" :close="close">
                  <template v-if="swipeRightActions">
                    <UButton
                      v-for="(action, idx) in swipeRightActions(item)"
                      :key="idx"
                      :color="action.color || 'primary'"
                      :icon="action.icon"
                      :aria-label="action.label || mo"
                      variant="solid"
                      square
                      class="h-full rounded-none"
                      @click="() => { action.click?.(item); close() }"
                    />
                  </template>
                </slot>
              </div>
            </template>
          </SwipeCard>
        </div>
        <div :class="{ 'col-span-full': currentViewMode === 'grid' }">
          <slot name="last-item">
            <div class="pb-16 md:pb-16" />
          </slot>
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="contextMenu.isOpen"
          class="fixed w-1 h-1 z-9999 pointer-events-none"
          :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        >
          <UDropdownMenu
            :items="contextMenu.items"
            :open="true"
            :popper="{ placement: 'bottom-start' }"
            class="pointer-events-auto"
            @update:open="(val) => !val && (contextMenu.isOpen = false)"
          >
            <div />
          </UDropdownMenu>
        </div>
      </Teleport>
    </UScrollArea>
  </div>
</template>
