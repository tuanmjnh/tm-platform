declare const formatDate: (dateString?: string | number | Date | null, locale?: string | null) => string;
declare const formatTimeAgo: (date: string | Date | number | undefined | null, locale?: string | null) => string;
declare const formatNumber: (value: number | string | undefined | null, intlOptions?: Intl.NumberFormatOptions, locale?: string | null) => string;

declare const toSlug: (str: string) => string;
declare const toCode: (str: string) => string;
declare const toNormalize: (string: string) => string;
declare const generateEan13: () => string;

declare const minifySvg: (svg: string) => string;
declare const escapeRegExp: (string: string) => string;

/**
 * Text transformations — pure string helpers, no platform access.
 *
 * Two groups are deliberately different from `codec/encoding.ts`:
 * the Base64/URL/HTML helpers here are *lenient* (they return the input
 * unchanged instead of throwing), because the text-utility UI applies them to
 * whatever the user pasted. That difference is preserved on purpose: the
 * encoding module's strict versions are what a form validator wants, these are
 * what a "try it" button wants.
 */
interface TextStats {
    chars: number;
    charsNoSpaces: number;
    words: number;
    lines: number;
    paragraphs: number;
    readingTimeMinutes: number;
}
declare function toUpperCase(text: string): string;
declare function toLowerCase(text: string): string;
declare function toCapitalize(text: string): string;
declare function toSentenceCase(text: string): string;
declare function toCamelCase(text: string): string;
declare function toPascalCase(text: string): string;
declare function toKebabCase(text: string): string;
declare function toSnakeCase(text: string): string;
declare function toConstantCase(text: string): string;
declare function toAlternatingCase(text: string): string;
declare function toInverseCase(text: string): string;
declare function removeVietnameseAccents(text: string): string;
/**
 * Slug for the text utility, which treats `_` as a separator so
 * `hello_world` becomes `hello-world`. `slug/index.ts`'s `toSlug` deletes the
 * underscore instead, so the two are not interchangeable and carry distinct
 * names rather than one pretending to be the other.
 */
declare function slugify(text: string): string;
declare function cleanSpaces(text: string): string;
declare function removeEmptyLines(text: string): string;
declare function removeDuplicateLines(text: string): string;
declare function sortLinesAsc(text: string): string;
declare function sortLinesDesc(text: string): string;
declare function reverseLines(text: string): string;
declare function reverseCharacters(text: string): string;
declare function numberLines(text: string): string;
/** Lenient Base64: unencodable input passes through unchanged. */
declare function encodeBase64Safe(text: string): string;
/** Lenient Base64 decode: undecodable input passes through unchanged. */
declare function decodeBase64Safe(text: string): string;
declare function encodeUrlSafe(text: string): string;
declare function decodeUrlSafe(text: string): string;
declare function escapeHtmlSafe(text: string): string;
declare function unescapeHtmlSafe(text: string): string;
declare function countStats(text: string): TextStats;

declare const getImage: (img: unknown, customKey?: string | string[] | null) => string;
declare const cleanImageUrl: (url: string) => string;
declare const isRawSvg: (val?: string) => boolean;
declare const isIconify: (url?: string) => boolean;
declare const isSpecialImage: (url?: string | null) => boolean;
declare const isImage: (url?: string) => boolean;
type DisplayType = 'svg' | 'image' | 'icon';
declare const detectDisplayType: (val?: string) => DisplayType;
declare const ensureForwardSlash: (url: string) => string;

declare const sanitizeSvg: (svg: string, prefix?: string) => string;

declare const readCsv: (csvText: string) => Record<string, string>[];
declare const readJson: (jsonText: string) => any[];
declare const downloadFile: (url: string, filename?: string) => Promise<void>;

/**
 * Coalesce concurrent calls into a single in-flight run.
 *
 * While a run is pending, every caller receives the same promise instead of
 * starting another run. The lock clears when the run settles (resolve or
 * reject), so the next call after that starts fresh. Used to stop duplicated
 * network fetches (e.g. notifications) from exhausting the shared rate limit.
 */
declare function createInflight<T>(): (task: () => Promise<T>) => Promise<T>;

type PoolItemStatus = 'waiting' | 'running' | 'done' | 'failed' | 'cancelled';
interface PoolItem {
    id: string;
    status: PoolItemStatus;
    retry: number;
}
interface BatchPoolOptions<T extends PoolItem> {
    concurrency: () => number;
    pauseMs: () => number;
    maxRetry: () => number;
    isPaused: () => boolean;
    isStopping: () => boolean;
    run: (item: T) => Promise<void>;
    delay?: (ms: number) => Promise<void>;
    tickMs?: number;
}
interface BatchPoolResult {
    done: number;
    failed: number;
    cancelled: number;
}
declare function runBatchPool<T extends PoolItem>(items: T[], opts: BatchPoolOptions<T>): Promise<BatchPoolResult>;

interface XfadeTransitionItem {
    id: string;
    name: string;
    description: string;
}
declare const ALL_XFADE_TRANSITIONS: XfadeTransitionItem[];

interface SystemRoute {
    id: string;
    parentId?: string | null;
    sort?: number | null;
    children?: SystemRoute[];
    [key: string]: unknown;
}

declare function buildRouteTree<T extends SystemRoute>(flatRoutes: T[]): T[];

interface RealisticFingerprint {
    os: 'windows' | 'macos' | 'linux';
    browser_type: string;
    browser_version: string;
    user_agent: string;
    screen_resolution: string;
    color_depth: number;
    hardware_concurrency: number;
    device_memory: number;
    languages: string;
    webrtc_mode: string;
    timezone_mode: string;
    timezone_val: string;
    geo_mode: string;
    canvas_mode: string;
    webgl_mode: string;
    webgl_vendor: string;
    webgl_renderer: string;
    audio_mode: string;
    client_rects_mode: string;
    fonts_mode: string;
}
declare function generateRealisticFingerprint(targetOs?: 'windows' | 'macos' | 'linux'): RealisticFingerprint;

declare function bufToB64url(buf: ArrayBuffer): string;
declare function b64urlToBuf(b64url: string): ArrayBuffer;

/**
 * Encoding helpers — pure, no DOM beyond `TextEncoder`/`btoa`/`atob`, which
 * exist in Node 18+ and every browser these apps target.
 *
 * This is the body of the two apps' `useEncoding` composable, unchanged: the
 * functions were already free of Vue and Nuxt, so they move here verbatim
 * rather than being rewritten.
 */
type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
interface JwtDecoded {
    header: Record<string, unknown> | null;
    payload: Record<string, unknown> | null;
    signature: string;
    valid: boolean;
    error?: string;
}
interface JwtEncodeOptions {
    secret?: string;
    header?: Record<string, unknown>;
    algorithm?: 'HS256' | 'none';
}
/** Unicode-safe Base64 encode */
declare function encodeBase64(text: string): string;
/** Unicode-safe Base64 decode */
declare function decodeBase64(text: string): string;
declare function encodeUrl(text: string): string;
declare function decodeUrl(text: string): string;
declare function escapeHtml(text: string): string;
declare function unescapeHtml(text: string): string;
declare function encodeHex(text: string): string;
declare function decodeHex(text: string): string;
declare function encodeBinary(text: string): string;
declare function decodeBinary(text: string): string;
declare function rot13(text: string): string;
declare function reverseText(text: string): string;
declare function sha1(text: string): Promise<string>;
declare function sha256(text: string): Promise<string>;
declare function sha384(text: string): Promise<string>;
declare function sha512(text: string): Promise<string>;
/** Compact pure-TS MD5 (Web Crypto does not support MD5) */
declare function md5(text: string): string;
/** Encode JWT — HS256 (HMAC-SHA256) or unsigned (alg: none) */
declare function encodeJwt(payload: Record<string, unknown>, options?: JwtEncodeOptions): Promise<string>;
/** Decode JWT header/payload without signature verification */
declare function decodeJwt(token: string): JwtDecoded;
/**
 * Generate a cryptographically secure random key in hex format.
 * @param length Character length of the key (default 64, e.g. 32 for 16 bytes, 64 for 32 bytes).
 */
declare function generateHexKey(length?: number): string;
/** Backwards-compatible alias: the apps' composable exposed this name. */
declare const generateRandomKey: typeof generateHexKey;
/** Hash by algorithm name, including MD5 which Web Crypto does not provide. */
declare function runHash(algorithm: HashAlgorithm | 'MD5', text: string): Promise<string>;

/**
 * AI provider transfer (JSON / ENV / CSV).
 *
 * One canonical row shape is read from — and written to — all three formats so
 * an exported file can be re-imported without loss:
 *
 *   { provider, name, model, baseUrl, apiKey, enabled }
 *
 * Formats accepted on import:
 *   - JSON: tm-hub / tm-trading export envelopes (`{ connections }`), the
 *     FreeLLMAPI `{ keys }` shape, or a bare array.
 *   - ENV : dotenv text. Either the single-connection block
 *     (`AI_PROVIDER` + `AI_API_KEY` + `AI_BASE_URL` + `AI_MODEL`), or one block
 *     per provider (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, ...).
 *     A `PREFIX__<name>` segment keeps several accounts of one provider apart.
 *   - CSV : header row with provider/name/model/baseUrl/enabled/apiKey columns
 *     (aliases and any column order are accepted).
 *
 * Secrets only ever travel inside the file the operator picked; nothing here
 * logs or persists a key.
 */
type AiTransferFormat = 'json' | 'env' | 'csv';
interface AiTransferRow {
    provider: string;
    name: string;
    model: string;
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
}
interface AiTransferIssue {
    /** Where the problem was found — a row number, a line or a CSV/JSON offset. */
    source: string;
    message: string;
}
interface AiTransferParseResult {
    rows: AiTransferRow[];
    errors: AiTransferIssue[];
    format: AiTransferFormat | null;
}
interface AiTransferParseOptions {
    format?: AiTransferFormat | null;
    fileName?: string;
    defaultModel?: string;
    /** Provider keys the current install knows (from the API catalogue). */
    knownProviders: string[];
    /** Where a provider with an explicit baseUrl but no known key lands. */
    customProviderKey?: string;
}
interface AiTransferMeta {
    appName: string;
    appId: string;
    includeSecrets: boolean;
}
declare const AI_TRANSFER_FORMATS: AiTransferFormat[];
/** Trim and strip one layer of matching quotes (`"sk-..."` / `'sk-...'`). */
declare function cleanTransferValue(value: unknown): string;
/** Best-effort format guess from the file extension, then the payload shape. */
declare function detectAiTransferFormat(text: string, fileName?: string): AiTransferFormat | null;
/**
 * Format decoding only: every row is cleaned, but the provider key is NOT
 * mapped or validated — callers that validate server-side (tm-trading's import
 * endpoint) send these rows straight through.
 */
declare function decodeAiTransfer(text: string, options?: {
    format?: AiTransferFormat | null;
    fileName?: string;
}): {
    rows: AiTransferRow[];
    errors: AiTransferIssue[];
    format: AiTransferFormat | null;
};
declare function parseAiTransfer(text: string, options: AiTransferParseOptions): AiTransferParseResult;
declare function serializeAiTransfer(rows: AiTransferRow[], format: AiTransferFormat, meta: AiTransferMeta): {
    content: string;
    fileName: string;
    mime: string;
};

/**
 * Error convention shared by the TM apps.
 *
 * Backend `createError` sends `statusMessage` = an i18n key (e.g.
 * `error.invalidCredentials`) and `message` = human-readable text for logs.
 * The frontend resolves the string a user should see with `getErrorMessage(err, t)`:
 *
 *   1. connection errors to TM-Hub, or a network failure;
 *   2. `statusMessage` used as an i18n key, when the table has it;
 *   3. known backend messages mapped to keys;
 *   4. otherwise a status-code default.
 *
 * `t` is a parameter, never imported. That is what lets a server route, a CLI or
 * a test resolve an error without a Vue app, and it keeps the package free of
 * i18n.
 */
type ApiErrorPayload = {
    name?: string;
    statusCode?: number;
    statusMessage?: string;
    data?: {
        message?: string;
        statusMessage?: string;
        statusCode?: number;
    };
    message?: string;
};
type Translate = (key: string) => string;
declare function getApiErrorStatus(err: unknown): number | undefined;
declare function isHubConnectionError(err: unknown): boolean;
declare function getErrorKey(err: unknown): string;
declare function getErrorMessage(err: unknown, t: Translate): string;
/**
 * PDF preset operations send `PDF_*` codes that have dedicated copy instead of
 * the generic status map. Kept beside `getErrorMessage` so both resolve an error
 * the same way; only these two codes take a different branch.
 */
declare function getPresetErrorMessage(err: unknown, t: Translate): string;

/**
 * Random generators — pure, backed by `crypto.getRandomValues`.
 *
 * `generateRandomKey` is not re-exported here: it is byte-for-byte the same
 * function as `generateHexKey` in `codec/encoding.ts`, and two exports of one
 * implementation in a single barrel is how the two copies drifted apart in the
 * apps. The batch helper imports it instead.
 */
interface PasswordOptions {
    length: number;
    upper: boolean;
    lower: boolean;
    digits: boolean;
    symbols: boolean;
    excludeAmbiguous: boolean;
}
interface UsernameOptions {
    style: 'word' | 'name' | 'handle' | 'email-like';
    length?: number;
    suffix?: boolean;
    domain?: string;
}
declare const DEFAULT_PASSWORD_OPTIONS: PasswordOptions;
declare function generatePassword(options?: Partial<PasswordOptions>): string;
declare function generatePin(length?: number): string;
declare function generateUuid(): string;
/** URL-safe random token (default 32 bytes → 43 chars) */
declare function generateToken(byteLength?: number): string;
declare function generateApiKey(prefix?: string): string;
declare function generateUsername(options?: UsernameOptions): string;
declare function generateEmail(): string;
declare function generateName(): string;
declare function generatePasswordBatch(count: number, options?: Partial<PasswordOptions>): string[];
declare function generateUsernameBatch(count: number, options?: UsernameOptions): string[];
/** Batch of hex keys. The single-key generator lives in `codec/encoding.ts`. */
declare function generateRandomKeyBatch(count: number, length?: number): string[];

export { AI_TRANSFER_FORMATS, ALL_XFADE_TRANSITIONS, type AiTransferFormat, type AiTransferIssue, type AiTransferMeta, type AiTransferParseOptions, type AiTransferParseResult, type AiTransferRow, type ApiErrorPayload, type BatchPoolOptions, type BatchPoolResult, DEFAULT_PASSWORD_OPTIONS, type DisplayType, type HashAlgorithm, type JwtDecoded, type JwtEncodeOptions, type PasswordOptions, type PoolItem, type PoolItemStatus, type RealisticFingerprint, type SystemRoute, type TextStats, type Translate, type UsernameOptions, type XfadeTransitionItem, b64urlToBuf, bufToB64url, buildRouteTree, cleanImageUrl, cleanSpaces, cleanTransferValue, countStats, createInflight, decodeAiTransfer, decodeBase64, decodeBase64Safe, decodeBinary, decodeHex, decodeJwt, decodeUrl, decodeUrlSafe, detectAiTransferFormat, detectDisplayType, downloadFile, encodeBase64, encodeBase64Safe, encodeBinary, encodeHex, encodeJwt, encodeUrl, encodeUrlSafe, ensureForwardSlash, escapeHtml, escapeHtmlSafe, escapeRegExp, formatDate, formatNumber, formatTimeAgo, generateApiKey, generateEan13, generateEmail, generateHexKey, generateName, generatePassword, generatePasswordBatch, generatePin, generateRandomKey, generateRandomKeyBatch, generateRealisticFingerprint, generateToken, generateUsername, generateUsernameBatch, generateUuid, getApiErrorStatus, getErrorKey, getErrorMessage, getImage, getPresetErrorMessage, isHubConnectionError, isIconify, isImage, isRawSvg, isSpecialImage, md5, minifySvg, numberLines, parseAiTransfer, readCsv, readJson, removeDuplicateLines, removeEmptyLines, removeVietnameseAccents, reverseCharacters, reverseLines, reverseText, rot13, runBatchPool, runHash, sanitizeSvg, serializeAiTransfer, sha1, sha256, sha384, sha512, slugify, sortLinesAsc, sortLinesDesc, toAlternatingCase, toCamelCase, toCapitalize, toCode, toConstantCase, toInverseCase, toKebabCase, toLowerCase, toNormalize, toPascalCase, toSentenceCase, toSlug, toSnakeCase, toUpperCase, unescapeHtml, unescapeHtmlSafe };
