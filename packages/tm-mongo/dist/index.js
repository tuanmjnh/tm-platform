// src/connection.ts
var DEFAULT_COOLDOWN_MS = 3e4;
function registry() {
  const g = globalThis;
  if (!g.__tmMongoRegistry) g.__tmMongoRegistry = {};
  return g.__tmMongoRegistry;
}
function defaultLog(level, message) {
  if (level === "warn") console.warn(message);
  else console.log(message);
}
function createMongoConnectionManager(managerOptions) {
  const createConnection = managerOptions.createConnection;
  const cooldownMs = managerOptions.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const log = managerOptions.log ?? defaultLog;
  async function get(uri, dbName, name = "default", options = {}) {
    const targetUri = (uri || "").trim();
    if (!targetUri) return null;
    const entries = registry();
    if (!entries[name]) {
      entries[name] = { conn: null, uri: targetUri, db: dbName, promise: null, lastAttempt: 0, generation: 0 };
    }
    const entry = entries[name];
    if (entry.uri !== targetUri || entry.db !== dbName) {
      entry.generation += 1;
      if (entry.conn) await entry.conn.close().catch(() => {
      });
      entry.conn = null;
      entry.promise = null;
      entry.lastAttempt = 0;
      entry.uri = targetUri;
      entry.db = dbName;
    }
    if (entry.conn && entry.conn.readyState === 1) return entry.conn;
    if (entry.promise) return entry.promise;
    if (entry.lastAttempt && Date.now() - entry.lastAttempt < cooldownMs) return null;
    entry.lastAttempt = Date.now();
    const generation = entry.generation;
    const attempt = (async () => {
      let conn = null;
      try {
        conn = createConnection(targetUri, {
          dbName,
          bufferCommands: false,
          maxPoolSize: options.maxPoolSize ?? 2,
          serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 5e3,
          socketTimeoutMS: options.socketTimeoutMS ?? 15e3,
          connectTimeoutMS: options.connectTimeoutMS ?? 1e4,
          heartbeatFrequencyMS: options.heartbeatFrequencyMS ?? 1e4,
          retryWrites: true,
          authSource: options.authSource ?? "admin"
        });
        await conn.asPromise();
        if (entry.generation !== generation) {
          await conn.close().catch(() => {
          });
          return null;
        }
        conn.on("error", (err) => {
          log("warn", `[Mongo:${name}] connection error: ${err?.message ?? "unknown"}`);
          if (entry.conn === conn) entry.conn = null;
        });
        conn.on("disconnected", () => {
          if (entry.conn === conn) entry.conn = null;
        });
        entry.conn = conn;
        log("info", `[Mongo:${name}] connected \u2192 db "${dbName}"`);
        return conn;
      } catch (error) {
        log("warn", `[Mongo:${name}] connect failed: ${error?.message ?? String(error)}`);
        if (entry.conn === conn) entry.conn = null;
        return null;
      } finally {
        if (entry.generation === generation) entry.promise = null;
      }
    })();
    entry.promise = attempt;
    return attempt;
  }
  async function close(name) {
    const entries = registry();
    const names = name ? [name] : Object.keys(entries);
    for (const key of names) {
      const entry = entries[key];
      if (!entry) continue;
      entry.generation += 1;
      try {
        if (entry.conn && entry.conn.readyState !== 0) {
          await entry.conn.close();
        }
      } catch {
      }
      entry.conn = null;
      entry.promise = null;
      entry.lastAttempt = 0;
      if (!name) delete entries[key];
    }
  }
  return { get, close };
}
export {
  createMongoConnectionManager
};
//# sourceMappingURL=index.js.map