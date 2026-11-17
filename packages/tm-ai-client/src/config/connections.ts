import { providerInfo, resolveProviderKey } from './providers'

/**
 * A connection the app runs itself (mode `local`). The Hub never holds its key
 * and never calls it; the connection is explicit so a hosted deployment cannot
 * silently begin calling a loopback address.
 */
export interface AppAIModel {
  modelId: string
  displayName?: string
}

export interface AppAIConnection {
  connectionId: string
  providerKey: string
  baseUrl: string
  /** Inline key for env-file-only setups. Prefer `apiKeyEnv` on desktop. */
  apiKey?: string
  /** Config slot holding the key (`AI_API_KEY_<SUFFIX>`), encrypted at rest. */
  apiKeyEnv?: string
  models: AppAIModel[]
}

export interface AppAIConfigParseResult {
  connections: AppAIConnection[]
  errors: string[]
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Host (and port) shown beside a local connection so two of them differ. */
export function endpointHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return ''
  }
}

/**
 * Resolves the provider key for one entry. An explicit `providerKey` must be a
 * registry key; the legacy `provider` field may still be an adapter family.
 */
function entryProviderKey(record: Record<string, unknown>, index: number, errors: string[]): string | null {
  const explicitKey = asString(record.providerKey)
  if (explicitKey) {
    if (!providerInfo(explicitKey)) {
      errors.push(`entry ${index}: unknown providerKey "${explicitKey}"`)
      return null
    }
    return resolveProviderKey(explicitKey)
  }

  const legacy = asString(record.provider) || 'openai-compatible'
  const resolved = resolveProviderKey(legacy)
  if (!resolved) {
    errors.push(`entry ${index}: unknown provider "${legacy}"`)
    return null
  }
  return resolved
}

/**
 * Pure and strict: a malformed entry is reported, never partially accepted,
 * because a half-configured connection fails later inside a chat call where
 * the reason is much harder to see.
 */
export function parseAppConnections(raw: unknown): AppAIConfigParseResult {
  const errors: string[] = []
  if (raw === undefined || raw === null || raw === '') return { connections: [], errors }

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return { connections: [], errors }
    try {
      parsed = JSON.parse(text)
    } catch (err: unknown) {
      return { connections: [], errors: [`AI_LOCAL_CONNECTIONS is not valid JSON: ${(err as Error)?.message || 'parse error'}`] }
    }
  }

  if (!Array.isArray(parsed)) {
    return { connections: [], errors: ['AI_LOCAL_CONNECTIONS must be a JSON array'] }
  }

  const seen = new Set<string>()
  const connections: AppAIConnection[] = []

  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`entry ${index}: must be an object`)
      return
    }
    const record = entry as Record<string, unknown>
    const connectionId = asString(record.connectionId)
    const baseUrl = normalizeBaseUrl(asString(record.baseUrl))
    const apiKey = asString(record.apiKey) || undefined
    const apiKeyEnv = asString(record.apiKeyEnv) || undefined

    if (!connectionId) {
      errors.push(`entry ${index}: connectionId is required`)
      return
    }
    if (!baseUrl) {
      errors.push(`entry ${index}: baseUrl is required`)
      return
    }
    if (!isHttpUrl(baseUrl)) {
      errors.push(`entry ${index}: baseUrl must be an http(s) URL`)
      return
    }
    if (apiKeyEnv && !/^AI_API_KEY(_[A-Z0-9_]+)?$/.test(apiKeyEnv)) {
      errors.push(`entry ${index}: apiKeyEnv must be AI_API_KEY or AI_API_KEY_<SUFFIX>`)
      return
    }
    if (seen.has(connectionId)) {
      errors.push(`entry ${index}: duplicate connectionId "${connectionId}"`)
      return
    }

    const providerKey = entryProviderKey(record, index, errors)
    if (!providerKey) return

    const models = Array.isArray(record.models)
      ? record.models
          .map((model) => {
            if (typeof model === 'string') return { modelId: model.trim() }
            if (model && typeof model === 'object') {
              const item = model as { modelId?: unknown, id?: unknown, displayName?: unknown }
              return {
                modelId: asString(item.modelId) || asString(item.id),
                displayName: asString(item.displayName) || undefined
              }
            }
            return { modelId: '' }
          })
          .filter(model => model.modelId)
      : []

    seen.add(connectionId)
    connections.push({ connectionId, providerKey, baseUrl, apiKey, apiKeyEnv, models })
  })

  return { connections, errors }
}

/** Finds a configured connection by id; the `app:` catalogue prefix is ignored. */
export function findAppConnection(connections: AppAIConnection[], connectionId: string): AppAIConnection | undefined {
  const id = asString(connectionId).replace(/^app:/, '')
  if (!id) return undefined
  return connections.find(entry => entry.connectionId === id)
}
