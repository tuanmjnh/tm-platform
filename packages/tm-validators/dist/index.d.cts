import { z } from 'zod';

declare const PaginationParamsSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    sort: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
type PaginationParams = z.infer<typeof PaginationParamsSchema>;
declare const ApiErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
type ApiError = z.infer<typeof ApiErrorSchema>;
declare const ApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>>;
    meta: z.ZodOptional<z.ZodObject<{
        page: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodOptional<z.ZodNumber>;
        total: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
};

/** Hybrid AI provider contracts (plan §6.3). Metadata only — no secrets. */
declare const AIConnectionModeSchema: z.ZodEnum<{
    hub: "hub";
    app: "app";
    local: "local";
}>;
type AIConnectionMode = z.infer<typeof AIConnectionModeSchema>;
declare const AIProviderProtocolSchema: z.ZodEnum<{
    custom: "custom";
    "openai-compatible": "openai-compatible";
    anthropic: "anthropic";
    google: "google";
}>;
type AIProviderProtocol = z.infer<typeof AIProviderProtocolSchema>;
declare const AIConnectionOwnerTypeSchema: z.ZodEnum<{
    hub: "hub";
    app: "app";
    device: "device";
}>;
type AIConnectionOwnerType = z.infer<typeof AIConnectionOwnerTypeSchema>;
declare const ProviderDefinitionSchema: z.ZodObject<{
    providerId: z.ZodString;
    displayName: z.ZodString;
    protocol: z.ZodEnum<{
        custom: "custom";
        "openai-compatible": "openai-compatible";
        anthropic: "anthropic";
        google: "google";
    }>;
    capabilities: z.ZodArray<z.ZodString>;
    isEnabled: z.ZodBoolean;
}, z.core.$strip>;
type ProviderDefinition = z.infer<typeof ProviderDefinitionSchema>;
declare const ModelDefinitionSchema: z.ZodObject<{
    providerId: z.ZodString;
    modelId: z.ZodString;
    displayName: z.ZodString;
    contextLength: z.ZodOptional<z.ZodNumber>;
    capabilities: z.ZodArray<z.ZodString>;
    metadataVersion: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
declare const AIConnectionMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    ownerType: z.ZodEnum<{
        hub: "hub";
        app: "app";
        device: "device";
    }>;
    ownerId: z.ZodString;
    providerId: z.ZodString;
    mode: z.ZodEnum<{
        hub: "hub";
        app: "app";
        local: "local";
    }>;
    baseUrl: z.ZodOptional<z.ZodString>;
    credentialRef: z.ZodOptional<z.ZodString>;
    isActive: z.ZodBoolean;
}, z.core.$strip>;
type AIConnectionMetadata = z.infer<typeof AIConnectionMetadataSchema>;

export { type AIConnectionMetadata, AIConnectionMetadataSchema, type AIConnectionMode, AIConnectionModeSchema, type AIConnectionOwnerType, AIConnectionOwnerTypeSchema, type AIProviderProtocol, AIProviderProtocolSchema, type ApiError, ApiErrorSchema, type ApiResponse, ApiResponseSchema, type ModelDefinition, ModelDefinitionSchema, type PaginationParams, PaginationParamsSchema, type ProviderDefinition, ProviderDefinitionSchema };
