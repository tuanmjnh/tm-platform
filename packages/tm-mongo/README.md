# @tuanmjnh/tm-mongo

Fail-fast MongoDB connection pooling for TM apps. The package has no driver
dependency: you inject `mongoose.createConnection`, so every app keeps one
mongoose copy while the pool behaviour stays identical everywhere.

## Usage

```ts
import mongoose from 'mongoose'
import { createMongoConnectionManager } from '@tuanmjnh/tm-mongo'

const mongo = createMongoConnectionManager({
  createConnection: (uri, options) => mongoose.createConnection(uri, options)
})

const conn = await mongo.get(process.env.MONGODB_URI, 'tm-studio', 'tm-studio', {
  maxPoolSize: 5
})
if (!conn) return null // not configured or unreachable — fail soft

// conn.db is the native Db (usable with structural stores, e.g. createMongoAIConfigStore)
// conn.getClient() returns the underlying MongoClient

await mongo.close() // shutdown: close every pool
```

## Behaviour

- Pools are cached on `globalThis` by name, so dev HMR and repeated imports reuse one connection.
- Concurrent callers share a single connect promise.
- `bufferCommands: false` plus timeouts means requests fail fast when Mongo is down.
- A failed attempt starts a cooldown (default 30s, `cooldownMs` to override) before the next try.
- Changing the URI or database name closes the old pool and reconnects.
- `error` / `disconnected` events clear the cache so the next call reconnects (still subject to the cooldown window).
- An empty or blank URI resolves `null` instead of throwing.
