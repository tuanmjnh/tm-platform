import assert from 'node:assert/strict'
import { credentialBelongsTo, normalizeOrigin, isTerminalDeviceRejection } from '../dist/index.js'

const PROD = 'https://hub.prod.test'
const LOCAL = 'http://localhost:4000'
const APP = 'tm-tools'
const credential = (over = {}) => ({ deviceId: 'dev-1', secret: 'sec', hubOrigin: PROD, appId: APP, ...over })

assert.equal(normalizeOrigin(`${PROD}/`), PROD)
assert.equal(normalizeOrigin(''), '')

assert.equal(credentialBelongsTo(credential(), { hubUrl: PROD, appId: APP }), true)
assert.equal(credentialBelongsTo(credential({ hubOrigin: `${PROD}/` }), { hubUrl: PROD, appId: APP }), true)
assert.equal(credentialBelongsTo(credential({ hubOrigin: LOCAL }), { hubUrl: PROD, appId: APP }), false)
assert.equal(credentialBelongsTo(credential({ appId: 'tm-tools_local' }), { hubUrl: PROD, appId: APP }), false)
assert.equal(credentialBelongsTo(credential({ hubOrigin: '' }), { hubUrl: PROD, appId: APP }), false)
assert.equal(credentialBelongsTo(null, { hubUrl: PROD, appId: APP }), false)
assert.equal(credentialBelongsTo(credential(), { hubUrl: '', appId: APP }), false)

assert.equal(isTerminalDeviceRejection(401, 'error.deviceUnauthorized'), true)
assert.equal(isTerminalDeviceRejection(401, 'error.deviceExpired'), true)
assert.equal(isTerminalDeviceRejection(401, 'error.forbidden'), false)
assert.equal(isTerminalDeviceRejection(500, 'error.deviceUnauthorized'), false)

console.log('tm-utils deviceCredentialScope tests passed')