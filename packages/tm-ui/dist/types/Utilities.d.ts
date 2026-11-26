/** One page of icon names, as the hosting app's endpoint returns it. */
export interface IconSearchPage {
  icons: string[]
  nextCursor?: string
  hasMore: boolean
}

/** The query the panel sends to the host's fetcher. */
export interface IconSearchQuery {
  search: string
  collection: string
  cursor: string
  limit: number
}
