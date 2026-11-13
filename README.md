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
| `@tuanmjnh/tm-ai-client` | OpenAI-compatible chat, streaming, adapters, error normalization, model discovery | Browser/server/Electron |

Planned, only when a real consumer exists: `tm-ui`, `tm-nuxt`.

`tm-hub-client` stays separate: it is the Control Plane SDK, not a generic provider client.

## Monorepo layout

```
packages/
  tm-types/
  tm-validators/
  tm-utils/
  tm-ai-client/
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

Packages are public under the `@tuanmjnh` scope. For the first publish:

```bash
pnpm --filter <package> build
npm publish ./packages/<package>/dist --access public
```

## Status

- Phase 0 audit: `docs/phase-0-audit.md` (read-only, complete)
- Phase 1 foundation: workspace, CI, build pipeline
- Phase 2 primitives: `@tuanmjnh/tm-types`, `@tuanmjnh/tm-validators`, `@tuanmjnh/tm-utils`
- Phase 4 AI client: `@tuanmjnh/tm-ai-client`
- Phase 6 (AI only, tm-tools): `server/utils/aiGateway.ts` routes hub vs explicit local
connections; see `tm-tools/docs/ai-local-mode.md`. tm-hub and tm-studio are untouched.
