import type { AIConfigStore } from '../store'
import { normalizeStoredConnection, type StoredAIConnection, type StoredAIModel } from '../stored'
import { guardStore, storeFailure } from './storeError'

export interface SupabaseFilterLike extends PromiseLike<{ data: unknown[] | null, error: unknown }> {
  eq(column: string, value: unknown): SupabaseFilterLike
  order(column: string, options?: { ascending?: boolean }): Promise<{ data: unknown[] | null, error: unknown }>
  maybeSingle(): Promise<{ data: unknown | null, error: unknown }>
}

export interface SupabaseTableLike {
  select(columns?: string): SupabaseFilterLike
  upsert(row: Record<string, unknown>, options?: { onConflict?: string }): Promise<{ error: unknown }>
  delete(): SupabaseFilterLike
  update(row: Record<string, unknown>): SupabaseFilterLike
}

export interface SupabaseAIConfigClient {
  from(table: string): SupabaseTableLike
}

export interface SupabaseAIConfigOptions {
  table?: string
  scopeColumn?: string
  toRow?: (record: StoredAIConnection) => Record<string, unknown>
  fromRow?: (row: Record<string, unknown>) => StoredAIConnection
}

export const SUPABASE_AI_CONNECTIONS_SQL = `create table if not exists public.ai_connections (
  owner_id text not null,
  connection_id text not null,
  provider_key text not null,
  base_url text not null default '',
  api_key_cipher text not null default '',
  api_key_env text,
  enabled boolean not null default true,
  models jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, connection_id)
);
-- Runs with the service-role key only. Enable RLS without policies so the
-- anon/authenticated keys can never read ciphertext directly.`

const DEFAULT_TABLE = 'ai_connections'
const DEFAULT_SCOPE = 'owner_id'

function defaultToRow(record: StoredAIConnection): Record<string, unknown> {
  return {
    owner_id: record.ownerId,
    connection_id: record.connectionId,
    provider_key: record.providerKey,
    base_url: record.baseUrl,
    api_key_cipher: record.apiKeyCipher,
    api_key_env: record.apiKeyEnv ?? null,
    enabled: record.enabled,
    models: record.models,
    created_at: record.createdAt ?? new Date().toISOString(),
    updated_at: record.updatedAt ?? new Date().toISOString()
  }
}

function defaultFromRow(row: Record<string, unknown>): StoredAIConnection {
  const models = Array.isArray(row.models) ? row.models as StoredAIModel[] : []
  return {
    ownerId: String(row.owner_id ?? ''),
    connectionId: String(row.connection_id ?? ''),
    providerKey: String(row.provider_key ?? 'custom'),
    baseUrl: String(row.base_url ?? ''),
    apiKeyCipher: String(row.api_key_cipher ?? ''),
    ...(row.api_key_env ? { apiKeyEnv: String(row.api_key_env) } : {}),
    enabled: row.enabled !== false,
    models,
    ...(row.created_at ? { createdAt: String(row.created_at) } : {}),
    ...(row.updated_at ? { updatedAt: String(row.updated_at) } : {})
  }
}

export function createSupabaseAIConfigStore(
  client: SupabaseAIConfigClient,
  ownerId: string,
  options: SupabaseAIConfigOptions = {}
): AIConfigStore {
  const table = options.table || DEFAULT_TABLE
  const scope = options.scopeColumn || DEFAULT_SCOPE
  const toRow = options.toRow || defaultToRow
  const fromRow = options.fromRow || defaultFromRow

  function fail(error: unknown, operation: string): never {
    throw storeFailure(operation, error)
  }

  async function findOne(connectionId: string): Promise<StoredAIConnection | null> {
    return guardStore('read', async () => {
      const { data, error } = await client.from(table).select('*').eq(scope, ownerId).eq('connection_id', connectionId).maybeSingle()
      if (error) fail(error, 'read')
      return data ? fromRow(data as Record<string, unknown>) : null
    })
  }

  return {
    async listConnections() {
      return guardStore('list', async () => {
        const { data, error } = await client.from(table).select('*').eq(scope, ownerId).order('connection_id')
        if (error) fail(error, 'list')
        return (data || []).map(row => fromRow(row as Record<string, unknown>))
      })
    },
    async upsertConnection(input) {
      const record = normalizeStoredConnection(input, ownerId)
      const now = new Date().toISOString()
      const existing = await findOne(record.connectionId)
      const stored: StoredAIConnection = {
        ...record,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      }
      return guardStore('upsert', async () => {
        const { error } = await client.from(table).upsert(toRow(stored), {
          onConflict: `${scope},connection_id`
        })
        if (error) fail(error, 'upsert')
        return stored
      })
    },
    async removeConnection(connectionId) {
      await guardStore('delete', async () => {
        const { error } = await client.from(table).delete().eq(scope, ownerId).eq('connection_id', connectionId)
        if (error) fail(error, 'delete')
      })
    },
    async replaceModels(connectionId, models) {
      const existing = await findOne(connectionId)
      if (!existing) return
      const record = normalizeStoredConnection({ ...existing, models }, ownerId)
      await guardStore('replace models', async () => {
        const { error } = await client.from(table).update({
          models: record.models,
          updated_at: new Date().toISOString()
        }).eq(scope, ownerId).eq('connection_id', connectionId)
        if (error) fail(error, 'replace models')
      })
    }
  }
}
