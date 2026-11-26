# @tuanmjnh/tm-validators


## 0.2.1

### Patch Changes

- Rebuild for the next pinned release.

## 0.2.0

### Minor Changes

- Move to zod 4 so the package shares one schema runtime with every TM app.
  `ApiErrorSchema.details` uses the zod 4 two-argument `z.record(keySchema,
  valueSchema)` form; the previous single-argument call does not construct
  under zod 4, so a consumer on zod 4 got a schema that threw at import.

## 0.1.0

### Minor Changes

- Initial public release: shared contracts, Zod schemas, pure utilities and an
  OpenAI-compatible AI client with SSE streaming, model discovery, normalized
  errors and a local-mode policy hook. No secret storage in any package.
