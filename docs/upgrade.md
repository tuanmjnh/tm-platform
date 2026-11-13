# Upgrading to the shared packages

Two migrations: moving dependencies from a `file:` link to a registry version,
and moving AI connections from implicit to explicit modes.

## 1. `file:` → registry version

Every app used to resolve shared code through a relative path:

```json
"@tuanmjnh/tm-ai-client": "file:../tm-platform/packages/tm-ai-client"
```

That resolves on one machine only — CI, Electron packaging on another box and
any other app cannot use it. Replace it with a version:

```json
"@tuanmjnh/tm-ai-client": "^0.2.1"
```

Then confirm the install came from the registry, not from a leftover link:

```bash
pnpm install
node -e "console.log(require.resolve('@tuanmjnh/tm-ai-client'))"
```

The path must contain `node_modules/.pnpm` — not `../tm-platform`.

### Pinning rules

- Use a caret (`^0.2.1`) so patch fixes arrive without a manual bump.
- Pin exactly (`0.2.1`) only when a regression must be held off deliberately.
- `pnpm` refuses a package published within `minimumReleaseAge`. Add the version
  to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` right after publishing:

```yaml
minimumReleaseAgeExclude:
  - '@tuanmjnh/tm-ai-client@0.2.1'
```

### Package map

| Package | Migration note |
|---|---|
| `@tuanmjnh/tm-ai-client` | Drop any hand-rolled provider HTTP; it carries OpenAI-compatible and Anthropic adapters, streaming and error normalization |
| `@tuanmjnh/tm-types` | Contracts only; no runtime code |
| `@tuanmjnh/tm-validators` | Zod schemas; the app must supply `zod` |
| `@tuanmjnh/tm-utils` | Pure functions, no browser/Node/Electron imports |
| `tm-hub-client` | Control-plane SDK; unaffected by the AI work |
| `tm-cut-core` | Editing engine; the studio reads it by source alias, so only change this if that alias moves |
| `@tuanmjnh/tm-ui` | `vue` is a peer; `@nuxt/ui` stays the app's own dependency |

## 2. AI connection modes

The AI connection mode used to be inferred from ownership or guessed from the
base URL. That inference is how a hosted Hub ended up trying to relay a desktop
loopback endpoint and answering 502. Mode is now an explicit column,
`connections.inference_mode`.

### Migration table

| Old behaviour | New mode | Who executes | What the Hub does |
|---|---|---|---|
| Hub-owned row with a public base URL | `hub` | the Hub relay | decrypts the key, calls the provider |
| App-owned row, app backend holds the credential | `app` | the app | registry metadata only |
| `127.0.0.1` / `localhost` / LAN / `.local` base URL | `local` | the local runtime (Electron main, local server) | never relays it |
| Row with no mode (pre-migration) | `hub` | the Hub relay | unchanged behaviour |

The backfill sets `local` for every loopback row and `hub` for system-app rows.
`inferenceModeForBaseUrl` in `shared/ai-modes.ts` is the single source for that
rule; the SQL migration mirrors it.

### What "mode" is not

- It is **not** `connections.mode`, which records how the credential was
  obtained (`manual` | `oauth`).
- It is **not** `is_shared`, which is registry metadata, never authorization.
- It is **not** inferred from the URL at call time. A `hub` row whose base URL
  turns out to be loopback is now refused explicitly.

### Enforcement

`AI_RELAY_REQUIRE_HUB_MANAGED` stays off by default. When on, the relay serves
only `hub` rows. Independently of that flag, a hosted runtime
(`process.env.VERCEL`) refuses any endpoint it cannot reach, in both the chat
path and the catalogue:

| Call | With reachable endpoint | With loopback endpoint |
|---|---|---|
| `POST /ai/relay/chat` | 200 | `403 Connection endpoint is not reachable from this Hub` |
| `GET /ai/relay/catalog` | row listed | row omitted |

A self-hosted Hub reaches everything, so local development keeps working
without extra configuration.

### Moving a satellite to `local`

1. Register the connection in the app's own config (`AI_LOCAL_CONNECTIONS` for
   tm-tools; the Electron vault for tm-studio).
2. Keep the API key in the app's slot (`AI_API_KEY_<SUFFIX>` or the OS keychain),
   never in the Hub.
3. Set the Hub row to `local` so the Hub stops offering it.
4. Verify the app answers with the Hub stopped — that proves the call is local,
   not a relay.

## 3. Checking the upgrade

```bash
cd tm-platform && pnpm typecheck && pnpm test && pnpm build
cd tm-tools    && pnpm typecheck && pnpm test
cd tm-studio   && pnpm typecheck && pnpm test
cd tm-hub      && node tests/run-tests.mjs && pnpm typecheck
```

Expected today: tm-platform 6 packages green; tm-tools 68/68; tm-studio 83/83
plus 41 gateway tests; tm-hub 268/268.
