// tmcut-core — generationAdapter declarations
export interface CapabilityManifest {
  schemaVersion: number
  providerId: string
  displayName: string
  modalities: string[]
  outputFormats: { image?: string[], video?: string[] }
  maxResolution: { image?: { width: number, height: number }, video?: { width: number, height: number } }
  maxDurationSec: number
  supportsAsync: boolean
  supportsCancel: boolean
  supportsProgress: boolean
  costModel: string
  verified?: boolean
  [key: string]: unknown
}

export interface GenerationAdapter {
  manifest(): CapabilityManifest
  submitJob(input: Record<string, unknown>): Promise<{ ok: boolean, jobId?: string, taskId?: string, error?: string }>
  pollJob(jobId: string): Promise<{ ok: boolean, status: string, progress?: number, results?: unknown[], error?: string }>
  cancelJob?(jobId: string): Promise<{ ok: boolean, error?: string }>
  downloadResult?(jobId: string, destDir?: string): Promise<{ ok: boolean, data?: unknown, error?: string }>
  estimateCost?(input: Record<string, unknown>): Promise<{ estimatedCostUsd: number, costBreakdown?: Record<string, number>, budgetWarning?: boolean }>
}

export declare function createCapabilityManifest(input?: Partial<CapabilityManifest>): CapabilityManifest
export declare function validateCapabilityManifest(manifest: unknown): { valid: boolean, errors: string[] }
export declare function createGenerationJobInput(input?: Record<string, unknown>): Record<string, unknown>
export declare function createJobStatusResponse(status: string, data?: Record<string, unknown>): Record<string, unknown>
export declare function createGenerationResult(data?: Record<string, unknown>): Record<string, unknown>
export declare function createCostEstimate(input?: Record<string, unknown>): { estimatedCostUsd: number, costBreakdown: Record<string, unknown>, budgetWarning: boolean }
export declare function registerGenerationAdapter(providerId: string, adapter: GenerationAdapter): void
export declare function getGenerationAdapter(providerId: string): GenerationAdapter | null
export declare function listGenerationAdapters(): Array<{ providerId: string, manifest: CapabilityManifest }>
export declare function isProviderVerified(providerId: string): boolean
