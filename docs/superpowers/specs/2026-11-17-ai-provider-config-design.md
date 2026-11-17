# AI provider & model config — shared package design

Status: **draft, awaiting approval**
Extends nothing; defines a new package in this monorepo.
Date: 2026-11-17

## 1. What this covers

A shared library so every TM app manages its **own** AI providers and models
without rewriting the same parser, identity rules, merge logic and icons. The
Hub is the only component that syncs (it discovers and stores models for its
own connections); child apps only read the Hub catalogue and configure their
own local connections.

**One-way by design:** `hub → app`. No app exports, shares or syncs anything
back to the Hub. There is no write path from an app to Hub AI tables.

## 2. Measured facts

### 2.1 What exists today

| Piece | Where | Reusable? |
|---|---|---|
| Local connection parser | `tm-tools/shared/utils/aiLocalConnections.ts` | pure, no imports — yes |
| Catalogue merge (hub + local) | `tm-tools/server/utils/aiGateway.ts:115-128` | yes, but wrong key (see 2.2) |
| Local connection editor | `tm-tools/app/pages/system/settings/ai-local.vue` | UI + transport mixed, desktop-only save |
| Provider → icon map | `tm-platform/packages/tm-ui/src/providerIcon.ts` | substring match on provider |
| Hub relay catalogue | `tm-hub/server/api/v1/apps/[id]/ai/relay/catalog.get.ts` | returns provider key + adapterType, `baseUrl: null` |
| Hub provider registry | `tm-hub/shared/ai-providers.ts` (`nvidia` L261, `freellmapi` L299) | hub-only, DB seed |
| tm-studio AI surface | `tm-studio/app/composables/useTmcutAi.ts`, `app/pages/system/ai-keys.vue` | hub proxy only; admin page is root-only, no local config |

Other apps (tm-trading, tm-fx, tm-websites, tm-data-manager, tm-social-hub)
have no model picker or `tm-ai-client` usage today.

### 2.2 The three concrete defects

1. **Dedupe by raw `connectionId` (latent).** `aiGateway.ts:127` drops a Hub
   connection whenever a local entry reuses its id. The current `.env` does
   not trip it by accident only because the Hub row it mirrors (freellmapi) is
   already dropped by the hosted-loopback policy; the filter itself has no
   notion of source, so any future overlap removes a Hub connection silently.
2. **Provider is free text.** The parser defaults `provider` to
   `openai-compatible` (`aiLocalConnections.ts:79`), which is the *adapter
   family*, not the provider. The picker therefore cannot tell `freellmapi` or
   `ollama` apart from OpenAI.
3. **Icons follow the family.** `providerIcon.ts:9` checks `includes('openai')`
   first, so every local OpenAI-compatible endpoint renders the OpenAI logo;
   `nvidia` / `amd_radeon` fall through to the generic bot icon. Nothing marks
   which source (hub vs app) a row belongs to.

Observed picker payload before the change (verified in a browser on :4002):
`{ openai-compatible: 1, google_ai: 34, amd_radeon: 13, nvidia: 72 }`,
`freellmapi: 0`. The one `openai-compatible` entry is the app-local
freellmapi endpoint (`baseUrl` `http://127.0.0.1:31415/v1`, one model
`auto`) reported under the adapter family instead of its provider.

### 2.3 Hosted Hub behaviour is correct

A hosted Hub cannot reach `127.0.0.1`; `relay-policy.ts:41` +
`catalog.get.ts:50` drop loopback rows. This is not changed. App-local
providers are unaffected because the app calls them directly (mode `local`).

### 2.4 Test contracts that must survive

`tm-tools/tests/unit/ai_local_connections.spec.ts`,
`ai_gateway.spec.ts`, `ai_local_mode_ui.spec.ts` read the parser and gateway
directly. They are repointed to the package source; assertions are updated
only where the behaviour intentionally changes (app-local catalogue ids gain
the `app:` prefix). No assertion is relaxed or deleted to make a gate pass.

## 3. Goals

- One implementation of: provider registry, local connection parsing,
  catalogue identity, cross-source merge, icon resolution.
- Each app configures its own providers/models with no code change.
- Two connections of the same provider type never look like one entry.
- Hub stays the only syncing component; apps stay read-only consumers.

## 4. Non-goals

- No share/export of app-local connections, and no push/sync to the Hub.
- No Hub schema change; Hub provider rows keep driving Hub discovery.
- No new plaintext key store on a server. Keys live in the env file (web) or
  the OS-keychain-backed Electron config (desktop), as today.
- No provider CRUD for tm-studio in this phase (it adopts identity/icons only).
- No model discovery beyond the existing `POST /api/v1/ai/discover`.

## 5. Package

New: `@tuanmjnh/tm-ai-config` (pure TypeScript, no Vue, no Nuxt, no fetch).
Build/test/publish conventions copied from `tm-ai-client` (tsup, CJS+ESM,
`node --test`, `scripts/prepare-dist.mjs`).

```
packages/tm-ai-config/
  src/providers.ts    registry + icon
  src/connections.ts  parse/validate app-local connections
  src/catalog.ts      identity, namespacing, merge/shadowing
  src/index.ts
  tests/*.test.mjs
```

UI stays in `tm-ui` (it owns Nuxt UI peers). `tm-ui` does **not** depend on
`tm-ai-config`; the app passes registry data in as props, matching how
`ModelSelect` already accepts `providerIcon`.

### 5.1 Types

```ts
export type AIProviderFamily = 'openai-compatible' | 'anthropic'

export interface AIProviderInfo {
  key: string                 // 'openai' | 'nvidia' | 'freellmapi' | 'custom' | ...
  name: string
  family: AIProviderFamily
  icon: string                // 'i-simple-icons-nvidia' | 'i-lucide-bot' | ...
  defaultBaseUrl: string | null
  keyless: boolean
  docsUrl: string | null
}

export interface AppAIConnection {
  connectionId: string        // stored value, may be a legacy UUID
  providerKey: string         // registry key, never an adapter family
  baseUrl: string
  apiKey?: string
  apiKeyEnv?: string
  models: Array<{ modelId: string, displayName?: string }>
}

export interface CatalogModel {
  connectionId: string        // hub: raw UUID; app: 'app:' + raw id
  connectionName: string
  providerKey: string
  providerName: string
  adapterFamily: string
  source: 'hub' | 'app'
  modelId: string
  displayName: string
  isPrimary?: boolean
  shadowed?: boolean          // identical model exists on the other source
}
```

### 5.2 Registry

`AI_PROVIDERS: AIProviderInfo[]` covers every key the Hub seeds for `ai_llm`
(openai, anthropic, google_ai, openrouter, nvidia, amd_radeon, huggingface,
zhipu, ollama, freellmapi, opencode, custom_openai) plus `custom`.

`resolveProviderKey(raw)`:
- exact registry key → itself;
- a value equal to an adapter family (`openai-compatible`, `anthropic`) →
  `custom` (legacy config means "some OpenAI-compatible endpoint");
- anything else → `null`, which the parser reports as an error. The editor
  offers a dropdown, so free text only survives in hand-edited env files and
  should fail loudly there.

Icons use `simple-icons` names already present in both apps (verified:
`nvidia`, `amd`, `ollama`, `openrouter`, `deepseek`, `mistralai`, `meta`,
`google`, `openai`, `anthropic`); everything else falls back to
`i-lucide-bot`. Unknown Hub keys render the key as the name with the fallback
icon, so a Hub-side addition degrades instead of breaking.

### 5.3 Parsing and compatibility

`parseAppConnections(raw)` accepts the current JSON shape unchanged
(`provider` may still be an adapter family) and returns
`{ connections, errors }`. Rules, in order:

- required: `connectionId`, `baseUrl` (http/https);
- `providerKey` = explicit `providerKey` if present, else
  `resolveProviderKey(provider)`;
- `apiKeyEnv` must match `AI_API_KEY(_[A-Z0-9_]+)?`;
- duplicate stored `connectionId` inside the config → error (unchanged);
- a value that is neither a registry key nor an adapter family is reported as
  an error (`unknown provider "x-y"`), not silently coerced.

Strictness is kept: a half-configured entry fails at save time, not inside a
chat call.

### 5.4 Identity and merge

```
app connection  → connectionId = 'app:' + stored id
hub connection  → connectionId = raw id
```

Because the raw id is still accepted everywhere (see 6.1), existing
conversations and `.env` files keep working, while the prefixed id can never
collide with a Hub UUID.

`mergeCatalog(hub, app)`:

1. Build both model lists; app entries first.
2. Collapse **model-level** duplicates across sources using
   `providerKey + modelId` (not `connectionId`, not `baseUrl` — the Hub
   catalogue intentionally returns `baseUrl: null`). The app entry wins; the
   hub twin is kept with `shadowed: true`.
3. Never remove or hide a connection. Within one source, two connections of
   the same provider remain two entries; the picker's secondary line
   distinguishes them by connection name.
4. If the Hub catalogue is unavailable, return the app list alone (current
   behaviour); rethrow only when both are empty and the Hub errored.

### 5.5 Icon + identification in the picker

`ModelSelect` (tm-ui) already accepts a `providerIcon` prop; apps pass
`providerIconFor` from the registry. Option rendering gains:

- icon from `providerKey`;
- secondary line `providerName · connectionName`, shown when that
  `providerKey` appears on more than one connection;
- a `HUB` / `APP` chip, shown only when the same `providerKey` exists on both
  sources (that is the case where overlap is ambiguous);
- `shadowed` rows are excluded from the picker and listed only in the
  management view.

Rendering uses an explicit `#item` slot so it does not depend on a
Nuxt UI item-field name. Motion stays within the existing budget; no new
ambient animation.

### 5.6 Management UI

`AIConnectionsEditor.vue` in `tm-ui`, dependency-free like `ModelSelect`:
rows + registry come in as props; validation, load, save and test arrive as
callbacks; labels arrive as props. It renders the provider as a select over
the registry (name + icon + keyless hint) instead of a free-text field.

The app page keeps ownership of transport:

- tm-tools (desktop): `window.electronAPI.getConfig/setConfig`, existing
  keychain slots;
- tm-tools (web): read-only, env hint (unchanged behaviour);
- any future app: same component, its own transport.

## 6. App changes

### 6.1 tm-tools

- `shared/utils/aiLocalConnections.ts` is replaced by imports from
  `@tuanmjnh/tm-ai-config` (parser + provider resolution).
- `server/utils/aiGateway.ts`:
  - catalogue = `mergeCatalog(hub, toAppCatalog(local))`;
  - remove the `${provider} (local)` name and the connectionId-only filter;
  - `chatWithConnection` / `check` resolve `app:<id>` by stripping the prefix,
    and still resolve a bare stored id (legacy conversations, current
    `.env`).
- `describeLocalConnections` exposes `providerKey` and `providerName`; the
  settings page reads `AI_PROVIDERS` from the package for the dropdown and
  icons, so no map is duplicated in the app.
- `app/pages/system/settings/ai-local.vue` renders `AIConnectionsEditor`
  and keeps the current save path and permission error handling.
- `relayModels.ts` keeps its non-text filter; it now receives merged entries.

### 6.2 tm-studio

- Uses the registry for provider presets/labels and the icon map in its
  pickers; no local editor, no config store, no sync.
- `app/pages/system/ai-keys.vue` (hub admin) is unchanged apart from icons
  coming from the shared map.

### 6.3 tm-hub

No code change. `catalog.get.ts` already returns `provider` (key) and
`adapterType`; the app resolves display name and icon. If a Hub connection's
provider is unknown to the registry, it renders by key with the fallback icon.

## 7. Security

- Keys never cross the process boundary: the server sees `hasKey`, the editor
  sees `''` (mask), the catalogue has no `baseUrl` for hub rows.
- App-local calls use `createAIClient` with `mode: 'local'` and the existing
  same-machine assertion; the Hub relay is never asked to reach a loopback.
- No new endpoint writes AI configuration to the Hub, by construction: the
  package exports no Hub transport.

## 8. Testing and gates

Unit (package): registry resolution, parser compatibility (legacy adapter
family → `custom`), app id prefixing, cross-source shadowing with the
`providerKey + modelId` key, hub-down fallback.

tm-tools: the three existing AI specs, repointed and updated only for the
`app:` prefix; new cases for "local entry reusing a hub UUID does not hide the
hub row" and "`app:` and bare ids both route locally".

Browser check on :4002 (seeded root account):

1. picker contains the Hub `nvidia` models **and** the app-local entry;
2. no label contains `(local)`;
3. freellmapi shows its own icon + `APP` chip, not the OpenAI logo;
4. two connections of one provider are distinguishable by the secondary line.

Verification commands: `pnpm build`, `pnpm typecheck`, `pnpm test` in
tm-platform; `pnpm typecheck`, `pnpm test`, scoped eslint (after
`nuxt typecheck` regenerates `.nuxt/eslint.config.mjs`) in tm-tools and
tm-studio. Numbers are quoted from the run that produced them.

## 9. Release

`@tuanmjnh/tm-ai-config@0.1.0`, `@tuanmjnh/tm-ui@0.2.0`; apps bump
dependencies. Publishing needs the owner's npm OTP and is not part of code
delivery. Local verification uses the workspace/link path before publish.

## 10. Follow-ups (explicitly not this spec)

- tm-studio local connection editor (same component, once it has a local
  config transport).
- Provider icons for keys with no simple-icons entry.
- Any Hub-side write of app-local models — refused by design, not deferred.
