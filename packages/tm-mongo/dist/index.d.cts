/**
 * Connection pooling shared by every TM app that talks to MongoDB.
 *
 * The package owns no driver dependency: callers inject `mongoose.createConnection`
 * (or any compatible factory), so apps keep a single mongoose copy while tests can
 * drive the pool with a fake. Behaviour is intentionally identical to the hub's
 * long-lived implementation: global cache by pool name, concurrent dedupe,
 * fail-fast with a cooldown, and reconnect when the URI or database changes.
 */
interface MongoConnectionOptions {
    /** Serverless recommended pool size (1-5). Default: 2. */
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
    heartbeatFrequencyMS?: number;
    authSource?: string;
}
interface MongoConnectOptions extends MongoConnectionOptions {
    dbName: string;
    bufferCommands: false;
    retryWrites: true;
}
interface MongoConnectionLike {
    readyState: number;
    asPromise(): Promise<unknown>;
    close(force?: boolean): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): unknown;
}
type MongoConnectionFactory<C extends MongoConnectionLike> = (uri: string, options: MongoConnectOptions) => C;
interface MongoConnectionManagerOptions<C extends MongoConnectionLike> {
    createConnection: MongoConnectionFactory<C>;
    /** Cooldown after a failed attempt before another connect is tried. Default: 30s. */
    cooldownMs?: number;
    log?: (level: 'info' | 'warn', message: string) => void;
}
interface MongoConnectionManager<C extends MongoConnectionLike = MongoConnectionLike> {
    /**
     * Get the shared connection for `name`.
     * Resolves `null` when the URI is empty or Mongo is unreachable (fail-soft).
     */
    get(uri: string | null | undefined, dbName: string, name?: string, options?: MongoConnectionOptions): Promise<C | null>;
    /** Close one pool by name, or every pool when `name` is omitted. */
    close(name?: string): Promise<void>;
}
declare function createMongoConnectionManager<C extends MongoConnectionLike = MongoConnectionLike>(managerOptions: MongoConnectionManagerOptions<C>): MongoConnectionManager<C>;

export { type MongoConnectOptions, type MongoConnectionFactory, type MongoConnectionLike, type MongoConnectionManager, type MongoConnectionManagerOptions, type MongoConnectionOptions, createMongoConnectionManager };
