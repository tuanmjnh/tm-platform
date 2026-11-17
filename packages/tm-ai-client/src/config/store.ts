import type { StoredAIConnection, StoredAIConnectionInput, StoredAIModel } from './stored'

/**
 * One owner's AI configuration. Implementations are constructed with the owner
 * and never accept one per call, so a handler cannot widen scope by accident.
 */
export interface AIConfigStore {
  listConnections(): Promise<StoredAIConnection[]>
  upsertConnection(record: StoredAIConnectionInput): Promise<StoredAIConnection>
  removeConnection(connectionId: string): Promise<void>
  replaceModels(connectionId: string, models: StoredAIModel[]): Promise<void>
  ensureSchema?(): Promise<void>
}

export interface AIConfigStoreScope {
  ownerId: string
}
