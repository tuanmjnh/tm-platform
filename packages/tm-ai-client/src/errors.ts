export type AIClientErrorCode =
  | 'ai.no-base-url'
  | 'ai.no-model'
  | 'ai.no-key'
  | 'ai.rate-limited'
  | 'ai.timeout'
  | 'ai.network'
  | 'ai.http-error'
  | 'ai.bad-shape'
  | 'ai.aborted'
  | 'ai.local-mode-blocked'

export class AIClientError extends Error {
  readonly code: AIClientErrorCode
  readonly status?: number
  readonly retryAfterMs?: number

  constructor(code: AIClientErrorCode, message: string, extra?: { status?: number, retryAfterMs?: number }) {
    super(message)
    this.name = 'AIClientError'
    this.code = code
    this.status = extra?.status
    this.retryAfterMs = extra?.retryAfterMs
  }
}

/** Local endpoints are only reachable from the runtime that hosts them. */
export function isLocalEndpoint(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false
  const value = String(baseUrl).trim()
  if (!value) return false
  try {
    const raw = value.includes('://') ? value : `http://${value}`
    const host = new URL(raw).hostname.toLowerCase()
    return host === 'localhost'
      || host === '127.0.0.1'
      || host === '::1'
      || host === '0.0.0.0'
      || host.endsWith('.local')
      || /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(host)
  } catch {
    return /localhost|127\.0\.0\.1|::1|0\.0\.0\.0|\.local/i.test(value)
  }
}