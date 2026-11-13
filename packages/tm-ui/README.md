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
variant="subtle"`; with it, a real `<button type="button">` whose tones come
from semantic theme tokens, never a fixed shade.

## Migrating from a local copy

```diff
-import AdminStatusBadge from '~/components/admin/StatusBadge.vue'
+import { StatusBadge as AdminStatusBadge } from '@tuanmjnh/tm-ui'
```

Keep the local component until every call site in the app has moved and the
suite is green.
