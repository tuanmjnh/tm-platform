import { z } from 'zod'

/** Hybrid AI provider contracts (plan §6.3). Metadata only — no secrets. */

export const AIConnectionModeSchema = z.enum(['hub', 'app', 'local'])
export type AIConnectionMode = z.infer<typeof AIConnectionModeSchema>

export const AIProviderProtocolSchema = z.enum(['openai-compatible', 'anthropic', 'google', 'custom'])
export type AIProviderProtocol = z.infer<typeof AIProviderProtocolSchema>

export const AIConnectionOwnerTypeSchema = z.enum(['hub', 'app', 'device'])
export type AIConnectionOwnerType = z.infer<typeof AIConnectionOwnerTypeSchema>

export const ProviderDefinitionSchema = z.object({
  providerId: z.string().min(1),
  displayName: z.string().min(1),
  protocol: AIProviderProtocolSchema,
  capabilities: z.array(z.string()),
  isEnabled: z.boolean()
})
export type ProviderDefinition = z.infer<typeof ProviderDefinitionSchema>

export const ModelDefinitionSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  contextLength: z.number().int().positive().optional(),
  capabilities: z.array(z.string()),
  metadataVersion: z.string().optional()
})
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>

export const AIConnectionMetadataSchema = z.object({
  id: z.string().min(1),
  ownerType: AIConnectionOwnerTypeSchema,
  ownerId: z.string().min(1),
  providerId: z.string().min(1),
  mode: AIConnectionModeSchema,
  baseUrl: z.string().url().optional(),
  credentialRef: z.string().min(1).optional(),
  isActive: z.boolean()
})
export type AIConnectionMetadata = z.infer<typeof AIConnectionMetadataSchema>