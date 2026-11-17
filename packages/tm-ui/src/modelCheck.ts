import type { ModelCheckResult, ModelSelectLabels } from './types/ModelSelect'

export type LabelValues = { ms?: number, status?: number }
export type LabelLookup = (key: keyof ModelSelectLabels, values?: LabelValues) => string

export interface CheckFailure {
  title: string
  desc: string
  raw: string
}

export const DEFAULT_LABELS: Record<keyof ModelSelectLabels, string> = {
  placeholder: 'Select model',
  checking: 'Checking connection...',
  available: 'Model is reachable ({ms}ms)',
  unavailable: 'Model check failed ({status})',
  tooltip: 'Check connection and quota for this model',
  quotaExceeded: 'Quota exceeded (HTTP 429)',
  quotaExceededHint: 'The account or API key has exceeded its quota limit. Please check billing or select another model.',
  timeout: 'Request timed out (HTTP 408)',
  timeoutHint: 'The check request timed out. Please try again or check network connectivity.',
  unauthorized: 'Unauthorized (HTTP {status})',
  unauthorizedHint: 'Invalid API key or missing permissions for this model.',
  notFound: 'Model not found (HTTP 404)',
  overloaded: 'AI service overloaded (HTTP {status})',
  rawError: 'Server error detail:',
  genericError: 'Failed to get a response from the AI provider.',
  retry: 'Retry',
  checkAriaLabel: 'Check connection and quota for this model',
  sourceHub: 'HUB',
  sourceApp: 'APP'
}

export function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match))
}

/**
 * Builds the resolver the classifiers need. A label may be a template string
 * (interpolated here) or a function — the function form lets a host pass its
 * own `t(key, params)` result, so no placeholder has to survive a translation
 * engine.
 */
export function createLabelResolver(labels?: ModelSelectLabels): LabelLookup {
  return (key, values = {}) => {
    const entry = labels?.[key] ?? DEFAULT_LABELS[key]
    if (typeof entry === 'function') return entry(values as never)
    return interpolate(entry, values)
  }
}

/** Maps a structured failure reply to the title and hint shown to the user. */
export function classifyFailure(result: ModelCheckResult, label: LabelLookup): CheckFailure {
  const code = result.reasonCode
  const status = result.status || 500
  const clean = result.error || ''
  const raw = result.rawError || clean

  if (code === 'quota_exceeded' || status === 429) {
    return { title: label('quotaExceeded'), desc: label('quotaExceededHint'), raw }
  }
  if (code === 'timeout' || status === 408 || status === 504) {
    return { title: label('timeout'), desc: label('timeoutHint'), raw }
  }
  if (code === 'invalid_key' || status === 401 || status === 403) {
    return { title: label('unauthorized', { status }), desc: label('unauthorizedHint'), raw }
  }
  if (code === 'not_found' || status === 404) {
    return { title: label('notFound'), desc: clean || label('notFound'), raw }
  }
  if (code === 'server_overloaded' || status === 503 || status === 502) {
    const text = label('overloaded', { status })
    return { title: text, desc: clean || text, raw }
  }
  return { title: label('unavailable', { status }), desc: clean, raw }
}

/** Maps a thrown transport error (network, abort, HTTP) to the same shape. */
export function classifyThrown(err: unknown, label: LabelLookup): CheckFailure {
  const errObj = err as {
    data?: { message?: string, statusMessage?: string, data?: { detail?: string } }
    message?: string
    statusCode?: number
    name?: string
  }
  const status = errObj?.statusCode || 500
  const raw = errObj?.data?.data?.detail || errObj?.data?.message || errObj?.message || ''
  const isTimeout = errObj?.name === 'AbortError' || errObj?.message === 'TIMEOUT'
    || status === 408 || status === 504 || /timed?[- ]?out|timeout/i.test(raw)
  const isQuota = status === 429 || /quota|rate[- ]?limit/i.test(raw)

  if (isTimeout) return { title: label('timeout'), desc: label('timeoutHint'), raw }
  if (isQuota) return { title: label('quotaExceeded'), desc: label('quotaExceededHint'), raw }
  return {
    title: label('unavailable', { status }),
    desc: raw.slice(0, 150) || label('genericError'),
    raw
  }
}
