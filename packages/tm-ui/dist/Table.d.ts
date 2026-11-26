import type { DefineComponent } from 'vue'
import type { Footer, Showing, T, TableColumn } from '@nuxt/ui'

export interface TableProps {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  total?: number
  pageSize?: number
  page?: number
  styled?: boolean
  /** Footer summary template, e.g. "Showing {count} of {total}". */
  showingTemplate?: string
  ui?: Record<string, unknown>
}

declare const Table: DefineComponent<TableProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default Table
