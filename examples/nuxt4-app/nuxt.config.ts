export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  telemetry: false,
  runtimeConfig: {
    aiProvider: 'openai',
    aiBaseUrl: process.env.NUXT_AI_BASE_URL || '',
    aiApiKey: process.env.NUXT_AI_API_KEY || '',
    aiModel: process.env.NUXT_AI_MODEL || 'auto'
  }
})
