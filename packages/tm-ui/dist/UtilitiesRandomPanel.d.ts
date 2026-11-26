import type { DefineComponent } from 'vue'

export interface UtilitiesRandomPanelProps {
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
}

declare const UtilitiesRandomPanel: DefineComponent<UtilitiesRandomPanelProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default UtilitiesRandomPanel
