/**
 * Connection pooling shared by every TM app that talks to MongoDB.
 *
 * The package owns no driver dependency: callers inject `mongoose.createConnection`
 * (or any compatible factory), so apps keep a single mongoose copy while tests can
 * drive the pool with a fake. Behaviour is intentionally identical to the hub's
 * long-lived implementation: global cache by pool name, concurrent dedupe,
 * fail-fast with a cooldown, and reconnect when the URI or database changes.
 */

export interface MongoConnectionOptions {
  /** Serverless recommended pool size (1-5). Default: 2. */
  maxPoolSize?: number
  serverSelectionTimeoutMS?: number
  socketTimeoutMS?: number
  connectTimeoutMS?: number
  heartbeatFrequencyMS?: number
  authSource?: string
}

export interface MongoConnectOptions extends MongoConnectionOptions {
  dbName: string
  bufferCommands: false
  retryWrites: true
}

export interface MongoConnectionLike {
  readyState: number
  asPromise(): Promise<unknown>
  close(force?: boolean): Promise<void>
  on(event: string, listener: (...args: any[]) => void): unknown
}

export type MongoConnectionFactory = (
  uri: string,
  options: MongoConnectOptions
) => MongoConnectionLike

export interface MongoConnectionManagerOptions {
  createConnection: MongoConnectionFactory
  /** Cooldown after a failed attempt before another connect is tried. Default: 30s. */
  cooldownMs?: number
  log?: (level: 'info' | 'warn', message: string) => void
}

export interface MongoConnectionManager {
  /**
   * Get the shared connection for `name`.
   * Resolves `null` when the URI is empty or Mongo is unreachable (fail-soft).
   */
  get(
    uri: string | null | undefined,
    dbName: string,
    name?: string,
    options?: MongoConnectionOptions
  ): Promise<MongoConnectionLike | null>
  /** Close one pool by name, or every pool when `name` is omitted. */
  close(name?: string): Promise<void>
}

interface MongoEntry {
  conn: MongoConnectionLike | null
  uri: string | null
  db: string | null
  promise: Promise<MongoConnectionLike | null> | null
  lastAttempt: number
}

interface GlobalMongoRegistry {
  __tmMongoRegistry?: Record<string, MongoEntry>
}

const DEFAULT_COOLDOWN_MS = 30_000

function registry(): Record<string, MongoEntry> {
  const g = globalThis as unknown as GlobalMongoRegistry
  if (!g.__tmMongoRegistry) g.__tmMongoRegistry = {}
  return g.__tmMongoRegistry
}

function defaultLog(level: 'info' | 'warn', message: string): void {
  if (level === 'warn') console.warn(message)
  else console.log(message)
}

export function createMongoConnectionManager(
  managerOptions: MongoConnectionManagerOptions
): MongoConnectionManager {
  const createConnection = managerOptions.createConnection
  const cooldownMs = managerOptions.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const log = managerOptions.log ?? defaultLog

  async function get(
    uri: string | null | undefined,
    dbName: string,
    name = 'default',
    options: MongoConnectionOptions = {}
  ): Promise<MongoConnectionLike | null> {
    const targetUri = (uri || '').trim()
    if (!targetUri) return null

    const entries = registry()
    if (!entries[name]) {
      entries[name] = { conn: null, uri: targetUri, db: dbName, promise: null, lastAttempt: 0 }
    }

    const entry = entries[name]

    if (entry.uri !== targetUri || entry.db !== dbName) {
      if (entry.conn) await entry.conn.close().catch(() => {})
      entry.conn = null
      entry.promise = null
      entry.lastAttempt = 0
      entry.uri = targetUri
      entry.db = dbName
    }

    if (entry.conn && entry.conn.readyState === 1) return entry.conn
    if (entry.promise) return entry.promise
    if (entry.lastAttempt && Date.now() - entry.lastAttempt < cooldownMs) return null
    entry.lastAttempt = Date.now()

    entry.promise = (async (): Promise<MongoConnectionLike | null> => {
      try {
        const conn = createConnection(targetUri, {
          dbName,
          bufferCommands: false,
          maxPoolSize: options.maxPoolSize ?? 2,
          serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 5000,
          socketTimeoutMS: options.socketTimeoutMS ?? 15000,
          connectTimeoutMS: options.connectTimeoutMS ?? 10000,
          heartbeatFrequencyMS: options.heartbeatFrequencyMS ?? 10000,
          retryWrites: true,
          authSource: options.authSource ?? 'admin'
        })

        await conn.asPromise()

        conn.on('error', (err?: Error) => {
          log('warn', `[Mongo:${name}] connection error: ${err?.message ?? 'unknown'}`)
          entry.conn = null
        })
        conn.on('disconnected', () => {
          entry.conn = null
        })

        entry.conn = conn
        log('info', `[Mongo:${name}] connected → db "${dbName}"`)
        return conn
      } catch (error) {
        log('warn', `[Mongo:${name}] connect failed: ${(error as Error)?.message ?? String(error)}`)
        entry.conn = null
        return null
      } finally {
        entry.promise = null
      }
    })()

    return entry.promise
  }

  async function close(name?: string): Promise<void> {
    const entries = registry()
    const names = name ? [name] : Object.keys(entries)
    for (const key of names) {
      const entry = entries[key]
      if (!entry) continue
      try {
        if (entry.conn && entry.conn.readyState !== 0) {
          await entry.conn.close()
        }
      } catch {
        // Shutdown is best-effort; a pool that refuses to close must not block exit.
      }
      entry.conn = null
      entry.promise = null
      entry.lastAttempt = 0
      if (!name) delete entries[key]
    }
  }

  return { get, close }
}
