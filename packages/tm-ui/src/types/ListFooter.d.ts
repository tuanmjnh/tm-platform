import type { DefineComponent } from 'vue'

export interface ListFooterProps {
  count?: number
  hasMore?: boolean
  loading?: boolean
  showNoMore?: boolean
  recordsLabel?: string
  loadingLabel?: string
  noMoreLabel?: string
}

declare const ListFooter: DefineComponent<ListFooterProps, {}, {}, {}, {}, {}, {}, {}>
export default ListFooter
