import assert from 'node:assert/strict'
import {
  AI_PROVIDERS,
  appCatalogId,
  endpointHost,
  findAppConnection,
  mergeCatalog,
  parseAppConnections,
  providerDisplayName,
  providerIconFor,
  resolveProviderKey,
  selectableModels,
  stripAppCatalogId,
  toAppCatalogConnection
} from '../dist/index.js'

// 1. Legacy config keeps working and is classified as a custom endpoint
{
  const { connections, errors } = parseAppConnections(JSON.stringify([
    {
      connectionId: 'free-local',
      provider: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:31415/v1///',
      apiKeyEnv: 'AI_API_KEY_FREELLM',
      models: ['auto', { id: 'gpt-4o-mini', displayName: 'GPT-4o mini' }]
    }
  ]))
  assert.deepEqual(errors, [])
  assert.equal(connections.length, 1)
  assert.equal(connections[0].providerKey, 'custom')
  assert.equal(connections[0].baseUrl, 'http://127.0.0.1:31415/v1')
  assert.deepEqual(connections[0].models.map(model => model.modelId), ['auto', 'gpt-4o-mini'])
  assert.equal(connections[0].models[1].displayName, 'GPT-4o mini')
}

// 2. Explicit providerKey wins and must be a registry key
{
  const ok = parseAppConnections([
    { connectionId: 'n', providerKey: 'nvidia', baseUrl: 'http://localhost:9/v1', models: [] }
  ])
  assert.deepEqual(ok.errors, [])
  assert.equal(ok.connections[0].providerKey, 'nvidia')

  const bad = parseAppConnections([
    { connectionId: 'n', providerKey: 'not-a-provider', baseUrl: 'http://localhost:9/v1' }
  ])
  assert.equal(bad.connections.length, 0)
  assert.match(bad.errors[0], /unknown providerKey/)
}

// 3. Malformed entries are rejected, not partially accepted
{
  const { connections, errors } = parseAppConnections([
    { connectionId: '', baseUrl: 'http://localhost:11434/v1' },
    { connectionId: 'no-url' },
    { connectionId: 'bad-url', baseUrl: 'file:///etc/passwd' },
    { connectionId: 'ok', baseUrl: 'http://localhost:11434/v1' },
    { connectionId: 'ok', baseUrl: 'http://localhost:11434/v1' }
  ])
  assert.equal(connections.length, 1)
  assert.equal(errors.length, 4)
}

// 4. Empty and invalid JSON
{
  for (const value of ['', '   ', undefined, null]) {
    assert.deepEqual(parseAppConnections(value), { connections: [], errors: [] })
  }
  const bad = parseAppConnections('{not json')
  assert.equal(bad.errors.length, 1)
  assert.match(bad.errors[0], /not valid JSON/)
}

// 5. Id namespacing is stable and reversible
{
  assert.equal(appCatalogId('abc'), 'app:abc')
  assert.equal(appCatalogId('app:abc'), 'app:abc')
  assert.equal(stripAppCatalogId('app:abc'), 'abc')
  assert.equal(stripAppCatalogId('abc'), 'abc')
  assert.equal(endpointHost('http://127.0.0.1:31415/v1'), '127.0.0.1:31415')
  assert.equal(endpointHost('not a url'), '')
}

// 6. Legacy stored ids still resolve through the prefixed lookup
{
  const { connections } = parseAppConnections([
    { connectionId: 'legacy', provider: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1' }
  ])
  assert.equal(findAppConnection(connections, 'legacy')?.connectionId, 'legacy')
  assert.equal(findAppConnection(connections, 'app:legacy')?.connectionId, 'legacy')
}

// 7. App rows are prefixed; Hub rows keep their id
{
  const app = [toAppCatalogConnection({
    connectionId: '774c79e3',
    providerKey: 'freellmapi',
    baseUrl: 'http://127.0.0.1:31415/v1',
    models: [{ modelId: 'auto' }]
  }, { hasKey: true })]
  const hub = [{
    connectionId: '774c79e3',
    provider: 'freellmapi',
    name: 'default',
    adapterType: 'openai_compatible',
    hasKey: true,
    model: null,
    models: [{ modelId: 'auto' }, { modelId: 'other-model' }]
  }]
  const merged = mergeCatalog(hub, app)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].connectionId, 'app:774c79e3')
  assert.equal(merged[0].source, 'app')
  assert.equal(merged[0].name, '127.0.0.1:31415')
  assert.equal(merged[1].connectionId, '774c79e3')
  assert.equal(merged[1].source, 'hub')
  // Same provider + same model: the Hub row is shadowed, the app row is not.
  assert.equal(merged[1].models[0].shadowed, true)
  assert.equal(merged[1].models[1].shadowed, false)
  assert.deepEqual(selectableModels(merged[1]).map(model => model.modelId), ['other-model'])
  assert.equal(merged[0].models[0].shadowed, false)
}

// 8. A different provider with the same model id is not a duplicate
{
  const app = [toAppCatalogConnection({
    connectionId: 'a',
    providerKey: 'nvidia',
    baseUrl: 'http://localhost:9/v1',
    models: [{ modelId: 'auto' }]
  }, { hasKey: true })]
  const hub = [{
    connectionId: 'h',
    provider: 'openai',
    name: 'default',
    adapterType: 'openai_compatible',
    hasKey: true,
    model: null,
    models: [{ modelId: 'auto' }]
  }]
  const merged = mergeCatalog(hub, app)
  assert.equal(merged[1].models[0].shadowed, false)
}

// 9. Unknown Hub keys survive and are displayed by key
{
  const merged = mergeCatalog([{
    connectionId: 'h',
    provider: 'brand-new-provider',
    name: 'default',
    adapterType: 'openai_compatible',
    hasKey: true,
    model: null,
    models: []
  }], [])
  assert.equal(merged[0].providerKey, 'brand-new-provider')
  assert.equal(merged[0].providerName, 'brand-new-provider')
}

// 10. Registry identity and icons
{
  assert.equal(resolveProviderKey('NVIDIA'), 'nvidia')
  assert.equal(resolveProviderKey('openai-compatible'), 'custom')
  assert.equal(resolveProviderKey('nope'), null)
  assert.equal(providerIconFor('nvidia'), 'i-simple-icons-nvidia')
  assert.equal(providerIconFor('brand-new-provider'), 'i-lucide-bot')
  assert.equal(providerDisplayName('google_ai'), 'Google AI (Gemini)')
  assert.ok(AI_PROVIDERS.every(provider => provider.key === provider.key.toLowerCase()))
}
