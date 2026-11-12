import assert from 'node:assert/strict'
import { ok, fail, normalizeBaseUrl } from '../dist/index.js'

assert.deepEqual(ok(42), { ok: true, data: 42 })
assert.deepEqual(fail('boom'), { ok: false, error: 'boom' })
assert.equal(normalizeBaseUrl('http://localhost:4000/'), 'http://localhost:4000')
console.log('basic test passed')