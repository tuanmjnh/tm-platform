# TM Platform — Remaining Phases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the TM platform upgrade — publishable shared packages, a hosted Hub that refuses connections it cannot reach, and one AI request contract shared by all three apps — without regressing the live apps.

**Architecture:** The Hub stays the control plane (registry, catalog, grants, relay). Satellites resolve AI through one gateway that routes by an *explicit* mode (`hub` | `app` | `local`), never by sniffing the URL. Shared code ships as `@tuanmjnh/*` packages pinned by version. `tm-studio` keeps its Electron main-process gateway (it already calls providers locally) but swaps its hand-rolled HTTP for `@tuanmjnh/tm-ai-client` so all three apps share one error/stream contract.

**Tech Stack:** Nuxt 4 + Nitro, Nuxt UI v4, Vue 3, Electron (CommonJS main), Supabase Postgres, pnpm workspaces, tsup, `node --test`, tsx.

**Spec:** `D:/Applications/tm-hub/docs/tm-platform-multi-app-upgrade-plan.md` §6–§11, plus `D:/Applications/tm-platform/docs/phase-0-audit.md`.

## Global Constraints

- Demo/local only. No Vercel deploy, no npm publish, no hosted env change without explicit owner approval inside the task.
- Never copy plaintext provider secrets between repos. A key moves only through the Hub vault decrypt path or the OS keychain slot, and is never printed.
- Do not run `pnpm seed` in `tm-hub`: it rewrites satellite relay secrets on the shared Supabase project.
- Never weaken a test to reach PASS. An unmet criterion is reported BLOCKED with the measurement.
- Stage exact files only. `tm-tools` and `tm-hub` trees contain unrelated user WIP; never `git add -A`.
- No code comments unless the WHY is non-obvious. English in code, Vietnamese only in `i18n/locales/vi.json`.
- Verify with the repo's own gates: `tm-hub` = `node tests/run-tests.mjs` + `pnpm typecheck`; `tm-tools` = `pnpm test` + `pnpm typecheck`; `tm-studio` = `pnpm test` + `pnpm typecheck`; `tm-platform` = `pnpm typecheck && pnpm test && pnpm build`.

---

## Phase A — Publish the shared packages (unblocks every other consumer)

Why first: `tm-tools` currently depends on `@tuanmjnh/tm-ai-client` via `file:../tm-platform/...`. That resolves on this machine only; CI, Electron packaging on another box, and `tm-studio` cannot use it. Everything downstream (Phase B, C) wants a real version.

### Task A1: Confirm registry access and scope ownership

**Files:** none modified.

- [ ] **Step 1: Confirm the npm account can publish to the scope**

Run: `npm whoami`
Expected: a username. If it prints `E401`, stop and ask the owner to run `npm login` — this is an owner action, not an agent action.

- [ ] **Step 2: Confirm the scope is free**

Run: `npm view @tuanmjnh/tm-types version`
Expected: `E404` (free). If it returns a version, the name is taken — stop and ask the owner to choose another scope.

- [ ] **Step 3: Record the decision**

Add a line to `docs/plans/decisions.md` (create it): `2026-11-12 — publish @tuanmjnh/* public to npmjs.com. Owner: <whoami>.` Commit:

```bash
git add docs/plans/decisions.md
git commit -m "docs: record npm scope decision"
```

### Task A2: Add a changeset and cut 0.1.0

**Files:**
- Create: `.changeset/initial-release.md`
- Modify: `packages/*/package.json` (version 0.0.1 → 0.1.0)

- [ ] **Step 1: Write the changeset**

```markdown
---
"@tuanmjnh/tm-types": minor
"@tuanmjnh/tm-validators": minor
"@tuanmjnh/tm-utils": minor
"@tuanmjnh/tm-ai-client": minor
---

Initial public release: shared contracts, Zod schemas, pure utilities and an
OpenAI-compatible AI client with SSE streaming, model discovery, normalized
errors and a local-mode policy hook. No secret storage in any package.
```

- [ ] **Step 2: Apply the version bump**

Run: `pnpm version-packages`
Expected: all four packages report `0.1.0` in `package.json`.

- [ ] **Step 3: Rebuild and verify the tarballs**

Run: `pnpm build && pnpm -r exec npm pack --dry-run`
Expected: build exit 0; each pack lists only `dist/**`, `package.json`, `README.md`, `LICENSE` (if present) — no `src/`, no `node_modules`.

- [ ] **Step 4: Commit**

```bash
git add .changeset packages/*/package.json pnpm-lock.yaml
git commit -m "chore: release 0.1.0 of the shared packages"
```

### Task A3: Publish (owner-gated)

**Files:** none.

- [ ] **Step 1: Ask the owner for an explicit go/no-go**

Publishing is irreversible-ish (unpublish is restricted after 72h) and visible to the world. Do not run the publish until the owner says yes in the conversation.

- [ ] **Step 2: Publish**

```bash
pnpm -r exec npm publish --access public
```

- [ ] **Step 3: Verify registry state**

```bash
npm view @tuanmjnh/tm-types version
npm view @tuanmjnh/tm-ai-client version
```

Expected: `0.1.0` for both.

### Task A4: Switch consumers from `file:` to a pinned version

**Files:**
- Modify: `tm-tools/package.json` (dependency line only)
- Modify: `tm-studio/package.json` (add dependency)

- [ ] **Step 1: Edit the two dependency entries**

`tm-tools/package.json`:
```json
"@tuanmjnh/tm-ai-client": "^0.1.0"
```

`tm-studio/package.json` (add under `dependencies`):
```json
"@tuanmjnh/tm-ai-client": "^0.1.0"
```

- [ ] **Step 2: Install and confirm resolution**

Run in each repo: `pnpm install`, then `node -e "console.log(require.resolve('@tuanmjnh/tm-ai-client'))"`
Expected: a path inside the repo's own `node_modules/.pnpm`, not `../tm-platform`.

- [ ] **Step 3: Re-run gates**

Run: `pnpm typecheck && pnpm test` in `tm-tools`.
Expected: exit 0 both, 68/68 specs pass.

- [ ] **Step 4: Commit each repo separately**

```bash
# tm-tools
git add package.json pnpm-lock.yaml
git commit -m "chore: depend on the published tm-ai-client 0.1.0"

# tm-studio
git add package.json pnpm-lock.yaml
git commit -m "chore: add the published tm-ai-client 0.1.0"
```

---

## Phase B — `tm-studio` AI on the shared client (plan Phase 7)

Facts established by inspection: `tm-studio` never relays AI through the Hub in the desktop build. The renderer calls `window.electronAPI.tools.aiGateway.*` → IPC → `electron/tools/ai-gateway.cjs` in the main process, which calls the provider directly. The web/dev build falls back to `/api/v1/ai/relay/*`. So the hosted-Hub loopback defect cannot reach it; the remaining work is contract unification, not a bug fix.

### Task B1: Pin the current gateway behaviour with tests

**Files:**
- Test: `tm-studio/electron/tools/ai-gateway.test.mjs` (extend)

- [ ] **Step 1: Add a test that pins the error contract for an unreachable endpoint**

`complete(args, opts)` reads configuration from `process.env` via `taskConfig(task)`; it does **not** take an env object. Existing tests save/restore `process.env` around the call, so follow that pattern.

```js
test('an unreachable endpoint reports ai.network, never a raw fetch error', async () => {
  const gw = await import('./ai-gateway.cjs')
  const saved = { ...process.env }
  Object.assign(process.env, {
    AI_PROVIDER: 'custom',
    AI_BASE_URL: 'http://127.0.0.1:1/v1',
    AI_API_KEY: 'x',
    AI_MODEL: 'm'
  })
  try {
    const err = await gw.complete({ messages: [{ role: 'user', content: 'hi' }] }).catch(e => e)
    assert.ok(err instanceof gw.AIGatewayError)
    assert.equal(err.code, 'ai.network')
    assert.ok(!String(err.message).includes('ECONNREFUSED'))
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in saved)) delete process.env[key]
    }
    Object.assign(process.env, saved)
  }
})
```

- [ ] **Step 2: Run it and confirm it passes today**

Run: `cd tm-studio && node --test electron/tools/ai-gateway.test.mjs`
Expected: PASS. If it fails, record the actual code/message in the task notes before continuing — that is the baseline the refactor must preserve.

- [ ] **Step 3: Commit the pin**

```bash
git add electron/tools/ai-gateway.test.mjs
git commit -m "test(ai): pin the desktop gateway error contract"
```

### Task B2: Route provider HTTP through `@tuanmjnh/tm-ai-client`

**Files:**
- Modify: `tm-studio/electron/tools/ai-gateway.cjs` (`complete`, `listModels`)
- Test: `tm-studio/electron/tools/ai-gateway.test.mjs`

**Interfaces:**
- Consumes: `createAIClient({ endpoint: { provider, baseUrl, apiKey, mode }, assertModeAllowed })` and `client.chat({ model, messages, maxTokens, temperature })` from `@tuanmjnh/tm-ai-client`.
- Produces: unchanged `complete(args, opts)` / `listModels(args, opts)` signatures so `registerAiGateway` and the preload namespace keep working.

- [ ] **Step 1: Add a failing test for a non-2xx provider reply**

The gateway already defines `ai.api-error` for an upstream rejection; `AIGatewayError(code, message, extra)` spreads `extra` onto the instance. Reuse those names — do not invent `ai.unauthorized`.

```js
test('a 401 from the provider maps to ai.api-error with no key in the message', async () => {
  const gw = await import('./ai-gateway.cjs')
  const saved = { ...process.env }
  Object.assign(process.env, {
    AI_PROVIDER: 'custom',
    AI_BASE_URL: 'http://127.0.0.1:9/v1',
    AI_API_KEY: 'secret-key-value',
    AI_MODEL: 'm'
  })
  try {
    const err = await gw.complete(
      { messages: [{ role: 'user', content: 'hi' }] },
      { fetch: async () => new Response('{"error":{"message":"Invalid API key"}}', { status: 401 }) }
    ).catch(e => e)
    assert.ok(err instanceof gw.AIGatewayError)
    assert.equal(err.code, 'ai.api-error')
    assert.equal(err.status, 401)
    assert.ok(!JSON.stringify(err).includes('secret-key-value'))
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in saved)) delete process.env[key]
    }
    Object.assign(process.env, saved)
  }
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test electron/tools/ai-gateway.test.mjs`
Expected: FAIL — either the code differs or the injected `fetch` is ignored.

- [ ] **Step 3: Replace the hand-rolled request with the shared client**

Inside `complete()`, keep every existing guard (base URL required, keyless local allowed, rate limit, per-task config) and replace only the request/response/error section:

```js
const { createAIClient, AIClientError } = require('@tuanmjnh/tm-ai-client')

function toGatewayError(err) {
  if (err instanceof AIClientError) {
    const map = {
      'ai.network': 'ai.network',
      'ai.rate-limited': 'ai.rate-limited',
      'ai.timeout': 'ai.timeout',
      'ai.no-key': 'ai.no-key',
      'ai.no-base-url': 'ai.no-base-url',
      'ai.no-model': 'ai.no-model',
      'ai.aborted': 'ai.timeout',
      'ai.bad-shape': 'ai.bad-shape',
      'ai.http-error': 'ai.api-error'
    }
    return new AIGatewayError(map[err.code] || 'ai.api-error', err.message, { status: err.status })
  }
  return new AIGatewayError('ai.network', 'Provider is unreachable')
}
```

`ai.network` must map to itself — Task B1 asserts it survives the refactor. Keep every code the gateway already exposes (`ai.api-error`, `ai.bad-shape`, `ai.http-error`, `ai.network`, `ai.no-base-url`, `ai.no-file`, `ai.no-key`, `ai.no-model`, `ai.rate-limited`, `ai.timeout`) so the renderer's error copy keeps working.

Pass the existing injected `fetch` through so the tests keep their doubles; do the same in `listModels()`.

- [ ] **Step 4: Run the whole gateway suite**

Run: `node --test electron/tools/ai-gateway.test.mjs`
Expected: PASS, including the Task B1 pin and all 38 pre-existing tests.

- [ ] **Step 5: Run the repo gates**

Run: `pnpm test && pnpm typecheck`
Expected: exit 0, 224 tests green.

- [ ] **Step 6: Commit**

```bash
git add electron/tools/ai-gateway.cjs electron/tools/ai-gateway.test.mjs pnpm-lock.yaml
git commit -m "refactor(ai): run the desktop gateway on the shared AI client"
```

### Task B3: Prove the desktop path against the real local provider

**Files:** none modified (manual verification, recorded in the task notes).

- [ ] **Step 1: Configure the studio desktop AI slots**

In the app: Settings → AI keys, provider `freellmapi`, base URL `http://127.0.0.1:31415/v1`, model `auto`, paste the key. Save. If the app is not packaged, write the same values into `%APPDATA%/tm-studio/config.env` via the app's own settings screen (never hand-edit a plaintext key into a committed file).

- [ ] **Step 2: Run one completion from the UI**

Open TMCut → AI script, send a one-line prompt.
Expected: an answer arrives; Settings → AI keys shows the masked key and a `Local`-style status, not a Hub relay badge.

- [ ] **Step 3: Record the evidence**

Append to the task notes: provider, model, latency, and the fact that the call went through `tools:ai-gateway`. Do not paste the key.

---

## Phase C — Hub hardening + hosted rollout (plan Phase 5 tail)

### Task C1: Enable the relay mode guard in dev and prove both answers

**Files:**
- Modify: `tm-hub/.env` (gitignored)

- [ ] **Step 1: Turn the guard on locally**

Add to `tm-hub/.env`:
```
AI_RELAY_REQUIRE_HUB_MANAGED=true
```

- [ ] **Step 2: Restart the hub and prove a `local` row is refused**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -H "X-App-Id: <tm-tools id>" -H "X-App-Secret: <secret>" \
  -d '{"connectionId":"774c79e3-9293-4bbe-9d6c-fe9d84991315","model":"auto","messages":[{"role":"user","content":"ping"}]}' \
  http://localhost:4000/api/v1/apps/<tm-tools id>/ai/relay/chat
```
Expected: HTTP 403 with `Connection mode 'local' is not relayed by this Hub`.

- [ ] **Step 3: Prove a `hub` row still works**

Same call with the `nvidia-main` connection id.
Expected: HTTP 200 with content.

- [ ] **Step 4: Turn the guard back off for local development**

Set `AI_RELAY_REQUIRE_HUB_MANAGED=false` and restart. Phase 6 depends on the local hub relaying loopback while the app-side `local` path is still being verified.

### Task C2: Deploy the Hub with the guard on (owner-gated)

**Files:** Vercel env only.

- [ ] **Step 1: Ask the owner before touching production**

State plainly: this changes behaviour for every satellite. Do not proceed without a yes.

- [ ] **Step 2: Deploy the committed hub**

Push `tm-hub` `main`, let Vercel build, confirm the deployment is live.

- [ ] **Step 3: Set the env var**

```
AI_RELAY_REQUIRE_HUB_MANAGED=true
```
Redeploy so the runtime config picks it up.

- [ ] **Step 4: Verify from outside**

Call the hosted relay with a `local` connection id → expect 403 (not 502). Call with a `hub` connection → expect 200.

- [ ] **Step 5: Point the satellites back at the hosted hub only after both pass**

`tm-tools/.env` and `tm-studio/.env`: `NUXT_PUBLIC_HUB_URL=https://tm-hub-app.vercel.app`. Restart both. Confirm tm-tools AI still answers (it now runs `local` mode itself) and that non-AI Hub features still work.

---

## Phase D — Shared UI (plan Phases 3 and 8)

Deferred until A–C are stable. Start with one vertical slice, not the 84-component list.

### Task D1: Contract audit for three components only

**Files:**
- Create: `tm-platform/docs/plans/ui-contract-audit.md`

- [ ] **Step 1: Pick three candidates by real duplication, not by name**

Confirmed present in all three repos: `app/components/admin/StatusBadge.vue` and `app/components/shared/ListFooter.vue`. Add `app/components/base/Page.vue` as the third.

- [ ] **Step 2: For each, tabulate props / emits / slots / defaults / a11y / responsive behaviour from all three repos**

Write the table into the audit file. Where two differ, mark `keep-in-app` and say why in one line.

- [ ] **Step 3: Commit**

```bash
git add docs/plans/ui-contract-audit.md
git commit -m "docs: audit three shared UI candidates"
```

### Task D2: Create `tm-ui` with exactly one component

**Files:**
- Create: `tm-platform/packages/ui/{package.json,tsup.config.ts,tsconfig.json,src/index.ts,src/StatusBadge.vue}`
- Test: `tm-platform/packages/ui/tests/statusBadge.test.mjs`

- [ ] **Step 1: Write the failing render test**

The real component takes `label`, `color`, `icon`, `size`, `clickable`, `loading`, `disabled` and emits `click`; it renders a `UIcon` only when `icon` is passed.

```js
test('StatusBadge renders its label and the icon it is given', async () => {
  const { renderToString } = await import('vue/server-renderer')
  const { createSSRApp, h } = await import('vue')
  const { StatusBadge } = await import('../dist/index.js')
  const html = await renderToString(createSSRApp({
    render: () => h(StatusBadge, { label: 'Connected', color: 'success', icon: 'i-lucide-circle-check' })
  }))
  assert.match(html, /Connected/)
  assert.match(html, /i-lucide-circle-check/)
})
```

- [ ] **Step 2: Run it; expect a module-not-found failure**

Run: `pnpm --filter @tuanmjnh/tm-ui test`
Expected: FAIL (package not created yet).

- [ ] **Step 3: Scaffold the package by copying the shape of `packages/tm-utils` (same tsup + prepare-dist pattern), then port the component with Vue as a peer dependency**

- [ ] **Step 4: Build, test, pack**

Run: `pnpm --filter @tuanmjnh/tm-ui build && pnpm --filter @tuanmjnh/tm-ui test && pnpm --filter @tuanmjnh/tm-ui exec npm pack --dry-run`
Expected: all exit 0; `vue` is a peer, not bundled.

- [ ] **Step 5: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): add tm-ui with a token-based StatusBadge"
```

### Task D3–D5: Migrate one app at a time

Same shape each time, one repo per task: add the pinned dependency, replace the local component at **one** call site, run the repo gates, commit. Never delete the local copy until all three consumers have migrated and their suites are green.

---

## Phase E — Template + release hygiene (plan Phases 9 and 10)

- **E1:** `examples/nuxt4-app` that consumes `tm-types` + `tm-ai-client` from the registry and boots with `pnpm dev`. Gate: page renders, one AI call against a stub server.
- **E2:** Upgrade guide in `tm-platform/docs/upgrade.md` covering `file:` → version, and the mode migration table from `docs/phase-0-audit.md` §7.
- **E3:** Security review checklist run against §6.5–6.7 of the spec: no secret in any package tarball (`npm pack` + grep), no localhost URL reachable from a hub-mode relay, grants enforced on cross-app rows (already covered by `tests/ai-connection-grants.test.ts`), secrets absent from logs.

---

## Execution log (2026-11-13)

Status against the plan, with the evidence each claim rests on.

| Task | Status | Evidence |
|---|---|---|
| A1–A3 publish 0.1.0 | done | 6 packages on npm, `release.mjs list` shows `up to date` |
| A4 consumers on a version | done | tm-tools and tm-studio resolve `@tuanmjnh/tm-ai-client` from `.pnpm` |
| B1 pin gateway contract | done | `electron/tools/ai-gateway.test.mjs` network pin |
| B2 gateway on the client | done | 41/41 gateway tests, `pnpm test` 83/83, typecheck 0 |
| B3 desktop against a real provider | **deferred** | needs the desktop app and a saved key; owner action |
| C1 relay guard locally | done | 403 for `local`, 200 for `hub` (recorded earlier) |
| C2 hosted deploy with the guard | **blocked** | owner approval required, nothing deployed |
| D1 contract audit | done | `docs/plans/ui-contract-audit.md` |
| D2 `tm-ui` slice | done | `StatusBadge` + `ListFooter` + `ModelSelect`; 8 files / 3.7 kB before ModelSelect |
| D3–D5 migrate apps | done | 14 badge + 27 footer + 2 picker call sites across 3 apps; 3 `StatusBadge`, 3 `RecordCount` copies deleted; now on the registry version, not `link:` |
| E1 example app | done | page renders 200; `/api/chat` returns `pong (auto)` against a stub |
| E2 upgrade guide | done | `docs/upgrade.md` |
| E3 security review | done | `docs/security-review.md`; fixed a real loopback hole (below) |
| F1 `tm-ui` 0.1.1 | **pending publish** | `text-foreground` → `text-highlighted` fixed in source, package tests 3/3; needs the owner's OTP |
| F2 app `@source` fix | done | package root, not `dist/`; 6/4/7 package-only classes now in each built CSS, 0 missing |

### Plan deviation worth recording

B2's plan said to map `ai.http-error` to `ai.api-error`. The existing suite pins
`ai.http-error` for a 401 in `listModels`, and no renderer branches on that
code, so the mapping was dropped; the gateway keeps its published vocabulary.

### D3–D5 executed against a local package

`@tuanmjnh/tm-ui` stays unpublished for now (npm returns `EOTP` for a new
package name), so all three apps consume it with `link:../tm-platform/packages/tm-ui`
and the migration was run and verified against that.

Two configuration requirements were found by measurement, not assumption:

1. **Vite dev blocked the symlink.** `link:` points outside the project root, so
   the browser got `403 ... is outside of Vite serving allow list` and the badge
   never loaded — while `nuxt build` passed, which made it look fine. Each app
   now adds the package to `vite.server.fs.allow`.
2. **Tailwind did not scan the package.** Class strings live only in the
   package's compiled dist, and `bg-info/10` had no other occurrence in tm-hub or
   tm-tools, so that tone would have rendered unstyled. Each `main.css` now has
   `@source "../../../node_modules/@tuanmjnh/tm-ui/dist"`.

`file:` was measured and rejected for local iteration: pnpm copies it into
`.pnpm`, so source edits need a forced reinstall.

Measured after the migration:

| Gate | tm-hub | tm-tools | tm-studio |
|---|---|---|---|
| `pnpm typecheck` | 0 | 0 | 0 |
| `pnpm test` | 268 pass | 68 pass | 144 + 83 pass |
| `pnpm build` | pass | pass | pass |
| Badge mounted in a real page | yes (8 pills) | yes | module imported; table empty |
| `active:scale-95` in source / built CSS | 0 / 1 | 0 / 1 | 0 / 1 |
| All 7 semantic tones in built CSS | yes | yes | yes |

Both of those CSS rows were **rejected later as proof** — see "The `@source`
path was wrong" below. They held while the apps used `link:`, because the local
package really does keep its output in `dist/`. They stopped holding the moment
the package came from the registry.

### ListFooter and RecordCount extracted afterwards

`shared/ListFooter.vue` was identical in all three apps (only Prettier
formatting differed) and `shared/RecordCount.vue` had no direct users, so both
moved into the package. To keep `@tuanmjnh/tm-ui` free of an i18n dependency,
the three strings became props (`recordsLabel`, `loadingLabel`, `noMoreLabel`);
each app keeps a six-line wrapper that passes `t(...)` and forwards the
`left`/`right` slots. All 27 call sites are untouched.

Measured after the second pass (all three apps):

| Gate | tm-hub | tm-tools | tm-studio |
|---|---|---|---|
| `pnpm typecheck` | 0 | 0 | 0 |
| `pnpm test` | 268 pass | 68 pass | 144 + 83 pass |
| `pnpm build` | pass | pass | pass |
| `ListFooter` mounted in a real page | 14 Record(s) | 50 Record(s) | 0 Record(s) |
| computed `min-height` | 32px | 32px | 32px |

The 32px held while the package was linked, but it proved less than it looked
like: `min-h-8` **also exists in `@nuxt/ui`** (`ui/drawer.ts`, `ui/chat-message.ts`),
so a non-zero count in the stylesheet cannot tell you which package supplied it.
That is why the replacement check below compares against classes that exist in
`tm-ui` and nowhere else.

### The `@source` path was wrong, and two of the gates above were not proof

The package's `publish` script runs `npm publish ./dist`, so the tarball **is**
the contents of `dist/` — the installed package is flat, with `ListFooter.js`
at its root next to `package.json`. But every app's `main.css` said:

```css
@source "../../../node_modules/@tuanmjnh/tm-ui/dist";
```

Under `link:` that path existed, so the scan worked. Under a registry install it
matches nothing, Tailwind emits no error for a missing `@source`, and every
utility that only the package uses silently disappears from the stylesheet.

Measured with `scripts/check-tmui-css.mjs`, which diffs the class strings in the
installed package against app source and the `@nuxt/ui` theme, then asks whether
each package-only class reached the build:

| App | tm-ui-only classes missing before the fix | After |
|---|---|---|
| tm-hub | 6 — `active:scale-95`, `bg-muted/20`, `disabled:opacity-60`, `max-h-28`, `sm:text-xs`, `w-80` | 0 |
| tm-tools | 4 — `active:scale-95`, `disabled:opacity-60`, `max-h-28`, `sm:text-xs` | 0 |
| tm-studio | 7 — the above plus `select-all`, `text-foreground` | 0 |

The fix is one character of path: point `@source` at the package root, not
`dist`. Rebuilding each app moved every one of those classes into the
stylesheet, which is the evidence the earlier "0 / 1" rows lacked.

### A second defect the new check found: `text-foreground` is not a utility

`select-all` and `text-foreground` were both listed as missing for studio. The
first was the `@source` bug. The second was a real source bug: `ModelSelect.vue`
styled the error popover's title `text-foreground`, and Nuxt UI v4 has no such
utility — the app-wide colour roles are `text-highlighted`, `text-default`,
`text-toned`, `text-muted`, `text-dimmed`, `text-inverted`, plus the app-config
colours (`text-primary`, `text-secondary`, …). `text-foreground` appears nowhere
in the `@nuxt/ui` package, so the title would have inherited its parent's colour
instead of being emphasised. Renamed to `text-highlighted` and rebuilt; the
checker is now clean on all three apps.

This is the case for keeping `check-tmui-css.mjs`: no build, typecheck or test
gate can see a class name that does not exist.

**The same string is already in tm-hub and tm-tools**, and it was there before
this work: `git show HEAD:tm-hub/app/pages/chat.vue` contains 9 occurrences, and
no `.text-foreground` rule exists in either app's built CSS. Those are a
pre-existing defect in the two apps, out of scope here and left untouched; the
package no longer adds to the count.

### ModelSelect extracted, and the defect that exposed

tm-tools gained a substantially upgraded `aiProviders/ModelSelect.vue`
(searchable, virtualised, paged scroll, a connection-check button with a
hover error popover and error classification). tm-hub had an older copy of the
same idea, so both moved to the package.

The package version is dependency-free: no `@vueuse/core` (the linked checkout
cannot resolve it), no `$fetch`, no `useNotify`, no `useI18n`. The app supplies
`checkModel` as a callback and the labels as props, and the component emits
`check:success` / `check:error` for the host to toast. Infinite scroll became one
passive listener on `USelectMenu`'s exposed `viewportRef`.

**The defect.** After wiring it up, reading the live DOM showed
`<uselectmenu>`, `<ubutton>`, `<utooltip>` and `<ubadge>` as literal unknown
elements. Nuxt UI v4 resolves its components through a **build-time**
auto-import that only rewrites files the app compiles itself. This package ships
**precompiled** `dist/*.js`, so every `resolveComponent('UBadge')` fell through
to the app's runtime registry, found nothing, and Vue rendered the tag name.

This was already live for `StatusBadge` and `ListFooter` before this step —
tm-hub had a `tm-ui-globals.client.ts` covering `UBadge`/`UIcon`, which is why
its pills looked right and hid the problem. Every static gate passed throughout:
`pnpm build`, `pnpm typecheck` and the package's own SSR render tests (which stub
the primitives) all stayed green while the UI was missing.

**The fix.** Register the six primitives the dist resolves, in all three apps:

```ts
// app/plugins/tm-ui-globals.client.ts
import { UBadge, UIcon, UButton, USelectMenu, UTooltip, UPopover } from '#components'
```

That list is exactly `grep -oh 'resolveComponent("[A-Za-z]*")' dist/*.js | sort -u`
— it must be re-checked whenever a component is added, because a missing entry is
silent. All three apps are SPA (`ssr: false`), so a `.client` plugin is enough.

Measured after the fix, reading `document.querySelectorAll('*')` for tag names
matching `/^u[a-z]/`, on a signed-in page in each app:

| App | Unresolved tags before | After | Footer check |
|---|---|---|---|
| tm-hub | `ubadge`×14, `uicon`×14 | none | 14 Record(s), 32px |
| tm-tools | `uselectmenu`, `ubutton`, `utooltip` | none | — (picker: 20 options, search placeholder "Select model") |
| tm-studio | — | none | 0 Record(s), 32px |

That check now lives in `scripts/probe-unresolved-tags.mjs` rather than in a
throwaway script, and it was control-tested: with
`app/plugins/tm-ui-globals.client.ts` renamed out of the way it reports
`unresolved=[uselectmenu,utooltip,ubutton]` and exits 1, and restoring the file
returns it to `unresolved=[none]`. A probe that cannot fail is not evidence.

One tools spec pinned the old implementation by source regex
(`ai_relay_ui.spec.ts`). The behaviour is unchanged, so the reads were repointed
at the wrapper *and* the package source; no assertion was dropped — the count went
68/68 with the same checks.

### Published, and the apps switched to the registry

`@tuanmjnh/tm-ui@0.1.0` is on npm; the published tarball's compiled
`ModelSelect.js` is byte-identical to the local `dist` (md5
`4cef983d28df0472b9c9dc729f9d7ebe`, 14 files). All three apps now pin `0.1.0`
and resolve it from `node_modules/.pnpm/@tuanmjnh+tm-ui@0.1.0_@nuxt_…`, not
from `../tm-platform`. `node scripts/release.mjs list` reports all seven
packages `up to date`. An earlier run of that command said `unpublished`; it was
registry propagation lag right after the publish, not a script defect.

Gates against the registry install. The CSS row that stood here
(`min-h-8` 0 / 1) was **not** proof — see "The `@source` path was wrong" above —
so it is replaced by the package-only class diff, and the builds below are the
ones taken *after* both fixes:

| Gate | tm-hub | tm-tools | tm-studio |
|---|---|---|---|
| `pnpm typecheck` | 0 | 0 | 0 |
| `pnpm test` | 268 pass | 68 pass | 144 pass, 1 pre-existing fail |
| `pnpm build` | exit 0, 1m17s | exit 0, 2m34s | exit 0, 53.3s |
| tm-ui-only classes missing from built CSS | 0 of 6 | 0 of 4 | 0 of 7 |
| computed footer `min-height` | 32px (14 Record(s)) | 32px (50+ Record(s)) | 32px (3 Record(s)) |
| unresolved `<u*>` tags in the DOM | none on `/admin/apps`, `/admin/users`, `/admin/roles` | none on `/chat` | none on `/system/docs`, `/resources/notifications`, `/system/settings/sessions` |

The studio failure is `tmcut_doc_table_shape.spec.ts`: `docs/audit/zero-ffmpeg-audit.md:9114`
has 3 cells where header line 9107 has 2. It is unrelated to the package work and
was proven pre-existing by stashing the changes, re-running on clean `HEAD` (same
failure), and restoring. Not fixed here, and not softened — the spec still checks
what it checked before.

The published 0.1.0 tarball still contains the `text-foreground` bug. The
`@source` fix is app-side, so that one is already covered, but the bad class is
compiled into the package. A 0.1.1 is required before anyone installs this
fresh: until it is out, an app pinned to `0.1.0` renders the error popover title
in the inherited colour. Locally the package is already fixed and its own tests
pass (3/3).

### Four defects found and fixed while executing

1. **`tm-ai-client` reported a malformed reply as `ai.network`.** An adapter
   parse failure thrown inside the request try-block was caught by the network
   handler, so a 200 with no message content looked like a connectivity fault.
   Now `ai.bad-shape`. Published as 0.2.1 together with `allowKeyless`.
2. **The Hub relay trusted `inference_mode` alone.** A row mislabelled `hub`
   pointing at `127.0.0.1` passed the mode check and failed upstream as a 502 —
   the Phase 0 defect, still reachable. A hosted runtime now also checks the
   resolved base URL, in both the chat path and the catalogue. tm-hub is
   268/268 with 12 new policy assertions.
3. **The `@source` path pointed at a directory the registry install does not
   have.** Detailed above under its own heading; fixed in all three apps, and
   `check-tmui-css.mjs` now guards it.
4. **`text-foreground` is not a Nuxt UI utility.** Detailed above; fixed in the
   package source, awaiting a 0.1.1 publish.

### Plan deviation worth recording

B2's plan said to map `ai.http-error` to `ai.api-error`. The existing suite pins
`ai.http-error` for a 401 in `listModels`, and no renderer branches on that
code, so the mapping was dropped; the gateway keeps its published vocabulary.

---

## Sequencing summary

| Order | Phase | Blocks | Owner gate |
|---|---|---|---|
| 1 | A1–A2 | B, C | npm scope + login |
| 2 | A3 | A4 | **publish approval** |
| 3 | A4 | B2 | — |
| 4 | B1–B3 | C2 | — |
| 5 | C1 | C2 | — |
| 6 | C2 | — | **production deploy approval** |
| 7 | D1–D5 | E1 | — |
| 8 | E1–E3 | — | — |

Two owner gates only: publishing packages, and deploying the Hub with the guard on. Everything else is local and reversible.
