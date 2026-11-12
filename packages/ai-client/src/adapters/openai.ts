import type { AIUsage, ChatRequest, ClientEndpoint, ModelInfo, ProviderAdapter, StreamChunk } from '../types'

function trimBase(baseUrl: string): string {
  return String(baseUrl || '').trim().replace(/\/+$/, '')
}

export const openAICompatibleAdapter: ProviderAdapter = {
  family: 'openai-compatible',

  buildChatRequest(endpoint: ClientEndpoint, request: ChatRequest) {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (endpoint.apiKey) headers.authorization = `Bearer ${endpoint.apiKey}`

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature
    }
    if (request.jsonMode) body.response_format = { type: 'json_object' }

    return {
      url: `${trimBase(endpoint.baseUrl)}/chat/completions`,
      headers,
      body
    }
  },

  parseChatResponse(json: unknown) {
    const payload = json as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number, completion_tokens?: number, total_tokens?: number }
    }
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content) {
      throw new Error('Chat response has no message content')
    }
    const usage: AIUsage | null = payload.usage
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens
        }
      : null
    return { content, usage }
  },

  parseStreamLine(line: string): StreamChunk | null {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data:')) return null
    const data = trimmed.slice(5).trim()
    if (!data) return null
    if (data === '[DONE]') return { delta: '', done: true }
    try {
      const json = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>
        usage?: { prompt_tokens?: number, completion_tokens?: number, total_tokens?: number }
      }
      const delta = json?.choices?.[0]?.delta?.content || ''
      const usage = json.usage
        ? {
            inputTokens: json.usage.prompt_tokens,
            outputTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens
          }
        : null
      return { delta, done: false, usage }
    } catch {
      return null
    }
  },

  buildModelsRequest(endpoint: ClientEndpoint) {
    const headers: Record<string, string> = {}
    if (endpoint.apiKey) headers.authorization = `Bearer ${endpoint.apiKey}`
    return { url: `${trimBase(endpoint.baseUrl)}/models`, headers }
  },

  parseModelsResponse(json: unknown): ModelInfo[] {
    const payload = json as { data?: unknown[], models?: unknown[] }
    const rows = Array.isArray(json) ? json : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : []
    const seen = new Map<string, ModelInfo>()
    for (const row of rows) {
      const value = typeof row === 'string'
        ? row
        : (row as { id?: string, name?: string, model?: string } | null)?.id
          || (row as { name?: string } | null)?.name
          || (row as { model?: string } | null)?.model
      const id = String(value || '').trim()
      if (!id || seen.has(id)) continue
      const label = (row as { name?: string } | null)?.name || id
      seen.set(id, { id, label })
    }
    return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id))
  }
}