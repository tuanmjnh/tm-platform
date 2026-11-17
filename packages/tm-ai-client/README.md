# @tuanmjnh/tm-ai-client

Provider-agnostic AI client and provider/model catalogue shared by TM apps.

## App-local AI configuration (0.4.0)

| Driver | Use it for | Constructor |
| --- | --- | --- |
| `createMongoAIConfigStore(db, ownerId)` | tm-tools, tm-studio (desktop + Vercel) | injected `Db` |
| `createSupabaseAIConfigStore(client, ownerId)` | Supabase deployments | injected client, `ai_connections` table (`SUPABASE_AI_CONNECTIONS_SQL`) |
| `createLocalStorageAIConfigStore(storage, ownerId)` | personal/browser clients | injected `Storage` |

Keys are sealed with `sealSecret(AI_CONFIG_SECRET, key)` before `upsertConnection`;
records expose `apiKeyCipher` only. Use `storedToAppConnection()` to build picker rows.

The two shipped consumers are tm-tools and tm-studio (desktop and Vercel), both on
`createMongoAIConfigStore` writing to the `ai_connections` collection in each app's own
MongoDB database.
