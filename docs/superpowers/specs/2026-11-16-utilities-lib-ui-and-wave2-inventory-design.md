# Utilities: lib, UI, and the wave-2 inventory — design

Status: **draft, awaiting approval**
Supersedes nothing; extends `2026-11-13-tm-core-tm-ui-base-set-design.md`.
Date: 2026-11-16

## 1. What this covers

Two separate pieces of work that both touch the utilities surface:

- **Part A** — split `app/pages/utilities/*` in tm-hub into a reusable library
  and a thin UI layer, so tm-tools (which already has the UI but stubs the
  pages) shares one implementation.
- **Part B** — the wave-2 inventory the base-set spec deferred, measured.

Wave 1 shipped `tm-core` + 21 base components. Its spec says wave 2 "gets its
own spec"; this is the first half of that — the utilities library — plus the
inventory needed to scope the rest.

## 2. Measured facts

All numbers below come from comparing the two apps directly. Nothing is copied
from an earlier estimate.

### 2.1 The utilities pages

| Page | tm-hub | tm-tools | Shares |
|---|---|---|---|
| `utilities/text.vue` | 352 L (real UI + logic) | 3 L → `<UtilitiesTextPanel />` | logic only |
| `utilities/encode.vue` | 420 L (191 L script) | 3 L → `<UtilitiesEncodePanel />` | logic only |
| `utilities/random.vue` | 165 L (90 L script) | 3 L → `<UtilitiesRandomPanel />` | logic only |
| `utilities/icons.vue` | 243 L (133 L script) | 3 L → `<UtilitiesIconsPanel />` | logic only |
| `utilities/editor.vue` | 71 L | 66 L | diverged |
| `utilities/index.vue` | 9 L | 9 L | **identical** |

tm-tools already carries the panel components (`TextPanel.vue` 573 L,
`EncodePanel.vue` 607 L, `RandomPanel.vue` 240 L, `IconsPanel.vue` 333 L,
`TextPane.vue` 154 L, `ToolTabs.vue` 36 L). Its pages are three-line shims onto
them. tm-hub keeps the whole thing inside the page.

**So the two apps already agree on the structure the split should produce.**
tm-tools just lacks the library, and tm-hub lacks the panel split.

### 2.2 The composables underneath are pure

| Composable | hub | tools | Verdict |
|---|---|---|---|
| `useTextTransform.ts` | 256 L | 256 L | **byte-identical** |
| `useEncoding.ts` | 311 L | 311 L | differs by 2 quote characters only |
| `useRandomGen.ts` | 210 L | 210 L | formatting only |
| `useUtilitiesMeta.ts` | 78 L | 84 L | diverged (app-specific labels) |
| `useEditorType.ts` | 25 L | 25 L | **byte-identical**, but uses Nuxt `useState` |

`useTextTransform`, `useEncoding` and `useRandomGen` have **zero imports** — no
Vue, no Nuxt, no `$fetch`, no `localStorage`, no `navigator`. They are plain
functions returning closures. That is what makes them library candidates rather
than composables.

**777 lines of pure logic are duplicated between two apps today.**

### 2.3 Platform coupling per page

| Page | Touches the platform through |
|---|---|
| text | `useToast`, `navigator.clipboard`, `Blob`/`URL.createObjectURL` |
| encode | `useToast` |
| random | `useToast`, `navigator.clipboard` |
| icons | `$fetch('/api/icons')`, `localStorage`, `@vueuse/core` |
| editor | `useEditorType` → Nuxt `useState` + `localStorage` |

Only `icons` and `editor` are genuinely app-bound. The first three isolate
cleanly: every platform call is a user-facing side effect (toast, clipboard,
download), not part of the computation.

### 2.4 tm-core already owns the primitive layer

`tm-core/src/codec/` holds `fingerprint.ts` and `webauthn.ts`, and exposes
`bufToB64url` / `b64urlToBuf`. It has **no** general-purpose encoding helpers —
no base64, URL, HTML, hex, binary, rot13, JWT or hashing. So `useEncoding` is
not duplicating anything that exists; the primitives it needs belong beside the
ones already there.

## 3. Part A — three layers, one rule

The split that makes the logic reusable elsewhere is the standard one:

```
pure function        →  tm-core/src/codec, tm-core/src/text, tm-core/src/random
composable wrapper   →  thin: reactive state + platform effects
page / panel         →  tm-ui, or stays in the app if it needs app state
```

**The rule:** a library function never touches `document`, `navigator`,
`localStorage`, `$fetch`, `useToast` or `useI18n`. It takes values and returns
values. Everything that needs the platform stays in the caller.

### 3.1 What moves to `tm-core`

New directories, matching the existing `codec/` shape:

| Module | Functions | Source |
|---|---|---|
| `codec/encoding.ts` | `encodeBase64`, `decodeBase64`, `encodeUrl`, `decodeUrl`, `escapeHtml`, `unescapeHtml`, `encodeHex`, `decodeHex`, `encodeBinary`, `decodeBinary`, `rot13`, `runHash`, `decodeJwt`, `encodeJwt`, `generateRandomKey` | `useEncoding.ts` body, unchanged |
| `text/transform.ts` | `toUpperCase`, `toLowerCase`, `toCapitalize`, `toSentenceCase`, `toCamelCase`, `toPascalCase`, `toSnakeCase`, `toKebabCase`, `toTitleCase`, `toAlternatingCase`, … plus `countStats` | `useTextTransform.ts` body, unchanged |
| `random/generate.ts` | `generatePassword`, `generatePasswordBatch`, `generatePin`, `generateUuid`, `generateToken`, `generateApiKey`, `generateRandomKeyBatch`, `generateUsername`, `generateUsernameBatch` | `useRandomGen.ts` body, unchanged |

The bodies move **verbatim**. They are already pure, already tested by two apps
in production, and rewriting them would be the risk this design exists to avoid.

`runHash` stays async and takes the algorithm as a parameter; it uses
`crypto.subtle`, which exists in Node 18+ and every browser the apps target. No
polyfill, no fallback.

**Why `tm-core` and not `tm-utils`:** `tm-core` is already the "framework-free
runtime helpers" package, already a dependency of all three apps, and already
has the `codec/` directory these belong in. `tm-utils` currently holds AI error
parsing and device-credential scoping — two things that are *not* general
utilities, and putting text/encoding/random there would make the package name
lie in the other direction. Splitting them is a separate decision this spec does
not force.

### 3.2 What moves to `tm-ui`

The presentational panels become package components, taking their labels as
props like every other tm-ui component:

| Component | Props | Emits |
|---|---|---|
| `UtilitiesTextPanel` | `labels`, `modelValue?` | `update:modelValue`, `copied` |
| `UtilitiesEncodePanel` | `labels` | `copied` |
| `UtilitiesRandomPanel` | `labels` | `copied` |
| `UtilitiesToolTabs` | `items`, `active` | `select` |

The clipboard and download effects stay inside the panel: they are UI
behaviour, not computation, and every host wants them. The `useToast` call does
**not** move — the panel emits `copied` with the text and the host decides how to
acknowledge it, which keeps the package free of Nuxt UI's toast composable.

`UtilitiesIconsPanel` does **not** move: it calls `$fetch('/api/icons')` and
`localStorage`, both app-specific. It stays in tm-hub (and tm-tools if that app
ever gets the route), after its icon-fetching logic is reduced to `tm-core`'s
existing helpers where possible. Out of scope for Part A beyond that note.

`useUtilitiesMeta` stays in each app: its job is to return translated
title/description pairs, which is i18n by definition.

`useEditorType` stays where it is. The base-set spec already dropped
`EditorTypeSwitch` for reading Nuxt `useState`; the same reasoning applies to
`useEditorType`, and `utilities/editor.vue` is the only consumer.

### 3.3 What the app keeps

Each app keeps a thin composable that binds the pure functions to its own
reactivity and effects — the same pattern wave 1 used for labels:

```ts
// app/composables/useEncoding.ts (after the move)
import { encodeBase64, decodeBase64, /* … */ } from '@tuanmjnh/tm-core'

export function useEncoding() {
  return { encodeBase64, decodeBase64, /* … */ }
}
```

That file keeps its 15-name surface, so **no call site changes**. Each app's
`utilities/*.vue` pages keep working untouched until they are pointed at the
package panel.

### 3.4 Order of work

Each step ends with its own gate; a red gate stops the sequence.

| # | Step | Gate |
|---|---|---|
| A1 | move the three function bodies into `tm-core` under `codec/`, `text/`, `random/`; export from the barrel | `node --test` green; `grep` shows 0 Vue/Nuxt/platform imports in the new files |
| A2 | add `tm-core` tests for encoding, text-transform and random | same function count, and each exported name has at least one assertion |
| A3 | rewrite each app's composable as a re-export of the `tm-core` functions | all three apps' `typecheck` and `test` stay at their pre-change counts |
| A4 | add `UtilitiesTextPanel`, `UtilitiesEncodePanel`, `UtilitiesRandomPanel`, `UtilitiesToolTabs` to `tm-ui` with label props | package tests + `typecheck`; `i18n-guard` stays green |
| A5 | point tm-tools' existing panels at the package components, and split tm-hub's pages into page + panel | probe clean on `/utilities/{text,encode,random}` in both apps; DOM check shows the panels rendered |
| A6 | delete the duplicated composable bodies and the tm-tools stub pages | 777 duplicated lines gone; all three apps green |

### 3.5 Guards

The two defects wave 1 already hit apply here unchanged, and each has a guard:

- **Unresolved primitives** — `build-sfc.mjs` regenerates the plugin from
  `dist/primitives.json`; the utilities panels resolve `UButton`, `USelect`,
  `UInput`, `UTextarea`, `UIcon`, `USwitch`, `UCheckbox`, `UInputNumber`. All
  eight are already in the list except `UInputNumber`, which the build picks up
  automatically.
- **Missing Tailwind classes** — `check-tmui-css.mjs` runs on every app after the
  panels move.
- **i18n leakage** — `tests/i18n-guard.test.mjs` fails if a panel calls
  `useI18n()`. The label-prop contract is what keeps that guard green.

## 4. Part B — the wave-2 inventory, measured

The base-set spec estimated `media (10), inputs (7), code (3), editor (1)`
≈ 3,700 lines. Measured now:

| Group | Shared by 2+ apps | Lines | Identical | Diverged |
|---|---|---|---|---|
| `media/` | **13** | ~2,985 | 6 | 7 |
| `inputs/` | **6** | ~753 | 0 | **6** |
| `code/` | 3 | ~372 | 0 | **3** |
| `editor/` | **7** | ~1,278 | 0 | **7** |
| **Total** | **29** | **~5,390** | 6 | **23** |

Two corrections to the earlier estimate:

1. **`editor` is 7 components, not 1.** The tiptap tree (`index.vue` 811 L,
   `LinkPopover` 138 L, five node/popover files) is duplicated in hub and tools.
2. **`inputs`, `code` and `editor` have zero identical copies.** Every one needs
   the union-of-props decision wave 1 used for `Page` and `GridList`. That is 23
   decisions, not 6.

`media/` is the only group where a third of the work is mechanical: six files are
already identical (`Gallery` 432 L, `ImagePreview` 232 L, `ConfirmModal` 133 L,
`FileGrid` 123 L, `UploadCard` 84 L, `RenameModal` 63 L). The diverged seven
include `cloudinary/Index.vue` at 533 L, the largest single component in the set.

`media/ConfirmModal.vue` and `base/ConfirmModal.vue` are different components
that happen to share a name — the media one is the gallery's own delete dialog.
Wave 2 must not merge them.

### 4.1 Suggested slicing for wave 2

Given 23 diverged components, one gate run cannot localise a failure. Slice by
group, media first:

| Slice | Content | Why first |
|---|---|---|
| 2a | the 6 identical `media/` files | mechanical; proves the media pipeline end to end |
| 2b | the 7 diverged `media/` files | hard, but self-contained; `cloudinary/Index.vue` is the biggest risk |
| 2c | `inputs/` (6) | all diverged, but each is small (73–226 L) |
| 2d | `code/` (3) | 3 diverged, 372 L total |
| 2e | `editor/` (7) | all diverged, includes an 811 L component; last because it is both the largest and the least-used |

## 5. Out of scope

- `useUtilitiesMeta` and `useEditorType` — app-specific by construction.
- `utilities/icons.vue` beyond reducing its logic to existing helpers — it is
  bound to a route and to `localStorage`.
- The 29 wave-2 components themselves. Part B is an inventory, not an
  implementation; the slicing above is the proposal for its own spec.
- Merging `tm-utils` into `tm-core`. The two packages stay separate this round;
  §3.1 explains why the utilities functions land in `tm-core` regardless.
- Any `nuxt4-cms` change.

## 6. Open questions for the owner

1. **671 lines of `codec` + `text` + `random` land in `tm-core`.** Should they
   be one barrel entry or three subpath exports (`@tuanmjnh/tm-core/encoding`)?
   Subpaths keep the main barrel small but add resolution surface; the current
   package exports only `.`.
2. **The panels take `labels` as a flat object** (`{ copied, paste, clear, … }`)
   rather than the nested `{ text: {...}, encode: {...} }` the i18n files use.
   Flat is simpler for the package; nested matches the existing keys. Wave 1
   used flat (`Page`'s `labels` prop), so flat is the default unless you prefer
   otherwise.
