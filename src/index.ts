export interface TmResult<T> {
  ok: boolean
  data?: T
  error?: string
}

export function ok<T>(data: T): TmResult<T> {
  return { ok: true, data }
}

export function fail(error: string): TmResult<never> {
  return { ok: false, error }
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}