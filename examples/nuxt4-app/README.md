# Example: Nuxt app on the published packages

A minimal Nuxt 4 app that depends on `@tuanmjnh/tm-ai-client` and
`@tuanmjnh/tm-types` from the registry — no `file:` link, no build step for the
packages.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:4010
```

The page has one button. It calls `/api/chat`, which uses the shared client
against whatever OpenAI-compatible endpoint you point it at. With nothing
configured the route answers `example.no-base-url` instead of guessing a
provider.

## Point it at a stub provider

Without an API key, run a local stub that answers the OpenAI shape:

```bash
node --eval '
const { createServer } = require("node:http")
createServer((req, res) => {
  let body = ""
  req.on("data", c => body += c)
  req.on("end", () => {
    const model = JSON.parse(body || "{}").model
    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify({ choices: [{ message: { content: "pong (" + model + ")" } }] }))
  })
}).listen(4011, "127.0.0.1", () => console.log("stub on 4011"))
'
```

Then start the app with the endpoint set:

```bash
NUXT_AI_BASE_URL=http://127.0.0.1:4011/v1 NUXT_AI_MODEL=auto pnpm dev
```

Clicking the button prints `pong (auto)`.

## Test

```bash
pnpm test
```

The test starts the same stub in-process and drives the client the route uses,
so it needs no network and no key.

## What this proves

- the registry version resolves without a workspace link
- the client's OpenAI-compatible path works from a plain Nuxt server route
- `tm-types` contracts import cleanly in the same app
