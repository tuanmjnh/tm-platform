/**
 * Error convention shared by the TM apps.
 *
 * Backend `createError` sends `statusMessage` = an i18n key (e.g.
 * `error.invalidCredentials`) and `message` = human-readable text for logs.
 * The frontend resolves the string a user should see with `getErrorMessage(err, t)`:
 *
 *   1. connection errors to TM-Hub, or a network failure;
 *   2. `statusMessage` used as an i18n key, when the table has it;
 *   3. known backend messages mapped to keys;
 *   4. otherwise a status-code default.
 *
 * `t` is a parameter, never imported. That is what lets a server route, a CLI or
 * a test resolve an error without a Vue app, and it keeps the package free of
 * i18n.
 */

export type ApiErrorPayload = {
  name?: string
  statusCode?: number
  statusMessage?: string
  data?: { message?: string, statusMessage?: string, statusCode?: number }
  message?: string
}

export type Translate = (key: string) => string

export function getApiErrorStatus(err: unknown): number | undefined {
  const e = err as ApiErrorPayload
  return e?.statusCode ?? e?.data?.statusCode
}

/**
 * A lowercase, separator-bearing token (`not_found`, `error.badRequest`) is a
 * wire code, not copy. Single words stay readable ("Unauthorized") and are not.
 */
function isWireCode(value: string): boolean {
  return /^[a-z][a-zA-Z0-9]*([._][a-zA-Z0-9]+)+$/.test(value)
}

const NETWORK = /fetch failed|failed to fetch|<no response>|network|econn|timeout|load failed|socket/i
const HUB_HINT = /4000|\/api\/v1\/|hub/i

export function isHubConnectionError(err: unknown): boolean {
  const e = err as ApiErrorPayload
  const status = getApiErrorStatus(err)
  const rawMsg = String(e?.message || e?.data?.message || '')
  if (!status) {
    if (NETWORK.test(rawMsg) && HUB_HINT.test(rawMsg)) return true
  }
  return false
}

export function getErrorKey(err: unknown): string {
  const e = err as ApiErrorPayload
  const status = getApiErrorStatus(err)

  if (!status) {
    const msg = String(e?.message || e?.data?.message || '').toLowerCase()
    if (NETWORK.test(msg)) {
      if (HUB_HINT.test(msg)) return 'error.hubConnectionFailed'
      return 'error.network'
    }
    return 'error.unexpected'
  }

  const raw = String(e?.statusMessage || e?.data?.statusMessage || e?.data?.message || e?.message || '')
  if (/invalid.*app/i.test(raw)) return 'error.invalidAppId'
  if (/not have access|no access/i.test(raw)) return 'error.noAppAccess'

  switch (status) {
    case 400: return 'error.invalidRequest'
    case 401: return 'error.invalidCredentials'
    case 403: return 'error.forbidden'
    case 404: return 'error.notFound'
    case 409: return 'error.conflict'
    case 422: return 'error.validation'
    case 429: return 'error.tooManyAttempts'
    default: return status >= 500 ? 'error.serverError' : 'error.unexpected'
  }
}

export function getErrorMessage(err: unknown, t: Translate): string {
  const e = err as ApiErrorPayload
  const status = getApiErrorStatus(err)
  const rawMsg = String(e?.message || e?.data?.message || '')

  // 1. Connection error to TM-Hub or a network failure (Failed to fetch, <no response>…)
  if (!status) {
    if (NETWORK.test(rawMsg)) {
      if (HUB_HINT.test(rawMsg)) return t('error.hubConnectionFailed')
      return t('error.network')
    }
  }

  // 2. `statusMessage` as an i18n key (e.g. error.invalidCredentials)
  const code = e?.statusMessage || e?.data?.statusMessage
  if (code && /^[a-zA-Z0-9_.-]+$/.test(code)) {
    const translated = t(code)
    if (translated && translated !== code) return translated
    // The server declared a code the table has no entry for. Its `message` is
    // diagnostic ("connectionId is required", "HTTP 500 from tts"), so the status
    // default is the only thing safe to show — a missing translation must not
    // silently promote debug text to user copy.
    if (isWireCode(code)) return t(getErrorKey(err))
  }

  // 3. Known backend messages mapped to keys
  const text = e?.data?.message || e?.message
  if (text) {
    if (/^[a-zA-Z0-9_.-]+$/.test(text)) {
      const translated = t(text)
      if (translated && translated !== text) return translated
    }

    if (/invalid email or password/i.test(text)) return t('error.invalidCredentials')
    if (/invalid or inactive app/i.test(text)) return t('error.invalidAppId')
    if (/does not have access to this application/i.test(text)) return t('error.noAppAccess')

    // Same rule for an untranslated code arriving as the message body: fall
    // through to the status default rather than print the identifier. Skip raw
    // HTTP debug strings too.
    if (!isWireCode(text) && !/\[(GET|POST|PUT|DELETE|PATCH)\]/i.test(text)) {
      return text
    }
  }

  // 4. Status-code default
  return t(getErrorKey(err))
}

/**
 * PDF preset operations send `PDF_*` codes that have dedicated copy instead of
 * the generic status map. Kept beside `getErrorMessage` so both resolve an error
 * the same way; only these two codes take a different branch.
 */
export function getPresetErrorMessage(err: unknown, t: Translate): string {
  const e = err as ApiErrorPayload
  const code = String(e?.data?.statusMessage || e?.statusMessage || e?.data?.message || e?.message || '')
  if (code.includes('PDF_PRESET_NAME_REQUIRED')) return t('pdf.extract.presetNameRequired')
  if (code.includes('PDF_PRESET_LIMIT')) return t('pdf.extract.presetLimit')
  return getErrorMessage(err, t)
}
