/**
 * Provider identity for every TM app.
 *
 * A provider key is the same string the Hub stores in `ai_connections.provider`
 * and returns in its relay catalogue. The adapter family is a separate concept:
 * many providers speak the OpenAI-compatible wire format but are not OpenAI,
 * and rendering them with OpenAI's logo is the defect this registry exists to
 * prevent.
 */
import type { AIProviderFamily } from '../types'

export interface AIProviderInfo {
  key: string
  name: string
  family: AIProviderFamily
  icon: string
  defaultBaseUrl: string | null
  keyless: boolean
  docsUrl: string | null
}

/**
 * Keys mirror `tm-hub/shared/ai-providers.ts` for `category: 'ai_llm'`.
 * `custom` is the client-side identity for an endpoint whose provider is not
 * known; it never replaces a registry key.
 */
export const AI_PROVIDERS: readonly AIProviderInfo[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    family: 'openai-compatible',
    icon: 'i-simple-icons-openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    keyless: false,
    docsUrl: 'https://platform.openai.com/docs/api-reference'
  },
  {
    key: 'anthropic',
    name: 'Anthropic',
    family: 'anthropic',
    icon: 'i-simple-icons-anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    keyless: false,
    docsUrl: 'https://docs.anthropic.com'
  },
  {
    key: 'google_ai',
    name: 'Google AI (Gemini)',
    family: 'openai-compatible',
    icon: 'i-simple-icons-google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyless: false,
    docsUrl: 'https://ai.google.dev/api'
  },
  {
    key: 'groq',
    name: 'Groq',
    family: 'openai-compatible',
    icon: 'i-lucide-zap',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    keyless: false,
    docsUrl: 'https://console.groq.com/docs'
  },
  {
    key: 'deepseek',
    name: 'DeepSeek',
    family: 'openai-compatible',
    icon: 'i-simple-icons-deepseek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    keyless: false,
    docsUrl: 'https://api-docs.deepseek.com'
  },
  {
    key: 'mistral',
    name: 'Mistral AI',
    family: 'openai-compatible',
    icon: 'i-simple-icons-mistralai',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    keyless: false,
    docsUrl: 'https://docs.mistral.ai'
  },
  {
    key: 'together',
    name: 'Together AI',
    family: 'openai-compatible',
    icon: 'i-lucide-cloud',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    keyless: false,
    docsUrl: 'https://docs.together.ai'
  },
  {
    key: 'cerebras',
    name: 'Cerebras',
    family: 'openai-compatible',
    icon: 'i-lucide-cpu',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    keyless: false,
    docsUrl: 'https://inference-docs.cerebras.ai'
  },
  {
    key: 'cohere',
    name: 'Cohere (compatibility API)',
    family: 'openai-compatible',
    icon: 'i-lucide-orbit',
    defaultBaseUrl: 'https://api.cohere.ai/compatibility/v1',
    keyless: false,
    docsUrl: 'https://docs.cohere.com'
  },
  {
    key: 'github_models',
    name: 'GitHub Models',
    family: 'openai-compatible',
    icon: 'i-simple-icons-github',
    defaultBaseUrl: 'https://models.inference.ai.azure.com',
    keyless: false,
    docsUrl: 'https://docs.github.com/en/github-models'
  },
  {
    key: 'openrouter',
    name: 'OpenRouter',
    family: 'openai-compatible',
    icon: 'i-simple-icons-openrouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    keyless: false,
    docsUrl: 'https://openrouter.ai/docs/api-reference'
  },
  {
    key: 'nvidia',
    name: 'NVIDIA NIM',
    family: 'openai-compatible',
    icon: 'i-simple-icons-nvidia',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    keyless: false,
    docsUrl: 'https://docs.api.nvidia.com/nim'
  },
  {
    key: 'amd_radeon',
    name: 'AMD Radeon AI',
    family: 'openai-compatible',
    icon: 'i-simple-icons-amd',
    defaultBaseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
    keyless: false,
    docsUrl: 'https://developer.amd.com.cn/radeon/api/v1'
  },
  {
    key: 'huggingface',
    name: 'Hugging Face Router',
    family: 'openai-compatible',
    icon: 'i-lucide-boxes',
    defaultBaseUrl: 'https://router.huggingface.co/v1',
    keyless: false,
    docsUrl: 'https://huggingface.co/docs/inference-providers'
  },
  {
    key: 'zhipu',
    name: 'Zhipu AI',
    family: 'openai-compatible',
    icon: 'i-lucide-sparkles',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    keyless: false,
    docsUrl: 'https://open.bigmodel.cn/dev/api'
  },
  {
    key: 'ollama',
    name: 'Ollama (local)',
    family: 'openai-compatible',
    icon: 'i-simple-icons-ollama',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    keyless: true,
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md'
  },
  {
    key: 'freellmapi',
    name: 'FreeLLMAPI deployment',
    family: 'openai-compatible',
    icon: 'i-lucide-route',
    defaultBaseUrl: 'http://127.0.0.1:31415/v1',
    keyless: true,
    docsUrl: null
  },
  {
    key: 'opencode',
    name: 'OpenCode server',
    family: 'openai-compatible',
    icon: 'i-lucide-terminal',
    defaultBaseUrl: null,
    keyless: false,
    docsUrl: null
  },
  {
    key: 'custom_openai',
    name: 'Custom (OpenAI-compatible)',
    family: 'openai-compatible',
    icon: 'i-lucide-plug',
    defaultBaseUrl: null,
    keyless: false,
    docsUrl: null
  },
  {
    key: 'custom',
    name: 'Custom endpoint',
    family: 'openai-compatible',
    icon: 'i-lucide-bot',
    defaultBaseUrl: null,
    keyless: false,
    docsUrl: null
  }
]

const BY_KEY = new Map(AI_PROVIDERS.map(provider => [provider.key, provider]))

export function providerInfo(key: unknown): AIProviderInfo | undefined {
  const value = typeof key === 'string' ? key.trim().toLowerCase() : ''
  return value ? BY_KEY.get(value) : undefined
}

/**
 * Resolves a stored value to a registry key. `null` means the value is not a
 * provider this version knows; callers decide whether that is an error (config
 * files) or a fallback (Hub rows that may be newer than the client).
 */
export function resolveProviderKey(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!value) return null
  if (BY_KEY.has(value)) return value
  if (value === 'openai-compatible' || value === 'openai_compatible') return 'custom'
  return null
}

/** Key safe for display: unknown Hub keys keep their own text. */
export function catalogProviderKey(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  return resolveProviderKey(value) ?? (value || 'custom')
}

export function providerDisplayName(key: unknown): string {
  return providerInfo(key)?.name ?? (typeof key === 'string' && key.trim() ? key.trim() : 'Custom endpoint')
}

export function providerIconFor(key: unknown, family?: unknown): string {
  const info = providerInfo(key)
  if (info) return info.icon
  if (family === 'anthropic') return 'i-simple-icons-anthropic'
  return 'i-lucide-bot'
}
