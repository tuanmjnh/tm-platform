import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeMasterKey,
  generateMasterKey,
  openSecret,
  sealSecret
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
