import type { AppAIConnection } from './connections'
import { endpointHost } from './connections'
import { catalogProviderKey, providerDisplayName, providerInfo } from './providers'

export type CatalogSource = 'hub' | 'app'

export interface CatalogModelEntry {
  modelId: string
  displayName?: string
  /** An identical provider+model exists on the other source; the app row wins. */
  shadowed?: boolean
}

/**
 * One catalogue connection. `provider` carries the provider key (nvidia,
 * google_ai, freellmapi, ...), never an adapter family; `adapterType` stays
 * separate because several providers share the OpenAI-compatible wire format.
 */
export interface CatalogConnection {
  connectionId: string
  provider: string
  name: string
  adapterType: string
  hasKey: boolean
  model: string | null
  models: CatalogModelEntry[]
  providerKey?: string
  providerName?: string
  source?: CatalogSource
}

/** Catalogue ids of app-local connections live in their own namespace. */
export const APP_ID_PREFIX = 'app:'

export function appCatalogId(connectionId: string): string {
  const id = connectionId.trim()
  return id.startsWith(APP_ID_PREFIX) ? id : `${APP_ID_PREFIX}${id}`
}

export function stripAppCatalogId(connectionId: string): string {
  return connectionId.trim().replace(/^app:/, '')
}

/**
 * Builds the catalogue row for an app-local connection. The name is the
 * endpoint host so two connections to the same provider never look identical;
 * the picker shows it beside the provider name.
 */
export function toAppCatalogConnection(
  entry: AppAIConnection,
  options: { hasKey: boolean, name?: string }
): CatalogConnection {
  const info = providerInfo(entry.providerKey)
  return {
    connectionId: entry.connectionId,
    provider: entry.providerKey,
    name: options.name || endpointHost(entry.baseUrl) || info?.name || entry.providerKey,
    adapterType: info?.family ?? 'openai-compatible',
    hasKey: options.hasKey,
    model: entry.models[0]?.modelId ?? null,
    models: entry.models.map(model => ({ ...model }))
  }
}

function shadowKey(providerKey: string, modelId: string): string {
  return `${providerKey}\u0000${modelId}`
}

/**
 * App-local connections first, then Hub connections, with model-level
 * de-duplication across the two sources. Connections are never dropped: only
 * an identical provider+model pair is marked `shadowed` on the Hub side, and
 * the picker hides that row. The Hub catalogue intentionally omits `baseUrl`,
 * so the endpoint cannot be part of the key.
 */
export function mergeCatalog(hub: CatalogConnection[], app: CatalogConnection[]): CatalogConnection[] {
  const appRows: CatalogConnection[] = app.map((connection) => {
    const providerKey = catalogProviderKey(connection.provider)
    return {
      ...connection,
      connectionId: appCatalogId(connection.connectionId),
      provider: providerKey,
      providerKey,
      providerName: providerDisplayName(providerKey),
      source: 'app',
      models: connection.models.map(model => ({ ...model, shadowed: false }))
    }
  })

  const shadowed = new Set(
    appRows.flatMap(connection => connection.models.map(model => shadowKey(connection.providerKey!, model.modelId)))
  )

  const hubRows: CatalogConnection[] = hub.map((connection) => {
    const providerKey = catalogProviderKey(connection.provider)
    const info = providerInfo(providerKey)
    return {
      ...connection,
      provider: providerKey,
      providerKey,
      providerName: providerDisplayName(providerKey),
      adapterType: connection.adapterType || info?.family || 'openai-compatible',
      source: 'hub',
      models: connection.models.map(model => ({
        ...model,
        shadowed: shadowed.has(shadowKey(providerKey, model.modelId))
      }))
    }
  })

  return [...appRows, ...hubRows]
}

/** Models a picker may offer: shadowed Hub rows stay visible in management only. */
export function selectableModels(connection: CatalogConnection): CatalogModelEntry[] {
  return connection.models.filter(model => !model.shadowed)
}
