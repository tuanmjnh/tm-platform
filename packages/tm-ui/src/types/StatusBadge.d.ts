import type { DefineComponent } from 'vue'

export interface StatusBadgeProps {
  label: string
  color?: 'success' | 'neutral' | 'warning' | 'info' | 'error' | 'primary' | 'secondary'
  icon?: string
  size?: 'xs' | 'sm'
  clickable?: boolean
  loading?: boolean
  disabled?: boolean
}

declare const StatusBadge: DefineComponent<StatusBadgeProps, {}, {}, {}, {}, {}, {}, { click: () => void }>
export default StatusBadge
