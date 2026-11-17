import { AIClientError } from '../errors'
import { normalizeBaseUrl, type AppAIConnection, type AppAIModel } from './connections'
import { resolveProviderKey } from './providers'

export interface StoredAIModel {
  modelId: string
  displayName?: string
  enabled: boolean
  isPrimary?: boolean
  discoveredAt?: string
}

export interface StoredAIConnection {
  ownerId: string
  connectionId: string
  providerKey: string
  baseUrl: string
  apiKeyCipher: string
  apiKeyEnv?: string
  enabled: boolean
  models: StoredAIModel[]
  createdAt?: string
  updatedAt?: string
}

export type StoredAIConnectionInput = Omit<StoredAIConnection, 'ownerId' | 'models' | 'createdAt' | 'updatedAt'> & {
  models?: Array<Partial<StoredAIModel> & { modelId: string }>
}

const CONNECTION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function cleanModels(input: StoredAIConnectionInput['models']): StoredAIModel[] {
  const seen = new Set<string>()
  const models: StoredAIModel[] = []
  for (const model of input ?? []) {
    const modelId = String(model?.modelId ?? '').trim()
    if (!modelId || seen.has(modelId)) continue
    seen.add(modelId)
    const displayName = typeof model.displayName === 'string' ? model.displayName.trim() : ''
    models.push({
      modelId,
      ...(displayName ? { displayName } : {}),
      enabled: model.enabled !== false,
      ...(model.isPrimary ? { isPrimary: true } : {}),
      ...(typeof model.discoveredAt === 'string' && model.discoveredAt ? { discoveredAt: model.discoveredAt } : {})
    })
  }
  return models
}

export function normalizeStoredConnection(input: StoredAIConnectionInput, ownerId: string): StoredAIConnection {
  const connectionId = String(input.connectionId ?? '').trim()
  if (!CONNECTION_ID_RE.test(connectionId)) {
    throw new AIClientError('ai.bad-shape', 'connectionId must match [A-Za-z0-9][A-Za-z0-9._:-]{0,127}')
  }
  const providerKey = resolveProviderKey(input.providerKey) ?? 'custom'
  const apiKeyEnv = String(input.apiKeyEnv ?? '').trim()
  return {
    ownerId,
    connectionId,
    providerKey,
    baseUrl: normalizeBaseUrl(String(input.baseUrl ?? '')),
    apiKeyCipher: String(input.apiKeyCipher ?? '').trim(),
    ...(apiKeyEnv ? { apiKeyEnv } : {}),
    enabled: input.enabled !== false,
    models: cleanModels(input.models)
  }
}

/**
 * The catalogue/picker shape. Disabled models never reach a picker; the cipher
 * never leaves the store layer.
 */
export function storedToAppConnection(
  record: StoredAIConnection,
  options: { apiKey?: string, includeDisabledModels?: boolean } = {}
): AppAIConnection {
  const models: AppAIModel[] = record.models
    .filter(model => options.includeDisabledModels || model.enabled)
    .map(model => ({
      modelId: model.modelId,
      ...(model.displayName ? { displayName: model.displayName } : {})
    }))
  return {
    connectionId: record.connectionId,
    providerKey: record.providerKey,
    baseUrl: record.baseUrl,
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(record.apiKeyEnv ? { apiKeyEnv: record.apiKeyEnv } : {}),
    models
  }
}
