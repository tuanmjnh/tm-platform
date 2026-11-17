import type { AIConfigStore } from '../store'
import { normalizeStoredConnection, type StoredAIConnection, type StoredAIModel } from '../stored'

/**
 * The narrow slice of the MongoDB driver this store needs. Keeping it structural
 * means the package takes no `mongodb` dependency and works with the official
 * driver, a proxy, or a test double.
 */
export interface MongoCollectionLike {
  find(filter?: Record<string, unknown>): { toArray(): Promise<unknown[]> }
  findOne(filter: Record<string, unknown>): Promise<unknown | null>
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean }
  ): Promise<unknown>
  deleteOne(filter: Record<string, unknown>): Promise<unknown>
  createIndex(spec: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>
}

export interface MongoDatabaseLike {
  collection(name: string): MongoCollectionLike
}

interface MongoDoc extends StoredAIConnection {}

const DEFAULT_COLLECTION = 'ai_connections'

export function createMongoAIConfigStore(
  db: MongoDatabaseLike,
  ownerId: string,
  options: { collectionName?: string } = {}
): AIConfigStore {
  const collection = db.collection(options.collectionName || DEFAULT_COLLECTION)
  let schemaReady: Promise<unknown> | null = null

  function ensureSchema(): Promise<unknown> {
    if (!schemaReady) {
      schemaReady = collection.createIndex({ ownerId: 1, connectionId: 1 }, { unique: true })
    }
    return schemaReady
  }

  async function findOne(connectionId: string): Promise<MongoDoc | null> {
    await ensureSchema()
    const doc = await collection.findOne({ ownerId, connectionId })
    return (doc as MongoDoc | null) || null
  }

  return {
    async ensureSchema() {
      await ensureSchema()
    },
    async listConnections() {
      await ensureSchema()
      const docs = (await collection.find({ ownerId }).toArray()) as MongoDoc[]
      return docs.sort((a, b) => a.connectionId.localeCompare(b.connectionId))
    },
    async upsertConnection(input) {
      await ensureSchema()
      const record = normalizeStoredConnection(input, ownerId)
      const now = new Date().toISOString()
      const existing = await findOne(record.connectionId)
      const stored: MongoDoc = {
        ...record,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      }
      // `createdAt` already carries the preserved value, so `$set` alone is
      // enough; repeating it in `$setOnInsert` is rejected by real MongoDB.
      await collection.updateOne(
        { ownerId, connectionId: record.connectionId },
        { $set: stored },
        { upsert: true }
      )
      return stored
    },
    async removeConnection(connectionId) {
      await ensureSchema()
      await collection.deleteOne({ ownerId, connectionId })
    },
    async replaceModels(connectionId, models: StoredAIModel[]) {
      await ensureSchema()
      const record = normalizeStoredConnection({
        ...(await findOne(connectionId)) ?? { connectionId, providerKey: 'custom', baseUrl: '', apiKeyCipher: '', enabled: true },
        models
      }, ownerId)
      await collection.updateOne(
        { ownerId, connectionId },
        { $set: { models: record.models, updatedAt: new Date().toISOString() } }
      )
    }
  }
}
