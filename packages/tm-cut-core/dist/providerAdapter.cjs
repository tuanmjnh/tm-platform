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

// src/providerAdapter.mjs
var providerAdapter_exports = {};
__export(providerAdapter_exports, {
  PROVIDER_ADAPTER_SCHEMA_VERSION: () => PROVIDER_ADAPTER_SCHEMA_VERSION,
  getProviderAdapter: () => getProviderAdapter,
  getProviderCapabilities: () => getProviderCapabilities,
  isProviderRegistered: () => isProviderRegistered,
  listProviderAdapters: () => listProviderAdapters,
  registerProviderAdapter: () => registerProviderAdapter
});
module.exports = __toCommonJS(providerAdapter_exports);
var PROVIDER_ADAPTER_SCHEMA_VERSION = 1;
var providerRegistry = /* @__PURE__ */ new Map();
function registerProviderAdapter(providerId, adapter) {
  const manifest = adapter.manifest();
  if (manifest.providerId !== providerId) {
    throw new Error(`Provider ID mismatch: registry key "${providerId}" vs manifest "${manifest.providerId}"`);
  }
  if (manifest.schemaVersion !== PROVIDER_ADAPTER_SCHEMA_VERSION) {
    throw new Error(`Provider ${providerId} schema version ${manifest.schemaVersion} != ${PROVIDER_ADAPTER_SCHEMA_VERSION}`);
  }
  providerRegistry.set(providerId, adapter);
}
function getProviderAdapter(providerId) {
  return providerRegistry.get(providerId);
}
function listProviderAdapters() {
  return Array.from(providerRegistry.values()).map((a) => a.manifest());
}
function isProviderRegistered(providerId) {
  return providerRegistry.has(providerId);
}
function getProviderCapabilities(providerId) {
  const adapter = providerRegistry.get(providerId);
  return adapter?.manifest();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PROVIDER_ADAPTER_SCHEMA_VERSION,
  getProviderAdapter,
  getProviderCapabilities,
  isProviderRegistered,
  listProviderAdapters,
  registerProviderAdapter
});
//# sourceMappingURL=providerAdapter.cjs.map