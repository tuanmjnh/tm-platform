# tm-platform

Shared, versioned libraries for the TM ecosystem (`tm-hub`, `tm-tools`, `tm-studio`, future apps).

Public packages under the `@tuanmjnh` scope, versioned and published independently. Nothing in
these packages contains secrets, internal endpoints, or app-specific business logic.

## Packages

| Package | Responsibility | Runtime |
|---|---|---|
| `@tuanmjnh/tm-types` | Shared TypeScript contracts, DTOs, primitive types | Runtime-agnostic |
| `@tuanmjnh/tm-validators` | Zod schemas, validation/parsing, type inference | Runtime-agnostic |
| `@tuanmjnh/tm-utils` | Pure utility functions (no browser/Node/Electron imports) | Runtime-agnostic |
| `@tuanmjnh/tm-ai-client` | Chat, streaming, adapters (OpenAI-compatible + Anthropic), error normalization, model discovery | Browser/server/Electron |
| `tm-hub-client` | Control Plane SDK (IAM, configs, media, storage, notifications, audit, AI relay) | Browser/server/Electron |
| `tm-cut-core` | TMCut pure editing engine (zero dependencies) | Node |

Planned, only when a real consumer exists: `tm-ui`, `tm-nuxt`.

## Monorepo layout

```
packages/
  tm-types/
  tm-validators/
  tm-utils/
  tm-ai-client/
  tm-hub-client/
  tm-cut-core/
examples/
docs/            # phase-0 audit, plans and migration notes
```

## Commands

```bash
pnpm install
pnpm typecheck    # every package
pnpm build        # every package (tsup + dist/package.json)
pnpm test         # every package
```

Per package:

```bash
pnpm --filter @tuanmjnh/tm-types build
pnpm --filter @tuanmjnh/tm-types test
pnpm --filter @tuanmjnh/tm-types pack:dry
```

## Build pipeline

Each package follows the `tm-hub-client` pattern:

- `tsup` dual output: `dist/index.js` (ESM) + `dist/index.cjs` (CJS) + `dist/index.d.ts`
- `scripts/prepare-dist.mjs` writes a publish-ready `dist/package.json`
- `npm pack --dry-run` verifies the tarball

## Publishing

Packages are public under the `@tuanmjnh` scope (except `tm-cut-core`, also public). All of it goes
through one script: `scripts/release.mjs`.

```bash
pnpm release:login                    # npm login, no-op when already signed in
pnpm release:list                     # version / dist / registry state per package
pnpm release:build                    # build every package (sequential)
pnpm release:build tm-ai-client       # build one package
```

Publishing one package at a time:

```bash
pnpm release:publish:ai-client          # @tuanmjnh/tm-ai-client
pnpm release:publish:types              # @tuanmjnh/tm-types
pnpm release:publish:utils              # @tuanmjnh/tm-utils
pnpm release:publish:validators         # @tuanmjnh/tm-validators
pnpm release:publish:cut-core           # tm-cut-core
pnpm release:publish:hub-client         # tm-hub-client

pnpm release:publish:ai-client --dry-run   # preview only, nothing is published
pnpm release:publish:one                   # pick from a numbered list, then publish
```

Or pass the package name directly, and/or several at once:

```bash
pnpm release:publish tm-ai-client
pnpm release:publish tm-cut-core tm-utils
```

Or everything not already on the registry:

```bash
pnpm release:publish                  # publish every package whose version is new
pnpm release:publish --dry-run        # preview only
```

Behaviour worth knowing:

- publishing is the default: it needs `pnpm release:login` and a clean working tree
- packages publish from `dist/`, never from the package root
- a stale or missing `dist/` is rebuilt automatically before publishing
- `--verify` runs `typecheck` + `test` for the selected packages first
- `--build` forces a rebuild even when `dist/` looks current
- a version already on the registry is skipped, so re-running is safe
- a real publish refuses a dirty working tree unless `--force-tree` is passed

## Status

- Phase 0 audit: `docs/phase-0-audit.md` (read-only, complete)
- Phase 1 foundation: workspace, CI, build pipeline
- Phase 2 primitives: `@tuanmjnh/tm-types`, `@tuanmjnh/tm-validators`, `@tuanmjnh/tm-utils`
- Phase 4 AI client: `@tuanmjnh/tm-ai-client` (OpenAI-compatible + native Anthropic)
- Phase 6 (AI only, tm-tools): `server/utils/aiGateway.ts` routes hub vs explicit local
connections; see `tm-tools/docs/ai-local-mode.md`. tm-hub and tm-studio are untouched.
