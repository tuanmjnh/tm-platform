import type { DefineComponent } from 'vue'

export interface ConfirmModalProps {
  title?: string
  description?: string
  icon?: string
  color?: 'primary' | 'neutral' | 'error' | 'warning' | 'success'
  confirmLabel?: string
  cancelLabel?: string
  confirmIcon?: string
  loading?: boolean
}
export interface ConfirmModalModel {
  modelValue: boolean
}

declare const ConfirmModal: DefineComponent<ConfirmModalProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default ConfirmModal
