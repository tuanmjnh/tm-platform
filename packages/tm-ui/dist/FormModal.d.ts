import type { DefineComponent } from 'vue'

export interface FormModalProps {
  title: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
  state: Record<string, unknown>
  loading?: boolean
  submitLabel?: string
  cancelLabel?: string
  ui?: Record<string, unknown>
}
export interface FormModalModel {
  modelValue: boolean
}

declare const FormModal: DefineComponent<FormModalProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default FormModal
