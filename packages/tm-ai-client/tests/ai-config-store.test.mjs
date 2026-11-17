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

import { createMongoAIConfigStore } from '../dist/index.js'

function fakeMongo() {
  const docs = []
  const indexes = []
  const matches = (doc, filter) =>
    Object.entries(filter).every(([key, value]) => doc[key] === value)
  return {
    docs,
    indexes,
    collection() {
      return {
        async createIndex(spec, opts) { indexes.push([spec, opts]) },
        find(filter) {
          return { async toArray() { return docs.filter(doc => matches(doc, filter)).map(doc => ({ ...doc })) } }
        },
        async findOne(filter) {
          const doc = docs.find(entry => matches(entry, filter))
          return doc ? { ...doc } : null
        },
        async updateOne(filter, update, options) {
          let doc = docs.find(entry => matches(entry, filter))
          if (!doc) {
            if (!options?.upsert) return { matchedCount: 0 }
            doc = { ...filter }
            docs.push(doc)
          }
          Object.assign(doc, update.$set ?? {}, doc.createdAt ? {} : update.$setOnInsert ?? {})
          return { matchedCount: 1 }
        },
        async deleteOne(filter) {
          const index = docs.findIndex(entry => matches(entry, filter))
          if (index >= 0) docs.splice(index, 1)
          return { deletedCount: index >= 0 ? 1 : 0 }
        }
      }
    }
  }
}

test('mongo driver scopes every operation to its owner', async () => {
  const db = fakeMongo()
  const store = createMongoAIConfigStore(db, 'user-1', { collectionName: 'ai_connections' })
  const saved = await store.upsertConnection({
    connectionId: 'lab',
    providerKey: 'freellmapi',
    baseUrl: 'http://127.0.0.1:31415/v1',
    apiKeyCipher: 'v1.a.b',
    models: [{ modelId: 'auto', enabled: true, isPrimary: true }]
  })
  assert.equal(saved.ownerId, 'user-1')
  assert.equal(db.indexes.length, 1)
  assert.deepEqual(db.indexes[0][0], { ownerId: 1, connectionId: 1 })
  assert.equal(db.indexes[0][1].unique, true)

  const other = createMongoAIConfigStore(db, 'user-2', { collectionName: 'ai_connections' })
  assert.equal((await other.listConnections()).length, 0)
  assert.equal((await store.listConnections()).length, 1)

  await store.replaceModels('lab', [{ modelId: 'qwen2.5', enabled: true }])
  assert.deepEqual((await store.listConnections())[0].models.map(m => m.modelId), ['qwen2.5'])

  await store.removeConnection('lab')
  assert.equal((await store.listConnections()).length, 0)
})

test('mongo driver keeps createdAt on upsert and bumps updatedAt', async () => {
  const db = fakeMongo()
  const store = createMongoAIConfigStore(db, 'user-1')
  await store.upsertConnection({ connectionId: 'a', providerKey: 'openai', baseUrl: 'https://api.openai.com/v1', apiKeyCipher: '' })
  const first = db.docs[0].createdAt
  await store.upsertConnection({ connectionId: 'a', providerKey: 'openai', baseUrl: 'https://api.openai.com/v1', apiKeyCipher: 'v1.x.y' })
  assert.equal(db.docs[0].createdAt, first)
  assert.equal(db.docs[0].apiKeyCipher, 'v1.x.y')
  assert.ok(db.docs[0].updatedAt >= first)
})
