# Upgrading to the shared packages

Two migrations: moving dependencies from a `file:` link to a registry version,
and moving AI connections from implicit to explicit modes.

## 0. Local mode (until a package is published)

`@tuanmjnh/tm-ui` has no registry release yet, so the three apps consume it from
the workspace with a `link:` spec while that is the case:

```json
"@tuanmjnh/tm-ui": "link:../tm-platform/packages/tm-ui"
```

`link:` is a symlink, so an edit under `packages/tm-ui/src` is visible after
`pnpm build` in the package — no reinstall. Four things are required because the
symlink points outside the consuming project, and each one fails quietly:

1. **Vite dev must be allowed to serve it.** Without this, the browser gets
   `403 ... is outside of Vite serving allow list` and the component silently
   fails to load:

```ts
// nuxt.config.ts
vite: {
  server: {
    fs: { allow: [fileURLToPath(new URL('../tm-platform/packages/tm-ui', import.meta.url))] }
  }
}
```

2. **Tailwind must scan the package's dist.** Tailwind does not scan
   `node_modules`, and the component's class strings only exist there:

```css
@import "@nuxt/ui";
@source "../../../node_modules/@tuanmjnh/tm-ui/dist";
```

3. **The app must register every component the package resolves at runtime.**
   `dist` is precompiled by `scripts/build-sfc.mjs`, so a component's render
   function calls `resolveComponent(…)` rather than receiving an injected
   auto-import. Nuxt rewrites auto-imports only in files it compiles itself, so
   for a package each of those lookups falls through to the app's global
   component registry. Take the list from the dist, not from the component you
   happen to be looking at — the badge needs two primitives, `ModelSelect` needs
   four more:

```bash
grep -o 'resolveComponent("[A-Za-z]*")' node_modules/@tuanmjnh/tm-ui/dist/*.js | sort -u
# UBadge, UButton, UIcon, UPopover, USelectMenu, UTooltip
```

```ts
// app/plugins/tm-ui-globals.client.ts
import { UBadge, UButton, UIcon, UPopover, USelectMenu, UTooltip } from '#components'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('UBadge', UBadge)
  nuxtApp.vueApp.component('UButton', UButton)
  nuxtApp.vueApp.component('UIcon', UIcon)
  nuxtApp.vueApp.component('UPopover', UPopover)
  nuxtApp.vueApp.component('USelectMenu', USelectMenu)
  nuxtApp.vueApp.component('UTooltip', UTooltip)
})
```

   Re-run that grep after every package upgrade: a new component can add a
   primitive nobody registered yet, and the omission is silent in the worst way.
   A display `StatusBadge` renders `<ubadge label="…" color="success">` as an
   unknown element — an empty pill, no console error, `nuxt build` and
   `vue-tsc` green — while the `clickable` variant (a plain `<button>`) still
   looks right, so a visual check can pass with half the badges invisible.

4. **One Vue instance, or none of the above helps.** `link:` also changes where
   the package resolves `vue` from: Vite reads it out of `tm-platform`'s tree
   (its own 3.5.45) instead of the app's. When the app cannot resolve `vue` from
   its root — `tm-websites` is such a case, `vue` arrives through Nuxt's own
   dependencies and its layers declare none — Vite loads both copies, the
   package's `resolveComponent` runs with no `currentInstance`, and it returns
   the tag name string. The registry from step 3 is then correct and irrelevant:
   the wrong Vue instance is asking.

   Diagnose it on a running dev server by reading the module Vite rewrote:

```bash
curl -s "http://localhost:4000/_nuxt/@fs/<abs>/packages/tm-ui/dist/StatusBadge.js" | head -1
# from "/_nuxt/@fs/.../tm-hub/node_modules/.pnpm/vue@3.5.44.../vue/dist/..."  -> one instance, fine
# from "/_nuxt/@fs/.../tm-platform/node_modules/.pnpm/vue@3.5.45.../vue/dist/..."  -> two instances
```

   A registry install (section 1) removes this whole class of bug: `vue` is a
   peer, so it resolves from the app and there is only one copy. That is the real
   reason to publish rather than link. If linking is unavoidable, the app needs a
   `vue` it can resolve plus `vite.resolve.dedupe: ['vue']` — and do that
   deliberately: adding `vue` to a Nuxt app's `package.json` only to give
   `dedupe` something to resolve produced 122 `vue-tsc` errors in `tm-websites`,
   including `Cannot find module 'vue'` in a layer file that has no dependency of
   its own. `tm-hub` links today because it already declares `vue` itself; it was
   missing step 3 only.

Do not use `file:` for local iteration: pnpm copies it into `.pnpm`, so edits
need a forced reinstall and it is easy to believe a change landed when it did
not.

Once the package is on the registry, switch all three apps at once:

```bash
pnpm tm-ui:registry   # link: -> ^0.1.0, version read from the package manifest
pnpm tm-ui:link       # back to the local symlink
```

`minimumReleaseAgeExclude` in each app's `pnpm-workspace.yaml` already lists
`@tuanmjnh/tm-ui@0.1.0`, so a fresh publish is not refused. The `fs.allow` and
`@source` entries above stay harmless under a registry install; delete them only
if you also want the extra config noise gone.

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
| `@tuanmjnh/tm-ui` | `vue` is a peer; `@nuxt/ui` stays the app's own dependency. Exports `StatusBadge` and `ListFooter`; `ListFooter` takes its three labels as props, so each app keeps a thin wrapper that supplies `t(...)`. While it is linked it needs all four items from §0 — `fs.allow`, `@source`, the `UBadge`/`UIcon` registration, and one Vue instance |

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

A green typecheck says nothing about the wiring above — the failing modes are a
403 from Vite's allow list, a class string missing from the CSS, and an element
rendered as a tag name. Check them in a signed-in browser on a page that shows a
pill:

```js
document.querySelectorAll('ubadge').length   // must be 0
// the pill itself must be a span[data-slot="base"] carrying bg-success/10 or
// bg-warning/10, not an empty custom element
```

`app._context.components` containing the names from step 3 proves the plugin
landed; only the DOM proves the component drew.
