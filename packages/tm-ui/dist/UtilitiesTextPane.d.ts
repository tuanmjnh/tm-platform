import type { DefineComponent } from 'vue'

export interface UtilitiesTextPaneProps {
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
  label: string
  modelValue: string
  placeholder?: string
  rows?: number
  readonly?: boolean
  allowDownload?: boolean
  allowCopy?: boolean
  allowPaste?: boolean
  allowClear?: boolean
  showBadge?: boolean
  showStats?: boolean
}

declare const UtilitiesTextPane: DefineComponent<UtilitiesTextPaneProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default UtilitiesTextPane
