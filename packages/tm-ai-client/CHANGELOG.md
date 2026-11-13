# @tuanmjnh/tm-ai-client

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
