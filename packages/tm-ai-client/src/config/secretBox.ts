import { AIClientError } from '../errors'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const KEY_BYTES = 32
const IV_BYTES = 12

interface SubtleLike {
  importKey(format: string, keyData: Uint8Array, algorithm: string, extractable: boolean, usages: string[]): Promise<unknown>
  encrypt(algorithm: { name: string, iv: Uint8Array }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
  decrypt(algorithm: { name: string, iv: Uint8Array }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
}

interface CryptoLike {
  getRandomValues<T extends Uint8Array>(array: T): T
  subtle: SubtleLike
}

function cryptoApi(): CryptoLike {
  const api = (globalThis as { crypto?: CryptoLike }).crypto
  if (!api?.subtle) {
    throw new AIClientError('ai.no-crypto', 'WebCrypto is unavailable in this runtime')
  }
  return api
}

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += B64[b0 >> 2]
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]
    out += b2 === undefined ? '=' : B64[b2 & 63]
  }
  return out
}

export function fromBase64(value: string): Uint8Array {
  const clean = String(value || '').replace(/=+$/, '')
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    const index = B64.indexOf(ch)
    if (index < 0) throw new AIClientError('ai.bad-shape', 'Invalid base64 payload')
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
    }
  }
  return Uint8Array.from(out)
}

function hexToBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function generateMasterKey(): string {
  return toBase64(cryptoApi().getRandomValues(new Uint8Array(KEY_BYTES)))
}

function decodeKeyBytes(value: string): Uint8Array {
  if (/^[0-9a-fA-F]{64}$/.test(value)) return hexToBytes(value)
  try {
    return fromBase64(value)
  } catch {
    // Input outside the base64 alphabet can never be a 32-byte key; report it through
    // the length rule so the caller sees the actionable requirement, not a base64 detail.
    return new Uint8Array(0)
  }
}

export function decodeMasterKey(secret: string): Uint8Array {
  const value = String(secret || '').trim()
  const bytes = decodeKeyBytes(value)
  if (bytes.length !== KEY_BYTES) {
    throw new AIClientError('ai.bad-master-key', `AI_CONFIG_SECRET must decode to ${KEY_BYTES} bytes (got ${bytes.length})`)
  }
  return bytes
}

async function importAesKey(masterKey: string | Uint8Array): Promise<unknown> {
  const bytes = typeof masterKey === 'string' ? decodeMasterKey(masterKey) : masterKey
  return cryptoApi().subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function sealSecret(masterKey: string | Uint8Array, plain: string): Promise<string> {
  const api = cryptoApi()
  const key = await importAesKey(masterKey)
  const iv = api.getRandomValues(new Uint8Array(IV_BYTES))
  const cipher = await api.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(String(plain))
  )
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`
}

export async function openSecret(masterKey: string | Uint8Array, sealed: string): Promise<string> {
  const parts = String(sealed || '').split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new AIClientError('ai.bad-shape', 'Stored secret is not v1 ciphertext')
  }
  try {
    const key = await importAesKey(masterKey)
    const plain = await cryptoApi().subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parts[1]!) },
      key,
      fromBase64(parts[2]!)
    )
    return new TextDecoder().decode(plain)
  } catch (err) {
    if (err instanceof AIClientError) throw err
    throw new AIClientError('ai.bad-shape', 'The configured master key cannot decrypt this value')
  }
}
