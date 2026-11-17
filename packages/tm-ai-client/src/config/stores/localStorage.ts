import type { AIConfigStore } from '../store'
import { normalizeStoredConnection, type StoredAIConnection } from '../stored'

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
    try {
      const parsed = JSON.parse(storage.getItem(key) || '[]')
      return Array.isArray(parsed)
        ? parsed.filter(entry => entry && typeof entry.connectionId === 'string')
        : []
    } catch {
      return []
    }
  }

  function write(records: StoredAIConnection[]): void {
    storage.setItem(key, JSON.stringify(records))
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
      write(records)
      return next
    },
    async removeConnection(connectionId) {
      write(read().filter(entry => entry.connectionId !== connectionId))
    },
    async replaceModels(connectionId, models) {
      const records = read()
      const index = records.findIndex(entry => entry.connectionId === connectionId)
      if (index < 0) return
      const record = normalizeStoredConnection({ ...records[index]!, models }, ownerId)
      records[index] = { ...record, updatedAt: new Date().toISOString() }
      write(records)
    }
  }
}
