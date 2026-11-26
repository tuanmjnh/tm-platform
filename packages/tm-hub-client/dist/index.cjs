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
  DEFAULT_HUB_PORT: () => DEFAULT_HUB_PORT,
  DEFAULT_HUB_URL: () => DEFAULT_HUB_URL,
  HubClient: () => HubClient,
  PLATFORM_PORTS: () => PLATFORM_PORTS,
  createHubClient: () => createHubClient
});
module.exports = __toCommonJS(index_exports);

// src/types.ts
var DEFAULT_HUB_PORT = 4e3;
var DEFAULT_HUB_URL = "http://localhost:4000";
var PLATFORM_PORTS = {
  HUB: 4e3,
  TRADING: 4001,
  TOOLS: 4002,
  TOOLS_DESKTOP: 3456
};

// src/client.ts
var CAPABILITY_ALIASES = {
  "media.write": ["media.upload"],
  "media.upload": ["media.write"],
  "users.manage": ["users.create", "users.update", "users.delete"],
  "users.create": ["users.manage"],
  "users.update": ["users.manage"],
  "users.delete": ["users.manage"],
  "logs.read": ["apps.logs.read"],
  "apps.logs.read": ["logs.read"]
};
var HubClient = class {
  baseUrl;
  appId;
  getAccessToken;
  onUnauthorized;
  customFetch;
  getRefreshToken;
  onTokensRefreshed;
  getAppSecret;
  getDeviceCredential;
  cachedPermissions = null;
  refreshInFlight = null;
  constructor(options) {
    this.baseUrl = (options.baseUrl || DEFAULT_HUB_URL).replace(/\/$/, "");
    this.appId = options.appId;
    this.getAccessToken = options.getAccessToken;
    this.onUnauthorized = options.onUnauthorized;
    this.customFetch = options.fetch || globalThis.fetch.bind(globalThis);
    this.getRefreshToken = options.getRefreshToken;
    this.onTokensRefreshed = options.onTokensRefreshed;
    this.getAppSecret = options.getAppSecret;
    this.getDeviceCredential = options.getDeviceCredential;
  }
  /**
   * Server-to-server calls (AI relay, Storage Gateway) identify the app, not a
   * user. A device credential wins over the shared App Secret: it is issued per
   * installation, scoped, expiring and revocable, and it is the only identity a
   * public Electron build can hold. Failing with a precise message beats a bare
   * 401 from the hub.
   */
  async appCredentialHeaders() {
    const device = this.getDeviceCredential ? await Promise.resolve(this.getDeviceCredential()) : null;
    if (device?.deviceId && device.secret) {
      return { "X-Device-Id": device.deviceId, "X-Device-Secret": device.secret };
    }
    const secret = this.getAppSecret ? await Promise.resolve(this.getAppSecret()) : null;
    if (!secret) {
      throw new Error("This call requires getDeviceCredential (X-Device-Id/X-Device-Secret) or getAppSecret (X-App-Secret) - pass one when creating the client (server-side only)");
    }
    return { "X-App-Secret": secret };
  }
  async request(path, options = {}) {
    const { params, headers: customHeaders, _retry, ...fetchOpts } = options;
    let url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== void 0 && v !== null) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    const headers = new Headers(customHeaders || {});
    if (!headers.has("X-App-Id")) {
      headers.set("X-App-Id", this.appId);
    }
    if (!headers.has("Authorization") && this.getAccessToken) {
      const token = await Promise.resolve(this.getAccessToken());
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    if (fetchOpts.body && typeof fetchOpts.body === "object" && !(fetchOpts.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
      fetchOpts.body = JSON.stringify(fetchOpts.body);
    }
    const response = await this.customFetch(url, {
      ...fetchOpts,
      headers
    });
    if (response.status === 401 && !_retry && this.getRefreshToken && !path.includes("/auth/login") && !path.includes("/auth/refresh") && !path.includes("/auth/register")) {
      const refreshed = await this.tryRefreshTokens();
      if (refreshed) {
        return this.request(path, { ...options, params, headers: customHeaders, _retry: true });
      }
    }
    if (response.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }
      const error = new Error(errorBody.message || errorBody.statusMessage || `Request failed with status ${response.status}`);
      error.statusCode = response.status;
      error.data = errorBody;
      throw error;
    }
    return await response.json();
  }
  async tryRefreshTokens() {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const rToken = await Promise.resolve(this.getRefreshToken?.());
        if (!rToken) return false;
        const res = await this.request("/api/v1/auth/refresh", {
          method: "POST",
          body: { refreshToken: rToken, appId: this.appId }
        });
        if (!res?.data?.accessToken) return false;
        await this.onTokensRefreshed?.(res.data);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }
  rememberPermissions(permissions) {
    if (Array.isArray(permissions)) {
      this.cachedPermissions = permissions;
    }
  }
  /** Manually seed/cache current user's permission codes (dot format). */
  setPermissions(permissions) {
    this.cachedPermissions = Array.isArray(permissions) ? [...permissions] : [];
  }
  /** Current cached permission codes (null = not loaded yet). */
  getPermissions() {
    return this.cachedPermissions ? [...this.cachedPermissions] : null;
  }
  // ==========================================
  // MODULE: Auth
  // ==========================================
  auth = {
    login: async (credentials) => {
      const res = await this.request("/api/v1/auth/login", {
        method: "POST",
        body: { ...credentials, appId: this.appId }
      });
      this.rememberPermissions(res.data?.user?.permissions);
      return res;
    },
    register: async (data) => {
      const res = await this.request("/api/v1/auth/register", {
        method: "POST",
        body: { ...data, appId: this.appId }
      });
      this.rememberPermissions(res.data?.user?.permissions);
      return res;
    },
    me: async () => {
      const res = await this.request("/api/v1/auth/me", {
        method: "GET"
      });
      this.rememberPermissions(res.data?.permissions);
      if (!res.data) return res;
      const { userId, ...rest } = res.data;
      return {
        ...res,
        data: { ...rest, id: userId }
      };
    },
    permissions: async () => {
      const res = await this.request("/api/v1/auth/permissions", {
        method: "GET"
      });
      this.rememberPermissions(res.data?.permissions);
      return res;
    },
    updateProfile: (updates) => {
      return this.request("/api/v1/auth/me", {
        method: "PUT",
        body: updates
      });
    },
    changePassword: (data) => {
      return this.request("/api/v1/auth/me/password", {
        method: "PUT",
        body: data
      });
    },
    forgotPassword: (data) => {
      return this.request("/api/v1/auth/forgot-password", {
        method: "POST",
        body: { ...data, appId: data.appId || this.appId }
      });
    },
    resetPassword: (data) => {
      return this.request("/api/v1/auth/reset-password", {
        method: "POST",
        body: { ...data, appId: data.appId || this.appId }
      });
    },
    refresh: async (refreshToken) => {
      const res = await this.request("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken, appId: this.appId }
      });
      if (res.data) await this.onTokensRefreshed?.(res.data);
      return res;
    },
    logout: (refreshToken) => {
      return this.request("/api/v1/auth/logout", {
        method: "POST",
        body: { refreshToken, appId: this.appId }
      });
    },
    getRoutes: (params) => {
      return this.request("/api/v1/auth/routes", {
        method: "GET",
        params
      });
    },
    listSessions: () => {
      return this.request("/api/v1/auth/sessions", {
        method: "GET"
      });
    },
    revokeSessions: (options) => {
      const ids = options?.ids;
      const idParam = Array.isArray(ids) ? ids.join(",") : ids;
      return this.request("/api/v1/auth/sessions", {
        method: "DELETE",
        params: {
          id: idParam,
          all: options?.all ? "true" : void 0
        }
      });
    },
    /** Validate a token without being the token holder (for external services). */
    introspect: (token) => {
      return this.request("/api/v1/auth/introspect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    // ==========================================
    // Two-factor authentication (v1.26)
    // ==========================================
    /**
     * Complete login after `auth.login()` returned `totpRequired`.
     * Pass the 6-digit TOTP code (or an unused recovery code).
     */
    verifyTotp: async (pendingTotpToken, code) => {
      const res = await this.request("/api/v1/auth/totp/login", {
        method: "POST",
        body: { pendingTotpToken, code, appId: this.appId }
      });
      this.rememberPermissions(res.data?.user?.permissions);
      return res;
    },
    /** Start 2FA setup — returns an otpauth QR code data URL (scan in an authenticator app). */
    totpSetup: () => {
      return this.request("/api/v1/auth/totp/setup", {
        method: "POST",
        body: { appId: this.appId }
      });
    },
    /** Confirm setup with a code — returns one-time recovery codes. */
    totpVerify: (code) => {
      return this.request("/api/v1/auth/totp/verify", {
        method: "POST",
        body: { code }
      });
    },
    /** Disable 2FA — requires a valid code or an unused recovery code. */
    totpDisable: (code) => {
      return this.request("/api/v1/auth/totp/disable", {
        method: "POST",
        body: { code }
      });
    },
    // ==========================================
    // Passkeys (v1.26)
    // ==========================================
    /** List the current user's registered passkeys. */
    passkeyList: () => {
      return this.request("/api/v1/auth/passkey/list", {
        method: "GET",
        params: { appId: this.appId }
      });
    },
    /** WebAuthn registration step 1 — creation options for `navigator.credentials.create()`. */
    passkeyRegisterStart: (username, displayName) => {
      return this.request("/api/v1/auth/passkey/register/start", {
        method: "POST",
        body: { appId: this.appId, username, displayName: displayName || username }
      });
    },
    /** WebAuthn registration step 2 — submit the PublicKeyCredential (JSON form). */
    passkeyRegisterFinish: (credential) => {
      return this.request("/api/v1/auth/passkey/register/finish", {
        method: "POST",
        body: { appId: this.appId, credential }
      });
    },
    /** Remove a passkey by its credential id. */
    passkeyDelete: (credentialId) => {
      return this.request("/api/v1/auth/passkey/delete", {
        method: "DELETE",
        params: { appId: this.appId, credentialId }
      });
    },
    /** WebAuthn login step 1 — assertion options for `navigator.credentials.get()` (no auth required). */
    passkeyLoginStart: () => {
      return this.request("/api/v1/auth/passkey/login/start", {
        method: "POST",
        body: { appId: this.appId }
      });
    },
    /** WebAuthn login step 2 — submit the assertion (JSON form); issues tokens on success. */
    passkeyLoginFinish: async (credential) => {
      const res = await this.request("/api/v1/auth/passkey/login/finish", {
        method: "POST",
        body: { appId: this.appId, credential }
      });
      this.rememberPermissions(res.data?.user?.permissions);
      return res;
    },
    // ==========================================
    // OAuth (v1.25)
    // ==========================================
    /** List enabled OAuth providers for an app. */
    oauthProviders: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/auth/oauth/providers`, {
        method: "GET",
        params: { appId: target }
      });
    },
    /** Start OAuth flow — returns authUrl to open in popup. */
    oauthStart: (provider, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/auth/oauth/${provider}/start`, {
        method: "POST",
        body: { appId: target }
      });
    },
    /** Link OAuth account to current user (requires auth). */
    oauthLink: (provider, code, state, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/auth/oauth/link`, {
        method: "POST",
        body: { provider, code, state, appId: target }
      });
    },
    // ==========================================
    // JWKS (P3 RS256 — public, no auth required)
    // ==========================================
    /**
     * Fetch the Hub's public JWKS so a satellite can verify RS256 access
     * tokens by `kid`. This only fetches keys — it does not verify tokens.
     */
    jwks: () => {
      return this.request("/api/v1/auth/jwks", { method: "GET" });
    },
    // ==========================================
    // Device Registry v2 — self-service (identity, not service credentials)
    // ==========================================
    devices: {
      /** List the caller's registered devices in the current app. */
      list: (params) => {
        return this.request("/api/v1/auth/user-devices", {
          method: "GET",
          params
        });
      },
      /** Read one of the caller's devices. */
      get: (deviceId) => {
        return this.request(`/api/v1/auth/user-devices/${encodeURIComponent(deviceId)}`, {
          method: "GET"
        });
      },
      /** Rename one of the caller's devices (display metadata only). */
      update: (deviceId, patch) => {
        return this.request(`/api/v1/auth/user-devices/${encodeURIComponent(deviceId)}`, {
          method: "PATCH",
          body: patch
        });
      },
      /** Revoke one of the caller's devices (revokes its sessions + service credential). */
      revoke: (deviceId) => {
        return this.request(`/api/v1/auth/user-devices/${encodeURIComponent(deviceId)}`, {
          method: "DELETE"
        });
      }
    },
    // ==========================================
    // Device Registry v2 — app admin (capability guarded on the server)
    // ==========================================
    adminDevices: {
      list: (appId, userId) => {
        return this.request(
          `/api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}/user-devices`,
          { method: "GET" }
        );
      },
      update: (appId, userId, deviceId, patch) => {
        return this.request(
          `/api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}/user-devices/${encodeURIComponent(deviceId)}`,
          { method: "PATCH", body: patch }
        );
      },
      revoke: (appId, userId, deviceId) => {
        return this.request(
          `/api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}/user-devices/${encodeURIComponent(deviceId)}`,
          { method: "DELETE" }
        );
      }
    }
  };
  // ==========================================
  // MODULE: Apps (Application Registry)
  // ==========================================
  apps = {
    list: (params) => {
      return this.request("/api/v1/apps", {
        method: "GET",
        params
      });
    },
    get: (appId) => {
      return this.request(`/api/v1/apps/${appId}`, {
        method: "GET"
      });
    },
    create: (app) => {
      return this.request("/api/v1/apps", {
        method: "POST",
        body: app
      });
    },
    update: (appId, app) => {
      return this.request(`/api/v1/apps/${appId}`, {
        method: "PATCH",
        body: app
      });
    },
    delete: (ids) => {
      const idParam = Array.isArray(ids) ? ids.join(",") : ids;
      return this.request("/api/v1/apps", {
        method: "DELETE",
        params: { id: idParam }
      });
    },
    reorder: (orderedIds) => {
      return this.request("/api/v1/apps/reorder", {
        method: "POST",
        body: { ids: orderedIds }
      });
    },
    rotateSecret: (appId) => {
      return this.request(`/api/v1/apps/${appId}/rotate-secret`, {
        method: "POST"
      });
    }
  };
  // ==========================================
  // MODULE: Tenants & Sites (Multi-Tenancy)
  // ==========================================
  tenants = {
    /** List all tenants. Requires tenants.read or root. */
    list: (params) => {
      return this.request("/api/v1/tenants", {
        params
      });
    },
    /** Get tenant details by tenantId. */
    get: (tenantId) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`);
    },
    /** Create a new tenant. Requires tenants.manage or root. */
    create: (data) => {
      return this.request("/api/v1/tenants", {
        method: "POST",
        body: data
      });
    },
    /** Update tenant properties or status. */
    update: (tenantId, data) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`, {
        method: "PUT",
        body: data
      });
    },
    /** Delete a tenant. Requires tenants.manage or root. */
    delete: (tenantId) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`, {
        method: "DELETE"
      });
    },
    /** Get apps assigned to this tenant. */
    getApps: (tenantId) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}/apps`);
    },
    /** List sites under a tenant. */
    listSites: (tenantId) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}/sites`);
    },
    /** Create a new site under a tenant. */
    createSite: (tenantId, data) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}/sites`, {
        method: "POST",
        body: data
      });
    },
    /** Update a site configuration. */
    updateSite: (tenantId, siteId, data) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}/sites`, {
        method: "PUT",
        body: { siteId, ...data }
      });
    },
    /** Delete a site under a tenant. */
    deleteSite: (tenantId, siteId) => {
      return this.request(`/api/v1/tenants/${encodeURIComponent(tenantId)}/sites`, {
        method: "DELETE",
        params: { siteId }
      });
    }
  };
  // ==========================================
  // MODULE: Configs (Remote dynamic configuration)
  // ==========================================
  configs = {
    getPublic: (appId) => {
      return this.request("/api/v1/configs/public", {
        method: "GET",
        params: appId ? { appId } : void 0
      });
    },
    getPublicForApp: (appId) => {
      return this.request(`/api/v1/apps/${appId}/configs/public`, {
        method: "GET"
      });
    },
    getAll: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/configs`, {
        method: "GET",
        params
      });
    },
    update: (configs) => {
      return this.request(`/api/v1/apps/${this.appId}/configs`, {
        method: "PUT",
        body: configs
      });
    }
  };
  // ==========================================
  // MODULE: Media (Cloudinary Gateway)
  // ==========================================
  media = {
    getSignature: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/media/signature`, {
        method: "POST",
        body: { params }
      });
    },
    getResources: (params) => {
      const { max_results, next_cursor, ...rest } = params || {};
      return this.request(`/api/v1/apps/${this.appId}/media/resources`, {
        method: "GET",
        params: {
          ...rest,
          limit: rest.limit ?? max_results,
          cursor: rest.cursor ?? next_cursor
        }
      });
    },
    deleteResources: (publicIds) => {
      return this.request(`/api/v1/apps/${this.appId}/media/resources`, {
        method: "DELETE",
        body: { publicIds }
      });
    },
    getFolders: (folder) => {
      return this.request(`/api/v1/apps/${this.appId}/media/folders`, {
        method: "GET",
        params: folder ? { folder } : void 0
      });
    },
    createFolder: (name, parent) => {
      const folder = parent ? `${parent}/${name}` : name;
      return this.request(`/api/v1/apps/${this.appId}/media/folders`, {
        method: "POST",
        body: { folder, parent }
      });
    },
    deleteFolder: (folder) => {
      return this.request(`/api/v1/apps/${this.appId}/media/folders`, {
        method: "DELETE",
        params: { folder }
      });
    },
    renameResource: (from, to) => {
      return this.request(`/api/v1/apps/${this.appId}/media/resources/rename`, {
        method: "POST",
        body: { from_public_id: from, to_public_id: to }
      });
    }
  };
  // ==========================================
  // MODULE: Notifications (Web Push & In-app)
  // ==========================================
  notifications = {
    list: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/notifications`, {
        method: "GET",
        params
      });
    },
    markRead: (notifyId) => {
      return this.request(`/api/v1/apps/${this.appId}/notifications/${notifyId}/read`, {
        method: "POST"
      });
    },
    markReadAll: () => {
      return this.request(`/api/v1/apps/${this.appId}/notifications/read-all`, {
        method: "POST"
      });
    },
    delete: (ids) => {
      const idParam = Array.isArray(ids) ? ids.join(",") : ids;
      return this.request(`/api/v1/apps/${this.appId}/notifications`, {
        method: "DELETE",
        params: { id: idParam }
      });
    },
    subscribePush: (subscription) => {
      return this.request(`/api/v1/apps/${this.appId}/notifications/subscribe`, {
        method: "POST",
        body: subscription
      });
    },
    unsubscribePush: (endpoint) => {
      return this.request(`/api/v1/apps/${this.appId}/notifications/unsubscribe`, {
        method: "POST",
        body: { endpoint }
      });
    },
    send: (payload) => {
      return this.request(`/api/v1/apps/${this.appId}/notifications/send`, {
        method: "POST",
        body: payload
      });
    }
  };
  // ==========================================
  // MODULE: Users (Manage app users)
  // ==========================================
  users = {
    list: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/users`, {
        method: "GET",
        params
      });
    },
    create: (user) => {
      return this.request(`/api/v1/apps/${this.appId}/users`, {
        method: "POST",
        body: user
      });
    },
    update: (id, user) => {
      return this.request(`/api/v1/apps/${this.appId}/users`, {
        method: "PUT",
        params: { id },
        body: user
      });
    },
    delete: (ids) => {
      const idParam = Array.isArray(ids) ? ids.join(",") : ids;
      return this.request(`/api/v1/apps/${this.appId}/users`, {
        method: "DELETE",
        params: { id: idParam }
      });
    },
    /** Admin: set/reset a user's password (no current password required). */
    adminSetPassword: (userId, password, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/users/${userId}/password`, {
        method: "POST",
        body: { password }
      });
    },
    /** Admin: generate a temporary password for a user. */
    adminResetPassword: (userId, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/users/${userId}/password`, {
        method: "POST",
        body: { generateTemp: true }
      });
    },
    /** Admin: list all sessions for a specific user. */
    getSessions: (userId, params, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/users/${userId}/sessions`, {
        method: "GET",
        params
      });
    },
    /** Admin: revoke a specific session of a user. */
    revokeSession: (userId, sessionId, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/users/${userId}/sessions/${sessionId}`, {
        method: "DELETE"
      });
    }
  };
  // ==========================================
  // MODULE: RBAC & Routes (Manage app permissions)
  // ==========================================
  roles = {
    list: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/roles`, {
        method: "GET",
        params
      });
    },
    create: (role) => {
      return this.request(`/api/v1/apps/${this.appId}/roles`, {
        method: "POST",
        body: role
      });
    },
    update: (role) => {
      return this.request(`/api/v1/apps/${this.appId}/roles`, {
        method: "PUT",
        params: { id: role.id },
        body: role
      });
    },
    delete: (ids) => {
      const idParam = Array.isArray(ids) ? ids.join(",") : ids;
      return this.request(`/api/v1/apps/${this.appId}/roles`, {
        method: "DELETE",
        params: { id: idParam }
      });
    }
  };
  routes = {
    list: async (params) => {
      const res = await this.request(`/api/v1/apps/${this.appId}/routes`, {
        method: "GET",
        params
      });
      const payload = res.data;
      return {
        ...res,
        data: payload?.tree ?? payload?.routes ?? [],
        routes: payload?.routes,
        tree: payload?.tree
      };
    },
    create: (route) => {
      return this.request(`/api/v1/apps/${this.appId}/routes`, {
        method: "POST",
        body: route
      });
    },
    update: (route) => {
      return this.request(`/api/v1/apps/${this.appId}/routes`, {
        method: "PUT",
        params: { id: route.id },
        body: route
      });
    },
    delete: async (ids) => {
      const idList = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
      const results = [];
      for (const id of idList) {
        results.push(await this.request(`/api/v1/apps/${this.appId}/routes`, {
          method: "DELETE",
          params: { id }
        }));
      }
      return results.length === 1 ? results[0] : { success: results.every((r) => r.success !== false), data: void 0 };
    }
  };
  // ==========================================
  // MODULE: Logs (Dedicated MongoDB Audit Logs)
  // ==========================================
  logs = {
    list: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/logs`, {
        method: "GET",
        params
      });
    }
  };
  auditLogs = this.logs;
  // ==========================================
  // MODULE: Permissions (read-only capability catalog §6.4)
  // ==========================================
  permissions = {
    catalog: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/permissions`, {
        method: "GET"
      });
    },
    list: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/permissions`, {
        method: "GET"
      });
    }
  };
  // ==========================================
  // MODULE: Docs (shared reference content, single source in tm-hub)
  // ==========================================
  docs = {
    /** Get the localized reference docs content for an app (requires a user JWT). */
    get: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/docs`, {
        method: "GET"
      });
    }
  };
  // ==========================================
  // MODULE: AI providers, credentials & models (R147)
  // ==========================================
  ai = {
    /** Provider definitions merged with this app's usable connections. */
    providers: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/ai/providers`, {
        method: "GET"
      });
    },
    /** Discover the live model catalogue; `persist` defaults to true with a connectionId. */
    discover: (input, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/ai/discover`, {
        method: "POST",
        body: input
      });
    },
    connections: {
      /** Add or rotate one credential; `name` allows many accounts per provider. */
      saveManual: (input, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/connections/manual`, {
          method: "POST",
          body: input
        });
      },
      update: (connectionId, patch, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/connections/${encodeURIComponent(connectionId)}`, {
          method: "PATCH",
          body: patch
        });
      },
      delete: (connectionId, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/connections/${encodeURIComponent(connectionId)}`, {
          method: "DELETE"
        });
      },
      /** Health test; `name` selects the credential row (default: 'default'). */
      test: (provider, name = "default", appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/connections/test`, {
          method: "POST",
          body: { provider, name }
        });
      }
    },
    models: {
      list: (params, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/models`, {
          method: "GET",
          params
        });
      },
      add: (input, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/models`, {
          method: "POST",
          body: input
        });
      },
      setEnabled: (modelId, isEnabled, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/models/${encodeURIComponent(modelId)}`, {
          method: "PATCH",
          body: { isEnabled }
        });
      },
      delete: (modelId, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/models/${encodeURIComponent(modelId)}`, {
          method: "DELETE"
        });
      }
    },
    /**
     * Server-to-server relay: the app authenticates with its own device
     * credential (X-Device-Id/X-Device-Secret) or App Secret (X-App-Secret),
     * never with provider keys, so provider credentials stay in the hub. Every
     * method throws if neither credential getter was supplied.
     */
    relay: {
      /** Connections (own rows + enabled grants) and their enabled models. */
      catalog: async (appId) => {
        const target = appId || this.appId;
        const headers = await this.appCredentialHeaders();
        return this.request(
          `/api/v1/apps/${target}/ai/relay/catalog`,
          { method: "GET", headers }
        );
      },
      /**
       * One chat turn through a connection. `systemPrompt` is sugar: the hub
       * only understands `messages`, so it is prepended as a system message
       * here. Attachments carry base64 `data`, never a `data:` URL.
       */
      chat: async (input, appId) => {
        const target = appId || this.appId;
        const headers = await this.appCredentialHeaders();
        const systemPrompt = input.systemPrompt?.trim();
        const messages = systemPrompt ? [{ role: "system", content: systemPrompt }, ...input.messages] : input.messages;
        return this.request(
          `/api/v1/apps/${target}/ai/relay/chat`,
          {
            method: "POST",
            headers,
            body: {
              connectionId: input.connectionId,
              model: input.model,
              messages,
              maxTokens: input.maxTokens,
              temperature: input.temperature
            }
          }
        );
      }
    },
    grants: {
      list: (appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/grants`, {
          method: "GET"
        });
      },
      add: (connectionId, targetAppId, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/grants`, {
          method: "POST",
          body: { connectionId, targetAppId }
        });
      },
      revoke: (connectionId, targetAppId, appId) => {
        const target = appId || this.appId;
        return this.request(`/api/v1/apps/${target}/ai/grants`, {
          method: "DELETE",
          params: { connectionId, targetAppId }
        });
      }
    }
  };
  // ==========================================
  // MODULE: Connections (per-app provider credentials)
  // ==========================================
  connections = {
    /** Provider definitions merged with this app's connection status (secrets never returned). */
    list: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/connections`, {
        method: "GET"
      });
    },
    /** Manual credentials connect (e.g. Cloudinary) — secrets are encrypted server-side. */
    saveManual: (provider, values, appId) => {
      const target = appId || this.appId;
      return this.request(
        `/api/v1/apps/${target}/connections/manual`,
        { method: "POST", body: { provider, values } }
      );
    },
    /**
     * Quick connect: no credentials sent — the server reads this app's configs
     * (app_configs, managed on the Configs page), verifies them live and stores
     * the connection row. Currently supported by providers flagged `quick` (cloudinary).
     */
    quick: (provider, appId) => {
      const target = appId || this.appId;
      return this.request(
        `/api/v1/apps/${target}/connections/quick`,
        { method: "POST", body: { provider } }
      );
    },
    /** Test a stored connection (updates last_test_* server-side). */
    test: (provider, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/connections/test`, {
        method: "POST",
        body: { provider }
      });
    },
    /** Disconnect + delete stored credentials. */
    disconnect: (provider, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/connections/${provider}`, {
        method: "DELETE"
      });
    },
    /**
     * OAuth start: returns the provider consent URL (state carries app_id).
     * Open it in a popup/window; the fixed callback posts
     * `{ type: 'tm-hub-oauth', status }` back to the opener.
     */
    oauthStart: (provider, appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/oauth/${provider}/auth`, {
        method: "POST",
        body: { app_id: target }
      });
    }
  };
  // ==========================================
  // MODULE: Storage Gateway (server-to-server object storage)
  // ==========================================
  /**
   * App-authenticated object storage. Every method sends the device credential
   * (X-Device-Id/X-Device-Secret) when `getDeviceCredential` is supplied, else
   * X-App-Secret, and throws when neither is configured. Provider credentials
   * never leave the hub; callers receive only short-lived, object-scoped
   * upload/download grants. Treat signed URLs as bearer secrets: never log them
   * or persist them client-side. Objects are addressed by `objectId`; the
   * internal provider key is not public.
   */
  storage = {
    /** Sanitized connections this app may use (own rows + enabled grants) with capabilities. */
    connections: async (appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/connections`,
        { method: "GET", headers }
      );
    },
    /** Initiate a single-part upload; returns a short-lived object-scoped grant. */
    initUpload: async (input, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/uploads/initiate`,
        { method: "POST", headers, body: input }
      );
    },
    /** Verify the uploaded object via independent server-side HEAD, then mark ready. */
    completeUpload: async (uploadId, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/uploads/${encodeURIComponent(uploadId)}/complete`,
        { method: "POST", headers }
      );
    },
    /** Abort an upload and clean up partial provider state where possible. */
    abortUpload: async (uploadId, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/uploads/${encodeURIComponent(uploadId)}/abort`,
        { method: "POST", headers }
      );
    },
    /** Short-lived, object-scoped download grant. Never an arbitrary bucket/key. */
    createDownloadGrant: async (objectId, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/objects/${encodeURIComponent(objectId)}/download-grant`,
        { method: "POST", headers }
      );
    },
    /** Stat a single object's manifest metadata. */
    getObject: async (objectId, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/objects/${encodeURIComponent(objectId)}`,
        { method: "GET", headers }
      );
    },
    /** Bounded cursor pagination over the app's object manifest; metadata only. */
    listObjects: async (params, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/objects`,
        { method: "GET", headers, params }
      );
    },
    /** Logical folder markers, bounded cursor pagination. */
    listFolders: async (params, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/folders`,
        { method: "GET", headers, params }
      );
    },
    /** Delete an object at the provider, then mark the manifest row deleted. */
    deleteObject: async (objectId, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/objects/${encodeURIComponent(objectId)}`,
        { method: "DELETE", headers }
      );
    },
    /** Provider-side copy to a new Hub-generated key (never a SQL-only rename). */
    copyObject: async (objectId, input, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/objects/${encodeURIComponent(objectId)}/copy`,
        { method: "POST", headers, body: input }
      );
    },
    /** Create an explicit folder marker so empty folders persist. */
    createFolder: async (input, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/folders`,
        { method: "POST", headers, body: input }
      );
    },
    /** Soft-delete a folder marker. */
    deleteFolder: async (input, appId) => {
      const target = appId || this.appId;
      const headers = await this.appCredentialHeaders();
      return this.request(
        `/api/v1/apps/${target}/storage/folders`,
        { method: "DELETE", headers, body: input }
      );
    }
  };
  // ==========================================
  // MODULE: Data Import (CSV/JSON/paste/Sheets → configs/users/routes)
  // ==========================================
  imports = {
    /** Target definitions (identifier + required/optional fields). */
    targets: (appId) => {
      const target = appId || this.appId;
      return this.request(`/api/v1/apps/${target}/import`, {
        method: "GET"
      });
    },
    /** Get target config with full schema (fields, validation, transformers, samples). */
    target: (target, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/targets/${target}`, {
        method: "GET"
      });
    },
    /** Dry-run: validate rows and detect create/update per row. */
    preview: (target, rows, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/preview`, {
        method: "POST",
        body: { target, rows }
      });
    },
    /** Preview with full source config and options (supports google, csv, paste, json). */
    previewWithConfig: (target, source, rows, sourceConfig, options, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/preview`, {
        method: "POST",
        body: { target, source, rows, sourceConfig, options }
      });
    },
    /** Apply rows (upsert, per-row error isolation). */
    run: (target, rows, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/run`, {
        method: "POST",
        body: { target, rows }
      });
    },
    /** Execute import with full options, preview, and source config (sync). */
    execute: (target, source, rows, sourceConfig, options, preview, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/execute`, {
        method: "POST",
        body: { target, source, rows, sourceConfig, options, preview }
      });
    },
    /** Schedule an import job (async, queued). */
    schedule: (target, source, sourceConfig, options, priority, scheduledAt, maxAttempts, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/schedule`, {
        method: "POST",
        body: { target, source, sourceConfig, options, priority, scheduledAt: scheduledAt?.toISOString(), maxAttempts }
      });
    },
    /** List import jobs with pagination and filters. */
    listJobs: (params, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/jobs`, {
        method: "GET",
        params
      });
    },
    /** Get import job detail. */
    getJob: (jobId, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/jobs/${jobId}`, {
        method: "GET"
      });
    },
    /** Cancel a pending/running import job. */
    cancel: (jobId, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/jobs/${jobId}`, {
        method: "DELETE"
      });
    },
    /** Get queue statistics. */
    getStats: (appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/stats`, {
        method: "GET"
      });
    },
    /** Download error log for a job. */
    getJobLog: (jobId, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/jobs/${jobId}/download`, {
        method: "GET"
      });
    },
    /** Read a Google Sheet server-side — the access token never leaves tm-hub. */
    fetchSheet: (spreadsheetId, range, appId) => {
      const app = appId || this.appId;
      return this.request(`/api/v1/apps/${app}/import/sheets`, {
        method: "GET",
        params: { spreadsheet_id: spreadsheetId, range }
      });
    },
    /** Import Templates */
    templates: {
      /** List import templates. */
      list: (target, isSystem, page, limit, appId) => {
        const app = appId || this.appId;
        return this.request(`/api/v1/apps/${app}/import/templates`, {
          method: "GET",
          params: { target, is_system: isSystem, page, limit }
        });
      },
      /** Create a new import template. */
      create: (target, name, columns, description, mappings, defaultValues, validationRules, isSystem, appId) => {
        const app = appId || this.appId;
        return this.request(`/api/v1/apps/${app}/import/templates`, {
          method: "POST",
          body: { target, name, columns, description, mappings, defaultValues, validationRules, isSystem }
        });
      },
      /** Get a template by ID. */
      get: (templateId, appId) => {
        const app = appId || this.appId;
        return this.request(`/api/v1/apps/${app}/import/templates/${templateId}`, {
          method: "GET"
        });
      },
      /** Update a template. */
      update: (templateId, data, appId) => {
        const app = appId || this.appId;
        return this.request(`/api/v1/apps/${app}/import/templates/${templateId}`, {
          method: "PUT",
          body: data
        });
      },
      /** Delete a template. */
      delete: (templateId, appId) => {
        const app = appId || this.appId;
        return this.request(`/api/v1/apps/${app}/import/templates/${templateId}`, {
          method: "DELETE"
        });
      },
      /** Download a template as CSV. */
      download: (templateId, format = "csv", appId) => {
        const app = appId || this.appId;
        return this.request(`/api/v1/apps/${app}/import/templates/${templateId}/download`, {
          method: "GET",
          params: { format }
        });
      }
    }
  };
  // ==========================================
  // MODULE: Export Data (Phase E — export jobs & templates)
  // ==========================================
  export = {
    /** Start an export job — job runs inline and is returned completed/failed. */
    start: (module2, options) => {
      return this.request(`/api/v1/apps/${this.appId}/modules/${encodeURIComponent(module2)}/export`, {
        method: "POST",
        body: { options }
      });
    },
    /** List export jobs (modules filtered server-side by capability; `mine` scopes to current user). */
    jobs: (params) => {
      return this.request(`/api/v1/apps/${this.appId}/export/jobs`, {
        method: "GET",
        params: {
          module: params?.module,
          mine: params?.mine ? "true" : void 0,
          limit: params?.limit,
          offset: params?.offset
        }
      });
    },
    job: (jobId) => {
      return this.request(`/api/v1/apps/${this.appId}/export/jobs/${encodeURIComponent(jobId)}`, {
        method: "GET"
      });
    },
    deleteJob: (jobId) => {
      return this.request(`/api/v1/apps/${this.appId}/export/jobs/${encodeURIComponent(jobId)}`, {
        method: "DELETE"
      });
    },
    /** Direct download URL — caller must attach Authorization header. */
    downloadUrl: (jobId) => `${this.baseUrl}/api/v1/apps/${this.appId}/export/jobs/${encodeURIComponent(jobId)}/download`,
    /** Download exported file as Blob (auto refresh token on 401). */
    download: async (jobId) => {
      const url = this.export.downloadUrl(jobId);
      const doFetch = () => {
        const headers = new Headers({ "X-App-Id": this.appId });
        return Promise.resolve(this.getAccessToken?.()).then((token) => {
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return this.customFetch(url, { headers });
        });
      };
      let response = await doFetch();
      if (response.status === 401 && this.getRefreshToken) {
        const refreshed = await this.tryRefreshTokens();
        if (refreshed) response = await doFetch();
      }
      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { message: response.statusText };
        }
        const error = new Error(errorBody.message || errorBody.statusMessage || `Download failed with status ${response.status}`);
        error.statusCode = response.status;
        error.data = errorBody;
        throw error;
      }
      return response.blob();
    },
    templates: (module2) => {
      return this.request(`/api/v1/apps/${this.appId}/export/templates`, {
        method: "GET",
        params: { module: module2 }
      });
    },
    createTemplate: (data) => {
      return this.request(`/api/v1/apps/${this.appId}/export/templates`, {
        method: "POST",
        body: data
      });
    },
    updateTemplate: (templateId, data) => {
      return this.request(`/api/v1/apps/${this.appId}/export/templates/${encodeURIComponent(templateId)}`, {
        method: "PUT",
        body: data
      });
    },
    deleteTemplate: (templateId) => {
      return this.request(`/api/v1/apps/${this.appId}/export/templates/${encodeURIComponent(templateId)}`, {
        method: "DELETE"
      });
    }
  };
  // ==========================================
  // MODULE: Mail (send/schedule, templates, inbox, analytics, queue, jobs)
  // ==========================================
  mail = {
    providers: () => {
      return this.request(`/api/v1/apps/${this.appId}/mail/providers`, {
        method: "GET"
      });
    },
    send: (data) => {
      return this.request(`/api/v1/apps/${this.appId}/mail/send`, {
        method: "POST",
        body: data
      });
    },
    schedule: (data) => {
      return this.request(`/api/v1/apps/${this.appId}/mail/schedule`, {
        method: "POST",
        body: data
      });
    },
    test: (to) => {
      return this.request(`/api/v1/apps/${this.appId}/mail/test`, {
        method: "POST",
        body: { to }
      });
    },
    stats: () => {
      return this.request(`/api/v1/apps/${this.appId}/mail/stats`, {
        method: "GET"
      });
    },
    templates: {
      list: (params) => {
        return this.request(
          `/api/v1/apps/${this.appId}/mail/templates`,
          { method: "GET", params }
        );
      },
      get: (templateId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}`, {
          method: "GET"
        });
      },
      byKey: (key, locale) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/by-key/${encodeURIComponent(key)}`, {
          method: "GET",
          params: locale ? { locale } : void 0
        });
      },
      create: (data) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates`, {
          method: "POST",
          body: data
        });
      },
      update: (templateId, data) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}`, {
          method: "PUT",
          body: data
        });
      },
      delete: (templateId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}`, {
          method: "DELETE"
        });
      },
      archive: (templateId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}/archive`, {
          method: "POST"
        });
      },
      clone: (templateId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}/clone`, {
          method: "POST"
        });
      },
      publish: (templateId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}/publish`, {
          method: "POST"
        });
      },
      preview: (templateId, variables) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/templates/${encodeURIComponent(templateId)}/preview`, {
          method: "POST",
          body: { variables }
        });
      }
    },
    analytics: {
      summary: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/analytics/summary`, {
          method: "GET",
          params
        });
      },
      timeseries: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/analytics/timeseries`, {
          method: "GET",
          params
        });
      },
      campaigns: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/analytics/campaigns`, {
          method: "GET",
          params
        });
      },
      events: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/analytics/events`, {
          method: "GET",
          params
        });
      },
      topDomains: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/analytics/top-domains`, {
          method: "GET",
          params
        });
      },
      topTemplates: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/analytics/top-templates`, {
          method: "GET",
          params
        });
      },
      exportCsvUrl: (params) => {
        const query = new URLSearchParams();
        if (params?.from) query.set("from", params.from);
        if (params?.to) query.set("to", params.to);
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return `${this.baseUrl}/api/v1/apps/${this.appId}/mail/analytics/export${suffix}`;
      }
    },
    inbox: {
      profile: () => {
        return this.request(`/api/v1/apps/${this.appId}/mail/inbox/profile`, {
          method: "GET"
        });
      },
      messages: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/inbox/messages`, {
          method: "GET",
          params
        });
      },
      message: (messageId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/inbox/messages/${encodeURIComponent(messageId)}`, {
          method: "GET"
        });
      },
      thread: (threadId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/inbox/threads/${encodeURIComponent(threadId)}`, {
          method: "GET"
        });
      },
      send: (data) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/inbox/messages`, {
          method: "POST",
          body: data
        });
      },
      setLabels: (messageId, data) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/inbox/messages/${encodeURIComponent(messageId)}/labels`, {
          method: "POST",
          body: data
        });
      },
      attachmentUrl: (messageId, attachmentId) => `${this.baseUrl}/api/v1/apps/${this.appId}/mail/inbox/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    },
    queue: {
      get: (params) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/queue`, {
          method: "GET",
          params
        });
      },
      action: (action, jobId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/queue`, {
          method: "POST",
          body: { action, jobId }
        });
      }
    },
    jobs: {
      get: (jobId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/jobs/${encodeURIComponent(jobId)}`, {
          method: "GET"
        });
      },
      delete: (jobId) => {
        return this.request(`/api/v1/apps/${this.appId}/mail/jobs/${encodeURIComponent(jobId)}`, {
          method: "DELETE"
        });
      }
    }
  };
  // ==========================================
  // MODULE: Capabilities (client-side helpers)
  // ==========================================
  capabilities = {
    has: (capability) => {
      const perms = this.cachedPermissions;
      if (!perms) return false;
      if (perms.includes("*")) return true;
      if (perms.includes(capability)) return true;
      const aliases = CAPABILITY_ALIASES[capability] || [];
      return aliases.some((a) => perms.includes(a));
    },
    canAccessApp: (targetAppId) => {
      if (!targetAppId || targetAppId === this.appId) return true;
      const perms = this.cachedPermissions;
      if (!perms) return false;
      if (perms.includes("*")) return true;
      return perms.includes("platform.crossapp.read") || perms.includes("platform.crossapp.write");
    },
    /** Load permissions from /auth/permissions and cache them. */
    load: async () => {
      try {
        await this.auth.permissions();
        return this.cachedPermissions !== null;
      } catch {
        return false;
      }
    }
  };
};
function createHubClient(options) {
  return new HubClient(options);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_HUB_PORT,
  DEFAULT_HUB_URL,
  HubClient,
  PLATFORM_PORTS,
  createHubClient
});
//# sourceMappingURL=index.cjs.map