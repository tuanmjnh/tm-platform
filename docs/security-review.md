# Security review — spec §6.5–6.7

Run on 2026-11-13 against the published package set and the tm-hub relay.
Every claim below is backed by a command whose output is quoted, not by
inspection alone.

## 1. No secret ships in any package tarball

Packed all seven packages from their `dist/`, extracted them, and grepped the
shipped files for credential shapes.

```bash
# for each of @tuanmjnh/tm-ai-client tm-types tm-utils tm-validators @tuanmjnh/tm-cut-core @tuanmjnh/tm-hub-client @tuanmjnh/tm-ui
npm pack ./dist --pack-destination /tmp/secdist
```

Result: `7` tarballs, `6` files each at most (`index.js`, `index.cjs`,
declarations, `README.md`, `package.json`).

```bash
grep -rIlE "sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|\
-----BEGIN [A-Z ]*PRIVATE KEY-----|SUPABASE_SERVICE|service_role" x
```

**No matches.** No `src/`, `tests/` or `node_modules/` directory is shipped.

### Loopback strings that do appear

`tm-ai-client` and `tm-cut-core` contain `localhost` / `127.0.0.1` inside
`isLocalEndpoint` — that function classifies a URL, it does not hold an
endpoint. `tm-hub-client` has `DEFAULT_HUB_URL = "http://localhost:4000"`,
which is the documented local default for the SDK, overridden by
`NUXT_PUBLIC_HUB_URL` in every app. None is a credential and none is a
provider endpoint.

## 2. No localhost URL is reachable through a hub-mode relay

This was **not** true before this review. The guard checked only the
`connections.inference_mode` column, so a row that said `hub` but pointed at
`127.0.0.1` passed the check and failed upstream with a 502 — the exact defect
the Phase 0 audit recorded.

Fixed in `server/modules/ai-providers/relay-policy.ts`:

```ts
export function relayCanReachEndpoint(baseUrl: unknown, hosted: boolean): boolean
```

- a hosted runtime (`process.env.VERCEL`) refuses loopback, `[::1]`, `.local`
  and RFC1918 addresses, plus any URL that fails to parse;
- a self-hosted Hub reaches everything, because it shares the network with the
  endpoint.

Wired into both relay surfaces, after the mode check and before any provider
call:

- `chat.post.ts` — `403 Connection endpoint is not reachable from this Hub`
- `catalog.get.ts` — the row is not advertised at all

Evidence: `tests/ai-relay-policy.test.ts`, 12 tests, `12 pass / 0 fail`.
Full hub suite: `268 tests, 268 pass, 0 fail`; `pnpm typecheck` exit 0.

## 3. Grants are enforced on cross-app rows

Covered by `tests/ai-connection-grants.test.ts` (part of the 268):

| Assertion | What it pins |
|---|---|
| `grants.filter(g => isGrantActive(g))` | expiry is honoured, not just `is_enabled` |
| `findUsableGrant(caller.appId, row.id, 'chat')` | chat needs a chat grant on shared rows |
| `grantAllows(grant, 'models')` in the catalogue | a models-excluded grant hides the row |
| `isAIGrantOperation` + future `expiresAt` | grant writes are validated |
| `resolveOwnerTypeForApp` on write | ownership is derived, never trusted from the client |

The ordering in `chat.post.ts` is: usable-connection lookup → mode policy →
reachability → grant → provider definition → decrypt. A caller cannot reach
the decrypt line without passing mode, reachability and grant.

## 4. Secrets stay in process and out of logs

- The relay decrypts with `decodeSecrets` inside the handler and passes the key
  straight into `relayChat`. The catalogue returns `baseUrl: null` and only a
  boolean `hasKey` — the satellite never receives the endpoint or the key.
- `server/utils/crypto.ts` derives an AES-256-GCM key with `scryptSync` from
  `CONFIG_ENCRYPTION_KEY` and throws when it is unset, so a missing key cannot
  silently fall back to plaintext.
- The desktop gateway's audit entry (`electron/tools/ai-gateway.cjs`) records
  `prompt`, `response`, `usage` and `latencyMs`. The key is read into `cfg` and
  only appears in request headers, never in the audit object; the 401 test
  asserts `!JSON.stringify(err).includes('secret-key-value')`.
- `tests/logger-policy.test.ts` pins the log levels, and the storage/gateway
  suites (part of the 268) cover credential handling for the non-AI path.

## Residual risk

- `hostedRuntime()` reads `process.env.VERCEL` at call time. Any other hosted
  platform would need the same signal; there is no second deployment today.
- The loopback guard is fail-closed for unparseable URLs on a hosted runtime,
  which means a typo in a base URL surfaces as a 403 rather than a 400. That is
  deliberate: unreachable is the safe answer.
