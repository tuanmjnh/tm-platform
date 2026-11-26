import type { DefineComponent } from 'vue'

export interface UtilitiesTextPanelProps {
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
}

declare const UtilitiesTextPanel: DefineComponent<UtilitiesTextPanelProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default UtilitiesTextPanel
