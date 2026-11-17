# App-local AI config (per-app DB storage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each TM app stores its own AI provider/model connections (keys encrypted at rest) in its own database through one shared `AIConfigStore` interface shipped by `@tuanmjnh/tm-ai-client`, without routing configuration through TM Hub.

**Architecture:** The package gains `config/stored.ts` (record shape + validation + stored→`AppAIConnection` mapping), `config/secretBox.ts` (AES-256-GCM over WebCrypto), `config/store.ts` (the `AIConfigStore` interface) and three injected-client drivers (`stores/mongo.ts`, `stores/supabase.ts`, `stores/localStorage.ts`). tm-tools (MongoDB) and tm-studio (MongoDB on desktop *and* Vercel) implement Nitro endpoints around the Mongo driver; tm-studio's Electron main generates the master key on first run and keeps it keychain-encrypted. tm-hub is verified only: it already stores provider config in its own Supabase tables, and its relational schema does not fit the generic driver without duplicating hub-only semantics (see Phase 4 rationale).

**Tech Stack:** TypeScript (tsup, `node --test`), WebCrypto (`globalThis.crypto.subtle`), MongoDB driver (structural typing, no package dependency in the library), Supabase PostgREST client (structural typing), Nuxt 4 / Nitro / h3, Vue 3 + Nuxt UI v4 (`AIConnectionsEditor` from `@tuanmjnh/tm-ui`), Electron `safeStorage` (tm-studio).

**Spec:** `docs/superpowers/specs/2026-11-17-app-local-ai-config-db-design.md`

## Global Constraints

- Never edit a test to force PASS. Extending a pin (e.g. the `SECRET_SLOT_RE` drift pin) to include a new legitimate slot is allowed; loosening an assertion is not.
- Do **not** run `pnpm install`. Two steps need dependency changes and are owner-gated: publishing `@tuanmjnh/tm-ai-client@0.4.0` (npm OTP is the owner's) and adding `mongodb` to tm-studio. Ask before running either.
- Never edit `.env` files; the owner edits environment themselves. Never print, log or commit API keys or `AI_CONFIG_SECRET`.
- Keys are encrypted at rest in every store (`v1.<iv>.<cipher>`); no endpoint may ever return `apiKey`, `apiKeyCipher` or the master key. Only `hasKey` leaves the server.
- Every driver is scoped to one `ownerId` at construction; callers never pass an owner per call.
- Package has no database/runtime dependency: drivers accept injected `db` / Supabase client / `Storage` handles (`tsconfig` has no DOM or Node lib, so use structural types).
- Gate order per Nuxt app: `node node_modules/nuxt/bin/nuxt.mjs typecheck` (regenerates `.nuxt/eslint.config.mjs`) → lint only touched files with `node node_modules/eslint/bin/eslint.js` → unit suite. Never use `npx` in these repos (it resolves from `D:\Applications`).
- After any `@tuanmjnh/tm-ui` bump, re-copy `packages/tm-ui/dist/tm-ui-globals.client.ts.txt` over `app/plugins/tm-ui-globals.client.ts` in tm-tools, tm-studio and tm-hub.
- Do not touch user WIP: tm-tools `server/modules/document/image-convert-executor.ts`, `server/modules/pdf/images-to-pdf.ts`, `server/modules/document/runtime.ts`. Stage exact files only; tm-tools has ~39 pre-existing modified files that must not be committed.
- tm-tools dev server runs on :4002 (`node node_modules/nuxt/bin/nuxt.mjs dev --port 4002`); restart it after dependency changes (stale Vite dep cache).
- No decorative animations, no emojis in UI or docs.
- tm-platform packages are published from `dist/`; tests import `../dist/index.js`, so build before test.

---

## File Structure

**tm-platform / `packages/tm-ai-client`**
- Modify `src/errors.ts` — add codes `ai.bad-master-key`, `ai.no-crypto`, `ai.store-failed`.
- Create `src/config/secretBox.ts` — base64/hex helpers, `generateMasterKey`, `decodeMasterKey`, `sealSecret`, `openSecret`.
- Create `src/config/stored.ts` — `StoredAIModel`, `StoredAIConnection`, `StoredAIConnectionInput`, `normalizeStoredConnection`, `storedToAppConnection`.
- Create `src/config/store.ts` — `AIConfigStore` interface.
- Create `src/config/stores/mongo.ts` — `createMongoAIConfigStore(db, ownerId, options)`.
- Create `src/config/stores/supabase.ts` — `createSupabaseAIConfigStore(client, ownerId, options)` (single-table JSON layout).
- Create `src/config/stores/localStorage.ts` — `createLocalStorageAIConfigStore(storage, ownerId, options)`.
- Modify `src/index.ts` — export the new modules.
- Create `tests/ai-config-store.test.mjs` — store driver + secretBox tests (in-memory fakes).
- Modify `package.json` — version `0.4.0`.

**tm-tools**
- Create `server/utils/aiConfigStore.ts` — Mongo store factory, owner scoping, master-key resolution, env import, safe-row mapper.
- Create `server/api/v1/ai/connections/index.get.ts`, `index.put.ts`, `[connectionId].delete.ts`, `[connectionId]/models/refresh.post.ts`, `[connectionId]/test.post.ts`.
- Modify `server/utils/aiGateway.ts` — DB-first local catalogue + chat routing (env only as fallback/bootstrap).
- Modify `app/pages/system/settings/ai-local.vue` — CRUD against the new endpoints.
- Create `tests/unit/ai_config_store.spec.ts` — owner scoping, no-secret serialisation, env import, endpoint contract.
- Verify/fix `app/components/aiProviders/ModelSelect.vue` + `app/pages/chat.vue` + tm-ui `ModelSelect.vue` truncation for the app-row defect.

**tm-studio**
- Modify `package.json` — add `mongodb` (owner-gated).
- Create `server/utils/aiConfigMongo.ts` — Mongo client singleton + store factory + master key.
- Create `server/api/v1/ai/connections/index.get.ts`, `index.put.ts`, `[connectionId].delete.ts`, `[connectionId]/models/refresh.post.ts`, `[connectionId]/test.post.ts`, `[connectionId]/chat.post.ts`.
- Modify `app/composables/useTmcutAi.ts` — merge app-local catalogue; route `app:` chat calls to the local endpoint.
- Modify `electron/tools/secret-slots.cjs` + `electron/main.cjs` — `AI_CONFIG_SECRET` slot + first-run generation.
- Modify `app/pages/system/ai-keys.vue` — local connections section using `AIConnectionsEditor`.
- Create `tests/unit/tmcut_ai_config_store.spec.ts`.

**tm-hub**
- No code change (Phase 4 verifies and documents); `app/plugins/tm-ui-globals.client.ts` already synced.

**Docs**
- `tm-platform/README.md` (package exports), `tm-platform/docs/` usage page.
- `tm-tools/docs/`, `tm-studio/docs/` (Mongo env + Vercel notes), `tm-hub/docs/` note.

---

## Phase 1 — Shared package (`@tuanmjnh/tm-ai-client@0.4.0`)

### Task 1: Secret box (AES-256-GCM)

**Files:**
- Modify: `packages/tm-ai-client/src/errors.ts`
- Create: `packages/tm-ai-client/src/config/secretBox.ts`
- Test: `packages/tm-ai-client/tests/ai-config-store.test.mjs`

**Interfaces:**
- Consumes: `AIClientError` from `src/errors.ts`.
- Produces: `generateMasterKey(): string`, `decodeMasterKey(secret: string): Uint8Array`, `sealSecret(masterKey: string | Uint8Array, plain: string): Promise<string>`, `openSecret(masterKey: string | Uint8Array, sealed: string): Promise<string>`.

- [ ] **Step 1: Extend the error union**

In `src/errors.ts`, add three codes to `AIClientErrorCode`:

```ts
  | 'ai.bad-master-key'
  | 'ai.no-crypto'
  | 'ai.store-failed'
```

- [ ] **Step 2: Write the failing test**

Append to `tests/ai-config-store.test.mjs` (create the file):

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeMasterKey,
  generateMasterKey,
  openSecret,
  sealSecret
} from '../dist/index.js'

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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: FAIL — `generateMasterKey` is not exported.

- [ ] **Step 4: Implement `src/config/secretBox.ts`**

```ts
import { AIClientError } from '../errors'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const KEY_BYTES = 32
const IV_BYTES = 12

interface SubtleLike {
  importKey(format: string, keyData: Uint8Array, algorithm: string, extractable: boolean, usages: string[]): Promise<unknown>
  encrypt(algorithm: { name: string, iv: Uint8Array }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
  decrypt(algorithm: { name: string, iv: Uint8Array }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
}

interface CryptoLike {
  getRandomValues<T extends Uint8Array>(array: T): T
  subtle: SubtleLike
}

function cryptoApi(): CryptoLike {
  const api = (globalThis as { crypto?: CryptoLike }).crypto
  if (!api?.subtle) {
    throw new AIClientError('ai.no-crypto', 'WebCrypto is unavailable in this runtime')
  }
  return api
}

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += B64[b0 >> 2]
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]
    out += b2 === undefined ? '=' : B64[b2 & 63]
  }
  return out
}

export function fromBase64(value: string): Uint8Array {
  const clean = String(value || '').replace(/=+$/, '')
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    const index = B64.indexOf(ch)
    if (index < 0) throw new AIClientError('ai.bad-shape', 'Invalid base64 payload')
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
    }
  }
  return Uint8Array.from(out)
}

function hexToBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function generateMasterKey(): string {
  return toBase64(cryptoApi().getRandomValues(new Uint8Array(KEY_BYTES)))
}

export function decodeMasterKey(secret: string): Uint8Array {
  const value = String(secret || '').trim()
  const bytes = /^[0-9a-fA-F]{64}$/.test(value) ? hexToBytes(value) : fromBase64(value)
  if (bytes.length !== KEY_BYTES) {
    throw new AIClientError('ai.bad-master-key', `AI_CONFIG_SECRET must decode to ${KEY_BYTES} bytes (got ${bytes.length})`)
  }
  return bytes
}

async function importAesKey(masterKey: string | Uint8Array): Promise<unknown> {
  const bytes = typeof masterKey === 'string' ? decodeMasterKey(masterKey) : masterKey
  return cryptoApi().subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function sealSecret(masterKey: string | Uint8Array, plain: string): Promise<string> {
  const api = cryptoApi()
  const key = await importAesKey(masterKey)
  const iv = api.getRandomValues(new Uint8Array(IV_BYTES))
  const cipher = await api.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(String(plain))
  )
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`
}

export async function openSecret(masterKey: string | Uint8Array, sealed: string): Promise<string> {
  const parts = String(sealed || '').split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new AIClientError('ai.bad-shape', 'Stored secret is not v1 ciphertext')
  }
  try {
    const key = await importAesKey(masterKey)
    const plain = await cryptoApi().subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parts[1]!) },
      key,
      fromBase64(parts[2]!)
    )
    return new TextDecoder().decode(plain)
  } catch (err) {
    if (err instanceof AIClientError) throw err
    throw new AIClientError('ai.bad-shape', 'The configured master key cannot decrypt this value')
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: PASS 3 tests.

- [ ] **Step 6: Commit**

```bash
cd packages/tm-ai-client && git add src/errors.ts src/config/secretBox.ts tests/ai-config-store.test.mjs
git commit -m "feat(ai-config): AES-256-GCM secret box for app-local provider keys"
```

### Task 2: Stored records + validation + stored→AppAIConnection

**Files:**
- Create: `packages/tm-ai-client/src/config/stored.ts`
- Test: `packages/tm-ai-client/tests/ai-config-store.test.mjs`

**Interfaces:**
- Consumes: `resolveProviderKey` (`config/providers`), `AppAIConnection` (`config/connections`), `AIClientError`.
- Produces: `StoredAIModel`, `StoredAIConnection`, `StoredAIConnectionInput`, `normalizeStoredConnection(input, ownerId)`, `storedToAppConnection(record, options?)`.

- [ ] **Step 1: Write the failing test**

```js
import {
  normalizeStoredConnection,
  storedToAppConnection
} from '../dist/index.js'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement `src/config/stored.ts`**

```ts
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
```

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts`:

```ts
export * from './config/secretBox'
export * from './config/stored'
export * from './config/store'
export * from './config/stores/mongo'
export * from './config/stores/supabase'
export * from './config/stores/localStorage'
```

(`store.ts` and the three driver files land in Tasks 3–5; until then export only the two lines above so the build stays green.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: PASS 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/config/stored.ts src/index.ts tests/ai-config-store.test.mjs
git commit -m "feat(ai-config): stored connection records and catalogue mapping"
```

### Task 3: `AIConfigStore` interface

**Files:**
- Create: `packages/tm-ai-client/src/config/store.ts`

**Interfaces:**
- Consumes: `StoredAIConnection`, `StoredAIConnectionInput`, `StoredAIModel`.
- Produces: `AIConfigStore`, `AIConfigStoreScope`.

- [ ] **Step 1: Write the interface**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/tm-ai-client && pnpm typecheck`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/config/store.ts
git commit -m "feat(ai-config): AIConfigStore contract"
```

### Task 4: MongoDB driver (structural, no dependency)

**Files:**
- Create: `packages/tm-ai-client/src/config/stores/mongo.ts`
- Test: `packages/tm-ai-client/tests/ai-config-store.test.mjs`

**Interfaces:**
- Consumes: `AIConfigStore`, `normalizeStoredConnection`, `StoredAIConnection`, `StoredAIModel`.
- Produces: `MongoCollectionLike`, `MongoDatabaseLike`, `createMongoAIConfigStore(db: MongoDatabaseLike, ownerId: string, options?: { collectionName?: string }): AIConfigStore`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: FAIL — `createMongoAIConfigStore` not exported.

- [ ] **Step 3: Implement `src/config/stores/mongo.ts`**

```ts
import type { AIConfigStore } from '../store'
import { normalizeStoredConnection, type StoredAIConnection, type StoredAIModel } from '../stored'

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
      await collection.updateOne(
        { ownerId, connectionId: record.connectionId },
        { $set: stored, $setOnInsert: { createdAt: stored.createdAt } },
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
        ...(await findOne(connectionId)) ?? { connectionId, providerKey: 'custom', baseUrl: '', apiKeyCipher: '' },
        models
      }, ownerId)
      await collection.updateOne(
        { ownerId, connectionId },
        { $set: { models: record.models, updatedAt: new Date().toISOString() } }
      )
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: PASS 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/config/stores/mongo.ts tests/ai-config-store.test.mjs
git commit -m "feat(ai-config): MongoDB store driver with owner-scoped indexes"
```

### Task 5: localStorage driver

**Files:**
- Create: `packages/tm-ai-client/src/config/stores/localStorage.ts`
- Test: `packages/tm-ai-client/tests/ai-config-store.test.mjs`

**Interfaces:**
- Consumes: `AIConfigStore`, `StoredAIConnection`.
- Produces: `KeyValueStorageLike`, `createLocalStorageAIConfigStore(storage: KeyValueStorageLike, ownerId: string, options?: { keyPrefix?: string }): AIConfigStore`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: FAIL — export missing.

- [ ] **Step 3: Implement `src/config/stores/localStorage.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: PASS 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/config/stores/localStorage.ts tests/ai-config-store.test.mjs
git commit -m "feat(ai-config): localStorage driver for personal clients"
```

### Task 6: Supabase driver (single-table JSON layout)

**Files:**
- Create: `packages/tm-ai-client/src/config/stores/supabase.ts`
- Test: `packages/tm-ai-client/tests/ai-config-store.test.mjs`

**Interfaces:**
- Consumes: `AIConfigStore`, `StoredAIConnection`.
- Produces: `SupabaseAIConfigClient`, `SupabaseAIConfigOptions`, `createSupabaseAIConfigStore(client, ownerId, options?)`, plus `SUPABASE_AI_CONNECTIONS_SQL` (a ready-to-run `create table` snippet exported for docs).

Design note: this driver targets the generic single-table layout shipped in the SQL snippet —
`ai_connections(owner_id, connection_id, provider_key, base_url, api_key_cipher, api_key_env, enabled, models jsonb, created_at, updated_at)`
with unique `(owner_id, connection_id)`. tm-hub's relational `connections` + `ai_models` schema is **not** this layout; adopting it is deferred (see Phase 4 rationale).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: FAIL — export missing.

- [ ] **Step 3: Implement `src/config/stores/supabase.ts`**

```ts
import type { AIConfigStore } from '../store'
import { normalizeStoredConnection, type StoredAIConnection, type StoredAIModel } from '../stored'

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
    const message = error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error)
    throw new Error(`AI config store ${operation} failed: ${message}`)
  }

  async function findOne(connectionId: string): Promise<StoredAIConnection | null> {
    const { data, error } = await client.from(table).select('*').eq(scope, ownerId).eq('connection_id', connectionId).maybeSingle()
    if (error) fail(error, 'read')
    return data ? fromRow(data as Record<string, unknown>) : null
  }

  return {
    async listConnections() {
      const { data, error } = await client.from(table).select('*').eq(scope, ownerId).order('connection_id')
      if (error) fail(error, 'list')
      return (data || []).map(row => fromRow(row as Record<string, unknown>))
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
      const { error } = await client.from(table).upsert(toRow(stored), {
        onConflict: `${scope},connection_id`
      })
      if (error) fail(error, 'upsert')
      return stored
    },
    async removeConnection(connectionId) {
      const { error } = await client.from(table).delete().eq(scope, ownerId).eq('connection_id', connectionId)
      if (error) fail(error, 'delete')
    },
    async replaceModels(connectionId, models) {
      const existing = await findOne(connectionId)
      if (!existing) return
      const record = normalizeStoredConnection({ ...existing, models }, ownerId)
      const { error } = await client.from(table).update({
        models: record.models,
        updated_at: new Date().toISOString()
      }).eq(scope, ownerId).eq('connection_id', connectionId)
      if (error) fail(error, 'replace models')
    }
  }
}
```

Note: the default row mappers hard-code `owner_id` column names for the shipped layout; pass `toRow`/`fromRow` (and `scopeColumn`) to map a different column set.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tm-ai-client && pnpm build && node --test tests/ai-config-store.test.mjs`
Expected: PASS 11 tests. If the fake's `then` chain misbehaves, fix the **fake**, not the driver — the driver's awaited chain is the contract used by real PostgREST clients.

- [ ] **Step 5: Commit**

```bash
git add src/config/stores/supabase.ts tests/ai-config-store.test.mjs
git commit -m "feat(ai-config): Supabase driver and table snippet"
```

### Task 7: Version 0.4.0, exports, docs, full package gates

**Files:**
- Modify: `packages/tm-ai-client/package.json` (`"version": "0.4.0"`)
- Modify: `packages/tm-ai-client/README.md` (exports + usage matrix)
- Modify: `pnpm-workspace.yaml` (`minimumReleaseAgeExclude` — only when publishing is approved)

**Interfaces:**
- Produces: published `@tuanmjnh/tm-ai-client@0.4.0` exporting everything above.

- [ ] **Step 1: Bump version and document**

`package.json`: `"version": "0.4.0"`. In `README.md` add a section:

```markdown
## App-local AI configuration (0.4.0)

| Driver | Use it for | Constructor |
| --- | --- | --- |
| `createMongoAIConfigStore(db, ownerId)` | tm-tools, tm-studio (desktop + Vercel) | injected `Db` |
| `createSupabaseAIConfigStore(client, ownerId)` | Supabase deployments | injected client, `ai_connections` table (`SUPABASE_AI_CONNECTIONS_SQL`) |
| `createLocalStorageAIConfigStore(storage, ownerId)` | personal/browser clients | injected `Storage` |

Keys are sealed with `sealSecret(AI_CONFIG_SECRET, key)` before `upsertConnection`;
records expose `apiKeyCipher` only. Use `storedToAppConnection()` to build picker rows.
```

- [ ] **Step 2: Run the full package gates**

```bash
cd packages/tm-ai-client
pnpm build
pnpm typecheck
node --test "tests/**/*.test.mjs"
```

Expected: build exit 0; typecheck exit 0 and `grep -c "error TS"` = 0; all tests pass (quote the count).

- [ ] **Step 3: Commit**

```bash
git add package.json README.md
git commit -m "chore(ai-client): 0.4.0 app-local config drivers"
```

### Task 8: Publish checkpoint (owner-gated)

- [ ] **Step 1: Ask the owner before publishing**

Run only after explicit approval:

```bash
cd packages/tm-ai-client && pnpm publish
```

Expected: npm prompts for the owner's OTP; version `0.4.0` appears in the registry.
- If not approved, mark Phase 2/3 tasks that need the new package as BLOCKED and continue with Phase 4/5 docs work.
- After publish, add `@tuanmjnh/tm-ai-client@0.4.0` to `pnpm-workspace.yaml` `minimumReleaseAgeExclude` (same line family as 0.2.1/0.1.4), commit, and only then bump app dependencies.

---

## Phase 2 — tm-tools (MongoDB, per-account)

### Task 9: Server store util (owner scope, master key, env import)

**Files:**
- Create: `tm-tools/server/utils/aiConfigStore.ts`
- Create: `tm-tools/tests/unit/ai_config_store.spec.ts`

**Interfaces:**
- Consumes: `createMongoAIConfigStore`, `sealSecret`, `openSecret`, `generateMasterKey`, `storedToAppConnection` from `@tuanmjnh/tm-ai-client`; `getSharedConnection` (`server/modules/database/shared`); `requireChatUser` (`server/utils/chatAuth`); `parseAppConnections` for the legacy env import.
- Produces:
  - `type SafeAIConnection` (renderer shape, never a secret)
  - `resolveAIConfigSecret(): string | null`
  - `requireAIConfigSecret(): string`
  - `aiConfigStore(ownerId: string): AIConfigStore`
  - `safeConnection(record: StoredAIConnection): SafeAIConnection`
  - `storeOwnerId(event): string`
  - `importEnvConnections(ownerId: string): Promise<number>`
  - `configuredConnections(event?): Promise<AppAIConnection[]>` (DB rows decrypted for server use; env fallback)
  - `findConfiguredConnection(connectionId, event?): Promise<AppAIConnection | undefined>`

- [ ] **Step 1: Write the failing spec**

`tests/unit/ai_config_store.spec.ts` (specs run via `tsx`, one process each; assert directly and `process.exit(1)` on failure with a printed `FAILED` line — match the existing specs' style):

```ts
import assert from 'node:assert/strict'

let failures = 0
function check(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve().then(fn).then(
    () => console.log(`PASS ${name}`),
    (err) => { failures++; console.log(`FAILED ${name}: ${(err as Error).message}`) }
  )
}

class MemoryCollection {
  docs: Array<Record<string, any>> = []
  indexes: Array<[Record<string, unknown>, Record<string, unknown>?]> = []
  async createIndex(spec: Record<string, unknown>, opts?: Record<string, unknown>) { this.indexes.push([spec, opts]) }
  async find(filter: Record<string, unknown>) {
    const hit = (doc: Record<string, unknown>) => Object.entries(filter).every(([k, v]) => doc[k] === v)
    return { async toArray() { return this.docs.filter(hit).map(doc => ({ ...doc })) } }
  }
  async findOne(filter: Record<string, unknown>) {
    const hit = (doc: Record<string, unknown>) => Object.entries(filter).every(([k, v]) => doc[k] === v)
    return this.docs.find(hit) ?? null
  }
  async updateOne(filter: Record<string, unknown>, update: Record<string, any>, opts?: { upsert?: boolean }) {
    const hit = (doc: Record<string, unknown>) => Object.entries(filter).every(([k, v]) => doc[k] === v)
    let doc = this.docs.find(hit)
    if (!doc) {
      if (!opts?.upsert) return {}
      doc = { ...filter }
      this.docs.push(doc)
    }
    Object.assign(doc, update.$set ?? {})
    return {}
  }
  async deleteOne(filter: Record<string, unknown>) {
    const hit = (doc: Record<string, unknown>) => Object.entries(filter).every(([k, v]) => doc[k] === v)
    const i = this.docs.findIndex(hit)
    if (i >= 0) this.docs.splice(i, 1)
    return {}
  }
}

const collections = new Map<string, MemoryCollection>()
;(globalThis as any).__fakeMongo = {
  collection(name: string) {
    if (!collections.has(name)) collections.set(name, new MemoryCollection())
    return collections.get(name)
  }
}
;(globalThis as any).__env = { AI_LOCAL_CONNECTIONS: JSON.stringify([{ connectionId: 'legacy', providerKey: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', models: ['llama3.2'], apiKey: 'legacy-key' }]) }

await import('../server/utils/aiConfigStore') // imported after the fakes so the module-level client factory sees them
const mod = await import('../server/utils/aiConfigStore')

await check('safeConnection never leaks the cipher', () => {
  const safe = mod.safeConnection({
    ownerId: 'u1', connectionId: 'lab', providerKey: 'ollama', baseUrl: 'http://x', apiKeyCipher: 'v1.a.b',
    enabled: true, models: [{ modelId: 'llama3.2', enabled: true, isPrimary: true }]
  })
  assert.equal(JSON.stringify(safe).includes('v1.a.b'), false)
  assert.equal(safe.hasKey, true)
  assert.equal(safe.models[0].modelId, 'llama3.2')
})

await check('env import seals the inline key once per account', async () => {
  const store = mod.aiConfigStore('u1')
  const count = await mod.importEnvConnections('u1')
  assert.equal(count, 1)
  const rows = await store.listConnections()
  assert.equal(rows.length, 1)
  assert.match(rows[0].apiKeyCipher, /^v1\./)
  assert.equal(rows[0].apiKeyCipher.includes('legacy-key'), false)
  assert.equal(await mod.importEnvConnections('u1'), 0)
})

await check('decryption resolves the inline key for server calls', async () => {
  const entries = await mod.configuredConnections({ context: { auth: { userId: 'u1' } } } as any)
  assert.equal(entries[0].apiKey, 'legacy-key')
  assert.deepEqual(entries[0].models.map(m => m.modelId), ['llama3.2'])
})

if (failures) {
  console.log(`${failures} FAILED`)
  process.exit(1)
}
console.log('ai_config_store: all checks passed')
```

Implementation note for the spec: `aiConfigStore.ts` must read the Mongo handle and secret through injectable module hooks so this spec can substitute fakes, e.g. export `__setTestHooks({ db, secret, env })` guarded to `process.env.NODE_ENV === 'test'`. Do not loosen the assertions if the flow differs — adjust the util.

- [ ] **Step 2: Run spec to verify it fails**

Run: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/ai_config_store.spec.ts`
Expected: FAILED — module not found.

- [ ] **Step 3: Implement `server/utils/aiConfigStore.ts`**

```ts
import type { H3Event } from 'h3'
import {
  createMongoAIConfigStore,
  generateMasterKey,
  openSecret,
  parseAppConnections,
  sealSecret,
  storedToAppConnection,
  type AIConfigStore,
  type AppAIConnection,
  type StoredAIConnection
} from '@tuanmjnh/tm-ai-client'
import { getSharedConnection } from '../modules/database/shared'
import { requireChatUser } from './chatAuth'

export interface SafeAIModel {
  modelId: string
  displayName?: string
  enabled: boolean
  isPrimary?: boolean
}

export interface SafeAIConnection {
  connectionId: string
  providerKey: string
  providerName: string
  baseUrl: string
  apiKeyEnv: string | null
  hasKey: boolean
  enabled: boolean
  models: SafeAIModel[]
}

interface TestHooks {
  db?: { collection(name: string): unknown }
  secret?: string | null
  env?: Record<string, string | undefined>
}

let hooks: TestHooks = {}

export function __setTestHooks(next: TestHooks): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('test hooks are not available')
  hooks = next
}

function envValue(key: string): string | undefined {
  return (hooks.env ?? process.env)[key]
}

export function resolveAIConfigSecret(): string | null {
  if (hooks.secret !== undefined) return hooks.secret
  const value = String(process.env.AI_CONFIG_SECRET || '').trim()
  return value || null
}

export function requireAIConfigSecret(): string {
  const secret = resolveAIConfigSecret()
  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'error.aiConfigSecretMissing',
      message: 'AI_CONFIG_SECRET is not configured on this server'
    })
  }
  return secret
}

/** Generated lazily so a read-only deployment can still list env connections. */
let ephemeralSecret: string | null = null
function secretForWrite(): string {
  const configured = resolveAIConfigSecret()
  if (configured) return configured
  if (!ephemeralSecret) {
    console.warn('[ai-config] AI_CONFIG_SECRET is unset; using an ephemeral master key (keys will not survive a restart)')
    ephemeralSecret = generateMasterKey()
  }
  return ephemeralSecret
}

export function storeOwnerId(event: H3Event): string {
  return requireChatUser(event).userId
}

export function aiConfigStore(ownerId: string): AIConfigStore {
  const db = (hooks.db ?? null) as { collection(name: string): any } | null
  if (db) return createMongoAIConfigStore(db as any, ownerId)
  // getSharedConnection is async; Mongo driver construction is synchronous, so
  // the first operation awaits the connection through this proxy.
  const proxy = {
    collection(name: string) {
      return new Proxy({}, {
        get(_target, prop: string) {
          return async (...args: unknown[]) => {
            const { db: live } = await getSharedConnection()
            return (live.collection(name) as any)[prop](...args)
          }
        }
      })
    }
  }
  return createMongoAIConfigStore(proxy as any, ownerId)
}

export function safeConnection(record: StoredAIConnection): SafeAIConnection {
  const apiKeyEnv = record.apiKeyEnv ?? null
  return {
    connectionId: record.connectionId,
    providerKey: record.providerKey,
    providerName: providerDisplayName(record.providerKey),
    baseUrl: record.baseUrl,
    apiKeyEnv,
    hasKey: Boolean(record.apiKeyCipher) || !apiKeyEnv,
    enabled: record.enabled,
    models: record.models.map(model => ({
      modelId: model.modelId,
      ...(model.displayName ? { displayName: model.displayName } : {}),
      enabled: model.enabled,
      ...(model.isPrimary ? { isPrimary: true } : {})
    }))
  }
}

export async function sealForKey(plain: string): Promise<string> {
  return sealSecret(secretForWrite(), plain)
}

async function decryptKey(record: StoredAIConnection): Promise<string | undefined> {
  if (record.apiKeyCipher) {
    try {
      return await openSecret(requireAIConfigSecret(), record.apiKeyCipher)
    } catch (err) {
      console.warn(`[ai-config] cannot decrypt connection "${record.connectionId}": ${(err as Error).message}`)
      return undefined
    }
  }
  if (record.apiKeyEnv) return String(process.env[record.apiKeyEnv] || '').trim() || undefined
  return undefined
}

export async function importEnvConnections(ownerId: string): Promise<number> {
  const store = aiConfigStore(ownerId)
  const existing = await store.listConnections()
  if (existing.length) return 0
  const parsed = parseAppConnections(envValue('AI_LOCAL_CONNECTIONS') || '')
  let imported = 0
  for (const entry of parsed.connections) {
    await store.upsertConnection({
      connectionId: entry.connectionId,
      providerKey: entry.providerKey,
      baseUrl: entry.baseUrl,
      apiKeyCipher: entry.apiKey ? await sealForKey(entry.apiKey) : '',
      ...(entry.apiKeyEnv ? { apiKeyEnv: entry.apiKeyEnv } : {}),
      enabled: true,
      models: entry.models.map(model => ({ modelId: model.modelId, displayName: model.displayName, enabled: true }))
    })
    imported++
  }
  return imported
}

export async function configuredConnections(event?: H3Event): Promise<AppAIConnection[]> {
  const ownerId = event?.context?.auth ? storeOwnerId(event) : null
  if (!ownerId) {
    return parseAppConnections(envValue('AI_LOCAL_CONNECTIONS') || '').connections
  }
  await importEnvConnections(ownerId)
  const records = await aiConfigStore(ownerId).listConnections()
  const out: AppAIConnection[] = []
  for (const record of records) {
    if (!record.enabled) continue
    const apiKey = await decryptKey(record)
    out.push(storedToAppConnection(record, { apiKey }))
  }
  return out
}

export async function findConfiguredConnection(connectionId: string, event?: H3Event): Promise<AppAIConnection | undefined> {
  const entries = await configuredConnections(event)
  return entries.find(entry => entry.connectionId === connectionId.replace(/^app:/, ''))
}
```

`providerDisplayName` is imported from `@tuanmjnh/tm-ai-client` as well (add it to the import list).

- [ ] **Step 4: Run spec to verify it passes**

Run: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/ai_config_store.spec.ts`
Expected: `ai_config_store: all checks passed`.

- [ ] **Step 5: Commit**

```bash
git add server/utils/aiConfigStore.ts tests/unit/ai_config_store.spec.ts
git commit -m "feat(ai-config): mongo-backed per-account store for tm-tools"
```

### Task 10: CRUD endpoints

**Files:**
- Create: `tm-tools/server/api/v1/ai/connections/index.get.ts`
- Create: `tm-tools/server/api/v1/ai/connections/index.put.ts`
- Create: `tm-tools/server/api/v1/ai/connections/[connectionId].delete.ts`
- Test: extend `tests/unit/ai_config_store.spec.ts` with a serialisation check.

**Interfaces:**
- Consumes: `aiConfigStore`, `storeOwnerId`, `safeConnection`, `sealForKey`, `importEnvConnections`, `requireAIConfigSecret` from `server/utils/aiConfigStore`.
- Produces: HTTP contract used by the settings page:
  - `GET /api/v1/ai/connections` → `{ success, data: { connections: SafeAIConnection[], envImport: number } }`
  - `PUT /api/v1/ai/connections` body `{ connectionId, providerKey, baseUrl, apiKey?, apiKeyEnv?, enabled?, models? }` → `{ success, data: SafeAIConnection }`
  - `DELETE /api/v1/ai/connections/:connectionId` → `{ success: true }`

- [ ] **Step 1: Add the failing serialisation check**

Append to the spec (before the failure summary):

```ts
await check('GET payload contract carries no ciphertext', async () => {
  const rows = (await mod.aiConfigStore('u1').listConnections()).map(mod.safeConnection)
  const json = JSON.stringify(rows)
  assert.equal(json.includes('apiKeyCipher'), false)
  assert.equal(json.includes('v1.'), false)
  assert.equal(json.includes('legacy-key'), false)
})
```

- [ ] **Step 2: Run spec to verify it fails or passes**

Run: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/ai_config_store.spec.ts`
Expected: PASS (mapper already safe). If it fails, fix `safeConnection`.

- [ ] **Step 3: Implement the endpoints**

`index.get.ts`:

```ts
import { aiConfigStore, importEnvConnections, safeConnection, storeOwnerId } from '../../../../utils/aiConfigStore'

export default defineEventHandler(async (event) => {
  const ownerId = storeOwnerId(event)
  const envImport = await importEnvConnections(ownerId)
  const rows = await aiConfigStore(ownerId).listConnections()
  return { success: true, data: { connections: rows.map(safeConnection), envImport } }
})
```

`index.put.ts`:

```ts
import type { StoredAIModel } from '@tuanmjnh/tm-ai-client'
import { aiConfigStore, requireAIConfigSecret, safeConnection, sealForKey, storeOwnerId } from '../../../../utils/aiConfigStore'

interface Body {
  connectionId?: string
  providerKey?: string
  baseUrl?: string
  apiKey?: string
  apiKeyEnv?: string
  enabled?: boolean
  models?: Array<{ modelId: string, displayName?: string, enabled?: boolean, isPrimary?: boolean }>
}

export default defineEventHandler(async (event) => {
  const ownerId = storeOwnerId(event)
  const body = await readBody<Body>(event)
  if (!body?.connectionId || !body.providerKey) {
    throw createError({ statusCode: 400, statusMessage: 'error.badRequest', message: 'connectionId and providerKey are required' })
  }
  const store = aiConfigStore(ownerId)
  const existing = (await store.listConnections()).find(row => row.connectionId === body.connectionId)
  const typedKey = String(body.apiKey ?? '').trim()
  // An absent/empty key input keeps the stored cipher: the form never echoes it.
  const apiKeyCipher = typedKey ? await sealForKey(typedKey) : existing?.apiKeyCipher ?? ''
  if (apiKeyCipher) requireAIConfigSecret()

  const models: StoredAIModel[] = (body.models ?? existing?.models ?? []).map(model => ({
    modelId: String(model.modelId || '').trim(),
    ...(model.displayName ? { displayName: String(model.displayName) } : {}),
    enabled: model.enabled !== false,
    ...(model.isPrimary ? { isPrimary: true } : {})
  })).filter(model => model.modelId)

  const saved = await store.upsertConnection({
    connectionId: body.connectionId,
    providerKey: body.providerKey,
    baseUrl: body.baseUrl ?? existing?.baseUrl ?? '',
    apiKeyCipher,
    ...(String(body.apiKeyEnv ?? existing?.apiKeyEnv ?? '').trim()
      ? { apiKeyEnv: String(body.apiKeyEnv ?? existing?.apiKeyEnv ?? '').trim() }
      : {}),
    enabled: body.enabled ?? existing?.enabled ?? true,
    models
  })
  return { success: true, data: safeConnection(saved) }
})
```

`[connectionId].delete.ts`:

```ts
import { getRouterParam } from 'h3'
import { aiConfigStore, storeOwnerId } from '../../../../utils/aiConfigStore'

export default defineEventHandler(async (event) => {
  const connectionId = getRouterParam(event, 'connectionId')
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'error.badRequest', message: 'connectionId is required' })
  await aiConfigStore(storeOwnerId(event)).removeConnection(decodeURIComponent(connectionId))
  return { success: true }
})
```

- [ ] **Step 4: Typecheck**

Run: `node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"` then `grep -c "error TS" .gate-typecheck.txt`
Expected: `TC_EXIT=0`, count 0.

- [ ] **Step 5: Commit**

```bash
git add server/api/v1/ai/connections/index.get.ts server/api/v1/ai/connections/index.put.ts "server/api/v1/ai/connections/[connectionId].delete.ts" tests/unit/ai_config_store.spec.ts
git commit -m "feat(ai-config): per-account connection CRUD endpoints"
```

### Task 11: DB-first catalogue and chat routing

**Files:**
- Modify: `tm-tools/server/utils/aiGateway.ts`
- Test: extend `tests/unit/ai_gateway.spec.ts` only with **new** cases; never weaken existing ones.

**Interfaces:**
- Consumes: `configuredConnections`, `findConfiguredConnection`.
- Produces: async `fetchAICatalog` unchanged in signature; `chatWithConnection` unchanged in signature but resolves DB rows first.

- [ ] **Step 1: Write the failing case**

In `tests/unit/ai_gateway.spec.ts` add (same harness style as the file):

```ts
await check('catalogue includes a DB row even when env is empty', async () => {
  process.env.AI_LOCAL_CONNECTIONS = ''
  // Fake auth + fake store hooks are installed here exactly like ai_config_store.spec.ts.
  const catalog = await mod.fetchAICatalog({ context: { auth: { userId: 'u1' } } } as any)
  const app = catalog.find(c => c.connectionId.startsWith('app:'))
  assert.ok(app, 'expected the app-local catalogue row')
  assert.equal(app.source, 'app')
  assert.deepEqual(app.models.map(m => m.modelId), ['auto'])
})
```

(If the existing spec file has no fake-hook infrastructure, import and install the same `__setTestHooks` fakes in a module-scope block before importing `aiGateway`.)

- [ ] **Step 2: Run to verify it fails**

Run: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/ai_gateway.spec.ts`
Expected: FAILED — app row missing.

- [ ] **Step 3: Modify `server/utils/aiGateway.ts`**

Replace `localConnectionAsCatalog` usage and the sync lookups:

```ts
import { configuredConnections, findConfiguredConnection } from './aiConfigStore'

function asCatalog(entry: AppAIConnection): CatalogConnection {
  return toAppCatalogConnection(entry, {
    hasKey: Boolean(entry.apiKey) || Boolean(entry.apiKeyEnv) || true
  })
}

export async function fetchAICatalog(event?: H3Event): Promise<CatalogConnection[]> {
  // Database first: the per-account rows are the source of truth once the
  // feature is on; AI_LOCAL_CONNECTIONS is only a bootstrap import (see
  // configuredConnections) and a fallback when no user is signed in.
  const local = (await configuredConnections(event)).map(asCatalog)
  ...
}
```

Notes:
- `hasKey` for DB rows must be `Boolean(entry.apiKey) || !entry.apiKeyEnv`; the existing env helper already encodes that rule. Reuse it: pass `{ hasKey: Boolean(resolveApiKey(entry)) || !entry.apiKeyEnv }` — `resolveApiKey` already handles inline/env keys, so keep `asCatalog` identical to the old `localConnectionAsCatalog` and only change **where the list comes from**.
- `chatWithConnection` becomes:

```ts
const entry = await findConfiguredConnection(body.connectionId, event)
```

Keep the `relayChat` fallback when not found.
- Delete `localConnectionsAsCatalog` only if nothing else imports it; grep first (`grep -rn "localConnections(" server app tests`). `local-connections.get.ts` stays working: it may keep describing env rows, but update it to describe DB rows when a user is present (see Task 13).

- [ ] **Step 4: Run the gateway spec and the store spec**

```bash
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/ai_gateway.spec.ts
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/ai_config_store.spec.ts
```

Expected: both exit 0 with every pre-existing case still PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/aiGateway.ts tests/unit/ai_gateway.spec.ts
git commit -m "feat(ai-config): route tm-tools catalogue and chat through the account store"
```

### Task 12: Model refresh and connection test endpoints

**Files:**
- Create: `tm-tools/server/api/v1/ai/connections/[connectionId]/models/refresh.post.ts`
- Create: `tm-tools/server/api/v1/ai/connections/[connectionId]/test.post.ts`

**Interfaces:**
- Consumes: `aiConfigStore`, `storeOwnerId`; `createAIClient` from `@tuanmjnh/tm-ai-client`; `ofetch`.
- Produces:
  - `POST .../models/refresh` → `{ success, data: { total, enabled } }`
  - `POST .../test` → `{ success, data: { ok, message, latencyMs } }`

- [ ] **Step 1: Implement refresh**

```ts
import { getRouterParam } from 'h3'
import { ofetch } from 'ofetch'
import { aiConfigStore, decryptKeyForStore, openSecret } from '../../../../../utils/aiConfigStore'

export default defineEventHandler(async (event) => {
  const ownerId = storeOwnerId(event)
  const connectionId = decodeURIComponent(getRouterParam(event, 'connectionId') || '')
  const store = aiConfigStore(ownerId)
  const record = (await store.listConnections()).find(row => row.connectionId === connectionId)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'error.notFound', message: 'Unknown connection' })

  const key = await openConnectionKey(record) // exported from aiConfigStore
  const base = record.baseUrl.replace(/\/+$/, '')
  const res = await ofetch<{ data?: Array<{ id?: string }>, models?: Array<{ name?: string }> }>(`${base}/models`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    timeout: 15_000
  }).catch((err) => {
    throw createError({ statusCode: 502, statusMessage: 'error.aiLocalUpstreamFailed', message: `Model discovery failed: ${(err as Error).message}` })
  })
  const ids = (res.data ?? res.models ?? [])
    .map(entry => String((entry as { id?: string, name?: string }).id || (entry as { name?: string }).name || '').replace(/^models\//, ''))
    .filter(Boolean)
  const previous = new Map(record.models.map(model => [model.modelId, model]))
  const models = ids.map((modelId, index) => ({
    modelId,
    ...(previous.get(modelId)?.displayName ? { displayName: previous.get(modelId)!.displayName } : {}),
    enabled: previous.get(modelId)?.enabled ?? true,
    ...(index === 0 && !previous.size ? { isPrimary: true } : previous.get(modelId)?.isPrimary ? { isPrimary: true } : {})
  }))
  await store.replaceModels(connectionId, models)
  return { success: true, data: { total: models.length, enabled: models.filter(model => model.enabled).length } }
})
```

In `aiConfigStore.ts` export `openConnectionKey(record: StoredAIConnection): Promise<string | undefined>` that wraps the existing private `decryptKey`.

- [ ] **Step 2: Implement test**

```ts
import { getRouterParam } from 'h3'
import { createAIClient } from '@tuanmjnh/tm-ai-client'
import { aiConfigStore, openConnectionKey, storeOwnerId } from '../../../../../utils/aiConfigStore'

export default defineEventHandler(async (event) => {
  const connectionId = decodeURIComponent(getRouterParam(event, 'connectionId') || '')
  const store = aiConfigStore(storeOwnerId(event))
  const record = (await store.listConnections()).find(row => row.connectionId === connectionId)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'error.notFound', message: 'Unknown connection' })
  const model = record.models.find(entry => entry.isPrimary)?.modelId || record.models.find(entry => entry.enabled)?.modelId
  if (!model) throw createError({ statusCode: 400, statusMessage: 'error.aiNoModel', message: 'No enabled model to test' })

  const started = Date.now()
  try {
    const client = createAIClient({
      endpoint: {
        provider: record.providerKey,
        baseUrl: record.baseUrl,
        apiKey: await openConnectionKey(record),
        mode: 'local'
      },
      defaults: { model, maxTokens: 256, timeoutMs: 20_000 }
    })
    const result = await client.complete({ messages: [{ role: 'user', content: 'Reply with exactly: OK' }] })
    return { success: true, data: { ok: true, message: String(result?.content || 'OK').slice(0, 120), latencyMs: Date.now() - started } }
  } catch (err) {
    return { success: true, data: { ok: false, message: String((err as Error).message || err).slice(0, 300), latencyMs: Date.now() - started } }
  }
})
```

Check `createAIClient`'s real options signature in `packages/tm-ai-client/src/client.ts` before committing; mirror the exact shape used in `chatWithConnection` (`endpoint` + call-level `model`/`maxTokens`). If `defaults` is not supported, pass the options on `complete()` instead.

- [ ] **Step 3: Typecheck + lint the new files**

```bash
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
node node_modules/eslint/bin/eslint.js server/api/v1/ai/connections > .gate-eslint.txt 2>&1; echo "LINT_EXIT=$?"
```

Expected: `TC_EXIT=0` with 0 `error TS`; `LINT_EXIT=0`.

- [ ] **Step 4: Commit**

```bash
git add "server/api/v1/ai/connections/[connectionId]/models/refresh.post.ts" "server/api/v1/ai/connections/[connectionId]/test.post.ts" server/utils/aiConfigStore.ts
git commit -m "feat(ai-config): model refresh and connection test endpoints"
```

### Task 13: Settings page CRUD (web-enabled)

**Files:**
- Modify: `tm-tools/app/pages/system/settings/ai-local.vue`
- Modify: `tm-tools/server/api/v1/ai/local-connections.get.ts` (describe DB rows, keep the env view as fallback for anonymous callers)

**Interfaces:**
- Consumes: `GET/PUT/DELETE /api/v1/ai/connections`, refresh/test endpoints, `AIConnectionsEditor`.
- Produces: an editor whose Save persists to Mongo per account; `disabled` is removed (web included).

- [ ] **Step 1: Replace the data source**

Replace the `fetchConnections` body (currently `$fetch('/api/v1/ai/local-connections')`) with:

```ts
const res = await $fetch<{ success: boolean, data: { connections: SafeAIConnection[], envImport: number } }>(
  '/api/v1/ai/connections'
)
rows.value = res.data.connections.map(toEditorRow)
```

Add local types mirroring the endpoint shape (`SafeAIConnection` + editor row) and map `models` to `row.models` (comma-joined string, as the editor expects). Keep the existing `labels` computed.

- [ ] **Step 2: Implement handlers**

```ts
async function saveAll() {
  saving.value = true
  try {
    for (const row of rows.value) {
      const saved = await $fetch<{ success: boolean, data: SafeAIConnection }>('/api/v1/ai/connections', {
        method: 'PUT',
        body: {
          connectionId: row.connectionId,
          providerKey: row.providerKey,
          baseUrl: row.baseUrl,
          apiKey: row.apiKey || undefined,
          apiKeyEnv: row.apiKeyEnv,
          models: splitModels(row.models)
        }
      })
      Object.assign(row, { hasKey: saved.data.hasKey, apiKey: '' })
      delete tests.value[row.connectionId.trim()]
    }
    notify.success(t('settings.aiLocalSaved'))
  } catch (err) {
    notify.error(getErrorMessage(err, key => t(key)))
  } finally {
    saving.value = false
  }
}

async function removeRow(row: EditorRow) {
  await $fetch(`/api/v1/ai/connections/${encodeURIComponent(row.connectionId.trim())}`, { method: 'DELETE' })
  rows.value = rows.value.filter(entry => entry !== row)
}

async function refreshModels(row: EditorRow) {
  const res = await $fetch<{ success: boolean, data: { total: number, enabled: number } }>(
    `/api/v1/ai/connections/${encodeURIComponent(row.connectionId.trim())}/models/refresh`,
    { method: 'POST' }
  )
  row.models = (await fetchRowModels(row.connectionId)) // re-read GET so disabled flags are exact
  notify.success(t('settings.aiModelsRefreshed', { total: res.data.total }))
}

async function testRow(row: EditorRow) {
  testingId.value = row.connectionId.trim()
  try {
    const res = await $fetch<{ success: boolean, data: { ok: boolean, message: string } }>(
      `/api/v1/ai/connections/${encodeURIComponent(row.connectionId.trim())}/test`,
      { method: 'POST' }
    )
    tests.value[row.connectionId.trim()] = res.data
  } finally {
    testingId.value = ''
  }
}
```

- [ ] **Step 3: Template**

Wire `@save="saveAll"`, `@remove="removeRow"` (delete immediately, confirm via `confirm()` or the existing page's confirm pattern), `@test="testRow"`. Remove `:disabled="isWeb"` / the desktop-only guard. Add a "Refresh models" ghost button per row beside Test only when `row.connectionId.trim()` is non-empty.

- [ ] **Step 4: Update `local-connections.get.ts`**

```ts
import { configuredConnections, safeConnection, aiConfigStore, storeOwnerId } from '../../utils/aiConfigStore'

export default defineEventHandler(async (event) => {
  if (event.context.auth) {
    const rows = (await aiConfigStore(storeOwnerId(event)).listConnections()).map(safeConnection)
    return { success: true, data: { connections: rows, errors: [], envVar: 'AI_LOCAL_CONNECTIONS' } }
  }
  const { connections, errors } = describeLocalConnections(event)
  return { success: true, data: { connections, errors, envVar: 'AI_LOCAL_CONNECTIONS' } }
})
```

- [ ] **Step 5: Restart the dev server and verify in the browser**

Kill the :4002 process (`netstat -ano | grep 4002`, then `taskkill //PID <pid> //F`) and restart:

```bash
node node_modules/nuxt/bin/nuxt.mjs dev --port 4002
```

Open `http://localhost:4002/system/settings/ai-local` with the authenticated Chrome session; confirm: labels/descriptions render, Save persists (reload keeps the row), key field stays empty after save with a "saved" hint, Test shows a result, Refresh models updates the comma list.

- [ ] **Step 6: Gates + commit**

```bash
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
node node_modules/eslint/bin/eslint.js app/pages/system/settings/ai-local.vue server/api/v1/ai/local-connections.get.ts > .gate-eslint.txt 2>&1; echo "LINT_EXIT=$?"
git add app/pages/system/settings/ai-local.vue server/api/v1/ai/local-connections.get.ts
git commit -m "feat(ai-config): per-account AI connections editor for tm-tools"
```

### Task 14: Chat picker app-row defect

**Files:**
- Inspect: `tm-tools/app/pages/chat.vue`, `tm-tools/app/components/aiProviders/ModelSelect.vue`, `tm-platform/packages/tm-ui/src/ai/ModelSelect.vue`
- Modify: whichever layer is proven wrong.

**Known evidence:** `/api/v1/chat/models` included the app-local row (`connectionId 'app:<id>'`, modelId `auto`), while the open picker showed hub rows first plus a single "Auto (router picks…)" entry. `tm-ui` `ModelSelect` renders `filteredModels.slice(0, INITIAL_LIMIT)` (30) with infinite scroll; the app row's displayName may be indistinguishable from a router entry.

- [ ] **Step 1: Reproduce with evidence**

Start :4002, open `http://localhost:4002/chat`, open the model menu, and evaluate in the page console via browser-use `evaluate_script`:

```js
const res = await fetch('/api/v1/chat/models', { headers: { accept: 'application/json' } }).then(r => r.json())
const appRows = res.data.filter(m => m.connectionId.startsWith('app:'))
const menu = document.querySelector('[role="listbox"]')
return {
  apiAppRows: appRows,
  apiCount: res.data.length,
  visibleLabels: [...document.querySelectorAll('[role="option"]')].map(el => el.textContent.trim()).slice(0, 40)
}
```

Record: whether `connectionId`/`modelId`/`displayName` of the app row appears among `visibleLabels` (the option label is `displayName`, description is `providerName · connectionName`).

- [ ] **Step 2: Decide and fix**

- If the label is present but ambiguous: set a deterministic label for app rows in `chatModelsFromCatalog` — `displayName` becomes `${displayName} · ${connectionName}` only when `source === 'app'` (tm-tools `server/utils/relayModels.ts`), and add a spec case for it.
- If the label is absent because it sits past the 30-row window: prepend rows whose `source === 'app'` in `chatModelsFromCatalog` ordering (app first) — this also matches the existing "app rows come first" catalogue contract.
- If `shadowed` filters it: inspect `mergeCatalog` in the installed 0.4.0 package and fix the shadow key, not the picker.

- [ ] **Step 3: Verify in the browser**

Reopen the menu with the app row first (or with the disambiguated label), take a snapshot, and confirm both the hub and app rows are selectable and visually distinct (APP chip).

- [ ] **Step 4: Add the regression case**

Add a case to `tests/unit/relay_model_filter.spec.ts` asserting app rows precede hub rows and carry the connection suffix when `source === 'app'`.

- [ ] **Step 5: Gates + commit**

```bash
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/relay_model_filter.spec.ts
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
git add server/utils/relayModels.ts tests/unit/relay_model_filter.spec.ts
git commit -m "fix(chat): keep app-local models visible and distinguishable in the picker"
```

---

## Phase 3 — tm-studio (MongoDB both runtimes, desktop master key)

### Task 15: Mongo dependency (owner-gated) + server store util

**Files:**
- Modify: `tm-studio/package.json` (`mongodb`)
- Create: `tm-studio/server/utils/aiConfigMongo.ts`
- Test: `tm-studio/tests/unit/tmcut_ai_config_store.spec.ts`

**Interfaces:**
- Consumes: `createMongoAIConfigStore`, `sealSecret`, `openSecret`, `storedToAppConnection` from `@tuanmjnh/tm-ai-client@^0.4.0`.
- Produces: `tmStudioAIConfigStore(ownerId)`, `tmStudioSafeConnection(record)`, `tmStudioSeal(plain)`, `tmStudioOpen(record)`, `MONGODB_URI`/`MONGODB_DB` env contract.

- [ ] **Step 1: Ask the owner, then install**

Request approval for the only install in this plan:

```bash
pnpm add mongodb
```

Expected: `mongodb` lands in `dependencies`; do not run a bare `pnpm install`. If approval is refused, mark Phase 3 BLOCKED and finish Phase 5 docs for Phases 1–2 only.

- [ ] **Step 2: Write the failing spec**

`tests/unit/tmcut_ai_config_store.spec.ts` uses the same in-memory fake as Task 9 but imports `server/utils/aiConfigMongo`; assertions: owner scoping, cipher-only rows, `storedToAppConnection` enabled filter, and missing-`AI_CONFIG_SECRET` → `requireStudioAIConfigSecret()` throws a 503-shaped error.

```ts
import assert from 'node:assert/strict'
process.env.AI_CONFIG_SECRET = Buffer.alloc(32, 7).toString('base64')

// Install fakes BEFORE importing the util (module-level hooks).
const mod = await import('../server/utils/aiConfigMongo')
const store = mod.tmStudioAIConfigStore('user-1')
await store.upsertConnection({ connectionId: 'lab', providerKey: 'openai', baseUrl: 'https://api.openai.com/v1', apiKeyCipher: await mod.tmStudioSeal('sk-x'), models: [{ modelId: 'gpt-4o-mini', enabled: true, isPrimary: true }] })
const rows = await store.listConnections()
assert.equal(rows.length, 1)
assert.match(rows[0].apiKeyCipher, /^v1\./)
assert.equal(JSON.stringify(mod.tmStudioSafeConnection(rows[0])).includes('v1.'), false)
assert.equal(await mod.tmStudioOpen(rows[0]), 'sk-x')
console.log('PASS tmcut_ai_config_store')
```

- [ ] **Step 3: Run to verify it fails**

Run: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/tmcut_ai_config_store.spec.ts`
Expected: FAILED — module not found.

- [ ] **Step 4: Implement `server/utils/aiConfigMongo.ts`**

```ts
import { MongoClient, type Db } from 'mongodb'
import {
  createMongoAIConfigStore,
  openSecret,
  sealSecret,
  storedToAppConnection,
  type AppAIConnection,
  type StoredAIConnection
} from '@tuanmjnh/tm-ai-client'

let client: MongoClient | null = null
let db: Db | null = null
let schemaReady: Promise<unknown> | null = null

async function studioDb(): Promise<Db> {
  if (db) return db
  const uri = String(process.env.MONGODB_URI || '').trim()
  if (!uri) {
    throw createError({
      statusCode: 503,
      statusMessage: 'error.mongoMissing',
      message: 'MONGODB_URI is not configured on this server'
    })
  }
  client = new MongoClient(uri)
  await client.connect()
  db = client.db(String(process.env.MONGODB_DB || 'tm_studio').trim() || 'tm_studio')
  return db
}

/** Owner-scoped store; the caller passes the signed-in user id. */
export function tmStudioAIConfigStore(ownerId: string) {
  // Same await-through-proxy pattern as tm-tools: construction is synchronous,
  // the first operation resolves the shared connection.
  const proxy = {
    collection(name: string) {
      return new Proxy({}, {
        get(_t, prop: string) {
          return async (...args: unknown[]) => {
            const live = await studioDb()
            return (live.collection(name) as never as Record<string, (...a: unknown[]) => unknown>)[prop as string](...args)
          }
        }
      })
    }
  }
  return createMongoAIConfigStore(proxy as never, ownerId)
}

export function requireStudioAIConfigSecret(): string {
  const secret = String(process.env.AI_CONFIG_SECRET || '').trim()
  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'error.aiConfigSecretMissing',
      message: 'AI_CONFIG_SECRET is not configured on this server'
    })
  }
  return secret
}

export async function tmStudioSeal(plain: string): Promise<string> {
  return sealSecret(requireStudioAIConfigSecret(), plain)
}

export async function tmStudioOpen(record: StoredAIConnection): Promise<string | undefined> {
  if (record.apiKeyCipher) return openSecret(requireStudioAIConfigSecret(), record.apiKeyCipher)
  if (record.apiKeyEnv) return String(process.env[record.apiKeyEnv] || '').trim() || undefined
  return undefined
}

export function tmStudioSafeConnection(record: StoredAIConnection) {
  // Reuse the package mapper for the public shape, then reduce models to the
  // management view (enabled flag included, no ciphertext).
  const app = storedToAppConnection(record, { includeDisabledModels: true })
  return {
    connectionId: record.connectionId,
    providerKey: record.providerKey,
    baseUrl: record.baseUrl,
    apiKeyEnv: record.apiKeyEnv ?? null,
    hasKey: Boolean(record.apiKeyCipher) || !record.apiKeyEnv,
    enabled: record.enabled,
    models: record.models.map(model => ({
      modelId: model.modelId,
      displayName: model.displayName,
      enabled: model.enabled,
      isPrimary: Boolean(model.isPrimary)
    })),
    appModels: app.models
  }
}

export async function studioConfiguredConnections(ownerId: string): Promise<AppAIConnection[]> {
  const records = await tmStudioAIConfigStore(ownerId).listConnections()
  const out: AppAIConnection[] = []
  for (const record of records) {
    if (!record.enabled) continue
    const apiKey = await tmStudioOpen(record).catch(() => undefined)
    out.push(storedToAppConnection(record, { apiKey }))
  }
  return out
}
```

- [ ] **Step 5: Run spec + typecheck**

```bash
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/tmcut_ai_config_store.spec.ts
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
```

Expected: PASS + `TC_EXIT=0` (0 `error TS`).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml server/utils/aiConfigMongo.ts tests/unit/tmcut_ai_config_store.spec.ts
git commit -m "feat(ai-config): mongo store + encrypted keys for tm-studio"
```

### Task 16: tm-studio endpoints

**Files:**
- Create: `server/api/v1/ai/connections/index.get.ts`
- Create: `server/api/v1/ai/connections/index.put.ts`
- Create: `server/api/v1/ai/connections/[connectionId].delete.ts`
- Create: `server/api/v1/ai/connections/[connectionId]/models/refresh.post.ts`
- Create: `server/api/v1/ai/connections/[connectionId]/test.post.ts`
- Create: `server/api/v1/ai/connections/[connectionId]/chat.post.ts`

**Interfaces:**
- Consumes: `event.context.auth.userId` (existing `TokenPayload`), the Task 15 util, `createAIClient`, `ofetch`.
- Produces: same HTTP contract as tm-tools, plus `POST .../chat` `{ messages, maxTokens?, temperature? }` → `{ success, data: { ok, content, model, usage, latencyMs } }` for app-local completions.

- [ ] **Step 1: Implement `index.get.ts` / `index.put.ts` / delete**

```ts
// index.get.ts
import { studioConfiguredConnections, tmStudioAIConfigStore, tmStudioSafeConnection } from '../../../../utils/aiConfigMongo'

export default defineEventHandler(async (event) => {
  if (!event.context.auth?.userId) {
    throw createError({ statusCode: 401, statusMessage: 'error.unauthorized', message: 'Unauthorized' })
  }
  const rows = await tmStudioAIConfigStore(event.context.auth.userId).listConnections()
  return { success: true, data: { connections: rows.map(tmStudioSafeConnection) } }
})
```

`index.put.ts` mirrors Task 10's PUT (same body), using `tmStudioSeal` for a typed key and keeping the existing cipher when the key field is empty. Delete mirrors Task 10.

- [ ] **Step 2: Implement refresh/test/chat**

Refresh and test copy Task 12's bodies, substituting `tmStudioAIConfigStore(ownerId)`, `tmStudioOpen`, and `event.context.auth.userId`. Chat:

```ts
import { getRouterParam } from 'h3'
import { createAIClient } from '@tuanmjnh/tm-ai-client'
import { tmStudioAIConfigStore, tmStudioOpen } from '../../../../../utils/aiConfigMongo'

interface Body { messages?: Array<{ role: 'system' | 'user' | 'assistant', content: string }>, maxTokens?: number, temperature?: number }

export default defineEventHandler(async (event) => {
  if (!event.context.auth?.userId) {
    throw createError({ statusCode: 401, statusMessage: 'error.unauthorized', message: 'Unauthorized' })
  }
  const connectionId = decodeURIComponent(getRouterParam(event, 'connectionId') || '')
  const body = await readBody<Body>(event)
  const store = tmStudioAIConfigStore(event.context.auth.userId)
  const record = (await store.listConnections()).find(row => row.connectionId === connectionId)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'error.notFound', message: 'Unknown connection' })
  const model = record.models.find(entry => entry.isPrimary)?.modelId || record.models.find(entry => entry.enabled)?.modelId
  if (!model) throw createError({ statusCode: 400, statusMessage: 'error.aiNoModel', message: 'Connection has no enabled model' })

  const started = Date.now()
  try {
    const client = createAIClient({
      endpoint: { provider: record.providerKey, baseUrl: record.baseUrl, apiKey: await tmStudioOpen(record), mode: 'local' }
    })
    const result = await client.complete({
      model,
      messages: body.messages ?? [],
      maxTokens: body.maxTokens,
      temperature: body.temperature
    })
    return { success: true, data: { ok: true, content: result.content, model, usage: result.usage, latencyMs: Date.now() - started } }
  } catch (err) {
    throw createError({
      statusCode: 502,
      statusMessage: 'error.aiLocalUpstreamFailed',
      message: String((err as Error).message || err).slice(0, 300)
    })
  }
})
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
node node_modules/eslint/bin/eslint.js server/api/v1/ai/connections > .gate-eslint.txt 2>&1; echo "LINT_EXIT=$?"
git add server/api/v1/ai/connections
git commit -m "feat(ai-config): tm-studio connection endpoints and local chat"
```

### Task 17: Renderer catalogue merge + routing

**Files:**
- Modify: `app/composables/useTmcutAi.ts`
- Test: `tests/unit/tmcut_ai_tasks.spec.ts` (add cases only)

**Interfaces:**
- Consumes: `GET /api/v1/ai/connections`, `POST /api/v1/ai/connections/:id/chat`, `toAppCatalogConnection`, `mergeCatalog`.
- Produces: `relayCatalog()` returns hub rows **merged with** app-local rows; `pickRelayConnection` keeps app rows; `relayChat` routes `app:` ids to the local endpoint.

- [ ] **Step 1: Write the failing case**

In `tests/unit/tmcut_ai_tasks.spec.ts`, add a case asserting the catalogue merge: given a hub catalogue `[{connectionId:'hub-1',...}]` and local rows `[{connectionId:'lab', providerKey:'freemodel', baseUrl:'http://127.0.0.1:31415/v1', models:[{modelId:'auto',enabled:true,isPrimary:true}]}]`, the merged catalogue contains `app:lab` **and** `hub-1`, and an identical `providerKey+modelId` on both keeps only the app row (`shadowed` on the hub twin).

- [ ] **Step 2: Run to verify it fails**

Run: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/tmcut_ai_tasks.spec.ts`
Expected: FAILED — merge not implemented.

- [ ] **Step 3: Implement**

```ts
import { mergeCatalog, toAppCatalogConnection } from '@tuanmjnh/tm-ai-client'

type LocalRow = {
  connectionId: string
  providerKey: string
  baseUrl: string
  hasKey: boolean
  enabled: boolean
  models: Array<{ modelId: string, displayName?: string, enabled: boolean, isPrimary?: boolean }>
}

async function localCatalog(): Promise<CatalogConnection[]> {
  try {
    const res = await $fetch<{ success: boolean, data?: { connections?: LocalRow[] } }>('/api/v1/ai/connections')
    return (res?.data?.connections ?? [])
      .filter(row => row.enabled)
      .map(row => toAppCatalogConnection({
        connectionId: row.connectionId,
        providerKey: row.providerKey,
        baseUrl: row.baseUrl,
        models: row.models.filter(model => model.enabled).map(model => ({ modelId: model.modelId, displayName: model.displayName }))
      }, { hasKey: row.hasKey }))
  } catch {
    return []
  }
}

async function relayCatalog(): Promise<AiRelayConnection[]> {
  ...existing hub fetch...
  const local = await localCatalog()
  // The picker consumes AiRelayConnection; the merged catalog keeps both sources.
  return mergeCatalog(hubConns as never, local as never) as never as AiRelayConnection[]
}
```

`relayChat` branch at the top:

```ts
if (call.connectionId.startsWith('app:')) {
  const res = await $fetch<{ success: boolean, data: { ok: boolean, content: string, model: string, usage: unknown } }>(
    `/api/v1/ai/connections/${encodeURIComponent(call.connectionId.replace(/^app:/, ''))}/chat`,
    { method: 'POST', body: { messages: call.messages, maxTokens: call.maxTokens, temperature: call.temperature }, timeout: call.timeoutMs }
  )
  if (!res?.success || !res.data?.ok || !String(res.data.content ?? '').trim()) {
    throw new Error(res?.data?.content ? 'AI local call failed' : `AI local returned no content (${call.model})`)
  }
  return { content: res.data.content, usage: res.data.usage, model: res.data.model, latencyMs: Date.now() - started }
}
```

Keep the hub relay path unchanged for hub ids. `relayStatus`/`tasks` may keep using the hub-only list; if the picker needs a status for an app row, derive it from `localCatalog()`.

- [ ] **Step 4: Run spec + typecheck + lint**

```bash
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.test.json tests/unit/tmcut_ai_tasks.spec.ts
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
node node_modules/eslint/bin/eslint.js app/composables/useTmcutAi.ts > .gate-eslint.txt 2>&1; echo "LINT_EXIT=$?"
```

- [ ] **Step 5: Commit**

```bash
git add app/composables/useTmcutAi.ts tests/unit/tmcut_ai_tasks.spec.ts
git commit -m "feat(ai-config): merge per-account connections into tm-studio AI routing"
```

### Task 18: Desktop master key + settings UI

**Files:**
- Modify: `electron/tools/secret-slots.cjs`
- Modify: `electron/main.cjs`
- Modify: `app/pages/system/ai-keys.vue`
- Test: `electron/tools/ai-gateway.test.mjs` (extend the slot pin)

**Interfaces:**
- Consumes: `writeConfigValues`/`readConfigFile` (config-file.cjs), `encrypt`/`decrypt` (ai-secure.cjs), `generateMasterKey` (renderer/main cannot import the package — replicate 32 bytes with `crypto.randomBytes(32).toString('base64')` in main.cjs).
- Produces: `AI_CONFIG_SECRET` exists in `config.env` (encrypted at rest) and in `process.env` before Nitro starts.

- [ ] **Step 1: Extend the slot regex and its pin**

`electron/tools/secret-slots.cjs`:

```js
const SECRET_SLOT_RE = /^(AI_API_KEY(_.+)?|TMCUT_GEMINI_API_KEY|NUXT_HUB_APP_SECRET|HUB_DEVICE_SECRET|AI_CONFIG_SECRET)$/
```

Update the drift-pin test (grep-pin on the shared regex source) to include `AI_CONFIG_SECRET`; this is extending the contract, not weakening it.

- [ ] **Step 2: Generate on first run**

In `electron/main.cjs` `loadUserConfig()`, after the loop:

```js
  // The AI config store encrypts provider keys with this master key. Generate
  // it once, store it as a normal vault slot (encrypted at rest), and keep the
  // startup env contract: Nitro reads process.env, never the file.
  if (!process.env.AI_CONFIG_SECRET) {
    const generated = require('node:crypto').randomBytes(32).toString('base64')
    try {
      writeConfigValues(path.join(app.getPath('userData'), 'config.env'), { ...values, AI_CONFIG_SECRET: generated })
      process.env.AI_CONFIG_SECRET = generated
    } catch (err) {
      console.error('[AI config] could not persist AI_CONFIG_SECRET:', err)
    }
  }
```

Ensure `writeConfigValues` is imported in main.cjs (it already imports config-file helpers for the config writer; reuse).

- [ ] **Step 3: Settings section**

In `app/pages/system/ai-keys.vue`, add a card above the existing key-vault card: description ("Local connections stored in this app's database"), an `AIConnectionsEditor` bound to rows loaded from `GET /api/v1/ai/connections`, with Save → PUT per row, Test → POST test, Refresh models, Remove → DELETE. Use the same labels object shape already used in the file and `providerIconFor` from the shared package. Show a warning banner when `GET` returns 503 with `error.aiConfigSecretMissing`.

- [ ] **Step 4: Run Electron tests + typecheck + browser check**

```bash
node --test "electron/tools/*.test.mjs"
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
```

Expected: all electron tests pass; `TC_EXIT=0`. Then start :4003 and verify the section renders and a save survives reload (web runtime requires `MONGODB_URI` and `AI_CONFIG_SECRET` in the dev environment — if absent, verify the 503 banner path, and record it as PARTIAL with the missing-env reason).

- [ ] **Step 5: Commit**

```bash
git add electron/tools/secret-slots.cjs electron/main.cjs electron/tools/ai-gateway.test.mjs app/pages/system/ai-keys.vue
git commit -m "feat(ai-config): desktop master key and per-account AI connection settings"
```

---

## Phase 4 — tm-hub: verification, no code change

**Rationale (deviation from spec decision 6, flagged for owner review):** the spec's hub adapter requires a two-table mapping (`connections` + `ai_models`) whose insert path carries hub-only semantics — `secrets` uses the hub's own `encodeSecrets` format (not `v1.<iv>.<cipher>`), `provider_definition_id` is a FK resolved at insert, and grants/mode/owner-type are authorization state. Forcing it through the generic driver would either duplicate that logic or widen the driver until it is no longer generic. tm-hub already stores its configuration in its own database, which is the feature's requirement; the shipped Supabase driver covers Supabase apps whose layout is the shipped `ai_connections` snippet. If the owner still wants the refactor, it needs its own spec (two-table mapping + secrets format adapter).

- [ ] **Step 1: Confirm the hub stays green and consistent**

```bash
cd D:/Applications/tm-hub
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"
node tests/run-tests.mjs
```

Expected: `TC_EXIT=0` (0 `error TS`), suite passes; record the counts.

- [ ] **Step 2: Confirm no hub dependency on app-local paths**

`grep -rn "ai_connections" server shared app` → no hits except docs. The relay catalogue endpoint remains the only Hub surface the apps use for hub-managed rows.

- [ ] **Step 3: Docs note**

Add one paragraph to `tm-hub/docs/` AI page: hub-managed connections stay in `connections`/`ai_models`; app-local rows never reach the hub; the shared Supabase driver targets the standalone `ai_connections` layout.

- [ ] **Step 4: Commit (docs only)**

```bash
git add docs  # exact file only
git commit -m "docs: clarify hub vs app-local AI configuration ownership"
```

---

## Phase 5 — Migration, docs, final gates

### Task 19: Environment and deployment docs

**Files:**
- Modify: `tm-tools/docs/` AI settings page (new page if none): env contract `AI_CONFIG_SECRET` (base64 32B), `MONGODB_URI`, collection `ai_connections`, Vercel notes (Mongo Atlas network access, server-only env vars).
- Modify: `tm-studio/docs/` AI page: `MONGODB_URI`, `MONGODB_DB`, `AI_CONFIG_SECRET` (desktop auto-generated, web operator-set), Vercel + Atlas note, and the "AI keys never leave the server" statement.
- Modify: `tm-platform/README.md` driver matrix (already in Task 7 — link it here).
- Archive, don't delete: any superseded AI-config doc goes to `docs/archive/<date>/` with links fixed.

- [ ] **Step 1: Write the env tables**

For each app document a table: Variable | Where set | Who sets it | Notes. Explicitly state: `AI_CONFIG_SECRET` must be 32 random bytes base64; losing it makes stored keys unreadable (rows must be re-entered); never commit it; Vercel env changes require a redeploy.

- [ ] **Step 2: Migration paragraph**

tm-tools: first signed-in GET imports `AI_LOCAL_CONNECTIONS` into that user's rows, seals inline keys, then never re-imports (database wins). Env is never rewritten. tm-studio: existing gateway presets stay in the Electron config; users re-enter keys once in the new local-connections section (documented, not auto-imported, because the gateway config is machine-scoped while rows are account-scoped).

- [ ] **Step 3: Commit**

```bash
git add docs && git commit -m "docs: app-local AI configuration env and migration"
```

### Task 20: Final gates and report

- [ ] **Step 1: tm-platform**

```bash
cd D:/Applications/tm-platform/packages/tm-ai-client
pnpm build && pnpm typecheck
node --test "tests/**/*.test.mjs"
cd D:/Applications/tm-platform/packages/tm-ui
pnpm typecheck
node --test "tests/**/*.test.mjs"
```

- [ ] **Step 2: tm-tools**

```bash
cd D:/Applications/tm-tools
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"; grep -c "error TS" .gate-typecheck.txt
node node_modules/eslint/bin/eslint.js app/pages/system/settings/ai-local.vue app/pages/chat.vue app/components/aiProviders/ModelSelect.vue server/utils/aiGateway.ts server/utils/aiConfigStore.ts server/utils/relayModels.ts server/api/v1/ai > .gate-eslint.txt 2>&1; echo "LINT_EXIT=$?"
node node_modules/tsx/dist/cli.mjs tests/unit/run-all.mts
```

- [ ] **Step 3: tm-studio**

```bash
cd D:/Applications/tm-studio
node node_modules/nuxt/bin/nuxt.mjs typecheck > .gate-typecheck.txt 2>&1; echo "TC_EXIT=$?"; grep -c "error TS" .gate-typecheck.txt
node node_modules/eslint/bin/eslint.js app/composables/useTmcutAi.ts app/pages/system/ai-keys.vue server/api/v1/ai server/utils/aiConfigMongo.ts > .gate-eslint.txt 2>&1; echo "LINT_EXIT=$?"
node node_modules/tsx/dist/cli.mjs tests/unit/run-all.mts
node --test "electron/tools/*.test.mjs"
```

- [ ] **Step 4: Report**

Produce a PASS/FAIL/BLOCKED line per gate with the fresh numbers and the command that produced them. Anything not run is BLOCKED with the reason (owner-gated publish/install, missing `MONGODB_URI`, no browser session). Do not claim a browser flow that was not exercised.

- [ ] **Step 5: Commit gate logs? No.**

`.gate-*.txt` files are scratch; leave them untracked (they already are in tm-tools/tm-studio). Do not stage them.

---

## Self-Review (author checklist)

- Spec coverage: secret box (Task 1), stored model + mapping (2), interface (3), three drivers (4–6), per-account scoping (4–6, 9, 15), tm-tools endpoints/UI/merge/defect (9–14), tm-studio both runtimes + desktop key (15–18), hub (19/Phase 4, deviation flagged), migration/docs (Task 19), gates (20).
- Deviation to confirm at plan review: Phase 4 no longer refactors hub `store.ts` (rationale above).
- Type consistency: `StoredAIConnection` fields identical across tasks; `SafeAIConnection` shape is described once in Task 9 and reused by 10/13; `tmStudioSafeConnection` adds `appModels` intentionally for the management page.
- Verify during execution (not assumed): `createAIClient` option names (`endpoint`, per-call `model`/`maxTokens`), `AIConnectionsEditor`'s model-string shape in tm-tools, and the exact PostgREST fake chain. Adjust the call sites, never the assertions.
