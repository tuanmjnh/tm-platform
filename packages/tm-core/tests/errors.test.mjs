import assert from 'node:assert/strict'
import {
  getApiErrorStatus, getErrorKey, getErrorMessage, isHubConnectionError, getPresetErrorMessage
} from '../dist/index.js'

// A translator that echoes the key, so a returned string tells you which branch
// produced it: a translated key comes back as 'error.x', raw copy as itself.
const t = key => key

// 1. Status extraction prefers the top-level field, then the nested one.
assert.equal(getApiErrorStatus({ statusCode: 404 }), 404, 'top-level status')
assert.equal(getApiErrorStatus({ data: { statusCode: 409 } }), 409, 'nested status')
assert.equal(getApiErrorStatus({}), undefined, 'absent status is undefined')

// 2. Status maps to a key.
const byStatus = [
  [400, 'error.invalidRequest'], [401, 'error.invalidCredentials'], [403, 'error.forbidden'],
  [404, 'error.notFound'], [409, 'error.conflict'], [422, 'error.validation'],
  [429, 'error.tooManyAttempts'], [500, 'error.serverError'], [418, 'error.unexpected']
]
for (const [status, key] of byStatus) {
  assert.equal(getErrorKey({ statusCode: status }), key, `${status} maps to ${key}`)
}

// 3. Network failures are distinguished from other no-status errors.
assert.equal(getErrorKey({ message: 'Failed to fetch' }), 'error.network', 'plain network failure')
assert.equal(
  getErrorKey({ message: 'Failed to fetch http://localhost:4000/api/v1/auth/login' }),
  'error.hubConnectionFailed',
  'a network failure naming the hub is the hub-connection case'
)
assert.equal(getErrorKey({ message: 'something odd' }), 'error.unexpected', 'unknown text is unexpected')
assert.equal(isHubConnectionError({ message: 'Failed to fetch http://localhost:4000/x' }), true, 'hub connection detected')
assert.equal(isHubConnectionError({ statusCode: 401, message: 'Failed to fetch' }), false, 'a status excludes it')

// 4. A declared i18n key is translated when the table has it. `t` here is a
//    table that knows one key, which is what makes "translated" observable.
const table = { 'error.forbidden': 'Bạn không có quyền' }
const tReal = key => table[key] ?? key

assert.equal(
  getErrorMessage({ statusCode: 401, statusMessage: 'error.forbidden' }, tReal),
  'Bạn không có quyền',
  'a key the table knows wins over the status default'
)
assert.equal(
  getErrorMessage({ statusCode: 401, statusMessage: 'error.unknownKey' }, t),
  'error.invalidCredentials',
  'a key the table does not know falls through to the status default'
)

// 5. The wire-code rule: an unknown code must NOT become user copy.
//    This is the behaviour the three app copies disagreed on.
assert.equal(
  getErrorMessage({ statusCode: 404, statusMessage: 'not_found' }, t),
  'error.notFound',
  'an untranslated wire code falls back to the status default, not to "not_found"'
)
assert.equal(
  getErrorMessage({ statusCode: 500, data: { message: 'connectionId is required' } }, t),
  'connectionId is required',
  'plain prose is shown as-is',
)
assert.equal(
  getErrorMessage({ statusCode: 500, data: { message: 'error.badRequest' } }, t),
  'error.serverError',
  'a dotted code with no translation falls back to the status default'
)

// 6. Known backend prose maps to its key.
assert.equal(
  getErrorMessage({ statusCode: 401, message: 'Invalid email or password' }, t),
  'error.invalidCredentials',
  'known login failure'
)
assert.equal(
  getErrorMessage({ statusCode: 403, message: 'App does not have access to this application' }, t),
  'error.noAppAccess',
  'known access failure'
)

// 7. HTTP debug strings are never shown.
assert.equal(
  getErrorMessage({ statusCode: 500, message: '[GET] /api/x failed' }, t),
  'error.serverError',
  'a bracketed HTTP debug line falls through to the default'
)

// 8. PDF preset codes take their own copy.
assert.equal(
  getPresetErrorMessage({ message: 'PDF_PRESET_NAME_REQUIRED' }, t),
  'pdf.extract.presetNameRequired',
  'preset name required'
)
assert.equal(
  getPresetErrorMessage({ message: 'PDF_PRESET_LIMIT reached' }, t),
  'pdf.extract.presetLimit',
  'preset limit'
)
assert.equal(
  getPresetErrorMessage({ statusCode: 404 }, t),
  'error.notFound',
  'anything else defers to getErrorMessage'
)

console.log('errors: all assertions passed')
