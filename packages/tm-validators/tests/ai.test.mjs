import assert from 'node:assert/strict'
import {
  AIConnectionMetadataSchema,
  AIConnectionModeSchema,
  ProviderDefinitionSchema,
  ModelDefinitionSchema
} from '../dist/index.js'

assert.equal(AIConnectionModeSchema.parse('local'), 'local')
assert.throws(() => AIConnectionModeSchema.parse('remote'))

assert.equal(ProviderDefinitionSchema.parse({
  providerId: 'freellmapi',
  displayName: 'FreeLLMAPI',
  protocol: 'openai-compatible',
  capabilities: ['chat'],
  isEnabled: true
}).providerId, 'freellmapi')

assert.equal(ModelDefinitionSchema.parse({
  providerId: 'openai',
  modelId: 'gpt-4o-mini',
  displayName: 'GPT-4o mini',
  capabilities: ['chat']
}).modelId, 'gpt-4o-mini')

assert.equal(AIConnectionMetadataSchema.parse({
  id: '774c79e3',
  ownerType: 'hub',
  ownerId: 'tm-tools',
  providerId: 'freellmapi',
  mode: 'local',
  baseUrl: 'http://127.0.0.1:31415/v1',
  isActive: true
}).mode, 'local')

assert.throws(() => AIConnectionMetadataSchema.parse({
  id: 'x', ownerType: 'hub', ownerId: 'a', providerId: 'p', mode: 'local', baseUrl: 'not-a-url', isActive: true
}))

console.log('tm-validators ai tests passed')