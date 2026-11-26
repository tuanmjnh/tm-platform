interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
}
interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

type DocsRoadmapStatus = 'shipped' | 'in_progress' | 'planned';
interface DocsArchitectureCard {
    icon: string;
    iconClass: string;
    hoverClass: string;
    title: string;
    desc: string;
}
interface DocsRoadmapItem {
    phase: string;
    status: DocsRoadmapStatus;
    statusLabel: string;
    title: string;
    desc: string;
}
interface DocsRoadmapSection {
    title: string;
    description: string;
    updatedLabel: string;
    items: DocsRoadmapItem[];
}
interface DocsSdkInstallCommand {
    label: string;
    code: string;
}
interface DocsSdkSection {
    title: string;
    description: string;
    install: string;
    installHint: string;
    usage: string;
    copyLabel: string;
    copiedLabel: string;
    githubLabel: string;
    githubUrl: string;
    installCommands: DocsSdkInstallCommand[];
    usageCode: string;
}
interface DocsApiSection {
    title: string;
    prefixLabel: string;
    headers: {
        module: string;
        method: string;
        endpoint: string;
        description: string;
    };
}
interface DocsApiReference {
    module: string;
    method: string;
    path: string;
    desc: string;
}
interface DocsSetupStep {
    title: string;
    desc: string;
    code?: string;
    lang?: string;
}
interface DocsSetupSection {
    title: string;
    description: string;
    steps: DocsSetupStep[];
}
interface DocsContentLocale {
    architecture: DocsArchitectureCard[];
    roadmap: DocsRoadmapSection;
    setupGuide?: DocsSetupSection;
    sdk: DocsSdkSection;
    api: DocsApiSection;
    apis: DocsApiReference[];
}
interface HubDocsContent {
    version: number;
    updatedAt: string;
    en: DocsContentLocale;
    vi: DocsContentLocale;
}

/**
 * Hybrid AI provider contracts (plan §6.3).
 *
 * These are metadata-only shapes: no credential, secret, or raw provider
 * value is part of this package. `credentialRef` is an opaque internal
 * reference that must never be resolved in a browser renderer.
 */
/** Where the provider connection lives and who performs inference. */
type AIConnectionMode = 'hub' | 'app' | 'local';
type AIProviderProtocol = 'openai-compatible' | 'anthropic' | 'google' | 'custom';
interface ProviderDefinition {
    providerId: string;
    displayName: string;
    protocol: AIProviderProtocol;
    capabilities: string[];
    isEnabled: boolean;
}
interface ModelDefinition {
    providerId: string;
    modelId: string;
    displayName: string;
    contextLength?: number;
    capabilities: string[];
    metadataVersion?: string;
}
type AIConnectionOwnerType = 'hub' | 'app' | 'device';
interface AIConnectionMetadata {
    id: string;
    ownerType: AIConnectionOwnerType;
    ownerId: string;
    providerId: string;
    mode: AIConnectionMode;
    baseUrl?: string;
    /** Opaque internal reference — never a secret, never resolved in renderers. */
    credentialRef?: string;
    isActive: boolean;
}

export type { AIConnectionMetadata, AIConnectionMode, AIConnectionOwnerType, AIProviderProtocol, ApiResponse, DocsApiReference, DocsApiSection, DocsArchitectureCard, DocsContentLocale, DocsRoadmapItem, DocsRoadmapSection, DocsRoadmapStatus, DocsSdkInstallCommand, DocsSdkSection, DocsSetupSection, DocsSetupStep, HubDocsContent, ModelDefinition, PaginationParams, ProviderDefinition };
