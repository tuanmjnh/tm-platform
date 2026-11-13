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

// 8. Anthropic uses its native messages endpoint, headers and body shape
{
  let seen
  const client = new AIClient({
    endpoint: { provider: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant-x' },
    fetchImpl: async (url, init) => {
      seen = { url, init }
      return jsonResponse({
        content: [{ type: 'text', text: 'pong' }],
        usage: { input_tokens: 7, output_tokens: 2 }
      })
    }
  })
  const result = await client.chat({ model: 'claude-sonnet-4', messages: [{ role: 'user', content: 'ping' }] })
  assert.equal(result.content, 'pong')
  assert.equal(result.usage.inputTokens, 7)
  assert.equal(result.usage.outputTokens, 2)
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages')
  assert.equal(seen.init.headers['x-api-key'], 'sk-ant-x')
  assert.equal(seen.init.headers['anthropic-version'], '2023-06-01')
  assert.equal(seen.init.headers.authorization, undefined)
  const body = JSON.parse(seen.init.body)
  assert.equal(body.model, 'claude-sonnet-4')
  assert.equal(body.max_tokens > 0, true)
  assert.equal(body.messages[0].content, 'ping')
}

// 9. Anthropic moves system messages into the top-level system field
{
  let body
  const client = new AIClient({
    endpoint: { provider: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'k' },
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body)
      return jsonResponse({ content: [{ type: 'text', text: 'ok' }] })
    }
  })
  await client.chat({
    model: 'claude-x',
    messages: [
      { role: 'system', content: 'be terse' },
      { role: 'user', content: 'hi' }
    ]
  })
  assert.equal(body.system, 'be terse')
  assert.deepEqual(body.messages, [{ role: 'user', content: 'hi' }])
}

// 10. Anthropic streaming parses content_block_delta events
{
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"text":"he"}}' + NL))
      controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"text":"llo"}}' + NL))
      controller.enqueue(encoder.encode('data: {"type":"message_stop"}' + NL))
      controller.close()
    }
  })
  const client = createAIClient({
    endpoint: { provider: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'k' },
    fetchImpl: async () => new Response(stream, { status: 200 })
  })
  let out = ''
  let done = false
  for await (const chunk of client.stream({ model: 'claude-x', messages: [{ role: 'user', content: 'hi' }] })) {
    out += chunk.delta
    if (chunk.done) done = true
  }
  assert.equal(out, 'hello')
  assert.equal(done, true)
}

// 11. Anthropic model discovery uses the v1/models endpoint with its own headers
{
  let seen
  const client = new AIClient({
    endpoint: { provider: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'k' },
    fetchImpl: async (url, init) => {
      seen = { url, headers: init.headers }
      return jsonResponse({ data: [{ id: 'claude-a', display_name: 'Claude A' }] })
    }
  })
  const result = await client.listModels()
  assert.equal(seen.url, 'https://api.anthropic.com/v1/models')
  assert.equal(seen.headers['x-api-key'], 'k')
  assert.deepEqual(result.models.map(m => m.id), ['claude-a'])
}

// 12. An OpenAI-shaped endpoint keeps the Bearer header (no regression)
{
  let seen
  const client = new AIClient({
    endpoint: { provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-x' },
    fetchImpl: async (url, init) => {
      seen = { url, headers: init.headers }
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] })
    }
  })
  await client.chat({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] })
  assert.equal(seen.url, 'https://api.openai.com/v1/chat/completions')
  assert.equal(seen.headers.authorization, 'Bearer sk-x')
}

// 13. A 200 with no message content is a shape error, not a network failure
{
  const client = new AIClient({
    endpoint: baseEndpoint,
    fetchImpl: async () => jsonResponse({ choices: [{ message: { content: '' } }] })
  })
  await assert.rejects(
    () => client.chat({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] }),
    (err) => err instanceof AIClientError && err.code === 'ai.bad-shape'
  )
}

// 14. `allowKeyless` lets a deployment-fronted gateway omit the key
{
  const client = new AIClient({
    endpoint: { provider: 'freellmapi', baseUrl: 'https://gw.example.test/v1' },
    allowKeyless: true,
    fetchImpl: async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] })
  })
  const result = await client.chat({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] })
  assert.equal(result.content, 'ok')
}

// 15. `allowKeyless` is opt-in, so a keyless OpenAI endpoint still fails
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

console.log('tm-ai-client tests passed')
