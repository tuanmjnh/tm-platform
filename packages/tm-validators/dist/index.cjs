"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AIConnectionMetadataSchema: () => AIConnectionMetadataSchema,
  AIConnectionModeSchema: () => AIConnectionModeSchema,
  AIConnectionOwnerTypeSchema: () => AIConnectionOwnerTypeSchema,
  AIProviderProtocolSchema: () => AIProviderProtocolSchema,
  ApiErrorSchema: () => ApiErrorSchema,
  ApiResponseSchema: () => ApiResponseSchema,
  ModelDefinitionSchema: () => ModelDefinitionSchema,
  PaginationParamsSchema: () => PaginationParamsSchema,
  ProviderDefinitionSchema: () => ProviderDefinitionSchema
});
module.exports = __toCommonJS(index_exports);

// src/api.ts
var import_zod = require("zod");
var PaginationParamsSchema = import_zod.z.object({
  page: import_zod.z.number().int().positive().optional(),
  limit: import_zod.z.number().int().positive().max(500).optional(),
  sort: import_zod.z.string().optional(),
  order: import_zod.z.enum(["asc", "desc"]).optional()
});
var ApiErrorSchema = import_zod.z.object({
  code: import_zod.z.string(),
  message: import_zod.z.string(),
  details: import_zod.z.record(import_zod.z.string(), import_zod.z.array(import_zod.z.string())).optional()
});
var ApiResponseSchema = (dataSchema) => import_zod.z.object({
  success: import_zod.z.boolean(),
  data: dataSchema.optional(),
  error: ApiErrorSchema.optional(),
  meta: import_zod.z.object({
    page: import_zod.z.number().int().optional(),
    limit: import_zod.z.number().int().optional(),
    total: import_zod.z.number().int().optional()
  }).optional()
});

// src/ai.ts
var import_zod2 = require("zod");
var AIConnectionModeSchema = import_zod2.z.enum(["hub", "app", "local"]);
var AIProviderProtocolSchema = import_zod2.z.enum(["openai-compatible", "anthropic", "google", "custom"]);
var AIConnectionOwnerTypeSchema = import_zod2.z.enum(["hub", "app", "device"]);
var ProviderDefinitionSchema = import_zod2.z.object({
  providerId: import_zod2.z.string().min(1),
  displayName: import_zod2.z.string().min(1),
  protocol: AIProviderProtocolSchema,
  capabilities: import_zod2.z.array(import_zod2.z.string()),
  isEnabled: import_zod2.z.boolean()
});
var ModelDefinitionSchema = import_zod2.z.object({
  providerId: import_zod2.z.string().min(1),
  modelId: import_zod2.z.string().min(1),
  displayName: import_zod2.z.string().min(1),
  contextLength: import_zod2.z.number().int().positive().optional(),
  capabilities: import_zod2.z.array(import_zod2.z.string()),
  metadataVersion: import_zod2.z.string().optional()
});
var AIConnectionMetadataSchema = import_zod2.z.object({
  id: import_zod2.z.string().min(1),
  ownerType: AIConnectionOwnerTypeSchema,
  ownerId: import_zod2.z.string().min(1),
  providerId: import_zod2.z.string().min(1),
  mode: AIConnectionModeSchema,
  baseUrl: import_zod2.z.string().url().optional(),
  credentialRef: import_zod2.z.string().min(1).optional(),
  isActive: import_zod2.z.boolean()
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AIConnectionMetadataSchema,
  AIConnectionModeSchema,
  AIConnectionOwnerTypeSchema,
  AIProviderProtocolSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  ModelDefinitionSchema,
  PaginationParamsSchema,
  ProviderDefinitionSchema
});
//# sourceMappingURL=index.cjs.map