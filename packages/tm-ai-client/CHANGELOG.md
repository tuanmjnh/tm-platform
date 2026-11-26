# @tuanmjnh/tm-ai-client


## 0.4.2

### Patch Changes

- Rebuild for the next pinned release.

## 0.4.1

### Patch Changes

- Store drivers reject with `ai.store-failed` when the underlying client call
  fails, instead of surfacing a raw driver error. Errors already classified by
  the package (`ai.bad-shape`, the crypto codes) are rethrown untouched, and the
  localStorage driver still tolerates corrupt documents.

## 0.4.0

### Minor Changes

- Add per-account AI configuration stores for MongoDB, Supabase and
  localStorage (`createMongoAIConfigStore` and siblings), `sealSecret` /
  `openSecret`, and `mergeCatalog` for combining app-local rows with the hub
  catalogue.

## 0.2.1

### Patch Changes

- Report a 200 response with no usable message content as `ai.bad-shape`
  instead of `ai.network` — a malformed provider reply is not a network fault.

  Add `allowKeyless` so a deployment-fronted gateway can run on a public base
  URL when the deployment holds the credential.

## 0.2.0

### Minor Changes

- Add a native Anthropic adapter: `/v1/messages` endpoint, `x-api-key` and
  `anthropic-version` headers, top-level `system` handling, `content[].text`
  parsing, `content_block_delta` streaming and `/v1/models` discovery. The
  OpenAI-compatible path is unchanged, so existing consumers keep working.

## 0.1.0

### Minor Changes

- Initial public release: shared contracts, Zod schemas, pure utilities and an
  OpenAI-compatible AI client with SSE streaming, model discovery, normalized
  errors and a local-mode policy hook. No secret storage in any package.
