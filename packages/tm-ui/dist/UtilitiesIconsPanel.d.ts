import type { DefineComponent } from 'vue'
import type { Favourite, IconSearchPage, IconSearchQuery, One, The } from '@nuxt/ui'

export interface UtilitiesIconsPanelProps {
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
  /** One page of icons. The host owns the transport and the route. */
  fetchIcons: (query: IconSearchQuery) => Promise<IconSearchPage>
  /** Favourite icon names, owned by the host so it can persist them. */
  favorites: string[]
  collections?: { label: string, value: string }[]
  pageSize?: number
}

declare const UtilitiesIconsPanel: DefineComponent<UtilitiesIconsPanelProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default UtilitiesIconsPanel
