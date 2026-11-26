import type { DefineComponent } from 'vue'
import type { HeaderAction, Providing, Refresh, Single, Two } from '@nuxt/ui'

export interface PageProps {
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
}

declare const Page: DefineComponent<PageProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default Page
