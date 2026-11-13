import { AIClientError, isLocalEndpoint } from './errors'
import { openAICompatibleAdapter } from './adapters/openai'
import { anthropicAdapter } from './adapters/anthropic'
import type {
  AIClientOptions,
  ChatRequest,
  ChatResult,
  ClientEndpoint,
  ModelListResult,
  ProviderAdapter,
  StreamChunk
} from './types'

const DEFAULT_TIMEOUT_MS = 60_000

/**
 * The endpoint names the wire protocol, not the vendor: an aggregator can
 * serve an Anthropic-shaped API under its own provider id, and a provider
 * preset may expose the OpenAI-compatible surface. Only `anthropic` is
 * distinct; everything else speaks the OpenAI contract.
 */
function adapterFor(endpoint: ClientEndpoint): ProviderAdapter {
  const family = String(endpoint.provider || '').trim().toLowerCase()
  return family === 'anthropic' ? anthropicAdapter : openAICompatibleAdapter
}

function assertEndpoint(endpoint: ClientEndpoint, options: AIClientOptions): void {
  if (!String(endpoint.baseUrl || '').trim()) {
    throw new AIClientError('ai.no-base-url', `Provider "${endpoint.provider}" has no base URL`)
  }
  // A local endpoint may only be executed by a runtime that can reach it.
  // The host decides that policy; the generic client just surfaces it.
  if (endpoint.mode === 'local') options.assertModeAllowed?.('local')
}

function assertCredentials(endpoint: ClientEndpoint, allowKeyless: boolean): void {
  if (endpoint.apiKey) return
  if (isLocalEndpoint(endpoint.baseUrl)) return
  // The caller opts in when its deployment fronts the endpoint and holds the
  // credential. Which providers qualify is app policy, so it stays out of here.
  if (allowKeyless) return
  throw new AIClientError('ai.no-key', `Missing API key for provider "${endpoint.provider}"`)
}

/** An adapter parse failure is a malformed provider reply, never a network fault. */
function parseChatOrThrow(adapter: ProviderAdapter, json: unknown) {
  try {
    return adapter.parseChatResponse(json)
  } catch (err) {
    throw new AIClientError('ai.bad-shape', String((err as Error)?.message || 'Malformed chat response'))
  }
}

export class AIClient {
  private readonly endpoint: ClientEndpoint
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly allowKeyless: boolean
  private readonly assertModeAllowed?: (mode: 'hub' | 'app' | 'local') => void

  constructor(options: AIClientOptions) {
    this.endpoint = options.endpoint
    this.fetchImpl = options.fetchImpl || globalThis.fetch
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.allowKeyless = options.allowKeyless === true
    this.assertModeAllowed = options.assertModeAllowed
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    const adapter = adapterFor(this.endpoint)
    assertEndpoint(this.endpoint, { endpoint: this.endpoint, assertModeAllowed: this.assertModeAllowed })
    assertCredentials(this.endpoint, this.allowKeyless)

    if (!request.messages || request.messages.length === 0) {
      throw new AIClientError('ai.bad-shape', 'messages must be a non-empty array')
    }
    if (!request.model) {
      throw new AIClientError('ai.no-model', `No model configured for provider "${this.endpoint.provider}"`)
    }

    const timeoutMs = request.timeoutMs ?? this.timeoutMs
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const signal = request.signal
      ? AbortSignal.any([request.signal, controller.signal])
      : controller.signal

    const startedAt = Date.now()
    const built = adapter.buildChatRequest(this.endpoint, request)

    try {
      const res = await this.fetchImpl(built.url, {
        method: 'POST',
        headers: built.headers,
        body: JSON.stringify(built.body),
        signal
      })
      const text = await res.text()
      if (res.status === 429) throw new AIClientError('ai.rate-limited', 'Provider rate limit (429)')
      if (res.status < 200 || res.status >= 300) {
        throw new AIClientError('ai.http-error', extractMessage(text) || `HTTP ${res.status}`, { status: res.status })
      }
      let json: unknown = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        throw new AIClientError('ai.bad-shape', 'Response is not valid JSON')
      }
      const parsed = parseChatOrThrow(adapter, json)
      return {
        content: parsed.content,
        model: request.model,
        provider: this.endpoint.provider,
        usage: parsed.usage,
        latencyMs: Date.now() - startedAt
      }
    } catch (err) {
      if (err instanceof AIClientError) throw err
      if (err && (err as Error).name === 'AbortError') {
        throw new AIClientError('ai.timeout', `Request timed out after ${timeoutMs}ms`)
      }
      throw new AIClientError('ai.network', String((err as Error)?.message || err))
    } finally {
      clearTimeout(timer)
    }
  }

  async *stream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const adapter = adapterFor(this.endpoint)
    assertEndpoint(this.endpoint, { endpoint: this.endpoint, assertModeAllowed: this.assertModeAllowed })
    assertCredentials(this.endpoint, this.allowKeyless)
    if (!request.messages || request.messages.length === 0) {
      throw new AIClientError('ai.bad-shape', 'messages must be a non-empty array')
    }
    if (!request.model) {
      throw new AIClientError('ai.no-model', `No model configured for provider "${this.endpoint.provider}"`)
    }

    const timeoutMs = request.timeoutMs ?? this.timeoutMs
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const signal = request.signal
      ? AbortSignal.any([request.signal, controller.signal])
      : controller.signal

    const built = adapter.buildChatRequest(this.endpoint, {
      ...request,
      // Streaming is opt-in via the `stream` flag on the body.
      messages: request.messages
    })
    const body = { ...(built.body as Record<string, unknown>), stream: true }

    try {
      const res = await this.fetchImpl(built.url, {
        method: 'POST',
        headers: built.headers,
        body: JSON.stringify(body),
        signal
      })
      if (res.status === 429) throw new AIClientError('ai.rate-limited', 'Provider rate limit (429)')
      if (res.status < 200 || res.status >= 300) {
        const text = await res.text()
        throw new AIClientError('ai.http-error', extractMessage(text) || `HTTP ${res.status}`, { status: res.status })
      }
      if (!res.body) throw new AIClientError('ai.bad-shape', 'Streaming response has no body')

      const decoder = new TextDecoder()
      let buffer = ''
      for await (const chunk of res.body as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const parsed = adapter.parseStreamLine(line)
          if (parsed) yield parsed
        }
      }
      if (buffer.trim()) {
        const parsed = adapter.parseStreamLine(buffer)
        if (parsed) yield parsed
      }
    } catch (err) {
      if (err instanceof AIClientError) throw err
      if (err && (err as Error).name === 'AbortError') {
        throw new AIClientError('ai.timeout', `Request timed out after ${timeoutMs}ms`)
      }
      throw new AIClientError('ai.network', String((err as Error)?.message || err))
    } finally {
      clearTimeout(timer)
    }
  }

  async listModels(): Promise<ModelListResult> {
    const adapter = adapterFor(this.endpoint)
    assertEndpoint(this.endpoint, { endpoint: this.endpoint, assertModeAllowed: this.assertModeAllowed })
    assertCredentials(this.endpoint, this.allowKeyless)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    const built = adapter.buildModelsRequest(this.endpoint)

    try {
      const res = await this.fetchImpl(built.url, { method: 'GET', headers: built.headers, signal: controller.signal })
      const text = await res.text()
      if (res.status === 429) throw new AIClientError('ai.rate-limited', 'Provider rate limit (429)')
      if (res.status < 200 || res.status >= 300) {
        throw new AIClientError('ai.http-error', extractMessage(text) || `HTTP ${res.status}`, { status: res.status })
      }
      let json: unknown = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        throw new AIClientError('ai.bad-shape', 'Model list response is not valid JSON')
      }
      const models = adapter.parseModelsResponse(json)
      if (models.length === 0) throw new AIClientError('ai.bad-shape', 'Model list response has no model ids')
      return {
        models,
        provider: this.endpoint.provider,
        baseUrl: this.endpoint.baseUrl,
        count: models.length
      }
    } catch (err) {
      if (err instanceof AIClientError) throw err
      if (err && (err as Error).name === 'AbortError') {
        throw new AIClientError('ai.timeout', `Model list timed out after ${this.timeoutMs}ms`)
      }
      throw new AIClientError('ai.network', String((err as Error)?.message || err))
    } finally {
      clearTimeout(timer)
    }
  }
}

function extractMessage(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string }, message?: string }
    return String(json?.error?.message || json?.message || '')
  } catch {
    return String(text || '').slice(0, 500)
  }
}

export function createAIClient(options: AIClientOptions): AIClient {
  return new AIClient(options)
}