import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AIClientError,
  decodeMasterKey,
  generateMasterKey,
  normalizeStoredConnection,
  openSecret,
  sealSecret,
  storedToAppConnection
} from '../dist/index.js'

function assertStoreFailure(error, fragment) {
  assert.ok(error instanceof AIClientError, `expected AIClientError, got ${error?.constructor?.name}`)
  assert.equal(error.code, 'ai.store-failed')
  assert.match(error.message, fragment)
  return true
}

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

function failingMongo(message, overrides = {}) {
  return {
    collection() {
      return {
        async createIndex() { return 'ownerId_1_connectionId_1' },
        find() { return { async toArray() { return [] } } },
        async findOne() { return null },
        async updateOne() { throw new Error(message) },
        async deleteOne() { throw new Error(message) },
        ...overrides
      }
    }
  }
}

test('mongo driver surfaces collection failures as ai.store-failed', async () => {
  const indexFailing = createMongoAIConfigStore(failingMongo('unused', {
    async createIndex() { throw new Error('mongo index denied') }
  }), 'user-1')
  await assert.rejects(() => indexFailing.listConnections(), error => assertStoreFailure(error, /mongo index denied/))

  const readFailing = createMongoAIConfigStore(failingMongo('mongo write concern failed', {
    find() { return { toArray() { return Promise.reject(new Error('mongo cursor lost')) } } }
  }), 'user-1')
  await assert.rejects(() => readFailing.listConnections(), error => assertStoreFailure(error, /mongo cursor lost/))

  const writeFailing = createMongoAIConfigStore(failingMongo('mongo write concern failed'), 'user-1')
  await assert.rejects(
    () => writeFailing.upsertConnection({ connectionId: 'lab', providerKey: 'openai', baseUrl: 'https://api.openai.com/v1', apiKeyCipher: '' }),
    error => assertStoreFailure(error, /mongo write concern failed/)
  )
  await assert.rejects(() => writeFailing.removeConnection('lab'), error => assertStoreFailure(error, /mongo write concern failed/))

  const validating = createMongoAIConfigStore(failingMongo('mongo delete failed'), 'user-1')
  await assert.rejects(
    () => validating.upsertConnection({ connectionId: 'bad id!', providerKey: 'openai', baseUrl: '', apiKeyCipher: '' }),
    error => {
      assert.equal(error.code, 'ai.bad-shape')
      assert.match(error.message, /connectionId/)
      return true
    }
  )
})

import { createLocalStorageAIConfigStore } from '../dist/index.js'

function memoryStorage() {
  const map = new Map()
  return {
    map,
    getItem(key) { return map.has(key) ? map.get(key) : null },
    setItem(key, value) { map.set(key, value) }
  }
}

test('localStorage driver round-trips one document per owner', async () => {
  const storage = memoryStorage()
  const store = createLocalStorageAIConfigStore(storage, 'acct-1')
  await store.upsertConnection({
    connectionId: 'lab',
    providerKey: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKeyCipher: '',
    models: [{ modelId: 'llama3.2', enabled: true, isPrimary: true }]
  })
  const list = await store.listConnections()
  assert.equal(list.length, 1)
  assert.equal(list[0].providerKey, 'ollama')
  assert.match([...storage.map.keys()][0], /acct-1$/)

  const other = createLocalStorageAIConfigStore(storage, 'acct-2')
  assert.equal((await other.listConnections()).length, 0)

  await store.replaceModels('lab', [{ modelId: 'qwen2.5', enabled: false }])
  assert.equal((await store.listConnections())[0].models[0].enabled, false)

  await store.removeConnection('lab')
  assert.equal((await store.listConnections()).length, 0)
})

test('localStorage driver tolerates a corrupt document', async () => {
  const storage = memoryStorage()
  storage.setItem('tm.ai.config.v1.acct-1', '{not json')
  const store = createLocalStorageAIConfigStore(storage, 'acct-1')
  assert.deepEqual(await store.listConnections(), [])
})

test('localStorage driver surfaces storage failures as ai.store-failed', async () => {
  const record = { connectionId: 'lab', providerKey: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', apiKeyCipher: '' }

  const writeFailing = createLocalStorageAIConfigStore({
    getItem() { return null },
    setItem() { throw new Error('QuotaExceededError: storage full') }
  }, 'acct-1')
  await assert.rejects(() => writeFailing.upsertConnection(record), error => assertStoreFailure(error, /storage full/))

  const readFailing = createLocalStorageAIConfigStore({
    getItem() { throw new Error('SecurityError: storage blocked') },
    setItem() {}
  }, 'acct-1')
  await assert.rejects(() => readFailing.listConnections(), error => assertStoreFailure(error, /storage blocked/))
})

import { createSupabaseAIConfigStore } from '../dist/index.js'

function fakeSupabase() {
  const rows = []
  const calls = []
  function table(name) {
    const filter = {}
    const chain = {
      select() { return chain },
      eq(column, value) { filter[column] = value; return chain },
      order() { return Promise.resolve({ data: rows.filter(row => Object.entries(filter).every(([k, v]) => row[k] === v)), error: null }) },
      maybeSingle() {
        return Promise.resolve({ data: rows.find(row => Object.entries(filter).every(([k, v]) => row[k] === v)) ?? null, error: null })
      },
      then(resolve, reject) {
        const result = { data: null, error: null }
        if (chain._kind === 'delete') {
          for (let i = rows.length - 1; i >= 0; i--) {
            if (Object.entries(filter).every(([k, v]) => rows[i][k] === v)) rows.splice(i, 1)
          }
        }
        if (chain._kind === 'update') {
          for (const row of rows) {
            if (Object.entries(filter).every(([k, v]) => row[k] === v)) Object.assign(row, chain._payload)
          }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
      delete() { chain._kind = 'delete'; return chain },
      update(payload) { chain._kind = 'update'; chain._payload = payload; return chain },
      async upsert(row, opts) {
        calls.push(['upsert', name, row, opts])
        const index = rows.findIndex(existing => existing.owner_id === row.owner_id && existing.connection_id === row.connection_id)
        if (index >= 0) rows[index] = { ...rows[index], ...row }
        else rows.push({ ...row })
        return { error: null }
      }
    }
    return chain
  }
  return { rows, calls, from: table }
}

test('supabase driver upserts, scopes and replaces models on one table', async () => {
  const client = fakeSupabase()
  const store = createSupabaseAIConfigStore(client, 'user-1')
  await store.upsertConnection({
    connectionId: 'lab',
    providerKey: 'nvidia',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyCipher: 'v1.a.b',
    models: [{ modelId: 'm1', enabled: true, isPrimary: true }]
  })
  const upsertCall = client.calls.find(call => call[0] === 'upsert')
  assert.equal(upsertCall[1], 'ai_connections')
  assert.equal(upsertCall[3].onConflict, 'owner_id,connection_id')
  assert.equal(upsertCall[2].api_key_cipher, 'v1.a.b')

  const list = await store.listConnections()
  assert.equal(list.length, 1)
  assert.equal(list[0].ownerId, 'user-1')
  assert.equal(list[0].models[0].modelId, 'm1')

  await store.replaceModels('lab', [{ modelId: 'm2', enabled: true }])
  assert.equal((await store.listConnections())[0].models[0].modelId, 'm2')

  await store.removeConnection('lab')
  assert.equal((await store.listConnections()).length, 0)
})

test('supabase driver surfaces client failures as ai.store-failed', async () => {
  const thrown = createSupabaseAIConfigStore({
    from() { throw new Error('supabase pool exhausted') }
  }, 'user-1')
  await assert.rejects(() => thrown.listConnections(), error => assertStoreFailure(error, /supabase pool exhausted/))
  await assert.rejects(
    () => thrown.upsertConnection({ connectionId: 'lab', providerKey: 'openai', baseUrl: '', apiKeyCipher: '' }),
    error => assertStoreFailure(error, /supabase pool exhausted/)
  )

  const returned = createSupabaseAIConfigStore({
    from() {
      const chain = {
        select() { return chain },
        eq() { return chain },
        order() { return Promise.resolve({ data: null, error: { message: 'relation ai_connections does not exist' } }) },
        maybeSingle() { return Promise.resolve({ data: null, error: null }) },
        upsert() { return Promise.resolve({ error: { message: 'duplicate key value' } }) },
        delete() { return chain },
        update() { return chain }
      }
      return chain
    }
  }, 'user-1')
  await assert.rejects(() => returned.listConnections(), error => assertStoreFailure(error, /relation ai_connections does not exist/))
  await assert.rejects(
    () => returned.upsertConnection({ connectionId: 'lab', providerKey: 'openai', baseUrl: '', apiKeyCipher: '' }),
    error => assertStoreFailure(error, /duplicate key value/)
  )
})
