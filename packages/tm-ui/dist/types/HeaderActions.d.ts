export interface HeaderActionChild {
  key?: string
  icon?: string
  label: string
  disabled?: boolean
  onSelect: () => unknown
}

export interface HeaderAction {
  key: string
  icon: string
  label: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  variant?: 'solid' | 'subtle' | 'outline' | 'soft' | 'ghost'
  primary?: boolean
  disabled?: boolean
  visible?: boolean
  overflow?: boolean
  children?: HeaderActionChild[]
  onSelect?: () => unknown
}
