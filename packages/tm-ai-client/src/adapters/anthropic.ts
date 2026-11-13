import type { AIUsage, ChatRequest, ClientEndpoint, ModelInfo, ProviderAdapter, StreamChunk } from '../types'

const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MAX_TOKENS = 4096

function trimBase(baseUrl: string): string {
  return String(baseUrl || '').trim().replace(/\/+$/, '')
}

function baseHeaders(endpoint: ClientEndpoint): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION
  }
  if (endpoint.apiKey) headers['x-api-key'] = endpoint.apiKey
  return headers
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Anthropic has no `system` role inside `messages`; it takes a top-level
 * `system` string. Several system messages are joined, and consecutive
 * same-role turns are merged because the API rejects them.
 */
function splitSystem(messages: ChatRequest['messages']): { system: string, messages: AnthropicMessage[] } {
  const system: string[] = []
  const out: AnthropicMessage[] = []
  for (const message of messages) {
    if (message.role === 'system') {
      if (message.content) system.push(message.content)
      continue
    }
    const role = message.role === 'assistant' ? 'assistant' : 'user'
    const last = out[out.length - 1]
    if (last && last.role === role) last.content = `${last.content}\n\n${message.content}`
    else out.push({ role, content: message.content })
  }
  if (out.length === 0) out.push({ role: 'user', content: '' })
  return { system: system.join('\n\n'), messages: out }
}

function mapUsage(usage: unknown): AIUsage | null {
  const raw = usage as { input_tokens?: number, output_tokens?: number } | null
  if (!raw) return null
  const inputTokens = raw.input_tokens
  const outputTokens = raw.output_tokens
  if (inputTokens === undefined && outputTokens === undefined) return null
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined
  }
}

export const anthropicAdapter: ProviderAdapter = {
  family: 'anthropic',

  buildChatRequest(endpoint: ClientEndpoint, request: ChatRequest) {
    const { system, messages } = splitSystem(request.messages)
    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens && request.maxTokens > 0 ? request.maxTokens : DEFAULT_MAX_TOKENS,
      messages
    }
    if (system) body.system = system
    if (request.temperature !== undefined) body.temperature = request.temperature

    return {
      url: `${trimBase(endpoint.baseUrl)}/v1/messages`,
      headers: baseHeaders(endpoint),
      body
    }
  },

  parseChatResponse(json: unknown) {
    const payload = json as {
      content?: Array<{ type?: string, text?: string }>
      usage?: { input_tokens?: number, output_tokens?: number }
    }
    const content = Array.isArray(payload?.content)
      ? payload.content.filter(block => block?.type === 'text').map(block => block.text || '').join('')
      : ''
    if (!content) throw new Error('Anthropic response has no text content')
    return { content, usage: mapUsage(payload.usage) }
  },

  parseStreamLine(line: string): StreamChunk | null {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data:')) return null
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return data === '[DONE]' ? { delta: '', done: true } : null
    try {
      const json = JSON.parse(data) as {
        type?: string
        delta?: { text?: string, stop_reason?: string },
        usage?: { input_tokens?: number, output_tokens?: number }
      }
      if (json.type === 'message_stop') return { delta: '', done: true }
      if (json.type === 'content_block_delta') {
        return { delta: json.delta?.text || '', done: false }
      }
      if (json.type === 'message_delta' || json.type === 'message_start') {
        return { delta: '', done: false, usage: mapUsage(json.usage) }
      }
      return null
    } catch {
      return null
    }
  },

  buildModelsRequest(endpoint: ClientEndpoint) {
    return {
      url: `${trimBase(endpoint.baseUrl)}/v1/models`,
      headers: baseHeaders(endpoint)
    }
  },

  parseModelsResponse(json: unknown): ModelInfo[] {
    const payload = json as { data?: Array<{ id?: string, display_name?: string }> }
    const rows = Array.isArray(payload?.data) ? payload.data : []
    const seen = new Map<string, ModelInfo>()
    for (const row of rows) {
      const id = String(row?.id || '').trim()
      if (!id || seen.has(id)) continue
      seen.set(id, { id, label: String(row?.display_name || id) })
    }
    return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id))
  }
}
