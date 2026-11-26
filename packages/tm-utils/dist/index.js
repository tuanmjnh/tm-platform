// src/deviceCredentialScope.ts
function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "").toLowerCase();
}
function credentialBelongsTo(credential, target) {
  const id = String(credential?.deviceId || "").trim();
  const secret = String(credential?.secret || "").trim();
  if (!id || !secret) return false;
  const origin = normalizeOrigin(target?.hubUrl);
  const appId = String(target?.appId || "").trim();
  if (!origin || !appId) return false;
  const storedOrigin = normalizeOrigin(credential?.hubOrigin);
  const storedAppId = String(credential?.appId || "").trim();
  if (!storedOrigin) return false;
  return storedOrigin === origin && storedAppId === appId;
}
var TERMINAL_DEVICE_ERRORS = /* @__PURE__ */ new Set([
  "error.deviceUnauthorized",
  "error.deviceExpired",
  "deviceUnauthorized",
  "deviceExpired"
]);
function isTerminalDeviceRejection(statusCode, statusMessage) {
  if (Number(statusCode) !== 401) return false;
  return TERMINAL_DEVICE_ERRORS.has(String(statusMessage || "").trim());
}

// src/aiError.ts
function cleanRawText(str) {
  let cleaned = str.replace(/^HTTP\s+\d+\s*[-—:]\s*/i, "");
  cleaned = cleaned.replace(/(?:For more information|To monitor your current usage)[\s\S]*$/i, "");
  cleaned = cleaned.replace(/https?:\/\/[^\s)]+/g, "");
  cleaned = cleaned.replace(/\s*\*\s*Quota exceed[^\n]*/i, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}
function extractCoreMessage(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const msg = parsed?.error?.message || parsed?.message || Array.isArray(parsed) && parsed[0]?.error?.message;
      if (typeof msg === "string" && msg.trim()) {
        return cleanRawText(msg);
      }
    }
  } catch {
    const msgMatch = text.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    if (msgMatch && msgMatch[1]) {
      return cleanRawText(msgMatch[1].replace(/\\n/g, " ").replace(/\\"/g, '"'));
    }
  }
  return cleanRawText(text);
}
function parseUpstreamAiError(raw, status) {
  const text = String(raw || "").trim();
  const isQuota = status === 429 || /quota|rate[- ]?limit|resource[-_ ]exhausted|exceeded your current quota/i.test(text);
  if (isQuota) {
    return {
      reasonCode: "quota_exceeded",
      cleanMessage: extractCoreMessage(text) || "You have exceeded your current quota or rate limit."
    };
  }
  const isAuth = status === 401 || status === 403 || /unauthorized|forbidden|invalid[-_ ]api[-_ ]key|permission[-_ ]denied/i.test(text);
  if (isAuth) {
    return {
      reasonCode: "invalid_key",
      cleanMessage: extractCoreMessage(text) || "Invalid API key or unauthorized access."
    };
  }
  const isNotFound = status === 404 || /not[-_ ]found|model does not exist/i.test(text);
  if (isNotFound) {
    return {
      reasonCode: "not_found",
      cleanMessage: extractCoreMessage(text) || "The requested model was not found or is unavailable."
    };
  }
  const isOverload = status === 503 || status === 502 || /overloaded|temporarily unavailable|service unavailable/i.test(text);
  if (isOverload) {
    return {
      reasonCode: "server_overloaded",
      cleanMessage: extractCoreMessage(text) || "The AI service is temporarily overloaded or unavailable."
    };
  }
  const isTimeout = status === 408 || status === 504 || /timed?[- ]?out|timeout/i.test(text);
  if (isTimeout) {
    return {
      reasonCode: "timeout",
      cleanMessage: extractCoreMessage(text) || "Request timed out after 10 seconds."
    };
  }
  return {
    reasonCode: "generic",
    cleanMessage: extractCoreMessage(text) || text.slice(0, 200)
  };
}
export {
  TERMINAL_DEVICE_ERRORS,
  credentialBelongsTo,
  isTerminalDeviceRejection,
  normalizeOrigin,
  parseUpstreamAiError
};
//# sourceMappingURL=index.js.map