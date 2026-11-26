// src/errors.ts
var AIClientError = class extends Error {
  code;
  status;
  retryAfterMs;
  constructor(code, message, extra) {
    super(message);
    this.name = "AIClientError";
    this.code = code;
    this.status = extra?.status;
    this.retryAfterMs = extra?.retryAfterMs;
  }
};
function isLocalEndpoint(baseUrl) {
  if (!baseUrl) return false;
  const value = String(baseUrl).trim();
  if (!value) return false;
  try {
    const raw = value.includes("://") ? value : `http://${value}`;
    const host = new URL(raw).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0" || host.endsWith(".local") || /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(host);
  } catch {
    return /localhost|127\.0\.0\.1|::1|0\.0\.0\.0|\.local/i.test(value);
  }
}

// src/adapters/openai.ts
function trimBase(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}
var openAICompatibleAdapter = {
  family: "openai-compatible",
  buildChatRequest(endpoint, request) {
    const headers = { "content-type": "application/json" };
    if (endpoint.apiKey) headers.authorization = `Bearer ${endpoint.apiKey}`;
    const body = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature
    };
    if (request.jsonMode) body.response_format = { type: "json_object" };
    return {
      url: `${trimBase(endpoint.baseUrl)}/chat/completions`,
      headers,
      body
    };
  },
  parseChatResponse(json) {
    const payload = json;
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content) {
      throw new Error("Chat response has no message content");
    }
    const usage = payload.usage ? {
      inputTokens: payload.usage.prompt_tokens,
      outputTokens: payload.usage.completion_tokens,
      totalTokens: payload.usage.total_tokens
    } : null;
    return { content, usage };
  },
  parseStreamLine(line) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) return null;
    const data = trimmed.slice(5).trim();
    if (!data) return null;
    if (data === "[DONE]") return { delta: "", done: true };
    try {
      const json = JSON.parse(data);
      const delta = json?.choices?.[0]?.delta?.content || "";
      const usage = json.usage ? {
        inputTokens: json.usage.prompt_tokens,
        outputTokens: json.usage.completion_tokens,
        totalTokens: json.usage.total_tokens
      } : null;
      return { delta, done: false, usage };
    } catch {
      return null;
    }
  },
  buildModelsRequest(endpoint) {
    const headers = {};
    if (endpoint.apiKey) headers.authorization = `Bearer ${endpoint.apiKey}`;
    return { url: `${trimBase(endpoint.baseUrl)}/models`, headers };
  },
  parseModelsResponse(json) {
    const payload = json;
    const rows = Array.isArray(json) ? json : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
    const seen = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const value = typeof row === "string" ? row : row?.id || row?.name || row?.model;
      const id = String(value || "").trim();
      if (!id || seen.has(id)) continue;
      const label = row?.name || id;
      seen.set(id, { id, label });
    }
    return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
};

// src/adapters/anthropic.ts
var ANTHROPIC_VERSION = "2023-06-01";
var DEFAULT_MAX_TOKENS = 4096;
function trimBase2(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}
function baseHeaders(endpoint) {
  const headers = {
    "content-type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION
  };
  if (endpoint.apiKey) headers["x-api-key"] = endpoint.apiKey;
  return headers;
}
function splitSystem(messages) {
  const system = [];
  const out = [];
  for (const message of messages) {
    if (message.role === "system") {
      if (message.content) system.push(message.content);
      continue;
    }
    const role = message.role === "assistant" ? "assistant" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) last.content = `${last.content}

${message.content}`;
    else out.push({ role, content: message.content });
  }
  if (out.length === 0) out.push({ role: "user", content: "" });
  return { system: system.join("\n\n"), messages: out };
}
function mapUsage(usage) {
  const raw = usage;
  if (!raw) return null;
  const inputTokens = raw.input_tokens;
  const outputTokens = raw.output_tokens;
  if (inputTokens === void 0 && outputTokens === void 0) return null;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens !== void 0 && outputTokens !== void 0 ? inputTokens + outputTokens : void 0
  };
}
var anthropicAdapter = {
  family: "anthropic",
  buildChatRequest(endpoint, request) {
    const { system, messages } = splitSystem(request.messages);
    const body = {
      model: request.model,
      max_tokens: request.maxTokens && request.maxTokens > 0 ? request.maxTokens : DEFAULT_MAX_TOKENS,
      messages
    };
    if (system) body.system = system;
    if (request.temperature !== void 0) body.temperature = request.temperature;
    return {
      url: `${trimBase2(endpoint.baseUrl)}/v1/messages`,
      headers: baseHeaders(endpoint),
      body
    };
  },
  parseChatResponse(json) {
    const payload = json;
    const content = Array.isArray(payload?.content) ? payload.content.filter((block) => block?.type === "text").map((block) => block.text || "").join("") : "";
    if (!content) throw new Error("Anthropic response has no text content");
    return { content, usage: mapUsage(payload.usage) };
  },
  parseStreamLine(line) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) return null;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return data === "[DONE]" ? { delta: "", done: true } : null;
    try {
      const json = JSON.parse(data);
      if (json.type === "message_stop") return { delta: "", done: true };
      if (json.type === "content_block_delta") {
        return { delta: json.delta?.text || "", done: false };
      }
      if (json.type === "message_delta" || json.type === "message_start") {
        return { delta: "", done: false, usage: mapUsage(json.usage) };
      }
      return null;
    } catch {
      return null;
    }
  },
  buildModelsRequest(endpoint) {
    return {
      url: `${trimBase2(endpoint.baseUrl)}/v1/models`,
      headers: baseHeaders(endpoint)
    };
  },
  parseModelsResponse(json) {
    const payload = json;
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const seen = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const id = String(row?.id || "").trim();
      if (!id || seen.has(id)) continue;
      seen.set(id, { id, label: String(row?.display_name || id) });
    }
    return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
};

// src/client.ts
var DEFAULT_TIMEOUT_MS = 6e4;
function adapterFor(endpoint) {
  const family = String(endpoint.provider || "").trim().toLowerCase();
  return family === "anthropic" ? anthropicAdapter : openAICompatibleAdapter;
}
function assertEndpoint(endpoint, options) {
  if (!String(endpoint.baseUrl || "").trim()) {
    throw new AIClientError("ai.no-base-url", `Provider "${endpoint.provider}" has no base URL`);
  }
  if (endpoint.mode === "local") options.assertModeAllowed?.("local");
}
function assertCredentials(endpoint, allowKeyless) {
  if (endpoint.apiKey) return;
  if (isLocalEndpoint(endpoint.baseUrl)) return;
  if (allowKeyless) return;
  throw new AIClientError("ai.no-key", `Missing API key for provider "${endpoint.provider}"`);
}
function parseChatOrThrow(adapter, json) {
  try {
    return adapter.parseChatResponse(json);
  } catch (err) {
    throw new AIClientError("ai.bad-shape", String(err?.message || "Malformed chat response"));
  }
}
var AIClient = class {
  endpoint;
  fetchImpl;
  timeoutMs;
  allowKeyless;
  assertModeAllowed;
  constructor(options) {
    this.endpoint = options.endpoint;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.allowKeyless = options.allowKeyless === true;
    this.assertModeAllowed = options.assertModeAllowed;
  }
  async chat(request) {
    const adapter = adapterFor(this.endpoint);
    assertEndpoint(this.endpoint, { endpoint: this.endpoint, assertModeAllowed: this.assertModeAllowed });
    assertCredentials(this.endpoint, this.allowKeyless);
    if (!request.messages || request.messages.length === 0) {
      throw new AIClientError("ai.bad-shape", "messages must be a non-empty array");
    }
    if (!request.model) {
      throw new AIClientError("ai.no-model", `No model configured for provider "${this.endpoint.provider}"`);
    }
    const timeoutMs = request.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal;
    const startedAt = Date.now();
    const built = adapter.buildChatRequest(this.endpoint, request);
    try {
      const res = await this.fetchImpl(built.url, {
        method: "POST",
        headers: built.headers,
        body: JSON.stringify(built.body),
        signal
      });
      const text = await res.text();
      if (res.status === 429) throw new AIClientError("ai.rate-limited", "Provider rate limit (429)");
      if (res.status < 200 || res.status >= 300) {
        throw new AIClientError("ai.http-error", extractMessage(text) || `HTTP ${res.status}`, { status: res.status });
      }
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new AIClientError("ai.bad-shape", "Response is not valid JSON");
      }
      const parsed = parseChatOrThrow(adapter, json);
      return {
        content: parsed.content,
        model: request.model,
        provider: this.endpoint.provider,
        usage: parsed.usage,
        latencyMs: Date.now() - startedAt
      };
    } catch (err) {
      if (err instanceof AIClientError) throw err;
      if (err && err.name === "AbortError") {
        throw new AIClientError("ai.timeout", `Request timed out after ${timeoutMs}ms`);
      }
      throw new AIClientError("ai.network", String(err?.message || err));
    } finally {
      clearTimeout(timer);
    }
  }
  async *stream(request) {
    const adapter = adapterFor(this.endpoint);
    assertEndpoint(this.endpoint, { endpoint: this.endpoint, assertModeAllowed: this.assertModeAllowed });
    assertCredentials(this.endpoint, this.allowKeyless);
    if (!request.messages || request.messages.length === 0) {
      throw new AIClientError("ai.bad-shape", "messages must be a non-empty array");
    }
    if (!request.model) {
      throw new AIClientError("ai.no-model", `No model configured for provider "${this.endpoint.provider}"`);
    }
    const timeoutMs = request.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal;
    const built = adapter.buildChatRequest(this.endpoint, {
      ...request,
      // Streaming is opt-in via the `stream` flag on the body.
      messages: request.messages
    });
    const body = { ...built.body, stream: true };
    try {
      const res = await this.fetchImpl(built.url, {
        method: "POST",
        headers: built.headers,
        body: JSON.stringify(body),
        signal
      });
      if (res.status === 429) throw new AIClientError("ai.rate-limited", "Provider rate limit (429)");
      if (res.status < 200 || res.status >= 300) {
        const text = await res.text();
        throw new AIClientError("ai.http-error", extractMessage(text) || `HTTP ${res.status}`, { status: res.status });
      }
      if (!res.body) throw new AIClientError("ai.bad-shape", "Streaming response has no body");
      const decoder = new TextDecoder();
      let buffer = "";
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const parsed = adapter.parseStreamLine(line);
          if (parsed) yield parsed;
        }
      }
      if (buffer.trim()) {
        const parsed = adapter.parseStreamLine(buffer);
        if (parsed) yield parsed;
      }
    } catch (err) {
      if (err instanceof AIClientError) throw err;
      if (err && err.name === "AbortError") {
        throw new AIClientError("ai.timeout", `Request timed out after ${timeoutMs}ms`);
      }
      throw new AIClientError("ai.network", String(err?.message || err));
    } finally {
      clearTimeout(timer);
    }
  }
  async listModels() {
    const adapter = adapterFor(this.endpoint);
    assertEndpoint(this.endpoint, { endpoint: this.endpoint, assertModeAllowed: this.assertModeAllowed });
    assertCredentials(this.endpoint, this.allowKeyless);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const built = adapter.buildModelsRequest(this.endpoint);
    try {
      const res = await this.fetchImpl(built.url, { method: "GET", headers: built.headers, signal: controller.signal });
      const text = await res.text();
      if (res.status === 429) throw new AIClientError("ai.rate-limited", "Provider rate limit (429)");
      if (res.status < 200 || res.status >= 300) {
        throw new AIClientError("ai.http-error", extractMessage(text) || `HTTP ${res.status}`, { status: res.status });
      }
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new AIClientError("ai.bad-shape", "Model list response is not valid JSON");
      }
      const models = adapter.parseModelsResponse(json);
      if (models.length === 0) throw new AIClientError("ai.bad-shape", "Model list response has no model ids");
      return {
        models,
        provider: this.endpoint.provider,
        baseUrl: this.endpoint.baseUrl,
        count: models.length
      };
    } catch (err) {
      if (err instanceof AIClientError) throw err;
      if (err && err.name === "AbortError") {
        throw new AIClientError("ai.timeout", `Model list timed out after ${this.timeoutMs}ms`);
      }
      throw new AIClientError("ai.network", String(err?.message || err));
    } finally {
      clearTimeout(timer);
    }
  }
};
function extractMessage(text) {
  try {
    const json = JSON.parse(text);
    return String(json?.error?.message || json?.message || "");
  } catch {
    return String(text || "").slice(0, 500);
  }
}
function createAIClient(options) {
  return new AIClient(options);
}

// src/config/providers.ts
var AI_PROVIDERS = [
  {
    key: "openai",
    name: "OpenAI",
    family: "openai-compatible",
    icon: "i-simple-icons-openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    keyless: false,
    docsUrl: "https://platform.openai.com/docs/api-reference"
  },
  {
    key: "anthropic",
    name: "Anthropic",
    family: "anthropic",
    icon: "i-simple-icons-anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    keyless: false,
    docsUrl: "https://docs.anthropic.com"
  },
  {
    key: "google_ai",
    name: "Google AI (Gemini)",
    family: "openai-compatible",
    icon: "i-simple-icons-google",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyless: false,
    docsUrl: "https://ai.google.dev/api"
  },
  {
    key: "groq",
    name: "Groq",
    family: "openai-compatible",
    icon: "i-lucide-zap",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    keyless: false,
    docsUrl: "https://console.groq.com/docs"
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    family: "openai-compatible",
    icon: "i-simple-icons-deepseek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    keyless: false,
    docsUrl: "https://api-docs.deepseek.com"
  },
  {
    key: "mistral",
    name: "Mistral AI",
    family: "openai-compatible",
    icon: "i-simple-icons-mistralai",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    keyless: false,
    docsUrl: "https://docs.mistral.ai"
  },
  {
    key: "together",
    name: "Together AI",
    family: "openai-compatible",
    icon: "i-lucide-cloud",
    defaultBaseUrl: "https://api.together.xyz/v1",
    keyless: false,
    docsUrl: "https://docs.together.ai"
  },
  {
    key: "cerebras",
    name: "Cerebras",
    family: "openai-compatible",
    icon: "i-lucide-cpu",
    defaultBaseUrl: "https://api.cerebras.ai/v1",
    keyless: false,
    docsUrl: "https://inference-docs.cerebras.ai"
  },
  {
    key: "cohere",
    name: "Cohere (compatibility API)",
    family: "openai-compatible",
    icon: "i-lucide-orbit",
    defaultBaseUrl: "https://api.cohere.ai/compatibility/v1",
    keyless: false,
    docsUrl: "https://docs.cohere.com"
  },
  {
    key: "github_models",
    name: "GitHub Models",
    family: "openai-compatible",
    icon: "i-simple-icons-github",
    defaultBaseUrl: "https://models.inference.ai.azure.com",
    keyless: false,
    docsUrl: "https://docs.github.com/en/github-models"
  },
  {
    key: "openrouter",
    name: "OpenRouter",
    family: "openai-compatible",
    icon: "i-simple-icons-openrouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    keyless: false,
    docsUrl: "https://openrouter.ai/docs/api-reference"
  },
  {
    key: "nvidia",
    name: "NVIDIA NIM",
    family: "openai-compatible",
    icon: "i-simple-icons-nvidia",
    defaultBaseUrl: "https://integrate.api.nvidia.com/v1",
    keyless: false,
    docsUrl: "https://docs.api.nvidia.com/nim"
  },
  {
    key: "amd_radeon",
    name: "AMD Radeon AI",
    family: "openai-compatible",
    icon: "i-simple-icons-amd",
    defaultBaseUrl: "https://developer.amd.com.cn/radeon/api/v1",
    keyless: false,
    docsUrl: "https://developer.amd.com.cn/radeon/api/v1"
  },
  {
    key: "huggingface",
    name: "Hugging Face Router",
    family: "openai-compatible",
    icon: "i-lucide-boxes",
    defaultBaseUrl: "https://router.huggingface.co/v1",
    keyless: false,
    docsUrl: "https://huggingface.co/docs/inference-providers"
  },
  {
    key: "zhipu",
    name: "Zhipu AI",
    family: "openai-compatible",
    icon: "i-lucide-sparkles",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    keyless: false,
    docsUrl: "https://open.bigmodel.cn/dev/api"
  },
  {
    key: "ollama",
    name: "Ollama (local)",
    family: "openai-compatible",
    icon: "i-simple-icons-ollama",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    keyless: true,
    docsUrl: "https://github.com/ollama/ollama/blob/main/docs/api.md"
  },
  {
    key: "freellmapi",
    name: "FreeLLMAPI deployment",
    family: "openai-compatible",
    icon: "i-lucide-route",
    defaultBaseUrl: "http://127.0.0.1:31415/v1",
    keyless: true,
    docsUrl: null
  },
  {
    key: "opencode",
    name: "OpenCode server",
    family: "openai-compatible",
    icon: "i-lucide-terminal",
    defaultBaseUrl: null,
    keyless: false,
    docsUrl: null
  },
  {
    key: "custom_openai",
    name: "Custom (OpenAI-compatible)",
    family: "openai-compatible",
    icon: "i-lucide-plug",
    defaultBaseUrl: null,
    keyless: false,
    docsUrl: null
  },
  {
    key: "custom",
    name: "Custom endpoint",
    family: "openai-compatible",
    icon: "i-lucide-bot",
    defaultBaseUrl: null,
    keyless: false,
    docsUrl: null
  }
];
var BY_KEY = new Map(AI_PROVIDERS.map((provider) => [provider.key, provider]));
function providerInfo(key) {
  const value = typeof key === "string" ? key.trim().toLowerCase() : "";
  return value ? BY_KEY.get(value) : void 0;
}
function resolveProviderKey(raw) {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return null;
  if (BY_KEY.has(value)) return value;
  if (value === "openai-compatible" || value === "openai_compatible") return "custom";
  return null;
}
function catalogProviderKey(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return resolveProviderKey(value) ?? (value || "custom");
}
function providerDisplayName(key) {
  return providerInfo(key)?.name ?? (typeof key === "string" && key.trim() ? key.trim() : "Custom endpoint");
}
function providerIconFor(key, family) {
  const info = providerInfo(key);
  if (info) return info.icon;
  if (family === "anthropic") return "i-simple-icons-anthropic";
  return "i-lucide-bot";
}

// src/config/connections.ts
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function endpointHost(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "";
  }
}
function entryProviderKey(record, index, errors) {
  const explicitKey = asString(record.providerKey);
  if (explicitKey) {
    if (!providerInfo(explicitKey)) {
      errors.push(`entry ${index}: unknown providerKey "${explicitKey}"`);
      return null;
    }
    return resolveProviderKey(explicitKey);
  }
  const legacy = asString(record.provider) || "openai-compatible";
  const resolved = resolveProviderKey(legacy);
  if (!resolved) {
    errors.push(`entry ${index}: unknown provider "${legacy}"`);
    return null;
  }
  return resolved;
}
function parseAppConnections(raw) {
  const errors = [];
  if (raw === void 0 || raw === null || raw === "") return { connections: [], errors };
  let parsed = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return { connections: [], errors };
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return { connections: [], errors: [`AI_LOCAL_CONNECTIONS is not valid JSON: ${err?.message || "parse error"}`] };
    }
  }
  if (!Array.isArray(parsed)) {
    return { connections: [], errors: ["AI_LOCAL_CONNECTIONS must be a JSON array"] };
  }
  const seen = /* @__PURE__ */ new Set();
  const connections = [];
  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      errors.push(`entry ${index}: must be an object`);
      return;
    }
    const record = entry;
    const connectionId = asString(record.connectionId);
    const baseUrl = normalizeBaseUrl(asString(record.baseUrl));
    const apiKey = asString(record.apiKey) || void 0;
    const apiKeyEnv = asString(record.apiKeyEnv) || void 0;
    if (!connectionId) {
      errors.push(`entry ${index}: connectionId is required`);
      return;
    }
    if (!baseUrl) {
      errors.push(`entry ${index}: baseUrl is required`);
      return;
    }
    if (!isHttpUrl(baseUrl)) {
      errors.push(`entry ${index}: baseUrl must be an http(s) URL`);
      return;
    }
    if (apiKeyEnv && !/^AI_API_KEY(_[A-Z0-9_]+)?$/.test(apiKeyEnv)) {
      errors.push(`entry ${index}: apiKeyEnv must be AI_API_KEY or AI_API_KEY_<SUFFIX>`);
      return;
    }
    if (seen.has(connectionId)) {
      errors.push(`entry ${index}: duplicate connectionId "${connectionId}"`);
      return;
    }
    const providerKey = entryProviderKey(record, index, errors);
    if (!providerKey) return;
    const models = Array.isArray(record.models) ? record.models.map((model) => {
      if (typeof model === "string") return { modelId: model.trim() };
      if (model && typeof model === "object") {
        const item = model;
        return {
          modelId: asString(item.modelId) || asString(item.id),
          displayName: asString(item.displayName) || void 0
        };
      }
      return { modelId: "" };
    }).filter((model) => model.modelId) : [];
    seen.add(connectionId);
    connections.push({ connectionId, providerKey, baseUrl, apiKey, apiKeyEnv, models });
  });
  return { connections, errors };
}
function findAppConnection(connections, connectionId) {
  const id = asString(connectionId).replace(/^app:/, "");
  if (!id) return void 0;
  return connections.find((entry) => entry.connectionId === id);
}

// src/config/catalog.ts
var APP_ID_PREFIX = "app:";
function appCatalogId(connectionId) {
  const id = connectionId.trim();
  return id.startsWith(APP_ID_PREFIX) ? id : `${APP_ID_PREFIX}${id}`;
}
function stripAppCatalogId(connectionId) {
  return connectionId.trim().replace(/^app:/, "");
}
function toAppCatalogConnection(entry, options) {
  const info = providerInfo(entry.providerKey);
  return {
    connectionId: entry.connectionId,
    provider: entry.providerKey,
    name: options.name || endpointHost(entry.baseUrl) || info?.name || entry.providerKey,
    adapterType: info?.family ?? "openai-compatible",
    hasKey: options.hasKey,
    model: entry.models[0]?.modelId ?? null,
    models: entry.models.map((model) => ({ ...model }))
  };
}
function shadowKey(providerKey, modelId) {
  return `${providerKey}\0${modelId}`;
}
function mergeCatalog(hub, app) {
  const appRows = app.map((connection) => {
    const providerKey = catalogProviderKey(connection.provider);
    return {
      ...connection,
      connectionId: appCatalogId(connection.connectionId),
      provider: providerKey,
      providerKey,
      providerName: providerDisplayName(providerKey),
      source: "app",
      models: connection.models.map((model) => ({ ...model, shadowed: false }))
    };
  });
  const shadowed = new Set(
    appRows.flatMap((connection) => connection.models.map((model) => shadowKey(connection.providerKey, model.modelId)))
  );
  const hubRows = hub.map((connection) => {
    const providerKey = catalogProviderKey(connection.provider);
    const info = providerInfo(providerKey);
    return {
      ...connection,
      provider: providerKey,
      providerKey,
      providerName: providerDisplayName(providerKey),
      adapterType: connection.adapterType || info?.family || "openai-compatible",
      source: "hub",
      models: connection.models.map((model) => ({
        ...model,
        shadowed: shadowed.has(shadowKey(providerKey, model.modelId))
      }))
    };
  });
  return [...appRows, ...hubRows];
}
function selectableModels(connection) {
  return connection.models.filter((model) => !model.shadowed);
}

// src/config/secretBox.ts
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var KEY_BYTES = 32;
var IV_BYTES = 12;
function cryptoApi() {
  const api = globalThis.crypto;
  if (!api?.subtle) {
    throw new AIClientError("ai.no-crypto", "WebCrypto is unavailable in this runtime");
  }
  return api;
}
function toBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[(b0 & 3) << 4 | (b1 ?? 0) >> 4];
    out += b1 === void 0 ? "=" : B64[(b1 & 15) << 2 | (b2 ?? 0) >> 6];
    out += b2 === void 0 ? "=" : B64[b2 & 63];
  }
  return out;
}
function fromBase64(value) {
  const clean = String(value || "").replace(/=+$/, "");
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const index = B64.indexOf(ch);
    if (index < 0) throw new AIClientError("ai.bad-shape", "Invalid base64 payload");
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push(buffer >> bits & 255);
    }
  }
  return Uint8Array.from(out);
}
function hexToBytes(value) {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function generateMasterKey() {
  return toBase64(cryptoApi().getRandomValues(new Uint8Array(KEY_BYTES)));
}
function decodeKeyBytes(value) {
  if (/^[0-9a-fA-F]{64}$/.test(value)) return hexToBytes(value);
  try {
    return fromBase64(value);
  } catch {
    return new Uint8Array(0);
  }
}
function decodeMasterKey(secret) {
  const value = String(secret || "").trim();
  const bytes = decodeKeyBytes(value);
  if (bytes.length !== KEY_BYTES) {
    throw new AIClientError("ai.bad-master-key", `AI_CONFIG_SECRET must decode to ${KEY_BYTES} bytes (got ${bytes.length})`);
  }
  return bytes;
}
async function importAesKey(masterKey) {
  const bytes = typeof masterKey === "string" ? decodeMasterKey(masterKey) : masterKey;
  return cryptoApi().subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealSecret(masterKey, plain) {
  const api = cryptoApi();
  const key = await importAesKey(masterKey);
  const iv = api.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await api.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(String(plain))
  );
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}
async function openSecret(masterKey, sealed) {
  const parts = String(sealed || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new AIClientError("ai.bad-shape", "Stored secret is not v1 ciphertext");
  }
  try {
    const key = await importAesKey(masterKey);
    const plain = await cryptoApi().subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(parts[1]) },
      key,
      fromBase64(parts[2])
    );
    return new TextDecoder().decode(plain);
  } catch (err) {
    if (err instanceof AIClientError) throw err;
    throw new AIClientError("ai.bad-shape", "The configured master key cannot decrypt this value");
  }
}

// src/config/stored.ts
var CONNECTION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function cleanModels(input) {
  const seen = /* @__PURE__ */ new Set();
  const models = [];
  for (const model of input ?? []) {
    const modelId = String(model?.modelId ?? "").trim();
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    const displayName = typeof model.displayName === "string" ? model.displayName.trim() : "";
    models.push({
      modelId,
      ...displayName ? { displayName } : {},
      enabled: model.enabled !== false,
      ...model.isPrimary ? { isPrimary: true } : {},
      ...typeof model.discoveredAt === "string" && model.discoveredAt ? { discoveredAt: model.discoveredAt } : {}
    });
  }
  return models;
}
function normalizeStoredConnection(input, ownerId) {
  const connectionId = String(input.connectionId ?? "").trim();
  if (!CONNECTION_ID_RE.test(connectionId)) {
    throw new AIClientError("ai.bad-shape", "connectionId must match [A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
  }
  const providerKey = resolveProviderKey(input.providerKey) ?? "custom";
  const apiKeyEnv = String(input.apiKeyEnv ?? "").trim();
  return {
    ownerId,
    connectionId,
    providerKey,
    baseUrl: normalizeBaseUrl(String(input.baseUrl ?? "")),
    apiKeyCipher: String(input.apiKeyCipher ?? "").trim(),
    ...apiKeyEnv ? { apiKeyEnv } : {},
    enabled: input.enabled !== false,
    models: cleanModels(input.models)
  };
}
function storedToAppConnection(record, options = {}) {
  const models = record.models.filter((model) => options.includeDisabledModels || model.enabled).map((model) => ({
    modelId: model.modelId,
    ...model.displayName ? { displayName: model.displayName } : {}
  }));
  return {
    connectionId: record.connectionId,
    providerKey: record.providerKey,
    baseUrl: record.baseUrl,
    ...options.apiKey ? { apiKey: options.apiKey } : {},
    ...record.apiKeyEnv ? { apiKeyEnv: record.apiKeyEnv } : {},
    models
  };
}

// src/config/stores/storeError.ts
function storeFailure(operation, error) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
  return new AIClientError("ai.store-failed", `AI config store ${operation} failed: ${message}`);
}
async function guardStore(operation, run) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AIClientError) throw error;
    throw storeFailure(operation, error);
  }
}

// src/config/stores/mongo.ts
var DEFAULT_COLLECTION = "ai_connections";
function createMongoAIConfigStore(db, ownerId, options = {}) {
  const collection = db.collection(options.collectionName || DEFAULT_COLLECTION);
  let schemaReady = null;
  function ensureSchema() {
    if (!schemaReady) {
      schemaReady = guardStore(
        "ensure index",
        () => collection.createIndex({ ownerId: 1, connectionId: 1 }, { unique: true })
      );
    }
    return schemaReady;
  }
  async function findOne(connectionId) {
    return guardStore("read", async () => {
      await ensureSchema();
      const doc = await collection.findOne({ ownerId, connectionId });
      return doc || null;
    });
  }
  return {
    async ensureSchema() {
      await ensureSchema();
    },
    async listConnections() {
      return guardStore("list", async () => {
        await ensureSchema();
        const docs = await collection.find({ ownerId }).toArray();
        return docs.sort((a, b) => a.connectionId.localeCompare(b.connectionId));
      });
    },
    async upsertConnection(input) {
      const record = normalizeStoredConnection(input, ownerId);
      return guardStore("upsert", async () => {
        await ensureSchema();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const existing = await findOne(record.connectionId);
        const stored = {
          ...record,
          createdAt: existing?.createdAt || now,
          updatedAt: now
        };
        await collection.updateOne(
          { ownerId, connectionId: record.connectionId },
          { $set: stored },
          { upsert: true }
        );
        return stored;
      });
    },
    async removeConnection(connectionId) {
      await guardStore("delete", async () => {
        await ensureSchema();
        await collection.deleteOne({ ownerId, connectionId });
      });
    },
    async replaceModels(connectionId, models) {
      const existing = await findOne(connectionId);
      const record = normalizeStoredConnection({
        ...existing ?? { connectionId, providerKey: "custom", baseUrl: "", apiKeyCipher: "", enabled: true },
        models
      }, ownerId);
      await guardStore("replace models", async () => {
        await ensureSchema();
        await collection.updateOne(
          { ownerId, connectionId },
          { $set: { models: record.models, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } }
        );
      });
    }
  };
}

// src/config/stores/localStorage.ts
var DEFAULT_PREFIX = "tm.ai.config.v1";
function createLocalStorageAIConfigStore(storage, ownerId, options = {}) {
  const key = `${options.keyPrefix || DEFAULT_PREFIX}.${ownerId}`;
  function read() {
    let raw = null;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      throw storeFailure("read", error);
    }
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.connectionId === "string") : [];
    } catch {
      return [];
    }
  }
  function write(records, operation) {
    try {
      storage.setItem(key, JSON.stringify(records));
    } catch (error) {
      throw storeFailure(operation, error);
    }
  }
  return {
    async listConnections() {
      return read();
    },
    async upsertConnection(input) {
      const record = normalizeStoredConnection(input, ownerId);
      const records = read();
      const index = records.findIndex((entry) => entry.connectionId === record.connectionId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const next = {
        ...record,
        createdAt: index >= 0 ? records[index].createdAt || now : now,
        updatedAt: now
      };
      if (index >= 0) records[index] = next;
      else records.push(next);
      write(records, "upsert");
      return next;
    },
    async removeConnection(connectionId) {
      write(read().filter((entry) => entry.connectionId !== connectionId), "delete");
    },
    async replaceModels(connectionId, models) {
      const records = read();
      const index = records.findIndex((entry) => entry.connectionId === connectionId);
      if (index < 0) return;
      const record = normalizeStoredConnection({ ...records[index], models }, ownerId);
      records[index] = { ...record, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      write(records, "replace models");
    }
  };
}

// src/config/stores/supabase.ts
var SUPABASE_AI_CONNECTIONS_SQL = `create table if not exists public.ai_connections (
  owner_id text not null,
  connection_id text not null,
  provider_key text not null,
  base_url text not null default '',
  api_key_cipher text not null default '',
  api_key_env text,
  enabled boolean not null default true,
  models jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, connection_id)
);
-- Runs with the service-role key only. Enable RLS without policies so the
-- anon/authenticated keys can never read ciphertext directly.`;
var DEFAULT_TABLE = "ai_connections";
var DEFAULT_SCOPE = "owner_id";
function defaultToRow(record) {
  return {
    owner_id: record.ownerId,
    connection_id: record.connectionId,
    provider_key: record.providerKey,
    base_url: record.baseUrl,
    api_key_cipher: record.apiKeyCipher,
    api_key_env: record.apiKeyEnv ?? null,
    enabled: record.enabled,
    models: record.models,
    created_at: record.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: record.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function defaultFromRow(row) {
  const models = Array.isArray(row.models) ? row.models : [];
  return {
    ownerId: String(row.owner_id ?? ""),
    connectionId: String(row.connection_id ?? ""),
    providerKey: String(row.provider_key ?? "custom"),
    baseUrl: String(row.base_url ?? ""),
    apiKeyCipher: String(row.api_key_cipher ?? ""),
    ...row.api_key_env ? { apiKeyEnv: String(row.api_key_env) } : {},
    enabled: row.enabled !== false,
    models,
    ...row.created_at ? { createdAt: String(row.created_at) } : {},
    ...row.updated_at ? { updatedAt: String(row.updated_at) } : {}
  };
}
function createSupabaseAIConfigStore(client, ownerId, options = {}) {
  const table = options.table || DEFAULT_TABLE;
  const scope = options.scopeColumn || DEFAULT_SCOPE;
  const toRow = options.toRow || defaultToRow;
  const fromRow = options.fromRow || defaultFromRow;
  function fail(error, operation) {
    throw storeFailure(operation, error);
  }
  async function findOne(connectionId) {
    return guardStore("read", async () => {
      const { data, error } = await client.from(table).select("*").eq(scope, ownerId).eq("connection_id", connectionId).maybeSingle();
      if (error) fail(error, "read");
      return data ? fromRow(data) : null;
    });
  }
  return {
    async listConnections() {
      return guardStore("list", async () => {
        const { data, error } = await client.from(table).select("*").eq(scope, ownerId).order("connection_id");
        if (error) fail(error, "list");
        return (data || []).map((row) => fromRow(row));
      });
    },
    async upsertConnection(input) {
      const record = normalizeStoredConnection(input, ownerId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const existing = await findOne(record.connectionId);
      const stored = {
        ...record,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      return guardStore("upsert", async () => {
        const { error } = await client.from(table).upsert(toRow(stored), {
          onConflict: `${scope},connection_id`
        });
        if (error) fail(error, "upsert");
        return stored;
      });
    },
    async removeConnection(connectionId) {
      await guardStore("delete", async () => {
        const { error } = await client.from(table).delete().eq(scope, ownerId).eq("connection_id", connectionId);
        if (error) fail(error, "delete");
      });
    },
    async replaceModels(connectionId, models) {
      const existing = await findOne(connectionId);
      if (!existing) return;
      const record = normalizeStoredConnection({ ...existing, models }, ownerId);
      await guardStore("replace models", async () => {
        const { error } = await client.from(table).update({
          models: record.models,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq(scope, ownerId).eq("connection_id", connectionId);
        if (error) fail(error, "replace models");
      });
    }
  };
}
export {
  AIClient,
  AIClientError,
  AI_PROVIDERS,
  APP_ID_PREFIX,
  SUPABASE_AI_CONNECTIONS_SQL,
  anthropicAdapter,
  appCatalogId,
  catalogProviderKey,
  createAIClient,
  createLocalStorageAIConfigStore,
  createMongoAIConfigStore,
  createSupabaseAIConfigStore,
  decodeMasterKey,
  endpointHost,
  findAppConnection,
  fromBase64,
  generateMasterKey,
  isLocalEndpoint,
  mergeCatalog,
  normalizeBaseUrl,
  normalizeStoredConnection,
  openAICompatibleAdapter,
  openSecret,
  parseAppConnections,
  providerDisplayName,
  providerIconFor,
  providerInfo,
  resolveProviderKey,
  sealSecret,
  selectableModels,
  storedToAppConnection,
  stripAppCatalogId,
  toAppCatalogConnection,
  toBase64
};
//# sourceMappingURL=index.js.map