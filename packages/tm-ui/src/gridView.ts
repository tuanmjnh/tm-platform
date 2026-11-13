import { computed } from 'vue'
import { useStorage } from '@vueuse/core'

/**
 * View-mode preference shared by every list surface. Stored globally so a user
 * who picks "grid" once keeps it across pages; `componentKey` allows a single
 * page to diverge.
 */
export function useAdminGridView(componentKey: string, defaultMode: 'list' | 'grid' = 'list') {
  const store = useStorage<Record<string, 'list' | 'grid'>>('admin-view-modes-storage', {
    default: 'list'
  })

  const viewMode = computed({
    get: () => store.value[componentKey] || store.value.default || defaultMode,
    set: (val: 'list' | 'grid') => {
      store.value = { ...store.value, [componentKey]: val }
    }
  })

  return {
    viewMode,
    toggleViewMode: () => {
      viewMode.value = viewMode.value === 'list' ? 'grid' : 'list'
    },
    setViewMode: (mode: 'list' | 'grid') => {
      viewMode.value = mode
    },
    setGlobalDefault: (mode: 'list' | 'grid') => {
      store.value = { ...store.value, default: mode }
    },
    isGrid: computed(() => viewMode.value === 'grid'),
    isList: computed(() => viewMode.value === 'list')
  }
}
