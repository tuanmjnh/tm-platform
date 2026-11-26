import type { DefineComponent } from 'vue'

export interface UtilitiesEncodePanelProps {
  /** i18n lookup supplied by the host. */
  t: (key: string, params?: Record<string, unknown>) => string
}

declare const UtilitiesEncodePanel: DefineComponent<UtilitiesEncodePanelProps, {}, {}, {}, {}, {}, {}, Record<string, unknown[]>>
export default UtilitiesEncodePanel
