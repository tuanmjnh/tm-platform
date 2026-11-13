export interface SystemRoute {
  id: string
  parentId?: string | null
  sort?: number | null
  children?: SystemRoute[]
  [key: string]: unknown
}
