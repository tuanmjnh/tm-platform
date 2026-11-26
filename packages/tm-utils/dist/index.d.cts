/**
 * Device credentials belong to one Hub, not to the app in general.
 *
 * A credential is a row in the issuing Hub's database. Pointing the app at a
 * different Hub (a local Supabase project, then Production) leaves a credential
 * behind that the new Hub has never seen, and sending it produces 401 on every
 * call — which the UI then reports as an expired session. The credential is not
 * corrupt; it is simply not this Hub's.
 *
 * Contract:
 *   - a stored credential is only offered to the origin and app id it was
 *     issued for (`credentialBelongsTo`),
 *   - a mismatched credential is reported as such instead of sent,
 *   - clearing is allowed ONLY on a definitive rejection by the matching Hub
 *     (`error.deviceUnauthorized` / `error.deviceExpired`), never on a network
 *     error, a 5xx, or a scope/permission refusal.
 */
interface DeviceCredentialRef {
    deviceId?: string;
    secret?: string;
    /** Hub base URL the credential was issued by. Absent on pre-scoping rows. */
    hubOrigin?: string;
    /** App id the credential was issued for. */
    appId?: string;
}
interface HubCredentialTarget {
    hubUrl?: string;
    appId?: string;
}
/** Hub origins compare without a trailing slash, case-insensitively. */
declare function normalizeOrigin(value: string | undefined): string;
/**
 * Does the stored credential belong to the Hub this build points at? Both
 * halves must match: right origin but another app id is a different satellite
 * and would be rejected the same way.
 */
declare function credentialBelongsTo(credential: DeviceCredentialRef | null | undefined, target: HubCredentialTarget | null | undefined): boolean;
/**
 * Which Hub rejection proves a credential is unusable there. Anything else —
 * timeouts, 5xx, 403 scope refusals, `notRoot` — leaves the credential alone:
 * those are conditions of the request, not of the credential.
 */
declare const TERMINAL_DEVICE_ERRORS: Set<string>;
declare function isTerminalDeviceRejection(statusCode: unknown, statusMessage: unknown): boolean;

interface ParsedAiError {
    cleanMessage: string;
    reasonCode: 'quota_exceeded' | 'invalid_key' | 'not_found' | 'server_overloaded' | 'timeout' | 'generic';
}
declare function parseUpstreamAiError(raw: string, status?: number): ParsedAiError;

export { type DeviceCredentialRef, type HubCredentialTarget, type ParsedAiError, TERMINAL_DEVICE_ERRORS, credentialBelongsTo, isTerminalDeviceRejection, normalizeOrigin, parseUpstreamAiError };
