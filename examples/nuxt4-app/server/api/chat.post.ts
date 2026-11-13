import { createAIClient } from '@tuanmjnh/tm-ai-client'
import type { ApiResponse } from '@tuanmjnh/tm-types'

/**
 * One chat call against the OpenAI-compatible endpoint in NUXT_AI_BASE_URL.
 * The base URL is mandatory: the example never guesses a provider, which is
 * the same rule the app gateways follow.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<{ content: string }>> => {
  const config = useRuntimeConfig(event)
  if (!String(config.aiBaseUrl || '').trim()) {
    return { success: false, error: { code: 'example.no-base-url', message: 'Set NUXT_AI_BASE_URL' } }
  }

  const client = createAIClient({
    endpoint: {
      provider: String(config.aiProvider || 'openai'),
      baseUrl: String(config.aiBaseUrl),
      apiKey: config.aiApiKey ? String(config.aiApiKey) : undefined
    },
    allowKeyless: true
  })

  try {
    const result = await client.chat({
      model: String(config.aiModel || 'auto'),
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }]
    })
    return { success: true, data: { content: result.content } }
  } catch (err) {
    return {
      success: false,
      error: {
        code: String((err as { code?: string })?.code || 'example.failed'),
        message: String((err as Error)?.message || err)
      }
    }
  }
})
