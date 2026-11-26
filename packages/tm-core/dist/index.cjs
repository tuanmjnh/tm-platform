"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AI_TRANSFER_FORMATS: () => AI_TRANSFER_FORMATS,
  ALL_XFADE_TRANSITIONS: () => ALL_XFADE_TRANSITIONS,
  DEFAULT_PASSWORD_OPTIONS: () => DEFAULT_PASSWORD_OPTIONS,
  b64urlToBuf: () => b64urlToBuf,
  bufToB64url: () => bufToB64url,
  buildRouteTree: () => buildRouteTree,
  cleanImageUrl: () => cleanImageUrl,
  cleanSpaces: () => cleanSpaces,
  cleanTransferValue: () => cleanTransferValue,
  countStats: () => countStats,
  createInflight: () => createInflight,
  decodeAiTransfer: () => decodeAiTransfer,
  decodeBase64: () => decodeBase64,
  decodeBase64Safe: () => decodeBase64Safe,
  decodeBinary: () => decodeBinary,
  decodeHex: () => decodeHex,
  decodeJwt: () => decodeJwt,
  decodeUrl: () => decodeUrl,
  decodeUrlSafe: () => decodeUrlSafe,
  detectAiTransferFormat: () => detectAiTransferFormat,
  detectDisplayType: () => detectDisplayType,
  downloadFile: () => downloadFile,
  encodeBase64: () => encodeBase64,
  encodeBase64Safe: () => encodeBase64Safe,
  encodeBinary: () => encodeBinary,
  encodeHex: () => encodeHex,
  encodeJwt: () => encodeJwt,
  encodeUrl: () => encodeUrl,
  encodeUrlSafe: () => encodeUrlSafe,
  ensureForwardSlash: () => ensureForwardSlash,
  escapeHtml: () => escapeHtml,
  escapeHtmlSafe: () => escapeHtmlSafe,
  escapeRegExp: () => escapeRegExp,
  formatDate: () => formatDate,
  formatNumber: () => formatNumber,
  formatTimeAgo: () => formatTimeAgo,
  generateApiKey: () => generateApiKey,
  generateEan13: () => generateEan13,
  generateEmail: () => generateEmail,
  generateHexKey: () => generateHexKey,
  generateName: () => generateName,
  generatePassword: () => generatePassword,
  generatePasswordBatch: () => generatePasswordBatch,
  generatePin: () => generatePin,
  generateRandomKey: () => generateRandomKey,
  generateRandomKeyBatch: () => generateRandomKeyBatch,
  generateRealisticFingerprint: () => generateRealisticFingerprint,
  generateToken: () => generateToken,
  generateUsername: () => generateUsername,
  generateUsernameBatch: () => generateUsernameBatch,
  generateUuid: () => generateUuid,
  getApiErrorStatus: () => getApiErrorStatus,
  getErrorKey: () => getErrorKey,
  getErrorMessage: () => getErrorMessage,
  getImage: () => getImage,
  getPresetErrorMessage: () => getPresetErrorMessage,
  isHubConnectionError: () => isHubConnectionError,
  isIconify: () => isIconify,
  isImage: () => isImage,
  isRawSvg: () => isRawSvg,
  isSpecialImage: () => isSpecialImage,
  md5: () => md5,
  minifySvg: () => minifySvg,
  numberLines: () => numberLines,
  parseAiTransfer: () => parseAiTransfer,
  readCsv: () => readCsv,
  readJson: () => readJson,
  removeDuplicateLines: () => removeDuplicateLines,
  removeEmptyLines: () => removeEmptyLines,
  removeVietnameseAccents: () => removeVietnameseAccents,
  reverseCharacters: () => reverseCharacters,
  reverseLines: () => reverseLines,
  reverseText: () => reverseText,
  rot13: () => rot13,
  runBatchPool: () => runBatchPool,
  runHash: () => runHash,
  sanitizeSvg: () => sanitizeSvg,
  serializeAiTransfer: () => serializeAiTransfer,
  sha1: () => sha1,
  sha256: () => sha256,
  sha384: () => sha384,
  sha512: () => sha512,
  slugify: () => slugify,
  sortLinesAsc: () => sortLinesAsc,
  sortLinesDesc: () => sortLinesDesc,
  toAlternatingCase: () => toAlternatingCase,
  toCamelCase: () => toCamelCase,
  toCapitalize: () => toCapitalize,
  toCode: () => toCode,
  toConstantCase: () => toConstantCase,
  toInverseCase: () => toInverseCase,
  toKebabCase: () => toKebabCase,
  toLowerCase: () => toLowerCase,
  toNormalize: () => toNormalize,
  toPascalCase: () => toPascalCase,
  toSentenceCase: () => toSentenceCase,
  toSlug: () => toSlug,
  toSnakeCase: () => toSnakeCase,
  toUpperCase: () => toUpperCase,
  unescapeHtml: () => unescapeHtml,
  unescapeHtmlSafe: () => unescapeHtmlSafe
});
module.exports = __toCommonJS(index_exports);

// src/format/date.ts
var RELATIVE_LOCALE = {
  vi: "en-VN",
  en: "en-US"
};
var relativeLocale = (locale) => {
  if (!locale) return "en-VN";
  return RELATIVE_LOCALE[locale] || locale;
};
var formatDate = (dateString, locale) => {
  if (!dateString) return "";
  const intlLocale = locale === "en" ? "en-US" : "vi-VN";
  return new Date(dateString).toLocaleDateString(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};
var formatTimeAgo = (date, locale) => {
  if (!date) return "";
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";
  const diff = (Date.now() - then) / 1e3;
  const rtf = new Intl.RelativeTimeFormat(relativeLocale(locale), { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.floor(diff), "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  return rtf.format(-Math.floor(diff / 86400), "day");
};
var formatNumber = (value, intlOptions, locale) => {
  if (value === void 0 || value === null || value === "") return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat(locale || "vi-VN", intlOptions).format(num);
};

// src/slug/index.ts
var toSlug = (str) => {
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/([^0-9a-z-\s])/g, "").replace(/(\s+)/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
};
var toCode = (str) => toSlug(str).replace(/-/g, "_").toUpperCase();
var toNormalize = (string) => {
  if (!string) return "";
  return string.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d");
};
var generateEan13 = () => {
  const digits = [];
  for (let i = 0; i < 12; i++) digits.push(Math.floor(Math.random() * 10));
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  digits.push((10 - sum % 10) % 10);
  return digits.join("");
};

// src/text/index.ts
var minifySvg = (svg) => {
  return svg.trim().replace(/<!--.*?-->/gs, "").replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").replace(/\r?\n|\r/g, "");
};
var escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// src/text/transform.ts
function toUpperCase(text) {
  return text.toUpperCase();
}
function toLowerCase(text) {
  return text.toLowerCase();
}
function toCapitalize(text) {
  return text.toLowerCase().replace(/(^|\P{L})(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}
function toSentenceCase(text) {
  const lower = text.toLowerCase();
  return lower.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}
function splitWords(text) {
  return text.trim().replace(/[^\p{L}\p{N}\s-]/gu, "").split(/[\s-_]+/).filter(Boolean);
}
function toCamelCase(text) {
  const words = splitWords(text);
  const first = words[0];
  if (!first) return "";
  return first.toLowerCase() + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}
function toPascalCase(text) {
  return splitWords(text).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}
function toKebabCase(text) {
  return text.trim().replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").replace(/[^\p{L}\p{N}-]+/gu, "").toLowerCase();
}
function toSnakeCase(text) {
  return text.trim().replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").replace(/[^\p{L}\p{N}_]+/gu, "").toLowerCase();
}
function toConstantCase(text) {
  return toSnakeCase(text).toUpperCase();
}
function toAlternatingCase(text) {
  let flag = false;
  return text.split("").map((char) => {
    if (/[a-zA-Z]/.test(char)) {
      flag = !flag;
      return flag ? char.toUpperCase() : char.toLowerCase();
    }
    return char;
  }).join("");
}
function toInverseCase(text) {
  return text.split("").map((char) => {
    if (char === char.toUpperCase()) return char.toLowerCase();
    return char.toUpperCase();
  }).join("");
}
function removeVietnameseAccents(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function slugify(text) {
  return removeVietnameseAccents(text).toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function cleanSpaces(text) {
  return text.split("\n").map((line) => line.trim().replace(/\s+/g, " ")).join("\n");
}
function removeEmptyLines(text) {
  return text.split("\n").filter((line) => line.trim().length > 0).join("\n");
}
function removeDuplicateLines(text) {
  const lines = text.split("\n");
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      result.push(line);
    }
  }
  return result.join("\n");
}
function sortLinesAsc(text) {
  return text.split("\n").sort((a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" })).join("\n");
}
function sortLinesDesc(text) {
  return text.split("\n").sort((a, b) => b.localeCompare(a, void 0, { numeric: true, sensitivity: "base" })).join("\n");
}
function reverseLines(text) {
  return text.split("\n").reverse().join("\n");
}
function reverseCharacters(text) {
  return Array.from(text).reverse().join("");
}
function numberLines(text) {
  const lines = text.split("\n");
  const pad = String(lines.length).length;
  return lines.map((line, idx) => `${String(idx + 1).padStart(pad, " ")}. ${line}`).join("\n");
}
function encodeBase64Safe(text) {
  try {
    const bytes = new TextEncoder().encode(text);
    const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    return btoa(binString);
  } catch {
    return text;
  }
}
function decodeBase64Safe(text) {
  try {
    const binString = atob(text.trim());
    const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return text;
  }
}
function encodeUrlSafe(text) {
  return encodeURIComponent(text);
}
function decodeUrlSafe(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
function escapeHtmlSafe(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function unescapeHtmlSafe(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}
function countStats(text) {
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? (text.trim().match(/[\p{L}\p{N}]+/gu) || []).length : 0;
  const lines = text ? text.split("\n").length : 0;
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length : 0;
  const readingTimeMinutes = Math.ceil(words / 200);
  return {
    chars,
    charsNoSpaces,
    words,
    lines,
    paragraphs,
    readingTimeMinutes
  };
}

// src/media/image.ts
var getImage = (img, customKey) => {
  if (!img) return "/placeholder.png";
  if (typeof img === "string") return img;
  const keys = Array.isArray(customKey) ? customKey : [customKey || "url"];
  for (const key of keys) {
    const value = img[key];
    if (typeof value === "string" && value) return value;
  }
  return "/placeholder.png";
};
var cleanImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.startsWith("data:") || url.startsWith("<svg")) return url;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("unsplash.com") || urlObj.hostname.includes("cloudinary.com")) {
      const searchParams = urlObj.searchParams;
      for (const key of ["w", "h", "width", "height", "fit", "crop"]) searchParams.delete(key);
      const query = searchParams.toString();
      return urlObj.origin + urlObj.pathname + (query ? "?" + query : "");
    }
  } catch {
    return url;
  }
  return url;
};
var isRawSvg = (val) => {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) && trimmed.includes("<svg");
};
var isIconify = (url) => {
  if (!url) return false;
  const value = typeof url === "string" ? url.trim() : url;
  if (value.startsWith("<svg")) return false;
  return (value.includes(":") || value.startsWith("i-")) && !value.startsWith("http") && !value.startsWith("/");
};
var isSpecialImage = (url) => {
  if (typeof url !== "string") return false;
  return /\.(ico|svg)$/i.test(url);
};
var isImage = (url) => {
  if (!url || typeof url !== "string") return false;
  const value = url.trim().toLowerCase();
  if (isSpecialImage(value)) return true;
  if (/\.(jpeg|jpg|gif|png|webp)$/.test(value)) return true;
  if (value.startsWith("http") || value.startsWith("/")) return true;
  return false;
};
var detectDisplayType = (val) => {
  if (!val) return "icon";
  if (isRawSvg(val)) return "svg";
  if (isImage(val)) return "image";
  return "icon";
};
var ensureForwardSlash = (url) => {
  if (!url || typeof url !== "string") return url;
  const value = url.trim();
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("/") || value.startsWith("<svg")) {
    return value;
  }
  return "/" + value;
};

// src/media/sanitizeSvg.ts
var sanitizeSvg = (svg, prefix) => {
  if (!svg || typeof svg !== "string") return "";
  let content = svg.trim();
  const svgMatch = content.match(/<svg[^>]*>/i);
  if (!svgMatch) return content;
  const openingTag = svgMatch[0];
  let sanitizedTag = openingTag.replace(/\s+(width|height)=["'][^"']*["']/gi, "").replace(/\s+(width|height)=[^ >"']+/gi, "");
  if (!/viewBox=/i.test(openingTag)) {
    const wMatch = openingTag.match(/\bwidth=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
    const hMatch = openingTag.match(/\bheight=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
    if (wMatch && hMatch) {
      sanitizedTag = sanitizedTag.replace(/<svg/i, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
    }
  }
  content = content.replace(openingTag, sanitizedTag);
  for (const match of Array.from(content.matchAll(/filter=["']url\(#([^)'"]+)\)["']/gi))) {
    const filterId = match[1];
    if (!new RegExp(`<filter[^>]*id=["']${escapeRegExp(filterId)}["']`, "i").test(content)) {
      content = content.replace(match[0], "");
    }
  }
  const isClient = typeof globalThis !== "undefined" && "window" in globalThis;
  const effectivePrefix = prefix || (isClient ? `s-${Math.random().toString(36).slice(2, 8)}` : void 0);
  if (effectivePrefix) {
    const cleanPrefix = effectivePrefix.replace(/[^a-zA-Z0-9_-]/g, "");
    const idMatches = Array.from(content.matchAll(/\bid=["']([^"']+)["']/gi));
    for (const match of idMatches) {
      const oldId = match[1];
      if (!oldId) continue;
      const newId = `${cleanPrefix}-${oldId}`;
      const escaped = escapeRegExp(oldId);
      content = content.replace(new RegExp(`\\bid=["']${escaped}["']`, "gi"), `id="${newId}"`).replace(new RegExp(`url\\(\\s*['"]?#${escaped}['"]?\\s*\\)`, "gi"), `url(#${newId})`).replace(new RegExp(`\\bhref=["']#${escaped}["']`, "gi"), `href="#${newId}"`).replace(new RegExp(`\\bxlink:href=["']#${escaped}["']`, "gi"), `xlink:href="#${newId}"`);
    }
  }
  return content;
};

// src/io/index.ts
var KNOWN_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "mp3", "mp4", "zip", "json", "csv"];
var parseCsvLine = (line) => {
  const result = [];
  let startValueIndex = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      let value = line.substring(startValueIndex, i);
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/""/g, '"');
      result.push(value);
      startValueIndex = i + 1;
    }
  }
  let lastValue = line.substring(startValueIndex);
  if (lastValue.startsWith('"') && lastValue.endsWith('"')) lastValue = lastValue.slice(1, -1).replace(/""/g, '"');
  result.push(lastValue);
  return result;
};
var readCsv = (csvText) => {
  const cleanCsv = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText;
  const lines = cleanCsv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0] || "");
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = parseCsvLine(lines[i] || "");
    if (currentLine.length !== headers.length) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = currentLine[index]?.trim() || "";
    });
    result.push(row);
  }
  return result;
};
var readJson = (jsonText) => {
  const data = JSON.parse(jsonText);
  return Array.isArray(data) ? data : [data];
};
var hasDocument = () => typeof document !== "undefined" && !!document.body;
var saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
var cleanFilename = (baseName, fallbackExt) => {
  const lastDotIndex = baseName.lastIndexOf(".");
  let namePart = baseName;
  let extPart = fallbackExt;
  if (lastDotIndex > 0) {
    const possibleExt = baseName.substring(lastDotIndex + 1).toLowerCase();
    if (KNOWN_EXTENSIONS.includes(possibleExt)) {
      namePart = baseName.substring(0, lastDotIndex);
      extPart = possibleExt;
    }
  }
  return `${toSlug(namePart)}.${extPart}`;
};
var extensionFromContentType = (contentType, fallback) => {
  if (!contentType) return fallback;
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/jpeg")) return "jpg";
  if (contentType.includes("image/gif")) return "gif";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/svg+xml")) return "svg";
  if (contentType.includes("application/pdf")) return "pdf";
  if (contentType.includes("audio/")) return contentType.split("/")[1] || "mp3";
  if (contentType.includes("video/")) return contentType.split("/")[1] || "mp4";
  return fallback;
};
var downloadFile = async (url, filename) => {
  if (!url) return;
  if (!hasDocument()) return;
  const urlExtMatch = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  let ext = urlExtMatch ? urlExtMatch[1] : "bin";
  if (isRawSvg(url)) {
    saveBlob(new Blob([url], { type: "image/svg+xml" }), cleanFilename(filename || "image", "svg"));
    return;
  }
  if (isIconify(url)) return;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    ext = extensionFromContentType(response.headers.get("content-type"), ext);
    saveBlob(blob, cleanFilename(filename || "download", ext));
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.download = cleanFilename(filename || "download", ext);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// src/async/inflight.ts
function createInflight() {
  let pending = null;
  return (task) => {
    if (pending) return pending;
    pending = task().finally(() => {
      pending = null;
    });
    return pending;
  };
}

// src/async/batchPool.ts
var realDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function runBatchPool(items, opts) {
  const delay = opts.delay ?? realDelay;
  const tick = opts.tickMs ?? 200;
  let active = 0;
  const launch = (item) => {
    item.status = "running";
    active++;
    void (async () => {
      try {
        await opts.run(item);
        item.status = "done";
      } catch {
        if (item.retry < opts.maxRetry()) {
          item.retry++;
          item.status = "waiting";
        } else {
          item.status = "failed";
        }
      } finally {
        active--;
      }
    })();
  };
  const nextWaiting = () => items.find((item) => item.status === "waiting");
  const pending = () => items.some((item) => item.status === "waiting" || item.status === "running");
  while (pending()) {
    if (opts.isStopping()) {
      for (const item of items) if (item.status === "waiting") item.status = "cancelled";
      if (active === 0) break;
      await delay(tick);
      continue;
    }
    if (opts.isPaused()) {
      await delay(tick);
      continue;
    }
    let launched = 0;
    while (active < opts.concurrency()) {
      const item = nextWaiting();
      if (!item) break;
      launch(item);
      launched++;
    }
    await delay(launched > 0 ? opts.pauseMs() : tick);
  }
  return {
    done: items.filter((item) => item.status === "done").length,
    failed: items.filter((item) => item.status === "failed").length,
    cancelled: items.filter((item) => item.status === "cancelled").length
  };
}

// src/async/transitions.ts
var ALL_XFADE_TRANSITIONS = [
  { id: "fade", name: "Fade", description: "Crossfade between images" },
  { id: "wipeleft", name: "Wipe Left", description: "Wipe to the left" },
  { id: "wiperight", name: "Wipe Right", description: "Wipe to the right" },
  { id: "wipeup", name: "Wipe Up", description: "Wipe upwards" },
  { id: "wipedown", name: "Wipe Down", description: "Wipe downwards" },
  { id: "slideleft", name: "Slide Left", description: "Slide to the left" },
  { id: "slideright", name: "Slide Right", description: "Slide to the right" },
  { id: "slideup", name: "Slide Up", description: "Slide upwards" },
  { id: "slidedown", name: "Slide Down", description: "Slide downwards" },
  { id: "circlecrop", name: "Circle Crop", description: "Circle shape crop" },
  { id: "rectcrop", name: "Rect Crop", description: "Rectangle shape crop" },
  { id: "distance", name: "Distance", description: "Distance transition effect" },
  { id: "fadeblack", name: "Fade Black", description: "Fade through black" },
  { id: "fadewhite", name: "Fade White", description: "Fade through white" },
  { id: "radial", name: "Radial", description: "Radial sweep effect" },
  { id: "smoothleft", name: "Smooth Left", description: "Smooth slide to the left" },
  { id: "smoothright", name: "Smooth Right", description: "Smooth slide to the right" },
  { id: "smoothup", name: "Smooth Up", description: "Smooth slide upwards" },
  { id: "smoothdown", name: "Smooth Down", description: "Smooth slide downwards" },
  { id: "circleopen", name: "Circle Open", description: "Open circular mask" },
  { id: "circleclose", name: "Circle Close", description: "Close circular mask" },
  { id: "vertopen", name: "Vert Open", description: "Open vertically" },
  { id: "vertclose", name: "Vert Close", description: "Close vertically" },
  { id: "horzopen", name: "Horz Open", description: "Open horizontally" },
  { id: "horzclose", name: "Horz Close", description: "Close horizontally" },
  { id: "dissolve", name: "Dissolve", description: "Dissolve pixels" },
  { id: "pixelize", name: "Pixelize", description: "Pixelation effect" },
  { id: "diagtl", name: "Diag TL", description: "Diagonal from top-left" },
  { id: "diagtr", name: "Diag TR", description: "Diagonal from top-right" },
  { id: "diagbl", name: "Diag BL", description: "Diagonal from bottom-left" },
  { id: "diagbr", name: "Diag BR", description: "Diagonal from bottom-right" },
  { id: "hlslice", name: "HL Slice", description: "Horizontal left slice" },
  { id: "hrslice", name: "HR Slice", description: "Horizontal right slice" },
  { id: "vuslice", name: "VU Slice", description: "Vertical upward slice" },
  { id: "vdslice", name: "VD Slice", description: "Vertical downward slice" },
  { id: "hblur", name: "HBlur", description: "Horizontal blur transition" },
  { id: "fadegrays", name: "Fade Grays", description: "Fade through grayscale" },
  { id: "wipetl", name: "Wipe TL", description: "Wipe from top-left" },
  { id: "wipetr", name: "Wipe TR", description: "Wipe from top-right" },
  { id: "wipebl", name: "Wipe BL", description: "Wipe from bottom-left" },
  { id: "wipebr", name: "Wipe BR", description: "Wipe from bottom-right" },
  { id: "squeezeh", name: "Squeeze H", description: "Horizontal squeeze" },
  { id: "squeezev", name: "Squeeze V", description: "Vertical squeeze" },
  { id: "zoomin", name: "Zoom In", description: "Zoom in transition" },
  { id: "fadefast", name: "Fade Fast", description: "Fast fade transition" },
  { id: "fadeslow", name: "Fade Slow", description: "Slow fade transition" },
  { id: "hlwind", name: "HL Wind", description: "Horizontal left wind effect" },
  { id: "hrwind", name: "HR Wind", description: "Horizontal right wind effect" },
  { id: "vuwind", name: "VU Wind", description: "Vertical upward wind effect" },
  { id: "vdwind", name: "VD Wind", description: "Vertical downward wind effect" },
  { id: "coverleft", name: "Cover Left", description: "Cover to the left" },
  { id: "coverright", name: "Cover Right", description: "Cover to the right" },
  { id: "coverup", name: "Cover Up", description: "Cover upwards" },
  { id: "coverdown", name: "Cover Down", description: "Cover downwards" },
  { id: "revealleft", name: "Reveal Left", description: "Reveal to the left" },
  { id: "revealright", name: "Reveal Right", description: "Reveal to the right" },
  { id: "revealup", name: "Reveal Up", description: "Reveal upwards" },
  { id: "revealdown", name: "Reveal Down", description: "Reveal downwards" }
];

// src/tree/index.ts
function buildRouteTree(flatRoutes) {
  const map = /* @__PURE__ */ new Map();
  const roots = [];
  const sorted = [...flatRoutes].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  for (const item of sorted) map.set(item.id, { ...item, children: [] });
  for (const item of sorted) {
    const current = map.get(item.id);
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(current);
    } else {
      roots.push(current);
    }
  }
  return roots;
}

// src/codec/fingerprint.ts
var WINDOWS_UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0"
];
var MACOS_UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
];
var LINUX_UAS = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0"
];
var RESOLUTIONS = [
  "1920x1080",
  "1920x1080",
  "2560x1440",
  "1366x768",
  "1536x864",
  "1440x900",
  "1680x1050"
];
var WINDOWS_RENDERERS = [
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)" },
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)" },
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)" },
  { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)" },
  { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)" }
];
var MACOS_RENDERERS = [
  { vendor: "Apple", renderer: "Apple M1" },
  { vendor: "Apple", renderer: "Apple M2" },
  { vendor: "Apple", renderer: "Apple M3 Pro" }
];
var LINUX_RENDERERS = [
  { vendor: "Mesa", renderer: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)" },
  { vendor: "NVIDIA Corporation", renderer: "NVIDIA GeForce RTX 3060/PCIe/SSE2" }
];
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function generateRealisticFingerprint(targetOs = "windows") {
  let ua;
  let gpu;
  if (targetOs === "macos") {
    ua = pickRandom(MACOS_UAS);
    gpu = pickRandom(MACOS_RENDERERS);
  } else if (targetOs === "linux") {
    ua = pickRandom(LINUX_UAS);
    gpu = pickRandom(LINUX_RENDERERS);
  } else {
    ua = pickRandom(WINDOWS_UAS);
    gpu = pickRandom(WINDOWS_RENDERERS);
  }
  const concurrency = pickRandom([4, 8, 8, 12, 16]);
  const memory = pickRandom([8, 8, 16, 16, 32]);
  const res = pickRandom(RESOLUTIONS);
  return {
    os: targetOs,
    browser_type: "chrome",
    browser_version: "124.0.0.0",
    user_agent: ua,
    screen_resolution: res,
    color_depth: 24,
    hardware_concurrency: concurrency,
    device_memory: memory,
    languages: "en-US,en",
    webrtc_mode: "proxy",
    timezone_mode: "auto",
    timezone_val: "Asia/Ho_Chi_Minh",
    geo_mode: "auto",
    canvas_mode: "noise",
    webgl_mode: "noise",
    webgl_vendor: gpu.vendor,
    webgl_renderer: gpu.renderer,
    audio_mode: "noise",
    client_rects_mode: "noise",
    fonts_mode: "system"
  };
}

// src/codec/webauthn.ts
function bufToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBuf(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// src/codec/encoding.ts
function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function bytesToBinary(bytes) {
  return Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(" ");
}
function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
function decodeBase64(text) {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function encodeUrl(text) {
  return encodeURIComponent(text);
}
function decodeUrl(text) {
  return decodeURIComponent(text);
}
var HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
function unescapeHtml(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function encodeHex(text) {
  return bytesToHex(new TextEncoder().encode(text));
}
function decodeHex(text) {
  const clean = text.trim().replace(/\s+/g, "").replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("Hex string must have even length");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("Invalid hex character");
    bytes[i] = byte;
  }
  return new TextDecoder().decode(bytes);
}
function encodeBinary(text) {
  return bytesToBinary(new TextEncoder().encode(text));
}
function decodeBinary(text) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const bytes = new Uint8Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const bin = parts[i];
    if (!/^[01]{1,8}$/.test(bin)) throw new Error(`Invalid binary byte: ${bin}`);
    bytes[i] = Number.parseInt(bin, 2);
  }
  return new TextDecoder().decode(bytes);
}
function rot13(text) {
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code <= 90 ? 65 : 97;
    return String.fromCharCode((code - base + 13) % 26 + base);
  });
}
function reverseText(text) {
  return [...text].reverse().join("");
}
async function subtleHash(algorithm, text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, data);
  return bytesToHex(new Uint8Array(digest));
}
async function sha1(text) {
  return subtleHash("SHA-1", text);
}
async function sha256(text) {
  return subtleHash("SHA-256", text);
}
async function sha384(text) {
  return subtleHash("SHA-384", text);
}
async function sha512(text) {
  return subtleHash("SHA-512", text);
}
function md5(text) {
  const msg = new TextEncoder().encode(text);
  return md5Bytes(msg);
}
function md5Bytes(input) {
  const S = [
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
  const bitLen = input.length * 8;
  const padded = new Uint8Array((input.length + 8 >> 6) + 1 << 6);
  padded.set(input);
  padded[input.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 2 ** 32), true);
  let a0 = 1732584193;
  let b0 = 4023233417;
  let c0 = 2562383102;
  let d0 = 271733878;
  const M = new Uint32Array(16);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F;
      let g;
      if (i < 16) {
        F = B & C | ~B & D;
        g = i;
      } else if (i < 32) {
        F = D & B | ~D & C;
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = 7 * i % 16;
      }
      F = F + A + K[i] + M[g] >>> 0;
      A = D;
      D = C;
      C = B;
      B = B + (F << S[i] | F >>> 32 - S[i]) >>> 0;
    }
    a0 = a0 + A >>> 0;
    b0 = b0 + B >>> 0;
    c0 = c0 + C >>> 0;
    d0 = d0 + D >>> 0;
  }
  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return bytesToHex(out);
}
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - padded.length % 4);
  return decodeBase64(padded + pad);
}
function base64UrlEncode(input) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmacSha256(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}
async function encodeJwt(payload, options = {}) {
  const algorithm = options.algorithm ?? (options.secret ? "HS256" : "none");
  const header = { alg: algorithm, typ: "JWT", ...options.header };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(payload));
  const data = `${h}.${p}`;
  if (algorithm === "none") return `${data}.`;
  if (!options.secret) throw new Error("Secret is required for HS256");
  const sig = await hmacSha256(options.secret, data);
  return `${data}.${sig}`;
}
function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { header: null, payload: null, signature: parts[0] ?? "", valid: false, error: "invalid_format" };
  }
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload, signature: parts[2], valid: true };
  } catch {
    return { header: null, payload: null, signature: parts[2] ?? "", valid: false, error: "decode_failed" };
  }
}
function generateHexKey(length = 64) {
  const byteCount = Math.ceil(length / 2);
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes).slice(0, length);
}
var generateRandomKey = generateHexKey;
async function runHash(algorithm, text) {
  if (algorithm === "MD5") return md5(text);
  return subtleHash(algorithm, text);
}

// src/transfer/aiProviderTransfer.ts
var AI_TRANSFER_FORMATS = ["json", "env", "csv"];
var PROVIDER_ALIASES = {
  "google": "google_ai",
  "google ai": "google_ai",
  "google ai studio": "google_ai",
  "gemini": "google_ai",
  "github": "github_models",
  "github models": "github_models",
  "hf": "huggingface",
  "hugging face": "huggingface",
  "nvidia nim": "nvidia",
  "z.ai": "zhipu",
  "bigmodel": "zhipu",
  "custom": "custom_openai",
  "openai-compatible": "custom_openai",
  "openai compatible": "custom_openai"
};
function cleanTransferValue(value) {
  let out = String(value ?? "").trim();
  if (out.length >= 2) {
    const head = out[0];
    const tail = out[out.length - 1];
    if (head === '"' && tail === '"' || head === "'" && tail === "'") out = out.slice(1, -1).trim();
  }
  return out;
}
function firstString(...values) {
  for (const value of values) {
    const cleaned = cleanTransferValue(value);
    if (cleaned) return cleaned;
  }
  return "";
}
function slugName(input, fallback) {
  const raw = cleanTransferValue(input) || fallback;
  const slug = raw.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return slug || fallback;
}
function truthy(value, fallback = true) {
  const raw = cleanTransferValue(value).toLowerCase();
  if (!raw) return fallback;
  if (["0", "false", "no", "off", "disabled"].includes(raw)) return false;
  if (["1", "true", "yes", "on", "enabled"].includes(raw)) return true;
  return fallback;
}
function detectAiTransferFormat(text, fileName = "") {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".env") || lower.endsWith(".txt") || lower.endsWith(".ini")) return "env";
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  const firstLine = trimmed.split(/\r?\n/, 1)[0] || "";
  if (/,/.test(firstLine) && /name|provider|model/i.test(firstLine)) return "csv";
  return "env";
}
function normalizeAliases(knownProviders) {
  const map = /* @__PURE__ */ new Map();
  for (const key of knownProviders) map.set(key.toLowerCase(), key);
  for (const [alias, key] of Object.entries(PROVIDER_ALIASES)) {
    if (!knownProviders.length || knownProviders.includes(key)) map.set(alias, key);
  }
  return map;
}
function finalizeRows(raw, options) {
  const known = options.knownProviders.map((key) => key.toLowerCase());
  const aliases = normalizeAliases(options.knownProviders);
  const customKey = options.customProviderKey || "custom_openai";
  const defaultModel = cleanTransferValue(options.defaultModel);
  const rows = [];
  const errors = [];
  const usedNames = /* @__PURE__ */ new Set();
  raw.forEach((entry, index) => {
    const source = `#${index + 1}`;
    const baseUrl = firstString(entry.baseUrl);
    const providerRaw = firstString(entry.provider).toLowerCase();
    let provider = aliases.get(providerRaw) || (known.includes(providerRaw) ? providerRaw : "");
    if (!provider) {
      const looksHttp = /^https?:\/\//i.test(baseUrl);
      if (providerRaw && looksHttp && known.includes(customKey)) provider = customKey;
      else if (!providerRaw && looksHttp && known.includes(customKey)) provider = customKey;
      else {
        errors.push({
          source,
          message: providerRaw ? `unknown provider "${providerRaw}" (add it in TM Hub first, or provide a baseUrl to import it as ${customKey})` : "provider is required"
        });
        return;
      }
    }
    const model = firstString(entry.model) || defaultModel;
    if (!model) {
      errors.push({ source, message: `${provider}: model is required (set a default model or add a model column)` });
      return;
    }
    let name = slugName(firstString(entry.name), "default");
    if (usedNames.has(`${provider}:${name}`)) {
      let n = 2;
      while (usedNames.has(`${provider}:${name}-${n}`)) n += 1;
      name = `${name}-${n}`;
    }
    usedNames.add(`${provider}:${name}`);
    rows.push({
      provider,
      name,
      model,
      baseUrl,
      apiKey: firstString(entry.apiKey),
      enabled: truthy(entry.enabled, true)
    });
  });
  return { rows, errors, format: null };
}
function rowsFromJson(text) {
  const parsed = JSON.parse(text);
  let list = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed;
    if (Array.isArray(obj.connections)) list = obj.connections;
    else if (Array.isArray(obj.keys)) list = obj.keys;
    else if (Array.isArray(obj.providers)) list = obj.providers;
    else {
      const entries = [];
      for (const [providerKey, val] of Object.entries(obj)) {
        if (!val || typeof val !== "object") continue;
        const item = val;
        const opts = item.options && typeof item.options === "object" ? item.options : {};
        const models = item.models && typeof item.models === "object" ? item.models : {};
        const modelNames = Object.keys(models);
        const firstModel = modelNames[0] || "";
        entries.push({
          provider: item.provider ?? item.platform ?? item.key ?? providerKey,
          name: item.name ?? item.label ?? providerKey,
          model: item.model ?? item.modelId ?? item.defaultModel ?? opts.model ?? firstModel,
          baseUrl: item.baseUrl ?? item.base_url ?? item.apiBase ?? item.api_base ?? item.url ?? opts.baseURL ?? opts.baseUrl,
          apiKey: item.apiKey ?? item.api_key ?? item.key ?? item.token ?? item.secret ?? opts.apiKey,
          enabled: item.enabled ?? item.isEnabled ?? (item.disabled === true ? false : void 0)
        });
      }
      if (entries.length > 0) return entries;
    }
  }
  if (!Array.isArray(list)) throw new Error("expected an array, or an object with a connections/keys array");
  return list.map((item) => {
    const entry = item || {};
    const opts = entry.options && typeof entry.options === "object" ? entry.options : {};
    const models = entry.models && typeof entry.models === "object" ? entry.models : {};
    const modelNames = Object.keys(models);
    const firstModel = modelNames[0] || "";
    return {
      provider: entry.provider ?? entry.platform ?? entry.key ?? entry.providerKey,
      name: entry.name ?? entry.label,
      model: entry.model ?? entry.modelId ?? entry.defaultModel ?? entry.primaryModel ?? opts.model ?? firstModel,
      baseUrl: entry.baseUrl ?? entry.base_url ?? entry.apiBase ?? entry.api_base ?? entry.url ?? opts.baseURL ?? opts.baseUrl,
      apiKey: entry.apiKey ?? entry.api_key ?? entry.key ?? entry.token ?? entry.secret ?? opts.apiKey,
      enabled: entry.enabled ?? entry.isEnabled ?? (entry.disabled === true ? false : void 0)
    };
  });
}
var ENV_ROLE_SUFFIXES = [
  { role: "apiKey", suffix: "_API_KEY" },
  { role: "apiKey", suffix: "_KEY" },
  { role: "apiKey", suffix: "_TOKEN" },
  { role: "apiKey", suffix: "_SECRET" },
  { role: "baseUrl", suffix: "_BASE_URL" },
  { role: "baseUrl", suffix: "_URL" },
  { role: "model", suffix: "_MODEL" },
  { role: "name", suffix: "_NAME" },
  { role: "enabled", suffix: "_ENABLED" }
];
function envLines(text) {
  const out = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) continue;
    out.push({ key: key.toUpperCase(), value: line.slice(eq + 1).trim() });
  }
  return out;
}
function splitEnvKey(key) {
  for (const { role, suffix } of ENV_ROLE_SUFFIXES) {
    if (!key.endsWith(suffix)) continue;
    const head = key.slice(0, -suffix.length);
    const sep = head.indexOf("__");
    if (sep > 0) return { prefix: head.slice(0, sep), name: head.slice(sep + 2), role };
    return { prefix: head, name: "", role };
  }
  return { prefix: "", name: "", role: null };
}
function rowsFromEnv(text) {
  const lines = envLines(text);
  const blocks = /* @__PURE__ */ new Map();
  const blockFor = (provider, name) => {
    const id = `${provider}:${name}`;
    let block = blocks.get(id);
    if (!block) {
      block = { provider, name, values: {} };
      blocks.set(id, block);
    }
    return block;
  };
  const generic = {};
  for (const { key, value } of lines) {
    if (key === "AI_PROVIDER" || key === "AI_API_KEY" || key === "AI_BASE_URL" || key === "AI_MODEL" || key === "AI_NAME") {
      generic[key] = value;
      continue;
    }
    const split = splitEnvKey(key);
    if (!split.role || split.prefix === "AI") continue;
    const provider = split.prefix.toLowerCase().replace(/-/g, "_");
    const block = blockFor(provider, split.name.toLowerCase());
    block.values[split.role] = value;
  }
  const rows = [];
  if (generic.AI_PROVIDER || generic.AI_API_KEY) {
    rows.push({
      provider: generic.AI_PROVIDER,
      name: generic.AI_NAME,
      model: generic.AI_MODEL,
      baseUrl: generic.AI_BASE_URL,
      apiKey: generic.AI_API_KEY,
      enabled: generic.AI_ENABLED
    });
  }
  for (const block of blocks.values()) {
    rows.push({
      provider: block.provider,
      name: block.values.name || block.name,
      model: block.values.model,
      baseUrl: block.values.baseUrl,
      apiKey: block.values.apiKey,
      enabled: block.values.enabled
    });
  }
  return rows;
}
function parseCsvGrid(text) {
  const grid = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === "," || ch === ";" || ch === "	") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      grid.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    grid.push(row);
  }
  return grid.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}
var CSV_HEADER_ALIASES = {
  provider: "provider",
  platform: "provider",
  key: "provider",
  name: "name",
  label: "name",
  credential: "name",
  model: "model",
  modelid: "model",
  defaultmodel: "model",
  baseurl: "baseUrl",
  url: "baseUrl",
  endpoint: "baseUrl",
  apikey: "apiKey",
  key_apikey: "apiKey",
  token: "apiKey",
  secret: "apiKey",
  enabled: "enabled",
  disabled: "enabled",
  isenabled: "enabled",
  status: "enabled"
};
function headerRole(cell) {
  const raw = cell.replace(/^\uFEFF/, "").toLowerCase().replace(/[\s_-]+/g, "");
  return CSV_HEADER_ALIASES[raw] ?? null;
}
function rowsFromCsv(text) {
  const grid = parseCsvGrid(text);
  if (grid.length < 2) return [];
  const header = grid[0].map(headerRole);
  const rows = [];
  for (const cells of grid.slice(1)) {
    const entry = { provider: "" };
    header.forEach((role, index) => {
      if (!role) return;
      const value = cells[index];
      if (value === void 0) return;
      if (role === "enabled") entry.enabled = /^(0|false|no|off|disabled)$/i.test(value.trim()) ? false : value;
      else entry[role] = value;
    });
    rows.push(entry);
  }
  return rows;
}
function decodeAiTransfer(text, options = {}) {
  const content = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!content) return { rows: [], errors: [{ source: "file", message: "the file is empty" }], format: null };
  let format = options.format ?? null;
  if (format === "json" && !/^[[{]/.test(content)) format = null;
  format = format || detectAiTransferFormat(content, options.fileName || "");
  if (!format) return { rows: [], errors: [{ source: "file", message: "unrecognized format" }], format: null };
  let raw;
  try {
    if (format === "json") raw = rowsFromJson(content);
    else if (format === "csv") raw = rowsFromCsv(content);
    else raw = rowsFromEnv(content);
  } catch (err) {
    return {
      rows: [],
      errors: [{ source: "file", message: err instanceof Error ? err.message : "could not parse the file" }],
      format
    };
  }
  if (raw.length === 0) {
    return { rows: [], errors: [{ source: "file", message: `no rows found in this ${format.toUpperCase()} file` }], format };
  }
  return {
    rows: raw.map((row) => ({
      provider: firstString(row.provider),
      name: firstString(row.name),
      model: firstString(row.model),
      baseUrl: firstString(row.baseUrl),
      apiKey: firstString(row.apiKey),
      enabled: truthy(row.enabled, true)
    })),
    errors: [],
    format
  };
}
function parseAiTransfer(text, options) {
  const decoded = decodeAiTransfer(text, { format: options.format, fileName: options.fileName });
  if (decoded.errors.length || !decoded.format) return decoded;
  const finalized = finalizeRows(decoded.rows, options);
  return { rows: finalized.rows, errors: finalized.errors, format: decoded.format };
}
function csvCell(value) {
  const raw = String(value ?? "");
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}
function envPrefix(row) {
  const base = row.provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (!row.name || row.name === "default") return base;
  const suffix = row.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return suffix ? `${base}__${suffix}` : base;
}
function serializeAiTransfer(rows, format, meta) {
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const baseName = `${meta.appName}-ai-providers-${stamp}`;
  if (format === "json") {
    const content = JSON.stringify({
      version: 1,
      source: meta.appName,
      appId: meta.appId,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      includeSecrets: meta.includeSecrets,
      connections: rows.map((row) => ({
        provider: row.provider,
        name: row.name,
        model: row.model,
        baseUrl: row.baseUrl || null,
        enabled: row.enabled,
        ...meta.includeSecrets && row.apiKey ? { apiKey: row.apiKey } : {}
      }))
    }, null, 2);
    return { content, fileName: `${baseName}.json`, mime: "application/json" };
  }
  if (format === "csv") {
    const header = meta.includeSecrets ? ["provider", "name", "model", "baseUrl", "enabled", "apiKey"] : ["provider", "name", "model", "baseUrl", "enabled"];
    const lines2 = [header.join(",")];
    for (const row of rows) {
      const cells = [row.provider, row.name, row.model, row.baseUrl, row.enabled ? "true" : "false"];
      if (meta.includeSecrets) cells.push(row.apiKey);
      lines2.push(cells.map(csvCell).join(","));
    }
    return { content: `${lines2.join("\n")}
`, fileName: `${baseName}.csv`, mime: "text/csv" };
  }
  const lines = [
    `# ${meta.appName} \u2014 AI providers`,
    `# app: ${meta.appId} \xB7 exported: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `# secrets: ${meta.includeSecrets ? "included" : "not included"}`,
    ""
  ];
  for (const row of rows) {
    const prefix = envPrefix(row);
    lines.push(`# ${row.provider} \xB7 ${row.name}${row.enabled ? "" : " \xB7 disabled"}`);
    if (meta.includeSecrets && row.apiKey) lines.push(`${prefix}_API_KEY=${row.apiKey}`);
    if (row.baseUrl) lines.push(`${prefix}_BASE_URL=${row.baseUrl}`);
    lines.push(`${prefix}_MODEL=${row.model}`);
    lines.push(`${prefix}_NAME=${row.name}`);
    if (!row.enabled) lines.push(`${prefix}_ENABLED=0`);
    lines.push("");
  }
  return { content: `${lines.join("\n").trimEnd()}
`, fileName: `${baseName}.env`, mime: "text/plain" };
}

// src/errors/resolve.ts
function getApiErrorStatus(err) {
  const e = err;
  return e?.statusCode ?? e?.data?.statusCode;
}
function isWireCode(value) {
  return /^[a-z][a-zA-Z0-9]*([._][a-zA-Z0-9]+)+$/.test(value);
}
var NETWORK = /fetch failed|failed to fetch|<no response>|network|econn|timeout|load failed|socket/i;
var HUB_HINT = /4000|\/api\/v1\/|hub/i;
function isHubConnectionError(err) {
  const e = err;
  const status = getApiErrorStatus(err);
  const rawMsg = String(e?.message || e?.data?.message || "");
  if (!status) {
    if (NETWORK.test(rawMsg) && HUB_HINT.test(rawMsg)) return true;
  }
  return false;
}
function getErrorKey(err) {
  const e = err;
  const status = getApiErrorStatus(err);
  if (!status) {
    const msg = String(e?.message || e?.data?.message || "").toLowerCase();
    if (NETWORK.test(msg)) {
      if (HUB_HINT.test(msg)) return "error.hubConnectionFailed";
      return "error.network";
    }
    return "error.unexpected";
  }
  const raw = String(e?.statusMessage || e?.data?.statusMessage || e?.data?.message || e?.message || "");
  if (/invalid.*app/i.test(raw)) return "error.invalidAppId";
  if (/not have access|no access/i.test(raw)) return "error.noAppAccess";
  switch (status) {
    case 400:
      return "error.invalidRequest";
    case 401:
      return "error.invalidCredentials";
    case 403:
      return "error.forbidden";
    case 404:
      return "error.notFound";
    case 409:
      return "error.conflict";
    case 422:
      return "error.validation";
    case 429:
      return "error.tooManyAttempts";
    default:
      return status >= 500 ? "error.serverError" : "error.unexpected";
  }
}
function getErrorMessage(err, t) {
  const e = err;
  const status = getApiErrorStatus(err);
  const rawMsg = String(e?.message || e?.data?.message || "");
  if (!status) {
    if (NETWORK.test(rawMsg)) {
      if (HUB_HINT.test(rawMsg)) return t("error.hubConnectionFailed");
      return t("error.network");
    }
  }
  const code = e?.statusMessage || e?.data?.statusMessage;
  if (code && /^[a-zA-Z0-9_.-]+$/.test(code)) {
    const translated = t(code);
    if (translated && translated !== code) return translated;
    if (isWireCode(code)) return t(getErrorKey(err));
  }
  const text = e?.data?.message || e?.message;
  if (text) {
    if (/^[a-zA-Z0-9_.-]+$/.test(text)) {
      const translated = t(text);
      if (translated && translated !== text) return translated;
    }
    if (/invalid email or password/i.test(text)) return t("error.invalidCredentials");
    if (/invalid or inactive app/i.test(text)) return t("error.invalidAppId");
    if (/does not have access to this application/i.test(text)) return t("error.noAppAccess");
    if (!isWireCode(text) && !/\[(GET|POST|PUT|DELETE|PATCH)\]/i.test(text)) {
      return text;
    }
  }
  return t(getErrorKey(err));
}
function getPresetErrorMessage(err, t) {
  const e = err;
  const code = String(e?.data?.statusMessage || e?.statusMessage || e?.data?.message || e?.message || "");
  if (code.includes("PDF_PRESET_NAME_REQUIRED")) return t("pdf.extract.presetNameRequired");
  if (code.includes("PDF_PRESET_LIMIT")) return t("pdf.extract.presetLimit");
  return getErrorMessage(err, t);
}

// src/random/generate.ts
var AMBIGUOUS = new Set("Il1O0o".split(""));
var UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var LOWER = "abcdefghijklmnopqrstuvwxyz";
var DIGITS = "0123456789";
var SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/";
var ADJECTIVES = [
  "swift",
  "bright",
  "silent",
  "brave",
  "clever",
  "lucky",
  "rapid",
  "noble",
  "calm",
  "epic",
  "frost",
  "golden",
  "iron",
  "jade",
  "crimson",
  "azure",
  "prime",
  "ultra",
  "hyper",
  "neo",
  "quantum",
  "cosmic",
  "solar",
  "lunar"
];
var NOUNS = [
  "fox",
  "wolf",
  "hawk",
  "lynx",
  "bear",
  "eagle",
  "shark",
  "tiger",
  "pixel",
  "nova",
  "orbit",
  "pulse",
  "spark",
  "wave",
  "cloud",
  "storm",
  "coder",
  "maker",
  "ranger",
  "pilot",
  "smith",
  "smithy",
  "blade",
  "arrow"
];
var NAMES = [
  "alex",
  "jamie",
  "riley",
  "morgan",
  "casey",
  "quinn",
  "avery",
  "taylor",
  "jordan",
  "cameron",
  "drew",
  "reese",
  "skyler",
  "rowan",
  "emery",
  "finley"
];
var DOMAINS = ["example.com", "mail.test", "demo.local", "hub.dev"];
function randomInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(4294967295 / max) * max;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}
function pick(arr) {
  return arr[randomInt(arr.length)];
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function filterPool(pool, excludeAmbiguous) {
  if (!excludeAmbiguous) return pool;
  return [...pool].filter((ch) => !AMBIGUOUS.has(ch)).join("");
}
var DEFAULT_PASSWORD_OPTIONS = {
  length: 16,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false
};
function generatePassword(options = {}) {
  const opts = { ...DEFAULT_PASSWORD_OPTIONS, ...options };
  const length = Math.min(Math.max(opts.length || 16, 4), 128);
  const pools = [];
  if (opts.upper) pools.push(filterPool(UPPER, opts.excludeAmbiguous));
  if (opts.lower) pools.push(filterPool(LOWER, opts.excludeAmbiguous));
  if (opts.digits) pools.push(filterPool(DIGITS, opts.excludeAmbiguous));
  if (opts.symbols) pools.push(filterPool(SYMBOLS, opts.excludeAmbiguous));
  const active = pools.filter((p) => p.length > 0);
  if (active.length === 0) active.push(filterPool(LOWER, opts.excludeAmbiguous));
  const all = active.join("");
  const chars = [];
  for (const pool of active) chars.push(pick([...pool]));
  while (chars.length < length) chars.push(pick([...all]));
  return shuffle(chars).slice(0, length).join("");
}
function generatePin(length = 6) {
  const len = Math.min(Math.max(length, 4), 12);
  let out = "";
  for (let i = 0; i < len; i++) out += String(randomInt(10));
  return out;
}
function generateUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function generateToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateApiKey(prefix = "tm") {
  return `${prefix}_${generateToken(24)}`;
}
function generateUsername(options = { style: "handle" }) {
  const { style, suffix = true, domain } = options;
  const num = String(randomInt(9e3) + 1e3);
  if (style === "email-like") {
    const user = generateUsername({ style: "handle", suffix: false });
    return `${user}@${domain || pick(DOMAINS)}`;
  }
  if (style === "name") {
    const base2 = `${pick(NAMES)}${suffix ? num : ""}`;
    return base2;
  }
  if (style === "word") {
    const base2 = `${pick(ADJECTIVES)}${pick(NOUNS)}`;
    return suffix ? `${base2}${num}` : base2;
  }
  const base = `${pick(ADJECTIVES)}.${pick(NOUNS)}`;
  return suffix ? `${base}${num}` : base;
}
function generateEmail() {
  return generateUsername({ style: "email-like" });
}
function generateName() {
  return `${pick(NAMES)} ${pick(ADJECTIVES).charAt(0).toUpperCase()}${pick(ADJECTIVES).slice(1)}`;
}
function generatePasswordBatch(count, options = {}) {
  const n = Math.min(Math.max(count, 1), 50);
  return Array.from({ length: n }, () => generatePassword(options));
}
function generateUsernameBatch(count, options = { style: "handle" }) {
  const n = Math.min(Math.max(count, 1), 50);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard < n * 20) {
    guard++;
    const name = generateUsername(options);
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}
function generateRandomKeyBatch(count, length = 64) {
  const n = Math.min(Math.max(count, 1), 50);
  return Array.from({ length: n }, () => generateHexKey(length));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AI_TRANSFER_FORMATS,
  ALL_XFADE_TRANSITIONS,
  DEFAULT_PASSWORD_OPTIONS,
  b64urlToBuf,
  bufToB64url,
  buildRouteTree,
  cleanImageUrl,
  cleanSpaces,
  cleanTransferValue,
  countStats,
  createInflight,
  decodeAiTransfer,
  decodeBase64,
  decodeBase64Safe,
  decodeBinary,
  decodeHex,
  decodeJwt,
  decodeUrl,
  decodeUrlSafe,
  detectAiTransferFormat,
  detectDisplayType,
  downloadFile,
  encodeBase64,
  encodeBase64Safe,
  encodeBinary,
  encodeHex,
  encodeJwt,
  encodeUrl,
  encodeUrlSafe,
  ensureForwardSlash,
  escapeHtml,
  escapeHtmlSafe,
  escapeRegExp,
  formatDate,
  formatNumber,
  formatTimeAgo,
  generateApiKey,
  generateEan13,
  generateEmail,
  generateHexKey,
  generateName,
  generatePassword,
  generatePasswordBatch,
  generatePin,
  generateRandomKey,
  generateRandomKeyBatch,
  generateRealisticFingerprint,
  generateToken,
  generateUsername,
  generateUsernameBatch,
  generateUuid,
  getApiErrorStatus,
  getErrorKey,
  getErrorMessage,
  getImage,
  getPresetErrorMessage,
  isHubConnectionError,
  isIconify,
  isImage,
  isRawSvg,
  isSpecialImage,
  md5,
  minifySvg,
  numberLines,
  parseAiTransfer,
  readCsv,
  readJson,
  removeDuplicateLines,
  removeEmptyLines,
  removeVietnameseAccents,
  reverseCharacters,
  reverseLines,
  reverseText,
  rot13,
  runBatchPool,
  runHash,
  sanitizeSvg,
  serializeAiTransfer,
  sha1,
  sha256,
  sha384,
  sha512,
  slugify,
  sortLinesAsc,
  sortLinesDesc,
  toAlternatingCase,
  toCamelCase,
  toCapitalize,
  toCode,
  toConstantCase,
  toInverseCase,
  toKebabCase,
  toLowerCase,
  toNormalize,
  toPascalCase,
  toSentenceCase,
  toSlug,
  toSnakeCase,
  toUpperCase,
  unescapeHtml,
  unescapeHtmlSafe
});
//# sourceMappingURL=index.cjs.map