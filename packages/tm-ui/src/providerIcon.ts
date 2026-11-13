/**
 * Provider → icon mapping shared by the model pickers.
 *
 * `lucide` and `simple-icons` are both present in every consuming app, so the
 * names resolve without the package shipping icon data.
 */
export function providerIconFor(provider: string): string {
  const p = (provider || '').toLowerCase()
  if (p.includes('openai')) return 'i-simple-icons-openai'
  if (p.includes('anthropic')) return 'i-simple-icons-anthropic'
  if (p.includes('google')) return 'i-simple-icons-google'
  if (p.includes('groq')) return 'i-lucide-zap'
  if (p.includes('deepseek')) return 'i-lucide-sparkles'
  if (p.includes('ollama')) return 'i-lucide-hard-drive'
  if (p.includes('router')) return 'i-lucide-route'
  return 'i-lucide-bot'
}
