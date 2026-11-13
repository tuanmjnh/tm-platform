import assert from 'node:assert/strict'
import { AIClient, AIClientError, createAIClient, isLocalEndpoint } from '../dist/index.js'

const NL = String.fromCharCode(10)
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
})

const baseEndpoint = {
  provider: 'freellmapi',
  baseUrl: 'http://127.0.0.1:31415/v1',
  mode: 'local'
}

// 1. Successful chat
{
  let seen
  const client = new AIClient({
    endpoint: baseEndpoint,
    fetchImpl: async (url, init) => {
      seen = { url, init }
      return jsonResponse({
        choices: [{ message: { content: 'pong' } }],
        usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 }
      })
    }
  })
  const result = await client.chat({ model: 'auto', messages: [{ role: 'user', content: 'ping' }] })
  assert.equal(result.content, 'pong')
  assert.equal(result.provider, 'freellmapi')
  assert.equal(result.usage.totalTokens, 4)
  assert.equal(seen.url, 'http://127.0.0.1:31415/v1/chat/completions')
  assert.equal(seen.init.method, 'POST')
}

// 2. HTTP error carries the provider message
{
  const client = new AIClient({
    endpoint: { provider: 'x', baseUrl: 'https://api.example.test/v1', apiKey: 'k' },
    fetchImpl: async () => jsonResponse({ error: { message: 'Invalid API key' } }, 401)
  })
  await assert.rejects(
    () => client.chat({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }),
    (err) => err instanceof AIClientError && err.code === 'ai.http-error' && err.status === 401
  )
}

// 3. Network failure is normalized, never leaked raw
{
  const client = new AIClient({
    endpoint: baseEndpoint,
    fetchImpl: async () => { throw new Error('fetch failed') }
  })
  await assert.rejects(
    () => client.chat({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] }),
    (err) => err instanceof AIClientError && err.code === 'ai.network'
  )
}

// 4. Missing key is rejected before the network for remote endpoints
{
  const client = new AIClient({
    endpoint: { provider: 'openai', baseUrl: 'https://api.openai.com/v1' },
    fetchImpl: async () => { throw new Error('should not be called') }
  })
  await assert.rejects(
    () => client.chat({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] }),
    (err) => err instanceof AIClientError && err.code === 'ai.no-key'
  )
}

// 5. Local mode policy hook runs
{
  let blocked = false
  const client = new AIClient({
    endpoint: baseEndpoint,
    assertModeAllowed: () => { blocked = true; throw new AIClientError('ai.local-mode-blocked', 'remote runtime') },
    fetchImpl: async () => jsonResponse({ choices: [{ message: { content: 'x' } }] })
  })
  await assert.rejects(
    () => client.chat({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] }),
    (err) => err.code === 'ai.local-mode-blocked'
  )
  assert.equal(blocked, true)
}

// 6. Model discovery tolerates the three response shapes
{
  const client = new AIClient({
    endpoint: baseEndpoint,
    fetchImpl: async () => jsonResponse({ data: [{ id: 'b' }, { id: 'a' }, { name: 'c' }] })
  })
  const result = await client.listModels()
  assert.deepEqual(result.models.map(m => m.id), ['a', 'b', 'c'])
  assert.equal(result.count, 3)
}

// 7. Streaming parses SSE deltas and [DONE]
{
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"he"}}]}' + NL))
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"llo"}}]}' + NL))
      controller.enqueue(encoder.encode('data: [DONE]' + NL))
      controller.close()
    }
  })
  const client = createAIClient({
    endpoint: baseEndpoint,
    fetchImpl: async () => new Response(stream, { status: 200 })
  })
  let out = ''
  let done = false
  for await (const chunk of client.stream({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] })) {
    out += chunk.delta
    if (chunk.done) done = true
  }
  assert.equal(out, 'hello')
  assert.equal(done, true)
}

assert.equal(isLocalEndpoint('http://127.0.0.1:31415/v1'), true)
assert.equal(isLocalEndpoint('https://api.openai.com/v1'), false)

console.log('tm-ai-client tests passed')
