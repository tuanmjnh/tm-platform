import test from 'node:test'
import assert from 'node:assert/strict'
import { createMongoConnectionManager } from '../dist/index.js'

function fakeConnection({ fail = false, gate = null } = {}) {
  const listeners = new Map()
  const conn = {
    readyState: 1,
    closeCount: 0,
    async asPromise() {
      if (gate) await gate
      if (fail) throw new Error('boom')
      return conn
    },
    async close() {
      conn.readyState = 0
      conn.closeCount += 1
    },
    on(event, listener) {
      listeners.set(event, listener)
      return conn
    },
    emit(event, arg) {
      listeners.get(event)?.(arg)
    }
  }
  return conn
}

function factoryOf(...connections) {
  const calls = []
  const queue = [...connections]
  return {
    calls,
    createConnection(uri, options) {
      calls.push({ uri, options })
      return queue.length > 1 ? queue.shift() : queue[0]
    }
  }
}

function silentManager(factory, cooldownMs) {
  return createMongoConnectionManager({
    createConnection: factory.createConnection,
    cooldownMs,
    log: () => {}
  })
}

test('empty or blank uri resolves null without connecting', async () => {
  const factory = factoryOf(fakeConnection())
  const manager = silentManager(factory)

  assert.equal(await manager.get('', 'db', 'empty-uri'), null)
  assert.equal(await manager.get('   ', 'db', 'empty-uri'), null)
  assert.equal(await manager.get(undefined, 'db', 'empty-uri'), null)
  assert.equal(factory.calls.length, 0)
})

test('concurrent calls share one connection and later calls reuse it', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const conn = fakeConnection({ gate })
  const factory = factoryOf(conn)
  const manager = silentManager(factory)

  const first = manager.get('mongodb://x', 'db', 'dedupe')
  const second = manager.get('mongodb://x', 'db', 'dedupe')
  release()
  const [a, b] = await Promise.all([first, second])

  assert.equal(a, conn)
  assert.equal(b, conn)
  assert.equal(factory.calls.length, 1)
  assert.deepEqual(factory.calls[0].options, {
    dbName: 'db',
    bufferCommands: false,
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    authSource: 'admin'
  })

  assert.equal(await manager.get('mongodb://x', 'db', 'dedupe'), conn)
  assert.equal(factory.calls.length, 1)
})

test('changed uri closes the old pool and reconnects', async () => {
  const oldConn = fakeConnection()
  const newConn = fakeConnection()
  const factory = factoryOf(oldConn, newConn)
  const manager = silentManager(factory)

  assert.equal(await manager.get('mongodb://a', 'db', 'switch'), oldConn)
  assert.equal(await manager.get('mongodb://b', 'db', 'switch'), newConn)
  assert.equal(oldConn.closeCount, 1)
  assert.equal(factory.calls.length, 2)
})

test('failed connect resolves null, then a cooldown gate delays the retry', async () => {
  const good = fakeConnection()
  let attempt = 0
  const calls = []
  const manager = createMongoConnectionManager({
    cooldownMs: 25,
    log: () => {},
    createConnection(uri, options) {
      calls.push({ uri, options })
      attempt += 1
      return attempt === 1 ? fakeConnection({ fail: true }) : good
    }
  })

  assert.equal(await manager.get('mongodb://x', 'db', 'cooldown'), null)
  assert.equal(await manager.get('mongodb://x', 'db', 'cooldown'), null)
  assert.equal(calls.length, 1)

  await new Promise(resolve => setTimeout(resolve, 40))
  assert.equal(await manager.get('mongodb://x', 'db', 'cooldown'), good)
  assert.equal(calls.length, 2)
})

test('a disconnected pool is replaced on the next call', async () => {
  const firstConn = fakeConnection()
  const secondConn = fakeConnection()
  const factory = factoryOf(firstConn, secondConn)
  const manager = silentManager(factory, 0)

  assert.equal(await manager.get('mongodb://x', 'db', 'disconnect'), firstConn)
  firstConn.emit('disconnected')
  assert.equal(await manager.get('mongodb://x', 'db', 'disconnect'), secondConn)
  assert.equal(factory.calls.length, 2)
})

test('close targets one pool by name or every pool without one', async () => {
  const alpha = fakeConnection()
  const beta = fakeConnection()
  const factory = factoryOf(alpha, beta)
  const manager = silentManager(factory)

  await manager.get('mongodb://x', 'db-a', 'close-one')
  await manager.get('mongodb://x', 'db-b', 'close-two')

  await manager.close('close-one')
  assert.equal(alpha.closeCount, 1)
  assert.equal(beta.closeCount, 0)

  await manager.close()
  assert.equal(beta.closeCount, 1)
})
