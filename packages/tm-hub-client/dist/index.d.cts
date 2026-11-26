declare const DEFAULT_HUB_PORT = 4000;
declare const DEFAULT_HUB_URL = "http://localhost:4000";
declare const PLATFORM_PORTS: {
    readonly HUB: 4000;
    readonly TRADING: 4001;
    readonly TOOLS: 4002;
    readonly TOOLS_DESKTOP: 3456;
};
interface HubClientOptions {
    /** Base URL of the TM Hub instance. Defaults to 'http://localhost:4000' (DEFAULT_HUB_URL). */
    baseUrl?: string;
    appId: string;
    getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
    onUnauthorized?: () => void;
    fetch?: typeof globalThis.fetch;
    /** Optional: supply a refresh token for automatic 401 retry (non-breaking). */
    getRefreshToken?: () => string | null | undefined | Promise<string | null | undefined>;
    /** Optional: called after a successful silent refresh so the host can persist new tokens. */
    onTokensRefreshed?: (tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }) => void | Promise<void>;
    /**
     * Optional: this app's TM-Hub secret (server only), sent as X-App-Secret.
     * Required by the AI relay, which authenticates the app itself instead of a
     * signed-in user. Never ship this to a browser.
     */
    getAppSecret?: () => string | null | undefined | Promise<string | null | undefined>;
    /**
     * Optional: a per-device credential issued by TM Hub device enrollment
     * (server only). Sent as X-Device-Id + X-Device-Secret and preferred over
     * `getAppSecret`, which a public Electron build must not carry.
     */
    getDeviceCredential?: () => HubDeviceCredential | null | undefined | Promise<HubDeviceCredential | null | undefined>;
}
/** Pair returned by TM Hub device enrollment (`/api/v1/auth/device/token`). */
interface HubDeviceCredential {
    deviceId: string;
    secret: string;
}
/** Device identity kinds — how the device id was created (v2 Device Registry). */
type HubDeviceIdentityKind = 'electron-machine' | 'electron-installation' | 'browser-profile' | 'native-installation';
type HubDeviceType = 'web' | 'mobile' | 'tablet' | 'desktop' | 'tv' | 'wearable' | 'cli' | 'other';
type HubDevicePlatform = 'web' | 'desktop' | 'mobile';
type HubDeviceStatus = 'active' | 'pending' | 'blocked' | 'revoked';
/**
 * Normalized device metadata sent on login (nested `device` object, v2).
 * The SDK never generates or hashes the device id — the host supplies it from
 * Electron Main / browser profile storage.
 */
interface HubDeviceInfo {
    deviceId: string;
    identityKind: HubDeviceIdentityKind;
    deviceType: HubDeviceType;
    platform: HubDevicePlatform;
    deviceName?: string;
    osPlatform?: string;
    arch?: string;
    appVersion?: string;
}
/** A Device Registry record as returned by the Device APIs. Never carries secrets. */
interface HubDeviceView {
    id: string;
    deviceId: string;
    identityKind: HubDeviceIdentityKind;
    deviceType: HubDeviceType;
    platform: string;
    deviceName: string | null;
    osPlatform: string | null;
    arch: string | null;
    appVersion: string | null;
    status: HubDeviceStatus;
    firstSeenAt: string;
    lastSeenAt: string;
    lastIp: string | null;
    isCurrent?: boolean;
}
/**
 * Transient per-device service credential returned once by login when the host
 * requested it (`requestDeviceCredential`). Host/Electron Main must persist it
 * in OS secure storage and must NEVER forward it to a renderer.
 */
interface HubIssuedServiceCredential {
    deviceId: string;
    secret: string;
    expiresAt: string;
    scopes: string[];
}
/** Login input. `device` carries the v2 identity; `requestDeviceCredential` is host-only. */
interface HubLoginInput {
    email: string;
    password: string;
    /** Legacy device type field; still accepted by the Hub. */
    platform?: string;
    /** Legacy top-level device id; still accepted by the Hub. */
    deviceId?: string;
    /** v2 nested device identity. */
    device?: HubDeviceInfo;
    /** Electron Main / server broker only. Web clients must not request a credential. */
    requestDeviceCredential?: boolean;
}
/** Public JWK served by `GET /api/v1/auth/jwks` (RS256 verification). Never has `d`. */
interface HubPublicJwk {
    kty: 'RSA';
    kid: string;
    alg?: string;
    use?: string;
    n: string;
    e: string;
}
interface HubJwksResponse {
    keys: HubPublicJwk[];
}
/** Result of `auth.login()` / `auth.verifyTotp()` — optional deviceCredential is host-only. */
interface HubDeviceAwareAuthResponse extends HubAuthResponse {
    /** Present only when the host requested it and the app policy allows it. */
    deviceCredential?: HubIssuedServiceCredential;
}
type Capability = 'apps.read' | 'apps.create' | 'apps.update' | 'apps.delete' | 'apps.rotateSecret' | 'apps.logs.read' | 'configs.read' | 'configs.write' | 'configs.export' | 'media.read' | 'media.upload' | 'media.delete' | 'media.export' | 'notifications.read' | 'notifications.send' | 'notifications.manage' | 'notifications.export' | 'mail.send' | 'mail.manage' | 'mail.analytics.read' | 'users.read' | 'users.create' | 'users.update' | 'users.delete' | 'users.export' | 'users.import' | 'roles.read' | 'roles.manage' | 'routes.read' | 'routes.manage' | 'permissions.read' | 'permissions.create' | 'permissions.update' | 'permissions.delete' | 'permissions.manage' | 'tenants.read' | 'tenants.manage' | 'platform.apps.manage' | 'platform.crossapp.read' | 'platform.crossapp.write' | 'platform.audit.read' | 'connections.read' | 'connections.write' | 'imports.read' | 'imports.write'
/** @deprecated use `media.upload` */
 | 'media.write'
/** @deprecated use `users.create` / `users.update` / `users.delete` */
 | 'users.manage'
/** @deprecated use `apps.logs.read` */
 | 'logs.read' | '*';
interface HubResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    meta?: unknown;
    nextCursor?: number | string | null;
}
interface HubAuthUser {
    id: string;
    email: string;
    name: string;
    appId: string;
    roles: string[];
    permissions: string[];
    allowedRoutes: string[];
}
interface HubMe {
    userId: string;
    email: string;
    name: string;
    appId: string;
    roles: string[];
    permissions: string[];
    allowedRoutes: string[];
    /** 2FA state (v1.26). */
    totpEnabled?: boolean;
    features?: {
        passkey?: boolean;
        totp?: boolean;
    };
}
interface HubAuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: HubAuthUser;
    /**
     * Set when the account has two-factor authentication enabled:
     * no tokens are issued yet — call `auth.verifyTotp()` with the code.
     */
    totpRequired?: true;
    pendingTotpToken?: string;
}
/** Result of `auth.login()` / `auth.verifyTotp()` — optional deviceCredential is host-only. */
type HubLoginResult = HubDeviceAwareAuthResponse;
interface HubTotpSetupResponse {
    qrDataUrl: string;
}
interface HubTotpVerifyResponse {
    recoveryCodes: string[];
}
interface HubPasskeyInfo {
    id: string;
    /** WebAuthn credential id (base64url) — pass to `auth.passkeyDelete()`. */
    credentialId: string;
    deviceName?: string;
    transports: string[];
    createdAt: string;
    lastUsedAt?: string;
}
interface HubPasskeyRegisterStart {
    challenge: string;
    user: {
        id: string;
        name: string;
        displayName: string;
    };
    rp: {
        id: string;
        name: string;
    };
    pubKeyCredParams: Array<{
        type: 'public-key';
        alg: number;
    }>;
    timeout: number;
    attestation: 'none' | 'indirect' | 'direct';
    authenticatorSelection: {
        authenticatorAttachment?: 'platform' | 'cross-platform';
        residentKey: 'required' | 'preferred' | 'discouraged';
        requireResidentKey?: boolean;
        userVerification: 'required' | 'preferred' | 'discouraged';
    };
}
interface HubPasskeyLoginStart {
    challenge: string;
    allowCredentials: Array<{
        id: string;
        type: 'public-key';
        transports?: string[];
    }>;
    timeout: number;
    userVerification: 'required' | 'preferred' | 'discouraged';
    rpId?: string;
}
interface HubRefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
interface HubProfileUpdate {
    name?: string;
    username?: string | null;
    avatarUrl?: string | null;
}
interface HubPasswordChange {
    currentPassword: string;
    newPassword: string;
}
interface HubForgotPasswordRequest {
    email: string;
    appId?: string;
    redirectUrl?: string;
}
interface HubResetPasswordRequest {
    email: string;
    token: string;
    password: string;
    appId?: string;
}
interface HubSession {
    id: string;
    platform: string;
    userAgent: string;
    lastIp: string;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
}
interface HubRolePermission {
    module: string;
    actions: string[];
}
interface HubRole {
    id: string;
    appId?: string;
    name: string;
    description?: string;
    permissions: HubRolePermission[];
    allowedRoutes: string[];
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}
interface HubSystemRoute {
    id: string;
    appId?: string;
    path: string;
    name: string;
    label: string;
    icon?: string;
    sort: number;
    isVisible: boolean;
    parentId?: string | null;
    isDeleted?: boolean;
    children?: HubSystemRoute[];
}
interface HubRouteListPayload {
    routes: HubSystemRoute[];
    tree: HubSystemRoute[];
}
interface HubMediaSignature {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder?: string;
    preset?: string;
}
interface HubMediaResource {
    public_id: string;
    secure_url?: string;
    url?: string;
    format?: string;
    resource_type?: string;
    width?: number;
    height?: number;
    created_at?: string;
    [key: string]: unknown;
}
interface HubMediaResourcesResponse {
    resources: HubMediaResource[];
    next_cursor?: string;
    [key: string]: unknown;
}
interface HubMediaFolder {
    name: string;
    path: string;
    [key: string]: unknown;
}
interface HubMediaFoldersResponse {
    parent: string | null;
    folders: HubMediaFolder[];
}
interface HubNotification {
    id: string;
    appId?: string;
    userId?: string;
    title?: string;
    body: string;
    icon?: string;
    url?: string;
    isRead?: boolean;
    is_read?: boolean;
    createdAt?: string;
    created_at?: string;
}
interface HubPushSubscription {
    endpoint: string;
    keys?: {
        p256dh: string;
        auth: string;
    };
    deviceType?: string;
    fcmToken?: string;
}
type HubLogMode = 'full' | 'compact' | 'minimal' | 'none' | 'off';
interface HubAuditLog {
    _id: string;
    appId: string;
    docId: string;
    modelName: string;
    action: string;
    source: 'external_app' | 'tm-hub_internal';
    by: {
        _id: string;
        name?: string;
        username?: string;
        email?: string;
        avatar?: string;
    };
    ip?: string;
    userAgent?: string;
    at: number;
    changes?: Record<string, {
        old: unknown;
        new: unknown;
    }>;
    changedFields?: string[];
    summary?: string;
    logMode?: HubLogMode;
}
interface HubApp {
    id: string;
    name: string;
    description?: string;
    tenantId?: string | null;
    type?: 'system' | 'application' | 'service';
    isSystem?: boolean;
    isActive?: boolean;
    isDeletable?: boolean;
    isPinned?: boolean;
    secretKey?: string;
    allowedOrigins?: string[];
    sort?: number;
    configs?: Record<string, string>;
    createdAt?: string;
    updatedAt?: string;
}
interface HubAppsListResponse {
    success: boolean;
    isConfigured: boolean;
    message: string;
    data: HubApp[];
    nextCursor: string | null;
}
interface HubUser {
    id: string;
    appId?: string;
    email: string;
    username?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    role?: string;
    roles?: string[];
    permissions?: string[];
    password?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    platform?: string;
}
interface HubIntrospectResponse {
    valid: boolean;
    reason?: string;
    sub?: string;
    appId?: string;
    email?: string;
    name?: string;
    roles?: string[];
    permissions?: string[];
    allowedRoutes?: string[];
}
interface HubAdminPasswordSetResponse {
    temporaryPassword?: string;
}
interface HubListParams {
    limit?: number;
    cursor?: string | number;
    q?: string;
}
interface HubPermissionItem {
    id: string;
    code: string;
    name: string;
    module: string;
    description?: string | null;
    isSystem?: boolean;
}
interface HubPermissionModuleDef {
    key: string;
    actions: string[];
}
interface HubPermissionCatalogResponse {
    success: boolean;
    readOnly?: boolean;
    data: HubPermissionItem[];
    modules?: HubPermissionModuleDef[];
}
/**
 * Reference docs content served by `GET /api/v1/apps/:appId/docs`.
 * Payload structure lives in tm-hub/shared/docs/content.ts (single source of
 * truth) — typed loosely here so the SDK never needs a release just because
 * the docs content shape grows.
 */
interface HubDocsContent {
    version: number;
    updatedAt: string;
    [key: string]: unknown;
}
interface HubAuthPermissions {
    appId?: string;
    roles: string[];
    permissions: string[];
    allowedRoutes: string[];
}
interface HubResourceListParams extends HubListParams {
    folder?: string;
    max_results?: number;
    next_cursor?: string;
}
type HubConnectionMode = 'manual' | 'oauth';
type HubConnectionStatus = 'connected' | 'error';
interface HubConnectionField {
    key: string;
    label: string;
    type: 'text' | 'password';
    required: boolean;
}
/** Public view of a stored connection — secrets are never included. */
interface HubConnection {
    id: string;
    provider: string;
    mode: HubConnectionMode;
    status: HubConnectionStatus;
    label: string | null;
    config: Record<string, unknown>;
    hasSecrets: boolean;
    expiresAt: string | null;
    connectedBy: string | null;
    lastTestAt: string | null;
    lastTestOk: boolean | null;
    connectedAt: string;
    updatedAt: string;
}
/** Provider definition merged with the app's connection (from GET /connections). */
interface HubConnectionProvider {
    key: string;
    name: string;
    description: string;
    icon: string;
    mode: HubConnectionMode;
    fields?: HubConnectionField[];
    scopes?: string[];
    connection: HubConnection | null;
}
interface HubConnectionTestResult {
    ok: boolean;
    message?: string;
}
interface HubOAuthStartResponse {
    authUrl: string;
}
type HubOAuthProvider = 'google' | 'github' | 'microsoft';
interface HubOAuthProviderInfo {
    key: HubOAuthProvider;
    name: string;
    enabled: boolean;
    scopes: string[];
}
interface HubOAuthProvidersResponse {
    success: boolean;
    data: HubOAuthProviderInfo[];
}
interface HubOAuthLoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: HubAuthUser;
    isNewUser: boolean;
}
interface HubOAuthLinkRequest {
    provider: HubOAuthProvider;
    code: string;
    state: string;
    appId?: string;
}
interface HubOAuthLinkResponse {
    success: boolean;
    data: {
        linked: boolean;
        provider: HubOAuthProvider;
        email: string;
    };
}
type HubImportTargetKey = 'configs' | 'users' | 'routes';
interface HubImportTarget {
    key: HubImportTargetKey;
    identifierField: string;
    requiredFields: string[];
    optionalFields: string[];
}
interface HubImportRowResult {
    index: number;
    ok: boolean;
    action: 'create' | 'update' | null;
    identifier?: string;
    error?: string;
}
interface HubImportRunResult {
    total: number;
    created: number;
    updated: number;
    failed: number;
    results: HubImportRowResult[];
}
interface HubSheetValues {
    range: string;
    values: string[][];
}
type HubImportSource = 'google' | 'csv' | 'paste' | 'json';
type HubImportTargetExtended = 'users' | 'roles' | 'routes' | 'permissions' | 'products' | 'categories' | 'variants' | 'attributes' | 'orders' | 'customers' | 'segments' | 'inventory' | 'warehouses' | 'suppliers' | 'purchase_orders' | 'content' | 'pages' | 'content_categories' | 'custom';
interface HubImportSourceConfig {
    source: HubImportSource;
    google?: {
        spreadsheetId: string;
        range?: string;
        accessToken: string;
    };
    csv?: File;
    paste?: string;
    json?: any[];
}
interface HubImportTargetConfig {
    key: HubImportTargetExtended;
    label: string;
    description: string;
    icon: string;
    model: string;
    identifierField: string;
    localeFields: string[];
    referenceFields: HubImportReferenceField[];
    requiredFields: string[];
    optionalFields: string[];
    localizedFields: string[];
    validationRules: HubImportValidationRule[];
    transformers: HubImportTransformer[];
    sampleHeaders: string[];
    sampleRows: string[][];
}
interface HubImportReferenceField {
    field: string;
    targetModel: string;
    targetField: string;
    lookupField: string;
    isArray: boolean;
    required: boolean;
}
interface HubImportValidationRule {
    field: string;
    required?: boolean;
    type?: 'string' | 'number' | 'email' | 'url' | 'date' | 'boolean';
    pattern?: RegExp;
    min?: number;
    max?: number;
    custom?: (value: any, row: any) => string | null;
}
type HubImportTransformer = {
    type: 'localize';
    fields: string[];
} | {
    type: 'slugify';
    fields: string[];
    sourceField: string;
} | {
    type: 'reference';
    field: string;
    targetModel: string;
    lookupField: string;
} | {
    type: 'parse';
    field: string;
    parser: 'json' | 'csv' | 'attributes';
} | {
    type: 'default';
    field: string;
    value: any;
} | {
    type: 'custom';
    field: string;
    fn: (value: any, row: any) => any;
};
interface HubImportColumn {
    accessorKey: string;
    header: string;
    type: 'text' | 'number' | 'select' | 'badge' | 'localized' | 'reference';
    required?: boolean;
    options?: {
        value: string;
        label: string;
    }[];
    referenceConfig?: {
        model: string;
        displayField: string;
        valueField: string;
    };
}
interface HubImportPreview {
    items: HubImportRow[];
    errors: HubImportError[];
    warnings: HubImportWarning[];
    summary: {
        totalRows: number;
        validRows: number;
        errorCount: number;
        warningCount: number;
        estimatedNew: number;
        estimatedUpdate: number;
    };
}
interface HubImportRow {
    [key: string]: any;
    _rowIndex: number;
    _hasError: boolean;
    _hasWarning: boolean;
    _isNew: boolean;
    _matchedId?: string;
}
interface HubImportError {
    row: number;
    field: string;
    message: string;
    severity: 'error' | 'warning';
    value?: any;
}
interface HubImportWarning {
    row: number;
    field: string;
    message: string;
    value?: any;
}
interface HubImportJob {
    id: string;
    appId: string;
    userId: string;
    target: HubImportTargetExtended;
    source: HubImportSource;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    options: HubImportOptions;
    preview: HubImportPreview;
    stats: {
        total: number;
        created: number;
        updated: number;
        failed: number;
        skipped: number;
    };
    fileUrl?: string;
    errorLog?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
interface HubImportOptions {
    target: HubImportTargetExtended;
    source: HubImportSource;
    locale: string;
    autoFixSlug: boolean;
    skipErrors: boolean;
    dryRun: boolean;
    batchSize: number;
    notifyOnComplete: boolean;
}
interface HubImportTemplate {
    id: string;
    appId: string;
    target: HubImportTargetExtended;
    name: string;
    description?: string;
    columns: HubImportColumn[];
    mappings: Record<string, string>;
    defaultValues: Record<string, any>;
    validationRules: HubImportValidationRule[];
    isSystem: boolean;
    version: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
interface HubImportJobStats {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    rowsProcessed: number;
    durationMs: number;
}
interface HubQueueStats {
    high: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    normal: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    low: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    scheduled: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    dead: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    total: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
}
interface HubImportJobListParams {
    status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
    priority?: 'high' | 'normal' | 'low';
    target?: HubImportTargetExtended;
    page?: number;
    limit?: number;
    from?: Date | string;
    to?: Date | string;
}
interface HubImportJobListItem {
    id: string;
    appId: string;
    userId: string;
    target: HubImportTargetExtended;
    source: HubImportSource;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
    priority: 'high' | 'normal' | 'low';
    attemptsMade: number;
    maxAttempts: number;
    scheduledAt?: Date;
    createdAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedReason?: string;
    stats?: HubImportJobStats;
}
interface HubPaginatedImportJobs {
    data: HubImportJobListItem[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
interface HubImportValidationResult {
    valid: boolean;
    errors: HubImportError[];
    warnings: HubImportWarning[];
}
interface HubImportResult {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    errors: HubImportError[];
    results: Array<{
        index: number;
        ok: boolean;
        action: 'create' | 'update' | null;
        identifier?: string;
        error?: string;
    }>;
}
type HubExportFormat = 'csv' | 'json' | 'xlsx';
type HubExportScope = 'page' | 'selected' | 'filtered' | 'all';
type HubExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
interface HubExportOptions {
    format: HubExportFormat;
    scope: HubExportScope;
    fields?: string[];
    filters?: Record<string, string | number | boolean>;
    sort?: Array<{
        field: string;
        order: 'asc' | 'desc';
    }>;
    dateRange?: {
        from?: string;
        to?: string;
    };
    filename?: string;
    includeHeaders?: boolean;
    encoding?: 'utf-8' | 'utf-16le';
    sheetName?: string;
    ids?: string[];
    limit?: number;
    offset?: number;
}
interface HubExportJob {
    id: string;
    appId: string;
    userId: string;
    module: string;
    status: HubExportJobStatus;
    format: HubExportFormat;
    scope: HubExportScope;
    options: HubExportOptions;
    totalRecords: number;
    processedRecords: number;
    fileUrl?: string;
    fileSize?: number;
    error?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    expiresAt: string;
}
interface HubExportTemplate {
    id: string;
    appId: string;
    module: string;
    name: string;
    description?: string;
    options: HubExportOptions;
    isDefault: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt?: string;
}
interface HubExportJobListParams {
    module?: string;
    mine?: boolean;
    limit?: number;
    offset?: number;
}
type HubMailAddress = string;
type HubMailPriority = 'high' | 'normal' | 'low';
type HubMailTemplateStatus = 'draft' | 'published' | 'archived';
interface HubMailAttachmentInput {
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
}
interface HubMailSendOptions {
    from?: HubMailAddress;
    to: HubMailAddress | HubMailAddress[];
    cc?: HubMailAddress[];
    bcc?: HubMailAddress[];
    replyTo?: HubMailAddress;
    subject: string;
    html?: string;
    text?: string;
    attachments?: HubMailAttachmentInput[];
    headers?: Record<string, string>;
    tags?: string[];
    metadata?: Record<string, string>;
    templateId?: string;
    templateData?: Record<string, unknown>;
}
interface HubMailScheduleOptions extends HubMailSendOptions {
    scheduledAt: string;
    priority?: HubMailPriority;
}
interface HubMailSendResult {
    success?: boolean;
    messageId?: string;
    error?: string;
    provider?: string;
    jobId?: string;
}
interface HubMailProviderInfo {
    type: string;
    name: string;
    enabled?: boolean;
    configured?: boolean;
    [key: string]: unknown;
}
interface HubMailTemplateVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'url';
    required: boolean;
    description?: string;
    default?: unknown;
}
interface HubMailTemplate {
    id: string;
    appId: string;
    key: string;
    name: string;
    subject: string;
    preheader?: string;
    html: string;
    text?: string;
    layoutId?: string;
    variables: Record<string, HubMailTemplateVariable>;
    locale: string;
    status: HubMailTemplateStatus;
    version: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}
interface HubMailTemplateListParams {
    status?: HubMailTemplateStatus;
    locale?: string;
    key?: string;
    page?: number;
    limit?: number;
}
interface HubMailTemplateListResult {
    templates: HubMailTemplate[];
    total: number;
}
interface HubMailTemplateInput {
    key: string;
    name: string;
    subject: string;
    preheader?: string;
    html: string;
    text?: string;
    layoutId?: string;
    variables?: Record<string, HubMailTemplateVariable>;
    locale?: string;
    status?: HubMailTemplateStatus;
}
interface HubMailTemplatePreview {
    html: string;
    text: string;
    variables: Record<string, unknown>;
}
interface HubMailAnalyticsParams {
    from?: string;
    to?: string;
}
interface HubMailAnalyticsSummary {
    totalSent: number;
    totalDelivered: number;
    totalBounced: number;
    totalOpened: number;
    totalClicked: number;
    totalUnsubscribed: number;
    totalComplained: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    complaintRate: number;
    period?: {
        from: string;
        to: string;
    };
}
interface HubMailTimeseriesPoint {
    date: string;
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    complained: number;
}
interface HubMailTopTemplateStats {
    templateId: string;
    templateKey: string;
    sent: number;
    openRate: number;
    clickRate: number;
}
interface HubMailTopDomainStats {
    domain: string;
    sent: number;
    bounced: number;
    openRate: number;
}
interface HubMailEventQuery extends HubMailAnalyticsParams {
    event?: string;
    templateId?: string;
    campaignId?: string;
    recipient?: string;
    tags?: string;
    page?: number;
    limit?: number;
}
interface HubMailAnalyticsEventsResult {
    events?: unknown[];
    pagination?: {
        page: number;
        limit: number;
        total?: number;
    };
    [key: string]: unknown;
}
interface HubMailQueueCounters {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}
interface HubMailQueueStats {
    high: HubMailQueueCounters;
    normal: HubMailQueueCounters;
    low: HubMailQueueCounters;
    scheduled: HubMailQueueCounters;
    dead: HubMailQueueCounters;
    total: HubMailQueueCounters;
}
interface HubMailQueueJob {
    id: string;
    queue: string;
    state: string;
    attempts: number;
    maxAttempts: number;
    timestamp: number | null;
    processedOn: number | null;
    finishedOn: number | null;
    failedReason: string | null;
    summary: string;
}
interface HubMailQueueState {
    enabled: boolean;
    stats: HubMailQueueStats | null;
    jobs: HubMailQueueJob[];
}
type HubMailQueueAction = 'pause' | 'resume' | 'clean' | 'cancel';
interface HubMailQueueQuery {
    start?: number;
    limit?: number;
    status?: string;
}
interface HubMailJobDetail {
    id: string;
    status?: string;
    result?: unknown;
    attemptsMade?: number;
    createdAt?: string;
    processedAt?: string;
    failedReason?: string;
}
interface HubInboxAttachment {
    id: string | null;
    filename: string;
    mimeType: string;
    size: number;
}
interface HubInboxItem {
    id: string;
    threadId: string;
    snippet: string;
    labels: string[];
    subject: string;
    from: string;
    date: string | null;
    unread: boolean;
    starred: boolean;
}
interface HubInboxDetail extends HubInboxItem {
    to: string;
    bodyHtml: string;
    bodyText: string;
    attachments: HubInboxAttachment[];
}
interface HubInboxThread {
    id: string;
    snippet: string;
    messages: HubInboxDetail[];
}
interface HubInboxProfile {
    connected: boolean;
    email: string | null;
    messagesTotal: number;
    threadsTotal: number;
}
interface HubInboxMessagesResult {
    items: HubInboxItem[];
    nextPageToken: string | null;
}
interface HubInboxMessagesQuery {
    q?: string;
    pageToken?: string;
    maxResults?: number;
}
interface HubInboxSendInput {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
}
interface HubInboxLabelsInput {
    addLabelIds?: string[];
    removeLabelIds?: string[];
}
interface HubAiProviderDefinition {
    id: string;
    key: string;
    name: string;
    category: string;
    adapter_type: string;
    base_url_default: string | null;
    capabilities_supported: string[];
    model_discovery_strategy: string | null;
    docs_url: string | null;
    is_builtin: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/** Public AI credential view — secrets never leave the hub. */
interface HubAiConnection {
    id: string;
    provider: string;
    name: string;
    mode: HubConnectionMode;
    status: HubConnectionStatus;
    label: string | null;
    config: Record<string, unknown>;
    hasSecrets: boolean;
    isEnabled: boolean;
    isShared: boolean;
    environment: string | null;
    baseUrlOverride: string | null;
    category: string | null;
    providerDefinitionId: string | null;
    expiresAt: string | null;
    connectedBy: string | null;
    lastTestAt: string | null;
    lastTestOk: boolean | null;
    connectedAt: string;
    updatedAt: string;
}
interface HubAiProviderItem {
    definition: HubAiProviderDefinition;
    connections: HubAiConnection[];
}
interface HubAiModel {
    id: string;
    provider: string;
    connectionId: string | null;
    modelId: string;
    displayName: string | null;
    capabilities: string[];
    isEnabled: boolean;
    source: 'discovered' | 'manual';
    syncedAt: string | null;
}
interface HubAiModelListParams {
    provider?: string;
    connectionId?: string;
    includeDisabled?: boolean;
}
interface HubAiConnectionInput {
    provider: string;
    name?: string;
    values: Record<string, string>;
    environment?: string;
    baseUrlOverride?: string;
    isShared?: boolean;
}
interface HubAiConnectionPatch {
    isEnabled?: boolean;
    isShared?: boolean;
}
interface HubAiDiscoverInput {
    connectionId?: string;
    provider?: string;
    baseUrl?: string;
    apiKey?: string;
    persist?: boolean;
}
interface HubAiDiscoveredModel {
    id: string;
    displayName: string;
}
interface HubAiDiscoverResult {
    baseUrl?: string;
    discovered: number;
    persisted: number;
    models: HubAiDiscoveredModel[];
}
interface HubAiManualModelInput {
    provider: string;
    connectionId?: string | null;
    modelId: string;
    displayName?: string;
    capabilities?: string[];
}
interface HubAiGrant {
    id: string;
    connection_id: string;
    app_id: string;
    is_enabled: boolean;
    granted_by: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Binary payload for a relay turn. `data` is base64 without the `data:` prefix
 * (hub caps one attachment at 8 MB of base64 and 12 MB per turn).
 */
interface HubAiRelayAttachment {
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';
    data: string;
}
interface HubAiRelayMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    /** A vision turn may carry images with an empty caption. */
    attachments?: HubAiRelayAttachment[];
}
interface HubAiRelayChatInput {
    connectionId: string;
    messages: HubAiRelayMessage[];
    /** Omit to use the connection's configured default model. */
    model?: string;
    /** Convenience: prepended as a system message before `messages`. */
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
}
interface HubAiRelayUsage {
    inputTokens?: number;
    outputTokens?: number;
}
interface HubAiRelayChatResult {
    ok: boolean;
    content: string;
    provider: string;
    model: string;
    usage: HubAiRelayUsage | null;
}
interface HubAiRelayCatalogModel {
    modelId: string;
    displayName: string;
}
/** A connection this app may chat through (own row or an enabled grant). */
interface HubAiRelayCatalogConnection {
    connectionId: string;
    provider: string;
    name: string;
    adapterType: string;
    hasKey: boolean;
    model: string | null;
    models: HubAiRelayCatalogModel[];
}
type HubTenantStatus = 'active' | 'suspended' | 'archived';
interface HubTenantDatabaseBinding {
    provider: 'mongodb' | 'external';
    databaseName?: string;
    clusterRef?: string;
    status: 'configured' | 'missing' | 'disabled';
}
interface HubTenant {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    status: HubTenantStatus;
    planCode?: string;
    metadata?: Record<string, unknown>;
    databaseBinding?: HubTenantDatabaseBinding;
    appCount?: number;
    createdAt: string;
    updatedAt: string;
}
interface HubCreateTenantInput {
    tenantId: string;
    name: string;
    slug?: string;
    planCode?: string;
    metadata?: Record<string, unknown>;
    databaseBinding?: HubTenantDatabaseBinding;
}
interface HubUpdateTenantInput {
    name?: string;
    slug?: string;
    status?: HubTenantStatus;
    planCode?: string;
    metadata?: Record<string, unknown>;
    databaseBinding?: HubTenantDatabaseBinding;
}
type HubSiteStatus = 'active' | 'disabled';
interface HubSite {
    id: string;
    tenantId: string;
    siteId: string;
    name: string;
    primaryDomain: string;
    allowedDomains: string[];
    defaultLocale: string;
    locales: string[];
    status: HubSiteStatus;
    publicConfigRevision?: string;
    createdAt: string;
    updatedAt: string;
}
interface HubCreateSiteInput {
    siteId: string;
    name: string;
    primaryDomain: string;
    allowedDomains?: string[];
    defaultLocale?: string;
    locales?: string[];
}
interface HubUpdateSiteInput {
    name?: string;
    primaryDomain?: string;
    allowedDomains?: string[];
    defaultLocale?: string;
    locales?: string[];
    status?: HubSiteStatus;
}
type HubStorageProviderKey = 'cloudflare_r2' | 'aws_s3' | 'supabase_storage' | 'backblaze_b2' | 'filebase' | 'storj' | 's3_compatible' | 'uploadthing';
interface HubStorageCapabilities {
    directUpload: boolean;
    directDownload: boolean;
    multipartUpload: boolean;
    rangeRead: boolean;
    copyObject: boolean;
    listObjects: boolean;
    maxSingleUploadBytes?: number;
    maxObjectBytes?: number;
}
/** Public manifest view — assembled by the Gateway from provider truth + Hub metadata. */
interface HubStorageObjectInfo {
    objectId: string;
    connectionId: string;
    namespace: string;
    relativePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    checksumSha256?: string | null;
    etag?: string | null;
    status: 'pending' | 'ready' | 'deleted' | 'failed';
    createdAt: string;
    updatedAt: string;
}
interface HubStorageUploadGrant {
    uploadId: string;
    objectId: string;
    connectionId: string;
    objectKey: string;
    method: 'PUT' | 'POST';
    uploadUrl: string;
    headers: Record<string, string>;
    expiresAt: string;
    maxBytes: number;
    transferMode: 'single' | 'multipart';
    multipart?: {
        providerUploadId: string;
        partSizeBytes: number;
        parts: Array<{
            partNumber: number;
            uploadUrl: string;
            headers?: Record<string, string>;
        }>;
    };
}
/** Sanitized connection inventory item — never carries config or secrets. */
interface HubStorageConnectionInfo {
    connectionId: string;
    provider: HubStorageProviderKey;
    name: string;
    label: string | null;
    environment: string;
    origin: 'own' | 'granted';
    capabilities: HubStorageCapabilities;
}
/** Logical folder marker. Object stores have no true directories. */
interface HubStorageFolderInfo {
    folderId: string;
    connectionId: string;
    namespace: string;
    relativePath: string;
    createdAt: string;
    updatedAt: string;
}
interface HubStorageDownloadGrant {
    objectId: string;
    downloadUrl: string;
    expiresAt: string;
    contentType: string;
    contentLength: number;
    fileName: string;
}
interface HubStorageInitUploadInput {
    connectionId: string;
    namespace: string;
    relativePath: string;
    fileName?: string;
    contentType?: string;
    sizeBytes: number;
    checksumSha256?: string | null;
    overwrite?: boolean;
    metadata?: Record<string, unknown>;
}
interface HubStorageListObjectsParams {
    connectionId: string;
    namespace?: string;
    prefix?: string;
    cursor?: string | null;
    limit?: number;
}
interface HubStorageListFoldersParams {
    connectionId: string;
    namespace?: string;
    prefix?: string;
    cursor?: string | null;
    limit?: number;
}
interface HubStorageCopyObjectInput {
    relativePath: string;
    namespace?: string;
    fileName?: string;
    overwrite?: boolean;
    metadata?: Record<string, unknown>;
}
interface HubStorageCreateFolderInput {
    connectionId: string;
    namespace: string;
    relativePath: string;
}
interface HubStorageDeleteFolderInput {
    connectionId: string;
    namespace: string;
    relativePath: string;
}
interface HubStorageCompleteUploadResult {
    uploadId: string;
    status: 'ready';
    object: HubStorageObjectInfo | null;
}
interface HubStorageAbortUploadResult {
    uploadId: string;
    status: 'aborted';
}
interface HubStorageDeleteObjectResult {
    objectId: string;
    status: 'deleted';
}
interface HubStorageDeleteFolderResult {
    status: 'deleted';
}
interface HubStorageListObjectsResult {
    objects: HubStorageObjectInfo[];
    nextCursor: string | null;
}
interface HubStorageListFoldersResult {
    folders: HubStorageFolderInfo[];
    nextCursor: string | null;
}

declare class HubClient {
    private baseUrl;
    appId: string;
    private getAccessToken?;
    private onUnauthorized?;
    private customFetch;
    private getRefreshToken?;
    private onTokensRefreshed?;
    private getAppSecret?;
    private getDeviceCredential?;
    private cachedPermissions;
    private refreshInFlight;
    constructor(options: HubClientOptions);
    /**
     * Server-to-server calls (AI relay, Storage Gateway) identify the app, not a
     * user. A device credential wins over the shared App Secret: it is issued per
     * installation, scoped, expiring and revocable, and it is the only identity a
     * public Electron build can hold. Failing with a precise message beats a bare
     * 401 from the hub.
     */
    private appCredentialHeaders;
    request<T = unknown>(path: string, options?: RequestInit & {
        params?: Record<string, any>;
        _retry?: boolean;
    }): Promise<T>;
    private tryRefreshTokens;
    private rememberPermissions;
    /** Manually seed/cache current user's permission codes (dot format). */
    setPermissions(permissions: string[]): void;
    /** Current cached permission codes (null = not loaded yet). */
    getPermissions(): string[] | null;
    readonly auth: {
        login: (credentials: HubLoginInput) => Promise<HubResponse<HubDeviceAwareAuthResponse>>;
        register: (data: {
            email: string;
            password: string;
            name?: string;
            platform?: string;
        }) => Promise<HubResponse<HubAuthResponse>>;
        me: () => Promise<HubResponse<HubAuthUser>>;
        permissions: () => Promise<HubResponse<HubAuthPermissions>>;
        updateProfile: (updates: HubProfileUpdate) => Promise<HubResponse<{
            name?: string;
            username?: string | null;
            avatarUrl?: string | null;
        }>>;
        changePassword: (data: HubPasswordChange) => Promise<HubResponse<void>>;
        forgotPassword: (data: HubForgotPasswordRequest) => Promise<HubResponse<void>>;
        resetPassword: (data: HubResetPasswordRequest) => Promise<HubResponse<void>>;
        refresh: (refreshToken: string) => Promise<HubResponse<HubRefreshResponse>>;
        logout: (refreshToken?: string) => Promise<HubResponse<void>>;
        getRoutes: (params?: {
            appId?: string;
        }) => Promise<HubResponse<HubSystemRoute[]>>;
        listSessions: () => Promise<HubResponse<HubSession[]>>;
        revokeSessions: (options?: {
            ids?: string | string[];
            all?: boolean;
        }) => Promise<HubResponse<void>>;
        /** Validate a token without being the token holder (for external services). */
        introspect: (token: string) => Promise<HubResponse<HubIntrospectResponse>>;
        /**
         * Complete login after `auth.login()` returned `totpRequired`.
         * Pass the 6-digit TOTP code (or an unused recovery code).
         */
        verifyTotp: (pendingTotpToken: string, code: string) => Promise<HubResponse<HubAuthResponse>>;
        /** Start 2FA setup — returns an otpauth QR code data URL (scan in an authenticator app). */
        totpSetup: () => Promise<HubResponse<HubTotpSetupResponse>>;
        /** Confirm setup with a code — returns one-time recovery codes. */
        totpVerify: (code: string) => Promise<HubResponse<HubTotpVerifyResponse>>;
        /** Disable 2FA — requires a valid code or an unused recovery code. */
        totpDisable: (code: string) => Promise<HubResponse<void>>;
        /** List the current user's registered passkeys. */
        passkeyList: () => Promise<HubResponse<HubPasskeyInfo[]>>;
        /** WebAuthn registration step 1 — creation options for `navigator.credentials.create()`. */
        passkeyRegisterStart: (username: string, displayName?: string) => Promise<HubResponse<HubPasskeyRegisterStart>>;
        /** WebAuthn registration step 2 — submit the PublicKeyCredential (JSON form). */
        passkeyRegisterFinish: (credential: unknown) => Promise<HubResponse<HubPasskeyInfo>>;
        /** Remove a passkey by its credential id. */
        passkeyDelete: (credentialId: string) => Promise<HubResponse<void>>;
        /** WebAuthn login step 1 — assertion options for `navigator.credentials.get()` (no auth required). */
        passkeyLoginStart: () => Promise<HubResponse<HubPasskeyLoginStart>>;
        /** WebAuthn login step 2 — submit the assertion (JSON form); issues tokens on success. */
        passkeyLoginFinish: (credential: unknown) => Promise<HubResponse<HubAuthResponse>>;
        /** List enabled OAuth providers for an app. */
        oauthProviders: (appId?: string) => Promise<HubOAuthProvidersResponse>;
        /** Start OAuth flow — returns authUrl to open in popup. */
        oauthStart: (provider: HubOAuthProvider, appId?: string) => Promise<HubResponse<HubOAuthStartResponse>>;
        /** Link OAuth account to current user (requires auth). */
        oauthLink: (provider: HubOAuthProvider, code: string, state: string, appId?: string) => Promise<HubResponse<HubOAuthLinkResponse>>;
        /**
         * Fetch the Hub's public JWKS so a satellite can verify RS256 access
         * tokens by `kid`. This only fetches keys — it does not verify tokens.
         */
        jwks: () => Promise<HubJwksResponse>;
        devices: {
            /** List the caller's registered devices in the current app. */
            list: (params?: {
                currentDeviceId?: string;
            }) => Promise<HubResponse<HubDeviceView[]>>;
            /** Read one of the caller's devices. */
            get: (deviceId: string) => Promise<HubResponse<HubDeviceView>>;
            /** Rename one of the caller's devices (display metadata only). */
            update: (deviceId: string, patch: {
                deviceName: string;
            }) => Promise<HubResponse<HubDeviceView>>;
            /** Revoke one of the caller's devices (revokes its sessions + service credential). */
            revoke: (deviceId: string) => Promise<HubResponse<{
                id: string;
            }>>;
        };
        adminDevices: {
            list: (appId: string, userId: string) => Promise<HubResponse<HubDeviceView[]>>;
            update: (appId: string, userId: string, deviceId: string, patch: {
                action: "approve" | "block" | "unblock" | "revoke";
                deviceName?: string;
            }) => Promise<HubResponse<HubDeviceView>>;
            revoke: (appId: string, userId: string, deviceId: string) => Promise<HubResponse<{
                id: string;
            }>>;
        };
    };
    readonly apps: {
        list: (params?: HubListParams & {
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            active?: "true" | "false";
        }) => Promise<HubAppsListResponse>;
        get: (appId: string) => Promise<HubResponse<HubApp>>;
        create: (app: Partial<HubApp> & {
            id: string;
            name: string;
        }) => Promise<HubResponse<HubApp>>;
        update: (appId: string, app: Partial<HubApp>) => Promise<HubResponse<HubApp>>;
        delete: (ids: string | string[]) => Promise<HubResponse<{
            success: boolean;
            deletedCount: number;
        }>>;
        reorder: (orderedIds: string[]) => Promise<HubResponse<void>>;
        rotateSecret: (appId: string) => Promise<HubResponse<{
            id: string;
            secretKey: string;
        }>>;
    };
    readonly tenants: {
        /** List all tenants. Requires tenants.read or root. */
        list: (params?: {
            status?: string;
            search?: string;
        }) => Promise<HubResponse<HubTenant[]>>;
        /** Get tenant details by tenantId. */
        get: (tenantId: string) => Promise<HubResponse<HubTenant>>;
        /** Create a new tenant. Requires tenants.manage or root. */
        create: (data: HubCreateTenantInput) => Promise<HubResponse<HubTenant>>;
        /** Update tenant properties or status. */
        update: (tenantId: string, data: HubUpdateTenantInput) => Promise<HubResponse<HubTenant>>;
        /** Delete a tenant. Requires tenants.manage or root. */
        delete: (tenantId: string) => Promise<HubResponse<void>>;
        /** Get apps assigned to this tenant. */
        getApps: (tenantId: string) => Promise<HubResponse<HubApp[]>>;
        /** List sites under a tenant. */
        listSites: (tenantId: string) => Promise<HubResponse<HubSite[]>>;
        /** Create a new site under a tenant. */
        createSite: (tenantId: string, data: HubCreateSiteInput) => Promise<HubResponse<HubSite>>;
        /** Update a site configuration. */
        updateSite: (tenantId: string, siteId: string, data: HubUpdateSiteInput) => Promise<HubResponse<HubSite>>;
        /** Delete a site under a tenant. */
        deleteSite: (tenantId: string, siteId: string) => Promise<HubResponse<void>>;
    };
    readonly configs: {
        getPublic: (appId?: string) => Promise<HubResponse<Record<string, string>>>;
        getPublicForApp: (appId: string) => Promise<HubResponse<Record<string, string>>>;
        getAll: (params?: HubListParams) => Promise<HubResponse<Record<string, string>>>;
        update: (configs: Record<string, any>) => Promise<HubResponse<void>>;
    };
    readonly media: {
        getSignature: (params?: Record<string, unknown>) => Promise<HubResponse<HubMediaSignature>>;
        getResources: (params?: HubResourceListParams) => Promise<HubResponse<HubMediaResourcesResponse> & {
            resources?: HubMediaResourcesResponse["resources"];
            nextCursor?: string | null;
        }>;
        deleteResources: (publicIds: string[]) => Promise<HubResponse<{
            deleted?: Record<string, string>;
        }>>;
        getFolders: (folder?: string) => Promise<HubResponse<HubMediaFoldersResponse>>;
        createFolder: (name: string, parent?: string) => Promise<HubResponse<unknown>>;
        deleteFolder: (folder: string) => Promise<HubResponse<unknown>>;
        renameResource: (from: string, to: string) => Promise<HubResponse<unknown> & {
            message?: string;
        }>;
    };
    readonly notifications: {
        list: (params?: HubListParams) => Promise<HubResponse<HubNotification[]>>;
        markRead: (notifyId: string) => Promise<HubResponse<void>>;
        markReadAll: () => Promise<HubResponse<void>>;
        delete: (ids: string | string[]) => Promise<HubResponse<void>>;
        subscribePush: (subscription: HubPushSubscription) => Promise<HubResponse<unknown>>;
        unsubscribePush: (endpoint: string) => Promise<HubResponse<void>>;
        send: (payload: {
            title: string;
            body: string;
            userId?: string;
            url?: string;
            icon?: string;
        }) => Promise<HubResponse<void> & {
            sentCount?: number;
        }>;
    };
    readonly users: {
        list: (params?: HubListParams) => Promise<HubResponse<HubUser[]>>;
        create: (user: Partial<HubUser> & {
            email?: string;
            password?: string;
        }) => Promise<HubResponse<HubUser>>;
        update: (id: string, user: Partial<HubUser> & {
            role?: string;
            isActive?: boolean;
        }) => Promise<HubResponse<void>>;
        delete: (ids: string | string[]) => Promise<HubResponse<void>>;
        /** Admin: set/reset a user's password (no current password required). */
        adminSetPassword: (userId: string, password: string, appId?: string) => Promise<HubResponse<HubAdminPasswordSetResponse>>;
        /** Admin: generate a temporary password for a user. */
        adminResetPassword: (userId: string, appId?: string) => Promise<HubResponse<HubAdminPasswordSetResponse>>;
        /** Admin: list all sessions for a specific user. */
        getSessions: (userId: string, params?: HubListParams, appId?: string) => Promise<HubResponse<HubSession[]>>;
        /** Admin: revoke a specific session of a user. */
        revokeSession: (userId: string, sessionId: string, appId?: string) => Promise<HubResponse<void>>;
    };
    readonly roles: {
        list: (params?: HubListParams) => Promise<HubResponse<HubRole[]>>;
        create: (role: Partial<HubRole> & {
            name: string;
        }) => Promise<HubResponse<HubRole>>;
        update: (role: Partial<HubRole> & {
            id: string;
        }) => Promise<HubResponse<HubRole>>;
        delete: (ids: string | string[]) => Promise<HubResponse<void>>;
    };
    readonly routes: {
        list: (params?: HubListParams) => Promise<{
            data: HubSystemRoute[];
            routes: HubSystemRoute[] | undefined;
            tree: HubSystemRoute[] | undefined;
            success: boolean;
            message?: string;
            error?: string;
            meta?: unknown;
            nextCursor?: number | string | null;
        }>;
        create: (route: Partial<HubSystemRoute> & {
            id: string;
            path: string;
            name: string;
        }) => Promise<HubResponse<HubSystemRoute>>;
        update: (route: Partial<HubSystemRoute> & {
            id: string;
        }) => Promise<HubResponse<HubSystemRoute>>;
        delete: (ids: string | string[]) => Promise<HubResponse<void>>;
    };
    readonly logs: {
        list: (params?: {
            limit?: number;
            cursor?: number;
        }) => Promise<HubResponse<HubAuditLog[]>>;
    };
    readonly auditLogs: {
        list: (params?: {
            limit?: number;
            cursor?: number;
        }) => Promise<HubResponse<HubAuditLog[]>>;
    };
    readonly permissions: {
        catalog: (appId?: string) => Promise<HubPermissionCatalogResponse>;
        list: (appId?: string) => Promise<HubPermissionCatalogResponse>;
    };
    readonly docs: {
        /** Get the localized reference docs content for an app (requires a user JWT). */
        get: (appId?: string) => Promise<HubResponse<HubDocsContent>>;
    };
    readonly ai: {
        /** Provider definitions merged with this app's usable connections. */
        providers: (appId?: string) => Promise<HubResponse<HubAiProviderItem[]>>;
        /** Discover the live model catalogue; `persist` defaults to true with a connectionId. */
        discover: (input: HubAiDiscoverInput, appId?: string) => Promise<HubResponse<HubAiDiscoverResult>>;
        connections: {
            /** Add or rotate one credential; `name` allows many accounts per provider. */
            saveManual: (input: HubAiConnectionInput, appId?: string) => Promise<HubResponse<HubAiConnection>>;
            update: (connectionId: string, patch: HubAiConnectionPatch, appId?: string) => Promise<HubResponse<HubAiConnection>>;
            delete: (connectionId: string, appId?: string) => Promise<HubResponse<{
                id: string;
                deleted: boolean;
            }>>;
            /** Health test; `name` selects the credential row (default: 'default'). */
            test: (provider: string, name?: string, appId?: string) => Promise<HubResponse<HubConnectionTestResult>>;
        };
        models: {
            list: (params?: HubAiModelListParams, appId?: string) => Promise<HubResponse<HubAiModel[]>>;
            add: (input: HubAiManualModelInput, appId?: string) => Promise<HubResponse<HubAiModel>>;
            setEnabled: (modelId: string, isEnabled: boolean, appId?: string) => Promise<HubResponse<{
                id: string;
                isEnabled: boolean;
            }>>;
            delete: (modelId: string, appId?: string) => Promise<HubResponse<{
                id: string;
                deleted: boolean;
            }>>;
        };
        /**
         * Server-to-server relay: the app authenticates with its own device
         * credential (X-Device-Id/X-Device-Secret) or App Secret (X-App-Secret),
         * never with provider keys, so provider credentials stay in the hub. Every
         * method throws if neither credential getter was supplied.
         */
        relay: {
            /** Connections (own rows + enabled grants) and their enabled models. */
            catalog: (appId?: string) => Promise<HubResponse<{
                connections: HubAiRelayCatalogConnection[];
            }>>;
            /**
             * One chat turn through a connection. `systemPrompt` is sugar: the hub
             * only understands `messages`, so it is prepended as a system message
             * here. Attachments carry base64 `data`, never a `data:` URL.
             */
            chat: (input: HubAiRelayChatInput, appId?: string) => Promise<HubResponse<HubAiRelayChatResult>>;
        };
        grants: {
            list: (appId?: string) => Promise<HubResponse<HubAiGrant[]>>;
            add: (connectionId: string, targetAppId: string, appId?: string) => Promise<HubResponse<{
                connectionId: string;
                appId: string;
            }>>;
            revoke: (connectionId: string, targetAppId: string, appId?: string) => Promise<HubResponse<{
                connectionId: string;
                appId: string;
                revoked: boolean;
            }>>;
        };
    };
    readonly connections: {
        /** Provider definitions merged with this app's connection status (secrets never returned). */
        list: (appId?: string) => Promise<HubResponse<HubConnectionProvider[]>>;
        /** Manual credentials connect (e.g. Cloudinary) — secrets are encrypted server-side. */
        saveManual: (provider: string, values: Record<string, string>, appId?: string) => Promise<HubResponse<{
            connection: HubConnectionProvider["connection"];
            test: HubConnectionTestResult;
        }>>;
        /**
         * Quick connect: no credentials sent — the server reads this app's configs
         * (app_configs, managed on the Configs page), verifies them live and stores
         * the connection row. Currently supported by providers flagged `quick` (cloudinary).
         */
        quick: (provider: string, appId?: string) => Promise<HubResponse<{
            connection: HubConnectionProvider["connection"];
            test: HubConnectionTestResult;
        }>>;
        /** Test a stored connection (updates last_test_* server-side). */
        test: (provider: string, appId?: string) => Promise<HubResponse<HubConnectionTestResult>>;
        /** Disconnect + delete stored credentials. */
        disconnect: (provider: string, appId?: string) => Promise<HubResponse<void>>;
        /**
         * OAuth start: returns the provider consent URL (state carries app_id).
         * Open it in a popup/window; the fixed callback posts
         * `{ type: 'tm-hub-oauth', status }` back to the opener.
         */
        oauthStart: (provider: string, appId?: string) => Promise<HubResponse<HubOAuthStartResponse>>;
    };
    /**
     * App-authenticated object storage. Every method sends the device credential
     * (X-Device-Id/X-Device-Secret) when `getDeviceCredential` is supplied, else
     * X-App-Secret, and throws when neither is configured. Provider credentials
     * never leave the hub; callers receive only short-lived, object-scoped
     * upload/download grants. Treat signed URLs as bearer secrets: never log them
     * or persist them client-side. Objects are addressed by `objectId`; the
     * internal provider key is not public.
     */
    readonly storage: {
        /** Sanitized connections this app may use (own rows + enabled grants) with capabilities. */
        connections: (appId?: string) => Promise<HubResponse<{
            connections: HubStorageConnectionInfo[];
        }>>;
        /** Initiate a single-part upload; returns a short-lived object-scoped grant. */
        initUpload: (input: HubStorageInitUploadInput, appId?: string) => Promise<HubResponse<HubStorageUploadGrant>>;
        /** Verify the uploaded object via independent server-side HEAD, then mark ready. */
        completeUpload: (uploadId: string, appId?: string) => Promise<HubResponse<HubStorageCompleteUploadResult>>;
        /** Abort an upload and clean up partial provider state where possible. */
        abortUpload: (uploadId: string, appId?: string) => Promise<HubResponse<HubStorageAbortUploadResult>>;
        /** Short-lived, object-scoped download grant. Never an arbitrary bucket/key. */
        createDownloadGrant: (objectId: string, appId?: string) => Promise<HubResponse<HubStorageDownloadGrant>>;
        /** Stat a single object's manifest metadata. */
        getObject: (objectId: string, appId?: string) => Promise<HubResponse<{
            object: HubStorageObjectInfo;
        }>>;
        /** Bounded cursor pagination over the app's object manifest; metadata only. */
        listObjects: (params: HubStorageListObjectsParams, appId?: string) => Promise<HubResponse<HubStorageListObjectsResult>>;
        /** Logical folder markers, bounded cursor pagination. */
        listFolders: (params: HubStorageListFoldersParams, appId?: string) => Promise<HubResponse<HubStorageListFoldersResult>>;
        /** Delete an object at the provider, then mark the manifest row deleted. */
        deleteObject: (objectId: string, appId?: string) => Promise<HubResponse<HubStorageDeleteObjectResult>>;
        /** Provider-side copy to a new Hub-generated key (never a SQL-only rename). */
        copyObject: (objectId: string, input: HubStorageCopyObjectInput, appId?: string) => Promise<HubResponse<{
            object: HubStorageObjectInfo;
        }>>;
        /** Create an explicit folder marker so empty folders persist. */
        createFolder: (input: HubStorageCreateFolderInput, appId?: string) => Promise<HubResponse<{
            folder: HubStorageFolderInfo;
        }>>;
        /** Soft-delete a folder marker. */
        deleteFolder: (input: HubStorageDeleteFolderInput, appId?: string) => Promise<HubResponse<HubStorageDeleteFolderResult>>;
    };
    readonly imports: {
        /** Target definitions (identifier + required/optional fields). */
        targets: (appId?: string) => Promise<HubResponse<HubImportTarget[]>>;
        /** Get target config with full schema (fields, validation, transformers, samples). */
        target: (target: HubImportTargetExtended, appId?: string) => Promise<HubResponse<HubImportTargetConfig>>;
        /** Dry-run: validate rows and detect create/update per row. */
        preview: (target: HubImportTargetExtended, rows: HubImportRow[], appId?: string) => Promise<HubResponse<HubImportRowResult[]>>;
        /** Preview with full source config and options (supports google, csv, paste, json). */
        previewWithConfig: (target: HubImportTargetExtended, source: HubImportSource, rows: HubImportRow[], sourceConfig?: HubImportSourceConfig, options?: Partial<HubImportOptions>, appId?: string) => Promise<HubResponse<{
            validation: HubImportValidationResult;
            preview: HubImportPreview;
        }>>;
        /** Apply rows (upsert, per-row error isolation). */
        run: (target: HubImportTargetExtended, rows: HubImportRow[], appId?: string) => Promise<HubResponse<HubImportRunResult>>;
        /** Execute import with full options, preview, and source config (sync). */
        execute: (target: HubImportTargetExtended, source: HubImportSource, rows: HubImportRow[], sourceConfig?: HubImportSourceConfig, options?: Partial<HubImportOptions>, preview?: HubImportPreview, appId?: string) => Promise<HubResponse<HubImportResult>>;
        /** Schedule an import job (async, queued). */
        schedule: (target: HubImportTargetExtended, source: HubImportSource, sourceConfig: HubImportSourceConfig, options?: Partial<HubImportOptions>, priority?: "high" | "normal" | "low", scheduledAt?: Date, maxAttempts?: number, appId?: string) => Promise<HubResponse<{
            jobId: string;
            status: string;
        }>>;
        /** List import jobs with pagination and filters. */
        listJobs: (params?: HubImportJobListParams, appId?: string) => Promise<HubResponse<HubImportJobListItem[]> & {
            meta?: HubPaginatedImportJobs["meta"];
        }>;
        /** Get import job detail. */
        getJob: (jobId: string, appId?: string) => Promise<HubResponse<HubImportJob>>;
        /** Cancel a pending/running import job. */
        cancel: (jobId: string, appId?: string) => Promise<HubResponse<{
            removed: boolean;
        }>>;
        /** Get queue statistics. */
        getStats: (appId?: string) => Promise<HubResponse<HubQueueStats>>;
        /** Download error log for a job. */
        getJobLog: (jobId: string, appId?: string) => Promise<HubResponse<string>>;
        /** Read a Google Sheet server-side — the access token never leaves tm-hub. */
        fetchSheet: (spreadsheetId: string, range: string, appId?: string) => Promise<HubResponse<HubSheetValues>>;
        /** Import Templates */
        templates: {
            /** List import templates. */
            list: (target?: HubImportTargetExtended, isSystem?: boolean, page?: number, limit?: number, appId?: string) => Promise<HubResponse<HubImportTemplate[]> & {
                meta?: HubPaginatedImportJobs["meta"];
            }>;
            /** Create a new import template. */
            create: (target: HubImportTargetExtended, name: string, columns: HubImportColumn[], description?: string, mappings?: Record<string, string>, defaultValues?: Record<string, any>, validationRules?: HubImportValidationRule[], isSystem?: boolean, appId?: string) => Promise<HubResponse<HubImportTemplate>>;
            /** Get a template by ID. */
            get: (templateId: string, appId?: string) => Promise<HubResponse<HubImportTemplate>>;
            /** Update a template. */
            update: (templateId: string, data: Partial<Pick<HubImportTemplate, "name" | "description" | "columns" | "mappings" | "defaultValues" | "validationRules">>, appId?: string) => Promise<HubResponse<HubImportTemplate>>;
            /** Delete a template. */
            delete: (templateId: string, appId?: string) => Promise<HubResponse<{
                message: string;
            }>>;
            /** Download a template as CSV. */
            download: (templateId: string, format?: "csv" | "json", appId?: string) => Promise<HubResponse<string>>;
        };
    };
    readonly export: {
        /** Start an export job — job runs inline and is returned completed/failed. */
        start: (module: string, options: HubExportOptions) => Promise<HubResponse<HubExportJob>>;
        /** List export jobs (modules filtered server-side by capability; `mine` scopes to current user). */
        jobs: (params?: HubExportJobListParams) => Promise<HubResponse<HubExportJob[]>>;
        job: (jobId: string) => Promise<HubResponse<HubExportJob>>;
        deleteJob: (jobId: string) => Promise<HubResponse<{
            id: string;
            deleted: boolean;
        }>>;
        /** Direct download URL — caller must attach Authorization header. */
        downloadUrl: (jobId: string) => string;
        /** Download exported file as Blob (auto refresh token on 401). */
        download: (jobId: string) => Promise<Blob>;
        templates: (module?: string) => Promise<HubResponse<HubExportTemplate[]>>;
        createTemplate: (data: {
            module: string;
            name: string;
            description?: string;
            options: HubExportOptions;
            isDefault?: boolean;
        }) => Promise<HubResponse<HubExportTemplate>>;
        updateTemplate: (templateId: string, data: {
            name?: string;
            description?: string;
            options?: HubExportOptions;
            isDefault?: boolean;
        }) => Promise<HubResponse<HubExportTemplate>>;
        deleteTemplate: (templateId: string) => Promise<HubResponse<{
            id: string;
            deleted: boolean;
        }>>;
    };
    readonly mail: {
        providers: () => Promise<HubResponse<HubMailProviderInfo[]>>;
        send: (data: HubMailSendOptions) => Promise<HubResponse<HubMailSendResult>>;
        schedule: (data: HubMailScheduleOptions) => Promise<HubResponse<HubMailSendResult & {
            jobId?: string;
        }>>;
        test: (to: string) => Promise<HubResponse<{
            messageId?: string;
            provider?: string;
        }>>;
        stats: () => Promise<HubResponse<unknown>>;
        templates: {
            list: (params?: HubMailTemplateListParams) => Promise<HubResponse<HubMailTemplate[]> & {
                pagination?: {
                    page: number;
                    limit: number;
                    total: number;
                };
            }>;
            get: (templateId: string) => Promise<HubResponse<HubMailTemplate>>;
            byKey: (key: string, locale?: string) => Promise<HubResponse<HubMailTemplate>>;
            create: (data: HubMailTemplateInput) => Promise<HubResponse<HubMailTemplate>>;
            update: (templateId: string, data: Partial<HubMailTemplateInput>) => Promise<HubResponse<HubMailTemplate>>;
            delete: (templateId: string) => Promise<HubResponse<unknown>>;
            archive: (templateId: string) => Promise<HubResponse<HubMailTemplate>>;
            clone: (templateId: string) => Promise<HubResponse<HubMailTemplate>>;
            publish: (templateId: string) => Promise<HubResponse<HubMailTemplate>>;
            preview: (templateId: string, variables?: Record<string, unknown>) => Promise<HubResponse<HubMailTemplatePreview>>;
        };
        analytics: {
            summary: (params?: HubMailAnalyticsParams) => Promise<HubResponse<HubMailAnalyticsSummary>>;
            timeseries: (params?: HubMailAnalyticsParams & {
                granularity?: "hour" | "day" | "week" | "month";
            }) => Promise<HubResponse<HubMailTimeseriesPoint[]>>;
            campaigns: (params?: HubMailAnalyticsParams) => Promise<HubResponse<unknown>>;
            events: (params?: HubMailEventQuery) => Promise<HubResponse<HubMailAnalyticsEventsResult>>;
            topDomains: (params?: HubMailAnalyticsParams & {
                limit?: number;
            }) => Promise<HubResponse<HubMailTopDomainStats[]>>;
            topTemplates: (params?: HubMailAnalyticsParams & {
                limit?: number;
            }) => Promise<HubResponse<HubMailTopTemplateStats[]>>;
            exportCsvUrl: (params?: HubMailAnalyticsParams) => string;
        };
        inbox: {
            profile: () => Promise<HubResponse<HubInboxProfile>>;
            messages: (params?: HubInboxMessagesQuery) => Promise<HubResponse<HubInboxMessagesResult>>;
            message: (messageId: string) => Promise<HubResponse<HubInboxDetail>>;
            thread: (threadId: string) => Promise<HubResponse<HubInboxThread>>;
            send: (data: HubInboxSendInput) => Promise<HubResponse<HubInboxItem>>;
            setLabels: (messageId: string, data: HubInboxLabelsInput) => Promise<HubResponse<HubInboxItem>>;
            attachmentUrl: (messageId: string, attachmentId: string) => string;
        };
        queue: {
            get: (params?: HubMailQueueQuery) => Promise<HubResponse<HubMailQueueState>>;
            action: (action: HubMailQueueAction, jobId?: string) => Promise<HubResponse<{
                action: string;
            }>>;
        };
        jobs: {
            get: (jobId: string) => Promise<HubResponse<HubMailJobDetail>>;
            delete: (jobId: string) => Promise<HubResponse<{
                success: boolean;
            }>>;
        };
    };
    readonly capabilities: {
        has: (capability: Capability) => boolean;
        canAccessApp: (targetAppId: string) => boolean;
        /** Load permissions from /auth/permissions and cache them. */
        load: () => Promise<boolean>;
    };
}
declare function createHubClient(options: HubClientOptions): HubClient;

export { type Capability, DEFAULT_HUB_PORT, DEFAULT_HUB_URL, type HubAdminPasswordSetResponse, type HubAiConnection, type HubAiConnectionInput, type HubAiConnectionPatch, type HubAiDiscoverInput, type HubAiDiscoverResult, type HubAiDiscoveredModel, type HubAiGrant, type HubAiManualModelInput, type HubAiModel, type HubAiModelListParams, type HubAiProviderDefinition, type HubAiProviderItem, type HubAiRelayAttachment, type HubAiRelayCatalogConnection, type HubAiRelayCatalogModel, type HubAiRelayChatInput, type HubAiRelayChatResult, type HubAiRelayMessage, type HubAiRelayUsage, type HubApp, type HubAppsListResponse, type HubAuditLog, type HubAuthPermissions, type HubAuthResponse, type HubAuthUser, HubClient, type HubClientOptions, type HubConnection, type HubConnectionField, type HubConnectionMode, type HubConnectionProvider, type HubConnectionStatus, type HubConnectionTestResult, type HubCreateSiteInput, type HubCreateTenantInput, type HubDeviceAwareAuthResponse, type HubDeviceCredential, type HubDeviceIdentityKind, type HubDeviceInfo, type HubDevicePlatform, type HubDeviceStatus, type HubDeviceType, type HubDeviceView, type HubDocsContent, type HubExportFormat, type HubExportJob, type HubExportJobListParams, type HubExportJobStatus, type HubExportOptions, type HubExportScope, type HubExportTemplate, type HubForgotPasswordRequest, type HubImportColumn, type HubImportError, type HubImportJob, type HubImportJobListItem, type HubImportJobListParams, type HubImportJobStats, type HubImportOptions, type HubImportPreview, type HubImportReferenceField, type HubImportResult, type HubImportRow, type HubImportRowResult, type HubImportRunResult, type HubImportSource, type HubImportSourceConfig, type HubImportTarget, type HubImportTargetConfig, type HubImportTargetExtended, type HubImportTargetKey, type HubImportTemplate, type HubImportTransformer, type HubImportValidationResult, type HubImportValidationRule, type HubImportWarning, type HubInboxAttachment, type HubInboxDetail, type HubInboxItem, type HubInboxLabelsInput, type HubInboxMessagesQuery, type HubInboxMessagesResult, type HubInboxProfile, type HubInboxSendInput, type HubInboxThread, type HubIntrospectResponse, type HubIssuedServiceCredential, type HubJwksResponse, type HubListParams, type HubLogMode, type HubLoginInput, type HubLoginResult, type HubMailAddress, type HubMailAnalyticsEventsResult, type HubMailAnalyticsParams, type HubMailAnalyticsSummary, type HubMailAttachmentInput, type HubMailEventQuery, type HubMailJobDetail, type HubMailPriority, type HubMailProviderInfo, type HubMailQueueAction, type HubMailQueueCounters, type HubMailQueueJob, type HubMailQueueQuery, type HubMailQueueState, type HubMailQueueStats, type HubMailScheduleOptions, type HubMailSendOptions, type HubMailSendResult, type HubMailTemplate, type HubMailTemplateInput, type HubMailTemplateListParams, type HubMailTemplateListResult, type HubMailTemplatePreview, type HubMailTemplateStatus, type HubMailTemplateVariable, type HubMailTimeseriesPoint, type HubMailTopDomainStats, type HubMailTopTemplateStats, type HubMe, type HubMediaFolder, type HubMediaFoldersResponse, type HubMediaResource, type HubMediaResourcesResponse, type HubMediaSignature, type HubNotification, type HubOAuthLinkRequest, type HubOAuthLinkResponse, type HubOAuthLoginResponse, type HubOAuthProvider, type HubOAuthProviderInfo, type HubOAuthProvidersResponse, type HubOAuthStartResponse, type HubPaginatedImportJobs, type HubPasskeyInfo, type HubPasskeyLoginStart, type HubPasskeyRegisterStart, type HubPasswordChange, type HubPermissionCatalogResponse, type HubPermissionItem, type HubPermissionModuleDef, type HubProfileUpdate, type HubPublicJwk, type HubPushSubscription, type HubQueueStats, type HubRefreshResponse, type HubResetPasswordRequest, type HubResourceListParams, type HubResponse, type HubRole, type HubRolePermission, type HubRouteListPayload, type HubSession, type HubSheetValues, type HubSite, type HubSiteStatus, type HubStorageAbortUploadResult, type HubStorageCapabilities, type HubStorageCompleteUploadResult, type HubStorageConnectionInfo, type HubStorageCopyObjectInput, type HubStorageCreateFolderInput, type HubStorageDeleteFolderInput, type HubStorageDeleteFolderResult, type HubStorageDeleteObjectResult, type HubStorageDownloadGrant, type HubStorageFolderInfo, type HubStorageInitUploadInput, type HubStorageListFoldersParams, type HubStorageListFoldersResult, type HubStorageListObjectsParams, type HubStorageListObjectsResult, type HubStorageObjectInfo, type HubStorageProviderKey, type HubStorageUploadGrant, type HubSystemRoute, type HubTenant, type HubTenantDatabaseBinding, type HubTenantStatus, type HubTotpSetupResponse, type HubTotpVerifyResponse, type HubUpdateSiteInput, type HubUpdateTenantInput, type HubUser, PLATFORM_PORTS, createHubClient };
