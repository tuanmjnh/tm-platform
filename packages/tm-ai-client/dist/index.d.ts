type AIConnectionMode = 'hub' | 'app' | 'local';
type AIProviderFamily = 'openai-compatible' | 'anthropic';
type AIRole = 'system' | 'user' | 'assistant';
interface AIMessage {
    role: AIRole;
    content: string;
}
interface ChatRequest {
    model: string;
    messages: AIMessage[];
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
    signal?: AbortSignal;
}
interface ChatResult {
    content: string;
    model: string;
    provider: string;
    usage: AIUsage | null;
    latencyMs: number;
}
interface AIUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}
interface StreamChunk {
    delta: string;
    done: boolean;
    usage?: AIUsage | null;
}
interface ModelInfo {
    id: string;
    label: string;
}
interface ModelListResult {
    models: ModelInfo[];
    provider: string;
    baseUrl: string;
    count: number;
}
interface ClientEndpoint {
    provider: string;
    baseUrl: string;
    apiKey?: string;
    /** The connection mode decides which runtime may execute the request. */
    mode?: AIConnectionMode;
    model?: string;
}
interface AIClientOptions {
    endpoint: ClientEndpoint;
    /** Injectable fetch for tests and non-standard runtimes. */
    fetchImpl?: typeof fetch;
    /** Default per-request timeout. */
    timeoutMs?: number;
    /**
     * Allow a gateway provider (freellmapi/custom/ollama) to run on a public base
     * URL without a client-side key, when the deployment holds the credential.
     */
    allowKeyless?: boolean;
    /** Reject a `local` mode endpoint resolved by a remote runtime. */
    assertModeAllowed?: (mode: AIConnectionMode) => void;
}
interface ProviderAdapter {
    family: AIProviderFamily;
    buildChatRequest(endpoint: ClientEndpoint, request: ChatRequest): {
        url: string;
        headers: Record<string, string>;
        body: unknown;
    };
    parseChatResponse(json: unknown): {
        content: string;
        usage: AIUsage | null;
    };
    parseStreamLine(line: string): StreamChunk | null;
    buildModelsRequest(endpoint: ClientEndpoint): {
        url: string;
        headers: Record<string, string>;
    };
    parseModelsResponse(json: unknown): ModelInfo[];
}

type AIClientErrorCode = 'ai.no-base-url' | 'ai.no-model' | 'ai.no-key' | 'ai.rate-limited' | 'ai.timeout' | 'ai.network' | 'ai.http-error' | 'ai.bad-shape' | 'ai.aborted' | 'ai.local-mode-blocked' | 'ai.bad-master-key' | 'ai.no-crypto' | 'ai.store-failed';
declare class AIClientError extends Error {
    readonly code: AIClientErrorCode;
    readonly status?: number;
    readonly retryAfterMs?: number;
    constructor(code: AIClientErrorCode, message: string, extra?: {
        status?: number;
        retryAfterMs?: number;
    });
}
/** Local endpoints are only reachable from the runtime that hosts them. */
declare function isLocalEndpoint(baseUrl: string | undefined): boolean;

declare const openAICompatibleAdapter: ProviderAdapter;

declare const anthropicAdapter: ProviderAdapter;

declare class AIClient {
    private readonly endpoint;
    private readonly fetchImpl;
    private readonly timeoutMs;
    private readonly allowKeyless;
    private readonly assertModeAllowed?;
    constructor(options: AIClientOptions);
    chat(request: ChatRequest): Promise<ChatResult>;
    stream(request: ChatRequest): AsyncGenerator<StreamChunk>;
    listModels(): Promise<ModelListResult>;
}
declare function createAIClient(options: AIClientOptions): AIClient;

/**
 * Provider identity for every TM app.
 *
 * A provider key is the same string the Hub stores in `ai_connections.provider`
 * and returns in its relay catalogue. The adapter family is a separate concept:
 * many providers speak the OpenAI-compatible wire format but are not OpenAI,
 * and rendering them with OpenAI's logo is the defect this registry exists to
 * prevent.
 */

interface AIProviderInfo {
    key: string;
    name: string;
    family: AIProviderFamily;
    icon: string;
    defaultBaseUrl: string | null;
    keyless: boolean;
    docsUrl: string | null;
}
/**
 * Keys mirror `tm-hub/shared/ai-providers.ts` for `category: 'ai_llm'`.
 * `custom` is the client-side identity for an endpoint whose provider is not
 * known; it never replaces a registry key.
 */
declare const AI_PROVIDERS: readonly AIProviderInfo[];
declare function providerInfo(key: unknown): AIProviderInfo | undefined;
/**
 * Resolves a stored value to a registry key. `null` means the value is not a
 * provider this version knows; callers decide whether that is an error (config
 * files) or a fallback (Hub rows that may be newer than the client).
 */
declare function resolveProviderKey(raw: unknown): string | null;
/** Key safe for display: unknown Hub keys keep their own text. */
declare function catalogProviderKey(raw: unknown): string;
declare function providerDisplayName(key: unknown): string;
declare function providerIconFor(key: unknown, family?: unknown): string;

/**
 * A connection the app runs itself (mode `local`). The Hub never holds its key
 * and never calls it; the connection is explicit so a hosted deployment cannot
 * silently begin calling a loopback address.
 */
interface AppAIModel {
    modelId: string;
    displayName?: string;
}
interface AppAIConnection {
    connectionId: string;
    providerKey: string;
    baseUrl: string;
    /** Inline key for env-file-only setups. Prefer `apiKeyEnv` on desktop. */
    apiKey?: string;
    /** Config slot holding the key (`AI_API_KEY_<SUFFIX>`), encrypted at rest. */
    apiKeyEnv?: string;
    models: AppAIModel[];
}
interface AppAIConfigParseResult {
    connections: AppAIConnection[];
    errors: string[];
}
declare function normalizeBaseUrl(value: string): string;
/** Host (and port) shown beside a local connection so two of them differ. */
declare function endpointHost(baseUrl: string): string;
/**
 * Pure and strict: a malformed entry is reported, never partially accepted,
 * because a half-configured connection fails later inside a chat call where
 * the reason is much harder to see.
 */
declare function parseAppConnections(raw: unknown): AppAIConfigParseResult;
/** Finds a configured connection by id; the `app:` catalogue prefix is ignored. */
declare function findAppConnection(connections: AppAIConnection[], connectionId: string): AppAIConnection | undefined;

type CatalogSource = 'hub' | 'app';
interface CatalogModelEntry {
    modelId: string;
    displayName?: string;
    /** An identical provider+model exists on the other source; the app row wins. */
    shadowed?: boolean;
}
/**
 * One catalogue connection. `provider` carries the provider key (nvidia,
 * google_ai, freellmapi, ...), never an adapter family; `adapterType` stays
 * separate because several providers share the OpenAI-compatible wire format.
 */
interface CatalogConnection {
    connectionId: string;
    provider: string;
    name: string;
    adapterType: string;
    hasKey: boolean;
    model: string | null;
    models: CatalogModelEntry[];
    providerKey?: string;
    providerName?: string;
    source?: CatalogSource;
}
/** Catalogue ids of app-local connections live in their own namespace. */
declare const APP_ID_PREFIX = "app:";
declare function appCatalogId(connectionId: string): string;
declare function stripAppCatalogId(connectionId: string): string;
/**
 * Builds the catalogue row for an app-local connection. The name is the
 * endpoint host so two connections to the same provider never look identical;
 * the picker shows it beside the provider name.
 */
declare function toAppCatalogConnection(entry: AppAIConnection, options: {
    hasKey: boolean;
    name?: string;
}): CatalogConnection;
/**
 * App-local connections first, then Hub connections, with model-level
 * de-duplication across the two sources. Connections are never dropped: only
 * an identical provider+model pair is marked `shadowed` on the Hub side, and
 * the picker hides that row. The Hub catalogue intentionally omits `baseUrl`,
 * so the endpoint cannot be part of the key.
 */
declare function mergeCatalog(hub: CatalogConnection[], app: CatalogConnection[]): CatalogConnection[];
/** Models a picker may offer: shadowed Hub rows stay visible in management only. */
declare function selectableModels(connection: CatalogConnection): CatalogModelEntry[];

declare function toBase64(bytes: Uint8Array): string;
declare function fromBase64(value: string): Uint8Array;
declare function generateMasterKey(): string;
declare function decodeMasterKey(secret: string): Uint8Array;
declare function sealSecret(masterKey: string | Uint8Array, plain: string): Promise<string>;
declare function openSecret(masterKey: string | Uint8Array, sealed: string): Promise<string>;

interface StoredAIModel {
    modelId: string;
    displayName?: string;
    enabled: boolean;
    isPrimary?: boolean;
    discoveredAt?: string;
}
interface StoredAIConnection {
    ownerId: string;
    connectionId: string;
    providerKey: string;
    baseUrl: string;
    apiKeyCipher: string;
    apiKeyEnv?: string;
    enabled: boolean;
    models: StoredAIModel[];
    createdAt?: string;
    updatedAt?: string;
}
type StoredAIConnectionInput = Omit<StoredAIConnection, 'ownerId' | 'models' | 'createdAt' | 'updatedAt'> & {
    models?: Array<Partial<StoredAIModel> & {
        modelId: string;
    }>;
};
declare function normalizeStoredConnection(input: StoredAIConnectionInput, ownerId: string): StoredAIConnection;
/**
 * The catalogue/picker shape. Disabled models never reach a picker; the cipher
 * never leaves the store layer.
 */
declare function storedToAppConnection(record: StoredAIConnection, options?: {
    apiKey?: string;
    includeDisabledModels?: boolean;
}): AppAIConnection;

/**
 * One owner's AI configuration. Implementations are constructed with the owner
 * and never accept one per call, so a handler cannot widen scope by accident.
 */
interface AIConfigStore {
    listConnections(): Promise<StoredAIConnection[]>;
    upsertConnection(record: StoredAIConnectionInput): Promise<StoredAIConnection>;
    removeConnection(connectionId: string): Promise<void>;
    replaceModels(connectionId: string, models: StoredAIModel[]): Promise<void>;
    ensureSchema?(): Promise<void>;
}
interface AIConfigStoreScope {
    ownerId: string;
}

/**
 * The narrow slice of the MongoDB driver this store needs. Keeping it structural
 * means the package takes no `mongodb` dependency and works with the official
 * driver, a proxy, or a test double.
 */
interface MongoCollectionLike {
    find(filter?: Record<string, unknown>): {
        toArray(): Promise<unknown[]>;
    };
    findOne(filter: Record<string, unknown>): Promise<unknown | null>;
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: {
        upsert?: boolean;
    }): Promise<unknown>;
    deleteOne(filter: Record<string, unknown>): Promise<unknown>;
    createIndex(spec: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}
interface MongoDatabaseLike {
    collection(name: string): MongoCollectionLike;
}
declare function createMongoAIConfigStore(db: MongoDatabaseLike, ownerId: string, options?: {
    collectionName?: string;
}): AIConfigStore;

interface KeyValueStorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
declare function createLocalStorageAIConfigStore(storage: KeyValueStorageLike, ownerId: string, options?: {
    keyPrefix?: string;
}): AIConfigStore;

interface SupabaseFilterLike extends PromiseLike<{
    data: unknown[] | null;
    error: unknown;
}> {
    eq(column: string, value: unknown): SupabaseFilterLike;
    order(column: string, options?: {
        ascending?: boolean;
    }): Promise<{
        data: unknown[] | null;
        error: unknown;
    }>;
    maybeSingle(): Promise<{
        data: unknown | null;
        error: unknown;
    }>;
}
interface SupabaseTableLike {
    select(columns?: string): SupabaseFilterLike;
    upsert(row: Record<string, unknown>, options?: {
        onConflict?: string;
    }): Promise<{
        error: unknown;
    }>;
    delete(): SupabaseFilterLike;
    update(row: Record<string, unknown>): SupabaseFilterLike;
}
interface SupabaseAIConfigClient {
    from(table: string): SupabaseTableLike;
}
interface SupabaseAIConfigOptions {
    table?: string;
    scopeColumn?: string;
    toRow?: (record: StoredAIConnection) => Record<string, unknown>;
    fromRow?: (row: Record<string, unknown>) => StoredAIConnection;
}
declare const SUPABASE_AI_CONNECTIONS_SQL = "create table if not exists public.ai_connections (\n  owner_id text not null,\n  connection_id text not null,\n  provider_key text not null,\n  base_url text not null default '',\n  api_key_cipher text not null default '',\n  api_key_env text,\n  enabled boolean not null default true,\n  models jsonb not null default '[]'::jsonb,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now(),\n  primary key (owner_id, connection_id)\n);\n-- Runs with the service-role key only. Enable RLS without policies so the\n-- anon/authenticated keys can never read ciphertext directly.";
declare function createSupabaseAIConfigStore(client: SupabaseAIConfigClient, ownerId: string, options?: SupabaseAIConfigOptions): AIConfigStore;

export { AIClient, AIClientError, type AIClientErrorCode, type AIClientOptions, type AIConfigStore, type AIConfigStoreScope, type AIConnectionMode, type AIMessage, type AIProviderFamily, type AIProviderInfo, type AIRole, type AIUsage, AI_PROVIDERS, APP_ID_PREFIX, type AppAIConfigParseResult, type AppAIConnection, type AppAIModel, type CatalogConnection, type CatalogModelEntry, type CatalogSource, type ChatRequest, type ChatResult, type ClientEndpoint, type KeyValueStorageLike, type ModelInfo, type ModelListResult, type MongoCollectionLike, type MongoDatabaseLike, type ProviderAdapter, SUPABASE_AI_CONNECTIONS_SQL, type StoredAIConnection, type StoredAIConnectionInput, type StoredAIModel, type StreamChunk, type SupabaseAIConfigClient, type SupabaseAIConfigOptions, type SupabaseFilterLike, type SupabaseTableLike, anthropicAdapter, appCatalogId, catalogProviderKey, createAIClient, createLocalStorageAIConfigStore, createMongoAIConfigStore, createSupabaseAIConfigStore, decodeMasterKey, endpointHost, findAppConnection, fromBase64, generateMasterKey, isLocalEndpoint, mergeCatalog, normalizeBaseUrl, normalizeStoredConnection, openAICompatibleAdapter, openSecret, parseAppConnections, providerDisplayName, providerIconFor, providerInfo, resolveProviderKey, sealSecret, selectableModels, storedToAppConnection, stripAppCatalogId, toAppCatalogConnection, toBase64 };
