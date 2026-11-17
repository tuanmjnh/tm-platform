import type { AIConfigStore } from '../store'
import { normalizeStoredConnection, type StoredAIConnection } from '../stored'
import { storeFailure } from './storeError'

export interface KeyValueStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const DEFAULT_PREFIX = 'tm.ai.config.v1'

export function createLocalStorageAIConfigStore(
  storage: KeyValueStorageLike,
  ownerId: string,
  options: { keyPrefix?: string } = {}
): AIConfigStore {
  const key = `${options.keyPrefix || DEFAULT_PREFIX}.${ownerId}`

  function read(): StoredAIConnection[] {
    let raw: string | null = null
    try {
      raw = storage.getItem(key)
    } catch (error) {
      throw storeFailure('read', error)
    }
    // Only the storage call is a failure; a corrupt document still degrades to [].
    try {
      const parsed = JSON.parse(raw || '[]')
      return Array.isArray(parsed)
        ? parsed.filter(entry => entry && typeof entry.connectionId === 'string')
        : []
    } catch {
      return []
    }
  }

  function write(records: StoredAIConnection[], operation: string): void {
    try {
      storage.setItem(key, JSON.stringify(records))
    } catch (error) {
      throw storeFailure(operation, error)
    }
  }

  return {
    async listConnections() {
      return read()
    },
    async upsertConnection(input) {
      const record = normalizeStoredConnection(input, ownerId)
      const records = read()
      const index = records.findIndex(entry => entry.connectionId === record.connectionId)
      const now = new Date().toISOString()
      const next: StoredAIConnection = {
        ...record,
        createdAt: index >= 0 ? records[index]!.createdAt || now : now,
        updatedAt: now
      }
      if (index >= 0) records[index] = next
      else records.push(next)
      write(records, 'upsert')
      return next
    },
    async removeConnection(connectionId) {
      write(read().filter(entry => entry.connectionId !== connectionId), 'delete')
    },
    async replaceModels(connectionId, models) {
      const records = read()
      const index = records.findIndex(entry => entry.connectionId === connectionId)
      if (index < 0) return
      const record = normalizeStoredConnection({ ...records[index]!, models }, ownerId)
      records[index] = { ...record, updatedAt: new Date().toISOString() }
      write(records, 'replace models')
    }
  }
}
