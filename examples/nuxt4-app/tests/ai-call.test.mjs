import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createAIClient } from '@tuanmjnh/tm-ai-client'

// The example's whole point is that a fresh Nuxt app can install the published
// client and complete a call. This test stands up the stub provider the README
// tells the reader to point NUXT_AI_BASE_URL at, then drives the same client
// code the server route uses.
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        choices: [{ message: { content: `pong (${parsed.model})` } }],
        usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 }
      }))
    })
    return
  }
  res.writeHead(404).end()
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port

try {
  const client = createAIClient({
    endpoint: { provider: 'openai', baseUrl: `http://127.0.0.1:${port}/v1` },
    allowKeyless: true,
    fetchImpl: fetch
  })
  const result = await client.chat({
    model: 'auto',
    messages: [{ role: 'user', content: 'ping' }]
  })
  assert.equal(result.content, 'pong (auto)')
  assert.equal(result.usage.totalTokens, 6)
  console.log('example AI call passed')
} finally {
  await new Promise(resolve => server.close(resolve))
}
