export type AIConnectionMode = 'hub' | 'app' | 'local'

export type AIProviderFamily = 'openai-compatible' | 'anthropic'

export type AIRole = 'system' | 'user' | 'assistant'

export interface AIMessage {
  role: AIRole
  content: string
}

export interface ChatRequest {
  model: string
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}

export interface ChatResult {
  content: string
  model: string
  provider: string
  usage: AIUsage | null
  latencyMs: number
}

export interface AIUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface StreamChunk {
  delta: string
  done: boolean
  usage?: AIUsage | null
}

export interface ModelInfo {
  id: string
  label: string
}

export interface ModelListResult {
  models: ModelInfo[]
  provider: string
  baseUrl: string
  count: number
}

export interface ClientEndpoint {
  provider: string
  baseUrl: string
  apiKey?: string
  /** The connection mode decides which runtime may execute the request. */
  mode?: AIConnectionMode
  model?: string
}

export interface AIClientOptions {
  endpoint: ClientEndpoint
  /** Injectable fetch for tests and non-standard runtimes. */
  fetchImpl?: typeof fetch
  /** Default per-request timeout. */
  timeoutMs?: number
  /**
   * Allow a gateway provider (freellmapi/custom/ollama) to run on a public base
   * URL without a client-side key, when the deployment holds the credential.
   */
  allowKeyless?: boolean
  /** Reject a `local` mode endpoint resolved by a remote runtime. */
  assertModeAllowed?: (mode: AIConnectionMode) => void
}

export interface ProviderAdapter {
  family: AIProviderFamily
  buildChatRequest(endpoint: ClientEndpoint, request: ChatRequest): {
    url: string
    headers: Record<string, string>
    body: unknown
  }
  parseChatResponse(json: unknown): { content: string, usage: AIUsage | null }
  parseStreamLine(line: string): StreamChunk | null
  buildModelsRequest(endpoint: ClientEndpoint): { url: string, headers: Record<string, string> }
  parseModelsResponse(json: unknown): ModelInfo[]
}