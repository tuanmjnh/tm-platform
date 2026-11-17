# App-local AI provider & model storage via shared store drivers

Date: 2026-11-17 (rev 2)
Status: approved design, pending implementation plan
Extends: `2026-11-17-ai-provider-config-design.md` (provider registry, catalogue merge, ModelSelect/AIConnectionsEditor)

## Problem

AI provider/model configuration for satellite apps currently lives outside each
app's own database:

- **tm-tools** reads `AI_LOCAL_CONNECTIONS` from the environment.
- **tm-studio** keeps provider keys in the Electron key vault and reads the
  whole catalogue from TM Hub; no local provider/model catalogue exists.
- **tm-hub** already stores provider definitions, connections and models in its
  Supabase database.

The owner wants every app to own provider/model configuration in its own
primary store, per user account, independent of TM Hub for storage, while still
being deployable to Vercel (web) and working as a desktop app. Hub rows remain
usable in pickers (one-way `hub → app`).

## Decisions (agreed with the owner)

1. Build three storage drivers behind one interface: **Supabase** (tm-hub and
   any Supabase deployment), **MongoDB** (apps that need online storage), and
   **localStorage** (self-managed/personal clients such as the tm-social-hub
   extension).
2. Scope: tm-tools, tm-studio, tm-hub. tm-studio uses MongoDB in **both**
   desktop and web runtimes (desktop requires reachable Mongo).
3. Configuration is **per user account** (`ownerId`), not per device.
4. API keys are stored encrypted on the runtime that owns the database
   (Nitro/Electron server or the browser), never plaintext, and never exposed
   to a UI surface — rows carry `hasKey` only.
5. Master key: `AI_CONFIG_SECRET` (base64, 32 bytes) in server runtimes. On
   desktop, if absent, the app generates one once and protects it with the OS
   keychain (`safeStorage`); the embedded Nitro process receives it at boot.
6. tm-hub refactors onto the shared Supabase driver for the CRUD paths that map
   cleanly; grants, inference-mode policy and relay stay in tm-hub. Hub
   behaviour must stay green under its existing suite.
7. Pickers keep merging app-local rows with the TM Hub catalogue (`app:` ids,
   shadowing, APP/HUB chips, provider icons/names unchanged).

## Non-goals

- No sync from app to hub, no sharing between apps.
- No change to hub grants, inference-mode checks or the relay contract.
- No media (TTS/image/video) provider work.
- localStorage driver is not used by tm-tools or tm-studio.

## Architecture

### Shared package: `@tuanmjnh/tm-ai-client` 0.4.0

```
src/config/
  stored.ts        StoredAIConnection / StoredAIModel, validation,
                   storedToAppConnection(record, apiKey)
  secretBox.ts     AES-256-GCM sealSecret/openSecret over webcrypto,
                   decodeMasterKey, generateMasterKey
  store.ts         AIConfigStore interface + shared helpers
  stores/
    mongo.ts       createMongoAIConfigStore({ collectionPrefix? })
    supabase.ts    createSupabaseAIConfigStore({ scopeColumn, tables, mapRow })
    localStorage.ts createLocalStorageAIConfigStore({ accountId, storage })
```

`AIConfigStore`:

```ts
interface AIConfigStore {
  listConnections(): Promise<StoredAIConnection[]>
  upsertConnection(record: StoredAIConnectionInput): Promise<StoredAIConnection>
  removeConnection(connectionId: string): Promise<void>
  replaceModels(connectionId: string, models: StoredAIModel[]): Promise<void>
  ensureSchema?(): Promise<void>
}
```

Every driver is scoped to one `ownerId` at construction time (user id; tm-hub
passes its app id) and never accepts an owner per call. Secrets travel as
ciphertext inside the record; the store never decrypts. The drivers use only
injected clients (`db` handle, Supabase client) or injected `Storage`, so the
package still has no database dependency.

### Data model

Normalized record:

| Field | Notes |
|-------|-------|
| `ownerId` | user id (hub: `app_id`) |
| `connectionId` | stable id, unique per owner |
| `providerKey` | registry key (`nvidia`, `ollama`, …) |
| `baseUrl` | endpoint |
| `apiKeyCipher` | `v1.<iv>.<cipher+tag>` or empty |
| `apiKeyEnv` | optional slot name; inline cipher wins |
| `models[]` | `modelId`, `displayName`, `enabled`, `isPrimary`, `discoveredAt` |

- **MongoDB** (`ai_connections`, `ai_models`): unique `(ownerId, connectionId)`
  and `(ownerId, connectionId, modelId)`; schema ensured on first connect.
- **Supabase**: tm-hub passes its existing `connections` table (scope column
  `app_id`, unique `(app_id, provider, name)`) and `ai_models`
  (`provider_definition_id`, `connection_id`, `model_id`, `is_enabled`). A
  `mapRow` hook supplies hub-only fields (definitions, mode, owner type).
  Satellites using Supabase create equivalent `ai_connections` / `ai_models`
  tables with `owner_id` via a shipped SQL snippet.
- **localStorage**: one JSON document per account
  (`tm.ai.config.v1.<accountId>`); ciphertext values only.

### Secret handling

- Master key resolution: `AI_CONFIG_SECRET` → desktop keychain-protected
  generated key → unavailable (saving keys disabled, other fields still save).
- Sealing happens where the store lives: Nitro server (tm-tools, tm-studio) or
  the browser driver (localStorage).
- localStorage encryption uses a non-extractable AES-GCM `CryptoKey` kept in
  IndexedDB per origin. It protects against casual inspection, not XSS, and
  configuration does not follow a user across origins (localhost vs Vercel).
- Rows expose `hasKey` only.

### tm-tools (MongoDB, desktop + web)

- `AppMongoDB` gains the two collections; `fetchAICatalog` reads DB rows for
  the signed-in user, maps via `storedToAppConnection`, and merges with the hub
  relay catalogue exactly as today.
- Endpoints (admin-guarded): `GET/PUT /api/v1/ai/connections`,
  `DELETE /api/v1/ai/connections/:id`,
  `POST /api/v1/ai/connections/:id/models/refresh`, `.../test`.
- Refresh calls the provider's `/models` server-side through tm-ai-client and
  upserts rows, preserving `enabled` / `isPrimary` flags.
- Settings page edits DB rows (provider dropdown with icons, models, key); the
  env blob becomes a first-boot import source, not an editor target.
- If Mongo is unreachable, reads fall back to the env blob and writes fail
  with a clear error.

### tm-studio (MongoDB, desktop + web)

- AI config endpoints live in the tm-studio Nitro server (it already runs
  inside Electron and on Vercel), so both runtimes share one store path.
- Desktop: Mongo URI and master key come from the same env/config file the
  Electron shell already writes; the key is generated + keychain-protected on
  first run when absent.
- Renderer gets rows with `hasKey` only; all provider calls stay server-side.
- `useTmcutAi` merges local rows with the hub relay catalogue; the web runtime
  keeps the hub relay path for hub-owned connections.
- The earlier sqlite plan for AI config is dropped; sqlite keeps the existing
  YouTube/history data only.

### tm-hub (Supabase)

- `store.ts` CRUD for connections/models delegates to
  `createSupabaseAIConfigStore`; grants, usable-connection filtering,
  inference-mode resolution and relay code are untouched.
- No schema migration; the adapter maps onto the existing `connections` /
  `ai_models` columns.
- Hub rows keep their current semantics (app/hub/device ownership).

## Catalogue and picker behaviour

Unchanged: `app:` namespace, shadowing on `providerKey + modelId`, enabled
models only, icons from `providerIconFor`, names from `providerDisplayName`,
APP/HUB chip and per-provider connection description.

Known defect to fix in this work: `/api/v1/chat/models` returns the app-local
row, but the chat ModelSelect does not show it (verified in the browser while
the API response included it).

## Migration

- tm-tools: first boot with an empty store imports `AI_LOCAL_CONNECTIONS` for
  the signed-in user, seals inline keys, inserts connection + model rows.
- tm-studio: imports the gateway's configured presets/keys into the user's
  Mongo rows once, then defers to the database.
- tm-hub: no migration.
- Env is never rewritten; precedence is database first, env only as
  bootstrap/fallback.

## Testing and gates

- Package: secret box round-trip + tamper detection, store contract tests with
  in-memory drivers, stored→catalogue mapping, merge/shadowing unchanged,
  localStorage account isolation.
- tm-tools: endpoint auth + CRUD + refresh against a fake provider; gateway
  reads DB rows; chat payload shows each app row once.
- tm-studio: server store path + renderer mapping; web/destkop parity on the
  catalogue shape.
- tm-hub: existing AI suite green after the store refactor (relay, modes,
  grants).
- Gates per repo: typecheck → lint touched files after the eslint config
  regeneration → unit suite; quote fresh numbers. Supabase adapter tests use
  the local emulator or a stubbed client, never production.

## Docs

- This spec plus the extended registry spec.
- tm-platform README: new exports and driver usage matrix.
- Per-repo docs: storage ownership, account scoping, env bootstrap precedence,
  localStorage caveats, Vercel deployment notes (Mongo Atlas/Supabase).
- Superseded notes archived, not deleted.

## Risks

- Mongo becomes a hard dependency for tm-studio (desktop included): offline
  desktop loses provider configuration; the UI must report it plainly.
- Hub store refactor touches a live relay path: keep the change narrow and gate
  on the existing hub suite.
- Desktop master key is OS-user bound; copying a config to another machine
  makes stored keys unreadable and must surface as “needs key re-entry”.
- localStorage limits: origin-bound, XSS-exposed key material, quota; suitable
  for personal clients only.
- Concurrent refresh races are resolved by unique `(ownerId, connectionId,
  modelId)` upserts.
