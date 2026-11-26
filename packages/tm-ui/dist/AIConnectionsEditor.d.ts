import type { DefineComponent } from 'vue'

export interface AIConnectionRow {
  connectionId: string
  providerKey: string
  baseUrl: string
  /** Comma-separated model ids, as typed in the field. */
  models: string
  /** Config slot name; the key itself never leaves the host's keychain. */
  apiKeyEnv: string
  apiKey: string
  hasKey: boolean
}

export interface AIProviderOption {
  key: string
  name: string
  keyless?: boolean
  defaultBaseUrl?: string | null
}

export interface AIConnectionsEditorLabels {
  connectionId: string
  connectionIdDesc: string
  provider: string
  providerDesc: string
  keyless: string
  baseUrl: string
  baseUrlDesc: string
  models: string
  modelsDesc: string
  keySlot: string
  keySlotDesc: string
  keyValue: string
  keyValueSaved: string
  keyValueHint: string
  test: string
  remove: string
  add: string
  save: string
  unsavedHint: string
  empty: string
}

export interface AIConnectionsEditorProps {
  rows: AIConnectionRow[]
  providers: AIProviderOption[]
  labels: AIConnectionsEditorLabels
  disabled?: boolean
  saving?: boolean
  testingId?: string
  tests?: Record<string, { ok: boolean, message: string }>
  providerIcon?: (provider: string) => string
}

declare const AIConnectionsEditor: DefineComponent<AIConnectionsEditorProps, {}, {}, {}, {}, {}, {}, {
  add: () => void
  remove: (row: AIConnectionRow) => void
  test: (row: AIConnectionRow) => void
  save: () => void
}>
export default AIConnectionsEditor
