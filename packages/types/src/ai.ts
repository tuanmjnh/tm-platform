/**
 * Hybrid AI provider contracts (plan §6.3).
 *
 * These are metadata-only shapes: no credential, secret, or raw provider
 * value is part of this package. `credentialRef` is an opaque internal
 * reference that must never be resolved in a browser renderer.
 */

/** Where the provider connection lives and who performs inference. */
export type AIConnectionMode = 'hub' | 'app' | 'local'

export type AIProviderProtocol = 'openai-compatible' | 'anthropic' | 'google' | 'custom'

export interface ProviderDefinition {
  providerId: string
  displayName: string
  protocol: AIProviderProtocol
  capabilities: string[]
  isEnabled: boolean
}

export interface ModelDefinition {
  providerId: string
  modelId: string
  displayName: string
  contextLength?: number
  capabilities: string[]
  metadataVersion?: string
}

export type AIConnectionOwnerType = 'hub' | 'app' | 'device'

export interface AIConnectionMetadata {
  id: string
  ownerType: AIConnectionOwnerType
  ownerId: string
  providerId: string
  mode: AIConnectionMode
  baseUrl?: string
  /** Opaque internal reference — never a secret, never resolved in renderers. */
  credentialRef?: string
  isActive: boolean
}