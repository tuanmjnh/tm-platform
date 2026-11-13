# @tuanmjnh/tm-ui

Shared Nuxt UI components for the TM platform.

## Install

```bash
pnpm add @tuanmjnh/tm-ui
```

`vue` is a peer dependency. `@nuxt/ui` is an optional peer: the components
render Nuxt UI primitives (`UBadge`, `UIcon`) through the host app's
auto-imports. Tailwind token classes (`bg-success/10`, `text-muted`, …) come
from the app's theme.

SFCs are compiled at build time, so consuming apps do not need to transpile
this package.

### Consuming a local checkout

Until a registry release exists, apps link the workspace copy:

```json
"@tuanmjnh/tm-ui": "link:../tm-platform/packages/tm-ui"
```

The symlink points outside the app root, so **three** host settings are required
— without them the components fail silently in dev:

```ts
// nuxt.config.ts — otherwise Vite answers 403 "outside of Vite serving allow list"
vite: { server: { fs: { allow: [fileURLToPath(new URL('../tm-platform/packages/tm-ui', import.meta.url))] } } }
```

```css
/* app/assets/css/main.css — Tailwind does not scan node_modules.
   The path is the package root, not `dist/`: publishing runs
   `npm publish ./dist`, so the installed tree is flat and a `dist`
   suffix matches nothing — silently dropping every package-only class. */
@source "../../../node_modules/@tuanmjnh/tm-ui";
```

```ts
// app/plugins/tm-ui-globals.client.ts — see "Why the plugin" below
import { UBadge, UIcon, UButton, USelectMenu, UTooltip, UPopover } from '#components'
export default defineNuxtPlugin((nuxtApp) => {
  for (const [name, component] of Object.entries({ UBadge, UIcon, UButton, USelectMenu, UTooltip, UPopover })) {
    nuxtApp.vueApp.component(name, component)
  }
})
```

`nuxt build` passes even when all three are missing, so verify in the dev server,
not only in a production build. Prefer `link:` over `file:` for iteration:
`file:` copies the package into `.pnpm` and hides source edits behind a
reinstall.

### Why the plugin

This package is published **precompiled** (`dist/*.js`). Nuxt UI v4 resolves
`<UBadge>`, `<USelectMenu>`, … through its **build-time** auto-import, which only
rewrites files the app compiles itself. Inside a precompiled module the
`resolveComponent('UBadge')` call therefore goes to the app's runtime registry;
with nothing registered it silently falls back to the literal tag name.

The failure is invisible to every static gate: the build succeeds, the typecheck
succeeds, and the page renders — with empty `<ubadge>`, `<uselectmenu>` and
`<ubutton>` elements where the UI should be. It was caught by reading
`document.querySelectorAll('*')` in a browser and looking for tag names matching
`/^u[a-z]/`.

Registering the six primitives globally fixes it, and since every consuming app
is SPA (`ssr: false`) a `.client` plugin is sufficient.

## StatusBadge

```vue
<AdminStatusBadge label="Connected" color="success" icon="i-lucide-circle-check" />

<AdminStatusBadge label="Retry" color="warning" clickable :loading="busy" @click="retry" />
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — (required) |
| `color` | `success \| neutral \| warning \| info \| error \| primary \| secondary` | `neutral` |
| `icon` | `string` | `''` |
| `size` | `xs \| sm` | `xs` |
| `clickable` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

Emits `click` (no payload). Without `clickable` it renders a `UBadge
variant="subtle"`; with it, a real `<button type="button">` whose geometry
matches the pills the apps already ship and whose tones come from semantic
theme tokens, never a fixed shade.

## ListFooter

The list footer shared by the three apps: left/right slots, a record count, a
loading spinner and an optional "no more data" line.

```vue
<SharedListFooter :count="rows.length" :has-more="hasMore" :loading="loading">
  <template #left><FilterBar /></template>
  <template #right><ExportButton /></template>
</SharedListFooter>
```

| Prop | Type | Default |
|---|---|---|
| `count` | `number` | `0` |
| `hasMore` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `showNoMore` | `boolean` | `false` |
| `recordsLabel` | `string` | `'Record(s)'` |
| `loadingLabel` | `string` | `'Loading...'` |
| `noMoreLabel` | `string` | `'No more data'` |

Labels are props rather than `useI18n()` calls, so the package carries no i18n
dependency. Each app keeps a thin `shared/ListFooter.vue` wrapper that passes
its translated strings, which leaves every call site untouched.

## ModelSelect

The model picker: searchable, virtualised, paged as you scroll, with an optional
connection check.

```vue
<ModelSelect
  v-model="modelKey"
  :models="models"
  :labels="{ placeholder: t('chat.selectModel') }"
  :check-model="check"
  @check:success="toastOk"
  @check:error="toastFail"
/>
```

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` (`connectionId:modelId`) | — |
| `models` | `ModelOption[]` | — |
| `loading` / `disabled` | `boolean` | `false` |
| `widthClass` | `string` | `'w-56 sm:w-72'` |
| `showCheck` | `boolean` | `true` |
| `labels` | `ModelSelectLabels` | built-in English |
| `checkModel` | `(modelKey, { signal }) => Promise<ModelCheckResult>` | — (hides the button) |
| `checkTimeoutMs` | `number` | `10000` |
| `providerIcon` | `(provider) => string` | built-in map |

Emits `update:modelValue`, `check:success`, `check:error`.

**Why it looks like this.** The component carries no `@vueuse/core`, `$fetch`,
`useNotify` or `useI18n`: the app supplies the transport and the labels, and
reacts to the emitted outcomes. That is what lets one implementation serve an app
with a check endpoint and an app without one.

A label entry may be a string template (`{ms}`, `{status}`) **or** a function.
Prefer the function form with `t(key, params)` — it hands the interpolation to
the host's translation engine instead of leaving a placeholder for it to escape.

Two app notes:

- `checkModel` is the only thing that makes the check button appear; omit it and
  the picker is just a picker.
- `providerIconFor` is exported if a host wants the same icons elsewhere.

## Migrating from a local copy

```diff
-import AdminStatusBadge from '~/components/admin/StatusBadge.vue'
+import { StatusBadge as AdminStatusBadge } from '@tuanmjnh/tm-ui'
```

Keep the local component until every call site in the app has moved and the
suite is green.
