import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeMasterKey,
  generateMasterKey,
  normalizeStoredConnection,
  openSecret,
  sealSecret,
  storedToAppConnection
} from '../dist/index.js'

test('sealSecret/openSecret round-trip with a base64 master key', async () => {
  const master = generateMasterKey()
  const sealed = await sealSecret(master, 'sk-test-123')
  assert.match(sealed, /^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/)
  assert.notEqual(sealed, 'sk-test-123')
  assert.equal(await openSecret(master, sealed), 'sk-test-123')
})

test('a different master key cannot open the ciphertext', async () => {
  const sealed = await sealSecret(generateMasterKey(), 'sk-test')
  await assert.rejects(() => openSecret(generateMasterKey(), sealed), /cannot decrypt/)
})

test('decodeMasterKey accepts 64 hex chars and rejects wrong lengths', () => {
  assert.equal(decodeMasterKey('a'.repeat(64)).length, 32)
  assert.throws(() => decodeMasterKey('too-short'), /32 bytes/)
})

test('normalizeStoredConnection maps the legacy adapter family to custom', () => {
  const record = normalizeStoredConnection({
    connectionId: 'lab',
    providerKey: 'openai-compatible',
    baseUrl: 'http://127.0.0.1:31415/v1/',
    apiKeyCipher: 'v1.a.b',
    models: [
      { modelId: 'auto', enabled: true, isPrimary: true },
      { modelId: 'auto', enabled: false },
      { modelId: ' ', enabled: true }
    ]
  }, 'user-1')
  assert.equal(record.ownerId, 'user-1')
  assert.equal(record.providerKey, 'custom')
  assert.equal(record.baseUrl, 'http://127.0.0.1:31415/v1')
  assert.equal(record.models.length, 1)
  assert.equal(record.models[0].isPrimary, true)
  assert.equal(record.enabled, true)
})

test('normalizeStoredConnection rejects a bad connectionId', () => {
  assert.throws(() => normalizeStoredConnection({
    connectionId: 'bad id!',
    providerKey: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyCipher: ''
  }, 'user-1'), /connectionId/)
})

test('storedToAppConnection exposes enabled models only and never the cipher', () => {
  const record = normalizeStoredConnection({
    connectionId: 'lab',
    providerKey: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKeyCipher: 'v1.a.b',
    models: [
      { modelId: 'llama3.2', displayName: 'Llama 3.2', enabled: true },
      { modelId: 'old', enabled: false }
    ]
  }, 'user-1')
  const app = storedToAppConnection(record, { apiKey: 'plain' })
  assert.deepEqual(app.models, [{ modelId: 'llama3.2', displayName: 'Llama 3.2' }])
  assert.equal(app.apiKey, 'plain')
  assert.equal('apiKeyCipher' in app, false)
  assert.equal(app.connectionId, 'lab')
})
