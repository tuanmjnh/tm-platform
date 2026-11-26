// src/api.ts
import { z } from "zod";
var PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(500).optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional()
});
var ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.array(z.string())).optional()
});
var ApiResponseSchema = (dataSchema) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: ApiErrorSchema.optional(),
  meta: z.object({
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
    total: z.number().int().optional()
  }).optional()
});

// src/ai.ts
import { z as z2 } from "zod";
var AIConnectionModeSchema = z2.enum(["hub", "app", "local"]);
var AIProviderProtocolSchema = z2.enum(["openai-compatible", "anthropic", "google", "custom"]);
var AIConnectionOwnerTypeSchema = z2.enum(["hub", "app", "device"]);
var ProviderDefinitionSchema = z2.object({
  providerId: z2.string().min(1),
  displayName: z2.string().min(1),
  protocol: AIProviderProtocolSchema,
  capabilities: z2.array(z2.string()),
  isEnabled: z2.boolean()
});
var ModelDefinitionSchema = z2.object({
  providerId: z2.string().min(1),
  modelId: z2.string().min(1),
  displayName: z2.string().min(1),
  contextLength: z2.number().int().positive().optional(),
  capabilities: z2.array(z2.string()),
  metadataVersion: z2.string().optional()
});
var AIConnectionMetadataSchema = z2.object({
  id: z2.string().min(1),
  ownerType: AIConnectionOwnerTypeSchema,
  ownerId: z2.string().min(1),
  providerId: z2.string().min(1),
  mode: AIConnectionModeSchema,
  baseUrl: z2.string().url().optional(),
  credentialRef: z2.string().min(1).optional(),
  isActive: z2.boolean()
});
export {
  AIConnectionMetadataSchema,
  AIConnectionModeSchema,
  AIConnectionOwnerTypeSchema,
  AIProviderProtocolSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  ModelDefinitionSchema,
  PaginationParamsSchema,
  ProviderDefinitionSchema
};
//# sourceMappingURL=index.js.map