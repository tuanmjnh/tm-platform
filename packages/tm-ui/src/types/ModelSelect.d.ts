import type { DefineComponent } from 'vue'

export interface ModelOption {
  connectionId: string
  modelId: string
  displayName: string
  provider: string
  connectionName?: string
  isPrimary?: boolean
}

export interface ModelCheckResult {
  ok: boolean
  latencyMs?: number
  status?: number
  reasonCode?: string
  error?: string
  rawError?: string
}

/**
 * Label entries accept either a template string (`{ms}`, `{status}` are
 * substituted) or a function. The function form lets a host pass its own
 * `t(key, params)` result directly, so no placeholder has to survive a
 * translation engine.
 */
export interface ModelSelectLabels {
  placeholder?: string
  checking?: string
  available?: string | ((values: { ms: number }) => string)
  unavailable?: string | ((values: { status: number }) => string)
  tooltip?: string
  quotaExceeded?: string
  quotaExceededHint?: string
  timeout?: string
  timeoutHint?: string
  unauthorized?: string | ((values: { status: number }) => string)
  unauthorizedHint?: string
  notFound?: string
  overloaded?: string | ((values: { status: number }) => string)
  rawError?: string
  genericError?: string
  retry?: string
  checkAriaLabel?: string
}

export interface ModelSelectCheckSuccess {
  modelKey: string
  displayName: string
  latencyMs: number
}

export interface ModelSelectCheckError {
  modelKey: string
  title: string
  description: string
  rawError: string
}

export interface ModelSelectProps {
  modelValue: string
  models: ModelOption[]
  loading?: boolean
  disabled?: boolean
  widthClass?: string
  showCheck?: boolean
  labels?: ModelSelectLabels
  /** Transport supplied by the app; omitted means the check button is hidden. */
  checkModel?: (modelKey: string, ctx: { signal: AbortSignal }) => Promise<ModelCheckResult>
  checkTimeoutMs?: number
  /** Override the built-in provider→icon map. */
  providerIcon?: (provider: string) => string
}

export interface ModelSelectEmits {
  'update:modelValue': (value: string) => void
  'check:success': (payload: ModelSelectCheckSuccess) => void
  'check:error': (payload: ModelSelectCheckError) => void
}

declare const ModelSelect: DefineComponent<ModelSelectProps, {}, {}, {}, {}, {}, {}, ModelSelectEmits>
export default ModelSelect
