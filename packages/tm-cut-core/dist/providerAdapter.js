// src/providerAdapter.mjs
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
export {
  PROVIDER_ADAPTER_SCHEMA_VERSION,
  getProviderAdapter,
  getProviderCapabilities,
  isProviderRegistered,
  listProviderAdapters,
  registerProviderAdapter
};
//# sourceMappingURL=providerAdapter.js.map