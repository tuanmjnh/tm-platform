# tm-core + tm-ui base set — design

Date: 2026-11-13
Status: awaiting owner review

## Problem

`@tuanmjnh/tm-ui` holds three components. The three apps (`tm-hub`,
`tm-tools`, `tm-studio`) share far more than that: 22 base-level components
exist in two or more of them, and 2,815 lines are byte-identical between
copies. Separately, the pure JS each app needs (formatters, encoding,
fingerprinting, transfer helpers) is duplicated as well.

The owner wants one complete extraction, done locally over `link:` first and
published once, and explicitly wants an app to be able to take **only the JS**
without pulling in Vue components.

## Scope

Two packages, because "JS only" and "JS + UI" are different consumers:

```
packages/
  tm-core/     pure JS. no vue, no nuxt, no i18n.
  tm-ui/       vue components. depends on tm-core; tm-core does not know it exists.
```

`tm-ui` keeps the three components it already ships (`StatusBadge`,
`ListFooter`, `ModelSelect`) and gains the base set.

Work ships in **two waves**. This spec covers wave 1 only; wave 2 gets its own
spec once wave 1 is running.

| Wave | Content | Approx. lines |
|---|---|---|
| 1 (this spec) | `tm-core` + 21 base components | ~1,900 |
| 2 | media (10), inputs (7), code (3), editor (1) | ~3,700 |

`nuxt4-cms` stayed untouched this wave. It is the ancestor of the TM apps and
its `shared/utils/helper.ts` is a superset in function count — but only 19 of
its 57 functions are used by two or more TM apps, so the plan is to extract
that subset into `tm-core` in a shape cms can adopt later, not to lift the file.

## Where the shared code actually comes from

`nuxt4-cms` is the original project; `tm-hub` and `tm-tools` were copied from
it and then upgraded. That history suggests cms holds the newest code, and for
`sanitizeSvg` it does — but for most of the helper file it does not, and two
hard facts change the shape of this work.

**Fact 1 — cms is a superset by count, not by usefulness.**

| | cms | each TM app |
|---|---|---|
| `shared/utils/helper.ts` lines | 1,105 | 964–991 |
| exported functions | 57 | 55 |
| functions unique to it | 2 (`exportToExcel`, `numberToVietnameseWords`) | 0 |

Of the 57, **35 are referenced by no TM app at all** — CMS domain code
(SEO alternate links, YouTube/Vimeo/TikTok embed URLs, Excel/CSV export,
product pricing, `syncQuickData`). Copying the file wholesale would import
dead code into a shared package.

**19 functions are used by two or more TM apps:**

```
formatDate, formatTimeAgo, toSlug, minifySvg, sanitizeSvg, cleanImageUrl,
getImage, isRawSvg, isIconify, isSpecialImage, isImage, detectDisplayType,
toCode, ensureForwardSlash, toNormalize, generateEan13, readCsv, readJson,
downloadFile
```

Three more are single-app and stay put for now: `formatNumber` and
`formatCurrency` (tools only), `generateSlug` (hub only).

**Fact 2 — `cms/server/utils` and `cms/shared/schemas` cannot be reused.**

The server trees are unrelated: cms is MongoDB (`mongo.database.ts`,
`mongo.helper.ts`, a 1,993-line seeder); the TM apps are Supabase behind the
Hub. The 29 zod schemas in cms describe CMS domains (inventory, quotation,
purchase order); the three TM apps contain **zero** schemas of that kind. There
is nothing to extract from either directory.

## The i18n problem, and the wrapper that avoids touching 78 call sites

Of the 19, **exactly one — `formatTimeAgo` — calls `useI18n()`** in its body. It
cannot go into a framework-free package as it stands, and it is used by all
three apps.

`formatDate` does **not** use i18n: it hard-codes `'vi-VN'` in every project,
cms included. That is its own defect — a user on `en` still gets Vietnamese date
order — but it is a behavioural question, not a packaging one. The plan keeps
that behaviour in this wave and records the locale parameter on the function so
the fix is a one-line change later; changing the output now would silently alter
every date on every page, which is exactly the kind of change that should be
asked for deliberately.

Changing `formatTimeAgo`'s signature to `(date, locale)` would break **51 call
sites** (hub 14, tools 10, studio 5 for `formatTimeAgo`; the rest of the 78 is
`formatDate`, which does not move at all).

**Instead, the signature changes and the call sites do not.** `tm-core` exports
the pure form; each app keeps a small file in `shared/utils/` — a directory Nuxt
already auto-imports (`imports.dirs` in all four projects) — that binds the
locale:

```ts
// tm-core: pure, works in Node, a worker, a CLI, and cms
export const formatTimeAgo = (date, locale = 'vi') => …

// each app: ~10 lines, auto-imported, same name as before
export const formatTimeAgo = (date) => coreFormatTimeAgo(date, useI18n().locale.value)
```

Call sites keep calling `formatTimeAgo(x)` and get the right locale. A consumer
that has no Nuxt imports it from `tm-core` and passes the locale itself. This is
what `imports.dirs` is for, not a workaround: the app layer redefines the name
and delegates.

**No server-side call sites.** `grep` over all three `server/` trees finds no
use of the shared helper. The one hit in tm-hub is a local `const formatDate`
declared inside `server/modules/mail/analytics/service.ts` — a different
function with a different signature, unaffected by this move.

`downloadFile` is the other odd one: 12 DOM references (`Blob`,
`URL.createObjectURL`, `document`). Per the owner's decision it moves into
`tm-core` **with a runtime guard** that returns early when `document` is
undefined, rather than being split across packages.


Wave 2 is deliberately separate: at almost twice the size of wave 1, a single
gate run would make a red gate impossible to localise.

## Measured facts this design rests on

All numbers come from the audit scripts in `scripts/audit-*.mjs`.

**22 base components are shared by 2+ apps; 21 move (see the drop note at the end).** Only 4 of them reference another
app-local module:

| Component | App-local dependency | Pure? |
|---|---|---|
| `base/Page.vue` | `~/components/base/HeaderActions.vue`, `~/composables/useMobileBar` | `useMobileBar` has 0 nuxt/vue refs |
| `gridlist/Index.vue` | `~/types/gridList` | type-only, 0 runtime refs |
| `shared/EditorTypeSwitch.vue` | `~/composables/useEditorType` | **uses Nuxt `useState` — must stay in the app** |
| `shared/SettingsPage.vue` | none by import; renders `BasePage` + `BaseSectionNav` | both move with it |

The other 18 reference nothing but Nuxt UI primitives and `vue`.

`HeaderActions` and `SectionNav` come along as child components of `Page` and
`SettingsPage` rather than as independent moves — they are already in the base
list, so this changes nothing about scope, only about the order in which they
must land.

**27 distinct Nuxt UI components** are resolved by the base set:

```
UButton 97  UIcon 50  UBadge 30  UDropdownMenu 18  UInput 18  USelect 18
UCheckbox 15  USkeleton 14  UModal 7  UNavigationMenu 6  UCard 5  UForm 4
UDashboardPanel 3  UDashboardNavbar 3  UDashboardSidebarCollapse 3
USlideover 3  UTable 3  UPagination 3  UTextarea 3  UFieldGroup 3
UScrollArea 3  UEmpty 3  UPopover 2  UTabs 2  UDashboardToolbar 1  USwitch 1
UProgress 1
```

This list must be generated by the build, not maintained by hand: the app
plugin currently registers 6, and a missing entry renders a dead custom
element with every static gate green.

**i18n usage among the 22:**

| Group | Count | Handling |
|---|---|---|
| no i18n at all | 8 | move unchanged |
| uses `t()`, every key exists in every consuming app | 12 | 1–5 keys each → props |
| uses `t()` with a key missing somewhere | 2 | props |

The owner's decision is **no i18n inside the package**, so all 14
`t()` call sites become props. Each app keeps a thin wrapper that supplies
its own translations, which is the pattern `ListFooter` already uses.

**`tm-core` candidates are dependency-free.** `aiProviderTransfer`,
`fingerprint`, `transitions`, `webauthn`, `routeTree` each contain 0
references to `useRuntimeConfig`, `useState`, `$fetch`, `#imports` or `vue`.

Two corrections to the obvious assumption:

- `useEncoding.ts` is **not** identical between hub and tools. The bodies match
  except for quote style in `escapeHtml` (`"'"` vs `'\''`) — functionally the
  same, but it is a real diff, so the move must pick one copy rather than
  assume byte equality. It has 0 nuxt/vue references and is a candidate.
- `dateTime.ts`, `formatters.ts` and `inflight.ts` exist **only in tm-hub**
  today. They are pure, and they belong in `tm-core` so the other two apps can
  use them, but they are not de-duplication — they are new availability.
  Nothing in the other apps imports them yet, so moving them is additive and
  cannot break anyone.

## Which copy becomes the package source

Picking the longest file is wrong. Two measured examples:

- `SwipeCard` — hub is **shorter** (185 vs 192 lines) but has a `flat` prop
  and uses design tokens (`border-default`, `bg-elevated`); the tools copy
  hard-codes `bg-gray-300/50`, `bg-white/40`, `dark:bg-gray-800/40`.
- `ViewModeToggle` — studio has `aria-pressed` and translations; hub
  hard-codes `aria-label="List"`.

Selection rule: **prefer the copy that uses theme tokens over hard-coded
colours, and the one with more accessible/props surface**; ignore line count
when the difference is formatting. Per component:

| Component | Source copy | Why |
|---|---|---|
| `Page` | tm-hub (172L, 11 slots) | strict superset of studio (91L) and tools (72L): has `count`, `search`, `viewMode`, `navbarUi` |
| `SwipeCard` | tm-hub | `flat` prop + design tokens; tools copy uses hard-coded greys |
| `FormModal` | tm-hub (81L) | +13 lines over the other two |
| `HeaderActions` | tm-hub (111L) | superset |
| `FilterPopover` | tm-hub (34L) | has `v-if` branch tools lacks |
| `HeTreeMenu` | tm-tools (451L) | +47 lines, one more branch |
| `GridList` | tm-tools | most branches at 21 `v-if` / 5 `v-for` |
| `EmptyState` | tm-tools (56L) | +13 lines |
| `PasswordInput` | tm-tools (48L) | +12 lines |
| `SectionNav` | tm-tools (34L) | 1 line over hub, same as studio |
| ~~`EditorTypeSwitch`~~ | — | dropped, see below |
| `AppBackdrop` | tm-tools (19L) | +1 line |
| `ConfirmModal` | tm-hub | the 14-line gap to studio is Prettier only; content identical |
| `ResponsiveModal` | tm-studio (136L) | largest, same slot set |
| `ResponsiveSlideover` | tm-studio (148L) | one extra branch |
| `BentoCard` | tm-studio (85L) | +4 lines |
| `ViewModeToggle` | tm-studio | has `aria-pressed` |
| `RowActions` | tm-tools (26L) | +6 lines |
| `Table` | any (identical 80L) | |
| `ListFooter` | already in package | |
| `BentoGrid` | any (identical 16L) | |
| `SettingsPage` | any (identical 39L) | |

## Package layout

```
tm-core/
  src/
    format/     formatTimeAgo (locale is a parameter); formatDate
    slug/       toSlug, toCode, toNormalize, generateEan13
    text/       minifySvg, escapeRegExp
    media/      sanitizeSvg, cleanImageUrl, getImage, isRawSvg, isIconify,
                isSpecialImage, isImage, detectDisplayType, ensureForwardSlash
    io/         readCsv, readJson, downloadFile   (downloadFile guards on `document`)
    async/      inflight, batchPool, transitions
    tree/       routeTree
    codec/      encoding (base64/url/html), fingerprint, webauthn
    transfer/   aiProviderTransfer, presetTransfer
    index.ts
  tests/        node --test, no browser, no Nuxt
```

Every function above is one of the 19 shared helpers or one of the
dependency-free utilities already measured. The 35 CMS-only helpers are **not**
included: they belong to a CMS domain that none of the TM apps use, and cms can
keep them in its own `helper.ts` when it adopts `tm-core`.

`tm-core` publishes as plain ESM. There is no build step beyond `tsc`, so an
app in Node, a worker or a CLI script can import it directly.

## The app-side wrapper files

Each app gains one small file per concern, in the directory its `imports.dirs`
already scans, so existing call sites keep working unchanged:

```
tm-hub/app/shared/utils/format.ts      formatTimeAgo → tm-core + locale
tm-tools/app/shared/utils/format.ts    same
tm-studio/app/shared/utils/format.ts   same
```

`cms` would add the same file when it adopts the package; nothing else in cms
changes this wave.

```
tm-ui/
  src/
    base/       Page, ResponsiveModal, ResponsiveSlideover, ConfirmModal,
                FormModal, Table, HeaderActions, PasswordInput, SectionNav,
                SettingsPage, BentoCard, BentoGrid, AppBackdrop
    admin/      RowActions, ViewModeToggle, FilterPopover, EmptyState
    gridlist/   GridList, SwipeCard
    shared/     ListFooter, HeTreeMenu
    ai/         StatusBadge, ModelSelect        (already shipped)
  scripts/
    build-sfc.mjs          compiles each .vue, now also emits the plugin
```

## The label-prop contract

Every component that used `t()` takes its strings explicitly. Naming follows
the existing `ListFooter` convention (`recordsLabel`, `loadingLabel`,
`noMoreLabel`):

| Component | New props |
|---|---|
| `Page` | `labels?: { search?: string, actions?: string, … }` |
| `ConfirmModal` | `cancelLabel`, `confirmLabel` (already exist) |
| `FormModal` | `cancelLabel`, `submitLabel` |
| `ResponsiveModal` / `ResponsiveSlideover` | `closeLabel` |
| `PasswordInput` | `showLabel`, `hideLabel` |
| `Table` | `labels?: { empty?: string, … }` |
| `ViewModeToggle` | `listLabel`, `gridLabel` |
| `GridList` | `labels?: { selectAll?: string, selectRow?: string, … }` |
| `RowActions` | `labels?: { edit?: string, delete?: string, … }` |
| `FilterPopover` | `label` |
| `EmptyState` | `title`, `description`, `actionLabel` |
| `SectionNav` | `ariaLabel` |
| `HeaderActions` | `labels?: { … }` |

Defaults are English, matching the `DEFAULT_LABELS` approach already used by
`ModelSelect`, so a component renders sensibly even if a wrapper forgets one.
Each app's wrapper passes `t(...)`.

## The SVG fix: `sanitizeSvg` moves to `tm-core`

The owner supplied an improved `MediaVisual.vue` at
`nuxt4-cms/app/components/media/MediaVisual.vue`. The component itself is barely
different — the fix is entirely in the helper it calls.

**The defect.** Each app's `sanitizeSvg(svg)` only strips `width`/`height` from
the root `<svg>`. Inline SVGs regularly reuse the same internal ids
(`clip0`, `a`, `b`). When two of them land on one page, the second one's
`fill="url(#a)"`, `<use href="#a">` and `clip-path` bind to the **first** SVG's
definitions, so the second renders wrong or blank.

**The cms version fixes three things**, all invisible until an SVG breaks:

| Added behaviour | Why |
|---|---|
| derives a `viewBox` from width/height when absent | stripping the attributes otherwise leaves no intrinsic aspect ratio |
| drops `filter="url(#x)"` when no matching `<filter id="x">` exists | a dangling filter reference hides the whole element |
| prefixes every `id` and rewrites `url(#id)`, `href="#id"`, `xlink:href="#id"` | this is the actual collision fix |

The component passes `useId()` as that prefix; the helper falls back to a random
prefix on the client when none is given.

**Blast radius, measured.** `sanitizeSvg` has 6 call sites per app, and every
one of them renders inline SVG through `v-html`:

```
media/MediaVisual.vue, media/ImageCard.vue, media/ImagePreview.vue,
media/ConfirmModal.vue, inputs/IconSelector.vue (×2), inputs/InputIcon.vue
```

All of them benefit from the prefix; none depend on ids staying unprefixed,
because an inline `id` has no external consumer. All four projects are
`ssr: false`, so there is no hydration mismatch to worry about and the
random-prefix server branch never runs.

**Decision:** the cms implementation moves into `tm-core/src/media/sanitizeSvg.ts`
and each app's `shared/utils/helper.ts` re-exports it instead of keeping its own
copy. The re-export keeps the ~500-line `helper.ts` diff to a single line, so
the change can be reverted on its own if a call site turns out to disagree.

`MediaVisual` itself stays in wave 2 with the rest of `media/`; only the helper
moves in wave 1, because the fix is in the helper and `IconSelector`/`InputIcon`
already use it today.

## Guards against the two defects already seen

1. **Unresolved primitives.** `build-sfc.mjs` greps its own output for
   `resolveComponent("U…")` and emits the plugin body that registers exactly
   those names through `#components`. A component added later cannot be
   forgotten, and the generated file is checked in so the diff is visible.

2. **Missing Tailwind classes.** `scripts/check-tmui-css.mjs` already exists.
   It is extended to also fail when a `@source` path matches nothing, so the
   `dist/` mistake fails loudly instead of silently.

3. **Dead i18n keys.** A test asserts that no source file in either package
   calls `t(` — the prop contract is enforced, not just documented.

## Execution order

Each step ends with its own gate; a red gate stops the sequence.

| # | Step | Gate |
|---|---|---|
| 1a | create `tm-core`, move the 19 shared helpers + the dependency-free utilities; `formatTimeAgo` takes `locale` | `node --test` green; `grep` shows 0 vue/nuxt imports |
| 1b | add `format.ts` to each app's `shared/utils/`; point `helper.ts` at `tm-core` for the moved functions | all existing call sites untouched; `typecheck` and `test` must both stay at their pre-change counts |
| 2 | `tm-ui` gains `Page`, `ConfirmModal`, `FormModal`, `ResponsiveModal`, `ResponsiveSlideover` | package tests + `typecheck`; all three apps still green on `link:` |
| 3 | the 4 phase-A components with no i18n (`SwipeCard`, `BentoCard`, `BentoGrid`, `AppBackdrop`) | same |
| 4 | `Table`, `RowActions`, `FilterPopover`, `EmptyState`, `ViewModeToggle` | same |
| 5 | `GridList`, `HeTreeMenu`, `SectionNav`, `SettingsPage`, `HeaderActions`, `PasswordInput` | same |
| 6 | all three apps on `link:`; runtime probe + CSS check | `probe-unresolved-tags.mjs` and `check-tmui-css.mjs` clean on every page that mounts a package component |
| 7 | publish `tm-core` and `tm-ui` together | owner-approved OTP; then re-run all gates against the registry install |

Step 1b's gate is deliberately phrased as "unchanged counts". Moving a shared
function must not change behaviour, so a test count that moves is a signal
something was rewired rather than delegated.

`EditorTypeSwitch` is dropped from the move: it reads `useEditorType`, which
calls Nuxt's `useState` and writes `localStorage`. To bring it into the package
the `type` would have to become a `v-model` prop and the persistence would have
to move to the caller — a real API change, not a move. It stays in the two apps
that have it, and the component count for this work is **21**, not 22.

Everything stays on `link:` until step 7. No deploy is involved.

## Out of scope

- Media, docs, inbox, dashboard and editor components (the 50–74% similarity
  band). They share a shell but diverge in behaviour; merging them would
  invent an API nobody asked for.
- The 35 CMS-only helpers in `nuxt4-cms/shared/utils/helper.ts`, and everything
  in `nuxt4-cms/server/utils/` and `nuxt4-cms/shared/schemas/`. Measured above:
  no TM app references them, and the server/schema trees have no structural
  counterpart in the TM apps.
- Wiring `nuxt4-cms` itself to `tm-core`. Its Nuxt 4.6 / Vue 3.5 / TS 5.9 stack
  is compatible, so adoption should be a one-line dependency plus a `format.ts`
  wrapper — but it is a separate change to a fourth project.
- Any change to how the apps' own `t()` keys are organised.
- Publishing. Step 7 is owner-gated and listed for completeness only.
