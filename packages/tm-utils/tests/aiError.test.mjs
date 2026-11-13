import assert from 'node:assert/strict'
import { parseUpstreamAiError } from '../dist/index.js'

assert.equal(parseUpstreamAiError('quota exceeded', 429).reasonCode, 'quota_exceeded')
assert.equal(parseUpstreamAiError('Invalid API key', 401).reasonCode, 'invalid_key')
assert.equal(parseUpstreamAiError('model not found', 404).reasonCode, 'not_found')
assert.equal(parseUpstreamAiError('service unavailable', 503).reasonCode, 'server_overloaded')
assert.equal(parseUpstreamAiError('request timed out', 504).reasonCode, 'timeout')
assert.equal(parseUpstreamAiError('something odd', 400).reasonCode, 'generic')

console.log('tm-utils aiError tests passed')