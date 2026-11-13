# UI contract audit — three shared candidates

Measured on 2026-11-13 across `tm-hub`, `tm-tools` and `tm-studio`. Each row was
read from the file itself, not inferred from its name. Call-site counts come from
`grep -rl` over each repo's `app/` tree.

## Summary

| Component | hub | tools | studio | Verdict |
|---|---|---|---|---|
| `admin/StatusBadge.vue` | 41 lines, 9 call sites | 53 lines, 4 call sites | 55 lines, 1 call site | **extract** — identical contract, studio differs only in tone source |
| `shared/ListFooter.vue` | 43 lines, 14 call sites | 45 lines, 10 call sites | 45 lines, 3 call sites | **extract later** — identical markup, but needs `useI18n` + `SharedRecordCount` (two extra modules) |
| `base/Page.vue` | 171 lines, 27 call sites | 71 lines, 39 call sites | 90 lines, 16 call sites | **keep-in-app** — hub is a superset wired to six local modules |

## 1. `admin/StatusBadge.vue`

### Contract (identical in all three)

| Field | Type | Default |
|---|---|---|
| `label` | `string` (required) | — |
| `color` | `'success' \| 'neutral' \| 'warning' \| 'info' \| 'error' \| 'primary' \| 'secondary'` | `'neutral'` |
| `icon` | `string` | `''` |
| `size` | `'xs' \| 'sm'` | `'xs'` |
| `clickable` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| emits | `click` (payload-less) | — |
| slots | none | — |

Structure is the same in all three: a `<button>` branch when `clickable`, else a
`UBadge variant="subtle"`. The clickable branch renders a spinner while
`loading`, otherwise the icon when one is passed.

### Divergence

| Aspect | hub | tools | studio |
|---|---|---|---|
| Class map name | `pillColor` | `pillColor` | `pillTone` |
| Tone values | hardcoded `emerald/amber/sky/red` | same as hub | semantic `bg-success/10`, `text-muted`, `bg-error/10` … |
| Corner radius | `rounded-full` | `rounded-full` | `rounded-md` |
| Press feedback | `active:scale-95` | `active:scale-95` | none |
| Transition | `transition-all` | `transition-all` | `transition-colors` |

hub and tools differ only in Prettier formatting — their output is byte-identical
once whitespace is normalised. studio changed the tone source on purpose; the
file carries the reason: *"Semantic tokens only: the accent shades are pinned per
theme in main.css, so these pills follow the same contrast guarantees as every
other badge."*

**Decision:** extract the studio tone map as canonical, because it is the one that
survives theme changes — `bg-emerald-500/10` in hub/tools is a fixed shade that
does not follow the accent palette. Migrate studio first (its rendering is
unchanged by the extraction). hub/tools stay on their local copy until someone
can eyeball the pill radius and press feedback on screen; that is a visual
decision, not a mechanical one.

### Accessibility and responsive

- The clickable branch is a real `<button type="button">`, so it is keyboard
  reachable and Enter/Space work. `disabled || loading` sets the native
  `disabled` attribute.
- The label is always rendered as text, so an icon-only badge cannot occur.
- No responsive variants in any of the three.

## 2. `shared/ListFooter.vue`

### Contract (identical in all three)

| Field | Type | Default |
|---|---|---|
| `count` | `number` | `0` |
| `hasMore` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `showNoMore` | `boolean` | `false` |
| emits | none | — |
| slots | `left`, `right` | — |

All three files have the same tree: a row, `#left` slot, `#right` slot, then
`SharedRecordCount`, then either a spinner with `common.loading_text` or a check
icon with `common.no_more_data`. The only difference is line wrapping in the
`v-else-if` block.

**Decision: extract later.** The markup is a perfect candidate, but it is not
self-contained: it calls `useI18n()` and renders the auto-imported
`SharedRecordCount`. Shipping it as a package means either pulling a second
component in (breaking "one component per slice") or passing three label strings
through props (changing every call site). Both are larger than the StatusBadge
slice, so they follow it.

The three i18n keys it reads (`common.records`, `common.loading_text`,
`common.no_more_data`) exist in all three locales already.

## 3. `base/Page.vue`

| Aspect | hub | tools | studio |
|---|---|---|---|
| Props | 14 (`id`, `title`, `description`, `navbarUi`, `flush`, `compact`, `actions`, `search`, `searchPlaceholder`, `viewMode`, `count`, `hasMore`, `loading`, `refresh`) | 5 | 6 (`hideDefaultActions` added) |
| Emits | `update:search`, `update:viewMode` | none | none |
| Toolbar | built-in `UDashboardToolbar` with search + view toggle | `#toolbar` slot only | `#toolbar` slot only |
| Footer | built-in `SharedListFooter` + footer slots | `#footer` slot only | `#footer` slot only |
| Mobile bar | registers actions and info through `useMobileBar` | none | none |
| Navbar | `tm-chrome-glass` | `tm-chrome-overlay` | merged `bg-elevated/50 backdrop-blur-md` |

hub's version composes six local modules — `HeaderActions`, `PageActions`,
`ViewModeToggle`, `DashboardBellButton`, `useMobileBar`, `useDashboard` — plus
`useAuth` and `useI18n`. tools and studio are thin shells around
`UDashboardPanel`.

**Decision: keep-in-app.** A shared `Page` would need the superset's props and
six injected modules, and its three visual variants (glass vs overlay vs elevated
blur) are all different. Extracting it would move the chrome composition of one
app into a package that the other two do not use, which is the opposite of the
goal. Revisit only if the chrome itself is unified first.

## What ships in this slice

`@tuanmjnh/tm-ui` exports exactly one component: `StatusBadge`, using the
semantic tone map and `rounded-md`. `vue` is a peer dependency; `@nuxt/ui`
(`UBadge`, `UIcon`) and Tailwind token classes are resolved by the consuming
Nuxt app. The SFC is compiled at build time, so consumers do not transpile it.
