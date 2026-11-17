# App-local AI provider & model storage in each app's own database

Date: 2026-11-17
Status: approved design, pending implementation plan
Extends: `2026-11-17-ai-provider-config-design.md` (provider registry, catalogue merge, ModelSelect/AIConnectionsEditor)

## Problem

AI provider/model configuration for satellite apps currently lives outside each
app's own database:

- **tm-tools** reads `AI_LOCAL_CONNECTIONS` from the environment; the settings
  page edits that env blob (desktop writes it to the shell env file).
- **tm-studio** keeps provider keys in the Electron key vault and reads every
  catalogue row from TM Hub; there is no local provider/model catalogue.
- **tm-hub** already stores `provider_definitions`, `ai_connections` and
  `ai_models` in its Supabase database.

The owner wants every app to own its provider/model configuration in its own
primary database, independent of TM Hub for storage. Hub rows remain usable in
the picker (one-way `hub → app`), but configuration is no longer an env blob.

## Decisions (agreed with the owner)

1. Scope: all three apps. tm-hub is verification/docs only — it already stores
   this data in its database.
2. API keys are stored **encrypted in the app database**, never plaintext.
3. The picker still merges the app-local rows with the TM Hub catalogue when the
   app has hub connections; `app:` ids, shadowing and APP/HUB chips stay.
4. A real model table per connection (discovered, enabled/disabled, display
   name, primary flag), mirroring the hub's `ai_models` model.
5. Master key: `AI_CONFIG_SECRET` (base64, 32 bytes) in every runtime. On
   desktop, if it is absent the app generates one once and protects it with the
   OS keychain (`safeStorage`), so later boots can decrypt. Without a usable
   master key, saving a key is refused with a clear error; other fields still
   save.

## Non-goals

- No sync from app to hub, no sharing between apps.
- No change to how hub-managed connections are granted or relayed.
- No media (TTS/image/video) provider catalogue work beyond keeping the
  existing admin page behavior.

## Architecture

### Shared package: `@tuanmjnh/tm-ai-client` 0.4.0

Additions (no database dependency; every app implements its own store):

- `config/stored.ts` — `StoredAIConnection`, `StoredAIModel` record types,
  validation and `storedToAppConnection(record, apiKey)` building an
  `AppAIConnection` for the existing catalogue merge.
- `config/secretBox.ts` — AES-256-GCM `sealSecret` / `openSecret` over
  webcrypto (Node 20+/Electron), `decodeMasterKey`, `generateMasterKey`.
  Ciphertext format: `v1.<iv-b64>.<cipher+tag-b64>` so a future rotation can be
  introduced without ambiguity.

`parseAppConnections` / `mergeCatalog` / `toAppCatalogConnection` remain the
single path from stored rows to the picker catalogue.

### tm-tools (MongoDB via `AppMongoDB`)

Collections:

| Collection       | Fields (unique keys marked) |
|------------------|------------------------------|
| `ai_connections` | `connectionId` (unique), `providerKey`, `baseUrl`, `apiKeyCipher`, `apiKeyEnv`, `enabled`, `createdAt`, `updatedAt` |
| `ai_models`      | `connectionId` + `modelId` (unique pair), `displayName`, `enabled`, `isPrimary`, `discoveredAt` |

Server endpoints (admin-guarded like the other settings routes):

- `GET /api/v1/ai/connections` — rows + `hasKey`, never ciphertext.
- `PUT /api/v1/ai/connections` — upsert one row; `apiKey` (plaintext input)
  is sealed before insert; empty key keeps the stored ciphertext.
- `DELETE /api/v1/ai/connections/:id` — removes the row and its models.
- `POST /api/v1/ai/connections/:id/models/refresh` — calls the provider's
  `/models` server-side and upserts rows (preserves `enabled`/`isPrimary`).
- `POST /api/v1/ai/connections/:id/test` — reuses the existing check flow.

The catalogue (`fetchAICatalog`) reads `ai_connections` + enabled models,
converts via `storedToAppConnection`, and merges with `fetchRelayCatalog` as
today (DB rows are the `app:` source).

### tm-studio (Electron SQLite `%APPDATA%/tm-studio/tools.sqlite`)

Same two tables, created with `CREATE TABLE IF NOT EXISTS` next to the existing
`youtube_*` tables in `electron/tools/sqlite.cjs`. Electron main owns the DB:

- IPC: `aiConnections.list`, `aiConnections.save`, `aiConnections.remove`,
  `aiConnections.refreshModels` (preload-exposed, main-sealed keys).
- The renderer gets `hasKey` only, never the key or ciphertext.
- Desktop picker (`useTmcutAi`) merges local rows + hub relay catalogue.
- The web runtime has no database and keeps today's hub-only behaviour; this is
  documented, not emulated.

### tm-hub

No schema or code change. Docs record that hub's `provider_definitions`,
`ai_connections`, `ai_models` are the hub's own primary-database storage, and
that satellites never write back.

## Secret handling

- Master key resolution order: `AI_CONFIG_SECRET` → desktop keychain-protected
  generated key → unavailable.
- Keys are sealed on the process that owns the database (Nitro server for
  tm-tools, Electron main for tm-studio). The browser renderer never sees a
  key or ciphertext.
- Key slot semantics (`apiKeyEnv`) remain for operators who keep a secret in
  the environment/keychain slot instead of the database; an inline stored key
  wins.

## Catalogue and picker behaviour

Unchanged from the registry design:

- Local rows use the `app:<connectionId>` namespace; hub rows keep their own
  ids.
- Duplicate `providerKey + modelId` on both sources: the app row wins, the hub
  twin is marked `shadowed` and never offered.
- Only `enabled` models are offered; provider icons come from
  `providerIconFor`, provider names from `providerDisplayName`.
- APP/HUB chip and per-provider `connectionName` description stay.

Known defect to fix in this work: `/api/v1/chat/models` returns the app-local
row, but the chat ModelSelect does not show it (verified in the browser while
the API response included it).

## Migration

- First boot with an empty store: import `AI_LOCAL_CONNECTIONS` (tm-tools) /
  the gateway's configured presets (tm-studio), seal inline keys, insert rows
  and model rows.
- Environment variables are not removed and not rewritten; precedence is
  database rows first, env only as bootstrap/fallback for deployments without
  a database.
- The tm-tools settings page stops editing the env blob; it edits database rows
  and explains that env is a first-boot import.

## Testing and gates

- Package: secret box round-trip, tamper detection, stored→catalogue mapping,
  merge/shadowing unchanged.
- tm-tools: endpoint guard + CRUD + refresh with a fake provider, gateway
  reading DB rows, picker payload includes app rows exactly once.
- tm-studio: sqlite store CRUD + seal/open, IPC surface, renderer label/icon
  mapping, web path unchanged.
- tm-hub: existing suite untouched; docs claim verified against schema.
- Gates per repo: typecheck → lint touched files (after `nuxt typecheck`
  regenerated the eslint config) → unit suite; quote fresh numbers.

## Docs

- This spec plus the extended registry spec.
- Per-repo docs: tm-tools AI settings and env-vs-DB precedence, tm-studio
  desktop-local vs web-hub behaviour, tm-hub storage ownership note.
- tm-platform package README: new exports, version 0.4.0.
- Superseded notes are archived, not deleted.

## Risks

- MongoDB may be unavailable in a web-only deployment: the store must fail
  soft and fall back to the env blob for reading, while writes report the
  failure.
- Electron keychain (safeStorage) is per OS user; moving the sqlite file to a
  machine without the protected master key makes stored keys unreadable — the
  UI must mark them as needing re-entry.
- Two runtimes can race on model refresh; upserts are idempotent on the
  `connectionId + modelId` unique pair.
