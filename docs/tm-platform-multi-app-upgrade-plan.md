# TM Platform --- Shared Libraries, AI Architecture & Multi-App Upgrade Plan

> Tài liệu triển khai dành cho AI coding agents làm việc trên: -
> `tuanmjnh/tm-hub` - `tuanmjnh/tm-tools` - `tuanmjnh/tm-studio` -
> Shared packages repository dự kiến: `tuanmjnh/tm-platform` (tên đề
> xuất, cần xác nhận trước khi tạo).
>
> Mục tiêu: chuẩn hóa kiến trúc hệ sinh thái TM, giảm code trùng lặp có
> kiểm soát, xây dựng shared libraries phát hành qua npm, đồng thời nâng
> cấp AI Provider theo mô hình Hybrid: Hub-managed / App-managed /
> Local.
>
> **Nguyên tắc:** Audit trước, đề xuất trước, triển khai theo phase.
> Không rewrite đồng loạt, không di chuyển code chỉ để giảm số dòng,
> không làm hỏng tính năng hiện tại.

------------------------------------------------------------------------

## 0. Quyết định kiến trúc cấp cao

### 0.1 Có nên xây shared libraries?

**Có.** Nên xây một bộ package độc lập, có version, changelog, tests và
release lifecycle riêng. Không gom mọi thứ vào một mega package.

Tên scope đề xuất `@tuanmjnh/*` nếu còn khả dụng và phù hợp; nếu không,
chọn scope/registry khác sau khi kiểm tra quyền publish. Không hard-code
tên trước khi xác nhận.

Package đề xuất:

  ---------------------------------------------------------------------------
  Package                 Trách nhiệm                 Runtime
  ----------------------- --------------------------- -----------------------
  `@tuanmjnh/types`             Shared TypeScript           Runtime-agnostic
                          contracts, DTO, primitive   
                          types                       

  `@tuanmjnh/validators`        Zod schemas,                Runtime-agnostic
                          validation/parsing          

  `@tuanmjnh/utils`             Pure utility functions      Runtime-agnostic

  `@tuanmjnh/ui`                Vue UI components dùng      Vue/Nuxt
                          chung                       

  `@tuanmjnh/nuxt`              Nuxt                        Nuxt 4
                          module/plugin/auto-import   
                          integration nếu cần         

  `@tuanmjnh/ai-client`         AI provider client,         Browser/server adapters
                          streaming, adapters, error  
                          handling                    
  ---------------------------------------------------------------------------

Không bắt buộc tạo tất cả ngay. Bắt đầu từ `types`, `validators`,
`utils`; chỉ tạo `ui`, `nuxt`, `ai-client` sau khi xác định contract và
consumer.

**Không tạo package trùng chức năng `tm-hub-client`.** -
`tm-hub-client`: SDK kết nối TM Hub Control Plane. - `@tuanmjnh/ai-client`:
SDK gọi AI Provider theo connection mode. - Hai SDK có thể phối hợp
nhưng không phụ thuộc bắt buộc vào nhau.

### 0.2 Ba lớp kiến trúc

``` text
TM Platform
├── Control Plane
│   ├── tm-hub
│   └── tm-hub-client
├── Shared Libraries
│   ├── @tuanmjnh/types
│   ├── @tuanmjnh/validators
│   ├── @tuanmjnh/utils
│   ├── @tuanmjnh/ui
│   ├── @tuanmjnh/nuxt
│   └── @tuanmjnh/ai-client
└── Satellite Applications
    ├── tm-tools
    ├── tm-studio
    ├── tm-trading (future)
    ├── tm-socialhub (future)
    └── other apps
```

-   `tm-hub`: danh tính, quyền, app registry, model catalog, shared
    connections, remote config, media/storage/notification và
    control-plane services.
-   Shared libraries: code generic có thể tái sử dụng.
-   Mỗi app: domain logic, UI đặc thù, data ownership và lifecycle
    riêng.

### 0.3 Tiêu chí đưa code vào shared package

Chỉ chia sẻ khi: 1. Có ít nhất hai consumer thực sự. 2.
Contract/behavior đủ ổn định. 3. Không phụ thuộc ngầm vào app-specific
runtime/state. 4. Có test độc lập. 5. Có owner và versioning. 6. Chi phí
nâng cấp consumer thấp hơn lợi ích tái sử dụng.

Giữ trong app: - TMCut timeline/editor/rendering/media engine. - TM
Tools browser profiles, downloader, FFmpeg workflow, document studio. -
TM Hub IAM implementation, database repositories, server secrets,
internal services. - Business rules chỉ thuộc một app. - UI component
đặc thù theo domain.

------------------------------------------------------------------------

## 1. Repository audit baseline

Thông tin dưới đây là baseline từ repository tại thời điểm lập tài liệu.
AI phải kiểm tra lại branch, commit và working tree trước khi triển
khai; không coi nội dung này thay thế audit local.

### 1.1 `tm-hub`

Repository: https://github.com/tuanmjnh/tm-hub

Nhận diện: - Nuxt 4 + Nuxt UI v4 + Nitro. - Supabase PostgreSQL là
database chính; MongoDB có vai trò audit theo cấu hình. - Đã có pnpm
workspace `packages/*`. - Có `shared/types`, `shared/rbac.ts`,
`server/modules/*`, `app/components/*`, `app/composables/*`. - Có
Application Registry, IAM/RBAC, dynamic routes, app configs,
connections, AI provider domain, media, notifications và Storage
Gateway. - `tm-hub-client` là SDK kết nối Control Plane. -
`scripts/seed` seed dữ liệu cho nhiều app.

Điểm cần giữ: - Storage Gateway là data plane riêng, không trộn với
Cloudinary Media Gateway. - Storage Gateway dùng connection grants
riêng, không tái sử dụng AI connection grants. - Không để app
secret/provider secrets rời Hub server. - Giữ backward compatibility các
API đang có consumer.

Tài liệu bắt buộc đọc: - `README.md`, `AGENTS.md`,
`docs/ARCHITECTURE.md` -
`docs/TM-HUB-STORAGE-GATEWAY-IMPLEMENTATION.md` - `shared/rbac.ts` -
`pnpm-workspace.yaml`, `package.json` - `supabase/schema.sql`,
`supabase/policies.sql`, migrations liên quan -
`server/modules/ai-providers/*`, `server/modules/connections/*` - API
routes liên quan AI, apps, config, storage, media, auth.

### 1.2 `tm-tools`

Repository: https://github.com/tuanmjnh/tm-tools

Nhận diện: - Electron + Nuxt 4 + Nuxt UI v4; dev port 4002. - Dùng
`tm-hub-client`/Hub làm identity và control plane. - Có local desktop
capabilities, local API/server, AI console,
media/download/FFmpeg/document tools. - Có nhiều component/composable có
tên và cấu trúc tương đồng `tm-hub`, `tm-studio`. - README mô tả AI
console/provider connections theo hướng Hub-owned; cần audit và chuyển
đổi sang Hybrid AI architecture.

Tài liệu bắt buộc đọc: - `README.md`, `AGENTS.md`, docs hiện hành trong
`docs/` - `package.json`, `nuxt.config.ts` -
`app/composables/useHub.ts`, `useHubAi.ts`, `useAuth.ts` -
`app/components/base/*`, `admin/*`, `roles/*` -
`app/utils/aiProviderTransfer.ts` - `server/api/*` liên quan AI, Hub
proxy, chat - `electron/main.cjs`, preload, secure storage/keychain và
IPC liên quan AI.

### 1.3 `tm-studio`

Repository: https://github.com/tuanmjnh/tm-studio

Nhận diện: - Electron + Nuxt 4 + Nuxt UI v4; dev port 4003. - Có
`packages/core` --- TMCut deterministic editing engine, zero-dependency;
cần giữ riêng. - Có local-first project persistence, browser byte cache,
media engine và AI integration. - Có `tm-hub-client`. - Có local
Electron AI vault/secure storage và Hub AI catalog/relay integration. -
Có nhiều base/dashboard/admin components tương đồng các app khác. - Tài
liệu hiện tại ghi nhận extraction một số media modules thành package đã
deferred/blocked do chưa đủ exit criteria. Không tự ý mở lại extraction
nếu chưa có evidence mới và owner approval.

Tài liệu bắt buộc đọc: - `README.md`, `AGENTS.md` -
`docs/architecture/package-boundaries.md` -
`docs/architecture/core-package-contract.md` - ADRs/audit docs liên quan
package boundaries - `package.json`, `pnpm-workspace.yaml`,
`packages/core/*` - `app/composables/useHub.ts`, `useHubAi.ts` -
`app/utils/tmcut/hubAiConnection.ts` - Electron AI gateway/secure
storage files - `server/api/v1/*` liên quan AI relay/TTS/local services.

### 1.4 Nhóm code trùng lặp cần audit

Ứng viên có tên/cấu trúc tương đồng trong nhiều repo: - `BasePage` -
`BentoCard`, `BentoGrid` - `ConfirmModal` - `FormModal` -
`HeaderActions` - `ResponsiveModal` - `ResponsiveSlideover` -
`SectionNav` - `PasswordInput` - `Table` - `StatusBadge` -
`RowActions` - `ViewModeToggle` - `GridList` - `ConversationList` -
`DocsArticleView`, `DocsMarkdown` - `Inbox*` -
`NotificationsSlideover` - `TeamsMenu`, `UserMenu` - `useAuth`,
`useHub`, `useNavMenu` - `useDateTime`, `useDeviceBreakpoints`,
`useNotify` - `useCloudinary`, `useWebPush` - `useMobileBar`,
`useAdminPageChrome`, `useAdminRowActions` - `aiProviderTransfer.ts`, AI
provider/model types và utilities.

Đây chỉ là danh sách ứng viên. Tên giống nhau không đồng nghĩa
implementation giống nhau. Phải so sánh props, emits, slots, styling,
accessibility, responsive behavior, side effects, dependencies và tests.

------------------------------------------------------------------------

## 2. Shared library architecture

### 2.1 Package boundaries

#### `@tuanmjnh/types`

Chứa: - Primitive types. - API DTO/request/response contracts dùng
chung. - Provider/model metadata contracts. - Pagination/result/error
types. - Shared app metadata types không gắn chặt Hub DB.

Không chứa database models/repositories, secret values, Nuxt runtime
config, app-specific page state hoặc logic I/O.

#### `@tuanmjnh/validators`

Chứa: - Zod schemas dùng chung. - Input validation/parsing. - Schema
versioning helpers khi có use case rõ. - Type inference exports.

Tránh circular dependency. Không import server-only modules.

#### `@tuanmjnh/utils`

Chứa pure functions: - String/number/date formatting nếu semantics đồng
nhất. - URL normalization. - Error normalization thuần. - Data
transformation. - Retry/backoff calculation thuần. - File metadata
helpers không đụng filesystem runtime cụ thể.

Không chứa `window`, `document`, `localStorage`, Electron IPC, Node
filesystem trực tiếp trong core entry; không chứa Nuxt auto-import
assumptions hoặc side-effect API calls.

Nếu cần runtime adapters, tách subpath rõ ràng như `@tuanmjnh/utils/browser`
và `@tuanmjnh/utils/node`. Không import Node adapter từ browser entry.

#### `@tuanmjnh/ui`

Chứa Vue components generic: - Page shell/header action patterns. -
Empty/loading/error states. - Confirm/form dialogs. - Responsive
modal/slideover wrappers. - Common list/table wrappers. - Status
badges. - Common navigation primitives.

Không chứa: - TMCut/downloader/profile-manager/Hub IAM domain
components. - API call trực tiếp. - Auth state hoặc app-specific Pinia
store. - Business permissions hard-coded.

Yêu cầu: - Vue 3 peer dependency; không bundle Vue. - Nuxt UI/Tailwind
peer/dependency strategy được kiểm tra trước. - Props/emits/slots có
types. - Styles có entry riêng và hướng dẫn import. - Accessibility,
keyboard, focus, aria, responsive. - Demo/story và visual regression nếu
khả thi. - Nuxt auto-import chỉ qua module integration; không giả định
package tự auto-import.

#### `@tuanmjnh/nuxt`

Chỉ tạo khi có nhu cầu thực tế: - Nuxt module đăng ký
components/composables. - Runtime config typing. - Plugin setup. - CSS
registration. - Auto-import directories.

Không đưa pure utils vào package này.

#### `@tuanmjnh/ai-client`

Chứa: - Provider/model/request/response types. - OpenAI-compatible chat
client. - Streaming/SSE parsing. - Provider adapter interface. -
Timeout/cancellation. - Error normalization. - Retry policy có giới
hạn. - Model capability metadata. - Connection resolver/routing
interfaces.

Không chứa Hub App Secret, API keys hard-code, Electron secure storage
implementation, Hub database access hoặc arbitrary URL fetch thiếu
security controls.

Credential adapters theo môi trường: - Browser: không lưu provider
secret dài hạn; dùng app backend hoặc credential public/ephemeral phù
hợp. - Server: secret từ server-side storage/environment/vault. -
Electron: OS credential store/keychain qua main process/secure IPC. -
Hub-managed: relay qua Hub API với authorization.

#### `tm-hub-client`

Tiếp tục là package riêng cho Control Plane: - Auth/control-plane
APIs. - App context. - Routes/RBAC. - Config metadata. -
Connections/grants. - Media/storage/notification. - AI catalog/relay
APIs theo contract Hub nếu hiện tại đã có.

Không chuyển generic provider SDK thành dependency bắt buộc của
`tm-hub-client`.

### 2.2 Dependency graph

``` text
@tuanmjnh/types
   ↑
@tuanmjnh/validators       @tuanmjnh/utils
        \             /
         \           /
          @tuanmjnh/ai-client

Vue 3 + Nuxt UI peers
          ↑
        @tuanmjnh/ui
          ↑
       @tuanmjnh/nuxt (optional)

tm-hub-client ── connects to TM Hub APIs
@tuanmjnh/ai-client ── connects to AI provider through selected adapter

tm-hub / tm-tools / tm-studio
  ├── consume shared packages
  ├── retain app-specific domain modules
  └── optionally use tm-hub-client and @tuanmjnh/ai-client
```

Không tạo dependency cycle. `@tuanmjnh/ui` không phụ thuộc app.
`@tuanmjnh/ai-client` không bắt buộc phụ thuộc `tm-hub-client`.

------------------------------------------------------------------------

## 3. Shared repository and npm publishing

### 3.1 Repository riêng

Tên gợi ý: `tm-platform` hoặc `tm-shared`.

Lợi ích: - Version/release độc lập. - Không buộc app consumer cài
monorepo app khác. - Publish package nhỏ theo nhu cầu. - Central CI,
tests, changelog, docs. - Shared code có ownership rõ.

Không cần chuyển mọi package hiện có ngay. `tm-hub` giữ workspace riêng
cho package nội bộ Hub. `tm-studio/packages/core` tiếp tục thuộc TMCut
tới khi có quyết định extraction riêng.

### 3.2 Workspace layout

``` text
tm-platform/
  packages/
    types/
    validators/
    utils/
    ui/
    nuxt/
    ai-client/
  examples/
    nuxt4-app/
    electron-nuxt-app/
  docs/
  .changeset/
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
```

Chỉ tạo packages đã được audit và có consumer; không tạo package rỗng.

### 3.3 npm package requirements

Mỗi package cần: - `name`, `version`, `type` phù hợp. - `exports` map
rõ. - `types`, `files`. - `peerDependencies` hợp lý. - Build output rõ
ràng. - README, changelog, license. - Tests/build/typecheck.

Khuyến nghị: - TypeScript → build `dist` bằng tsup/unbuild/rollup phù
hợp. - Vue SFC → library build strategy được verify với Nuxt 4/Vite. -
Không publish source path chưa compile nếu consumer cần transform. -
Không bundle peer dependencies như Vue. - `npm pack --dry-run`. - Test
install package từ tarball vào sample consumer. - Không dùng dependency
range `*`.

### 3.4 Public hay private?

-   Generic utilities/types/UI có thể public nếu không chứa thông tin
    riêng và owner muốn open-source.
-   Internal business logic/provider integration nhạy cảm nên private.
-   npm private có yêu cầu plan/organization phù hợp; GitHub Packages là
    lựa chọn khác nhưng cần registry auth.
-   Không đưa secrets, internal endpoints, app IDs/credentials hoặc
    private config vào package public.
-   Trước khi chọn registry, AI phải báo cáo package nào public/private,
    chi phí/permission, CI publishing workflow, local install và token
    security.

### 3.5 Versioning

Dùng SemVer: - Patch: bug fix không breaking. - Minor: feature
backward-compatible. - Major: breaking API/props/behavior.

Dùng Changesets hoặc tool tương đương: - Mỗi PR có changeset. -
Changelog tự động. - Không release nếu CI fail. - Consumer upgrade theo
PR riêng. - Không tự động bump tất cả apps lên latest mà không test.

------------------------------------------------------------------------

## 4. Component consolidation

### 4.1 Classification

  -----------------------------------------------------------------------
  Nhóm                                Quyết định
  ----------------------------------- -----------------------------------
  Identical generic behavior          Có thể chuyển vào `@tuanmjnh/ui`

  Similar nhưng intentional           Base primitive + app
  differences                         wrapper/variant

  Domain-specific                     Giữ trong app

  Legacy/unused/duplicate             Xác minh usage, xóa sau
  -----------------------------------------------------------------------

### 4.2 Contract audit

Trước khi migrate: - So sánh props, emits, slots, default values. - So
sánh keyboard/accessibility. - So sánh mobile behavior. - So sánh
CSS/theme tokens. - Tìm toàn bộ usage trong ba repo. - Viết contract
thống nhất và migration map.

Không phá API đang dùng. Nếu API mới tốt hơn, có compatibility
wrapper/deprecation period; migrate từng app; chỉ xóa legacy khi không
còn consumer.

### 4.3 Nuxt UI coupling

Các app dùng Nuxt UI v4. Trước khi share: - Kiểm tra version và peer
requirements. - Không tạo wrapper chỉ rename Nuxt UI component mà không
thêm giá trị. - Nếu shared component phụ thuộc Nuxt UI, khai báo peer
dependency/range. - Nuxt auto-import qua module nếu cần. - Không buộc
`tm-studio` nâng Nuxt UI chỉ vì shared package. - Design tokens/theme
CSS tách khỏi branding app.

### 4.4 Design system

Chuẩn hóa: - Semantic color tokens. - Typography. -
Spacing/radius/border. - Elevation/shadows. - Motion duration. - Focus
ring. - Status semantics. - Responsive breakpoints.

Mỗi app được phép override brand/theme, shared components dùng semantic
tokens và không hard-code màu của một app.

------------------------------------------------------------------------

## 5. Composables, utilities and service boundaries

### 5.1 Composable candidates

Có thể cân nhắc sau khi so sánh behavior: - `useDateTime` -
`useDeviceBreakpoints` - `useNotify` (nên có adapter cho UI
notification) - `useNetworkStatus` - `useCursorPagination` -
`useNavMenu` (nhận route tree/permissions qua input, không tự gọi Hub)

Không share trực tiếp nếu lifecycle khác nhau: - `useAuth`: dùng
`tm-hub-client` và app-level adapter. - `useHub`: giữ trong
`tm-hub-client` hoặc Nuxt adapter. - `useHubAi`: tách
catalog/control-plane integration khỏi generic AI client.

### 5.2 Runtime separation

-   Pure function → `@tuanmjnh/utils`.
-   Types → `@tuanmjnh/types`.
-   Zod schema → `@tuanmjnh/validators`.
-   Vue composable không cần Nuxt → package Vue-specific phù hợp.
-   Nuxt plugin/composable → `@tuanmjnh/nuxt` nếu đáng giá.
-   Electron main/preload → package riêng có Node/Electron boundary,
    không import vào renderer.
-   App domain composable → giữ trong app.

Không đưa API fetch app-specific, Pinia singleton, runtime config
assumptions, locale app-specific, app permissions, DB implementation
hoặc filesystem/Electron IPC vào browser entry.

------------------------------------------------------------------------

## 6. Hybrid AI Provider Architecture

### 6.1 Mục tiêu

Không bắt buộc mọi AI request của satellite apps phải relay qua TM Hub.

``` text
                  TM Hub Control Plane
             ┌────────────────────────────┐
             │ Provider Registry          │
             │ Model Catalog              │
             │ Shared Connections         │
             │ Connection Grants          │
             │ AI Policy / Usage / Audit  │
             └─────────────┬──────────────┘
                           │
                Metadata / grants / relay
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
    tm-tools            tm-studio            tm-trading
       │                   │                    │
   AI Gateway           AI Gateway           AI Gateway
       │                   │                    │
   Hub / App / Local   Hub / App / Local   Hub / App / Local
       │                   │                    │
       └───────────────────┴────────────────────┘
                           │
                 AI Provider / Local Runtime
```

### 6.2 Ba connection modes

``` ts
type AIConnectionMode = "hub" | "app" | "local";
```

**Hub-managed** - Connection/provider secret thuộc Hub. - Hub relay thực
hiện inference. - App chỉ nhận metadata/connection ID và policy. -
Cross-app use cần explicit grant, allowed operations và scope. -
`is_shared` không phải authorization. - Không trả raw credential xuống
satellite.

**App-managed** - Provider connection do app sở hữu. - Secret lưu
server-side hoặc secure store phù hợp. - App backend gọi provider. -
Không bắt buộc Hub relay. - Catalog có thể sync metadata, không sync
credential. - Connection scope theo app.

**Local** - Provider runtime chạy trên máy user/desktop companion. - Ví
dụ FreeLLMAPI `http://127.0.0.1:31415/v1`. - Request được thực hiện bởi
local app backend/main process/agent có thể truy cập runtime. - Không
gửi localhost URL cho Vercel/Hub server relay. - Browser-only local
connection phải xử lý CORS, HTTPS/mixed content, loopback access, local
service authentication và browser support. - Local URL chỉ được dùng từ
runtime có thể reach địa chỉ đó.

### 6.3 Model Catalog ≠ Connection ≠ Credential

**Provider Registry**

``` ts
interface ProviderDefinition {
  providerId: string;
  displayName: string;
  protocol: "openai-compatible" | "anthropic" | "google" | "custom";
  capabilities: string[];
  isEnabled: boolean;
}
```

**Model Catalog**

``` ts
interface ModelDefinition {
  providerId: string;
  modelId: string;
  displayName: string;
  contextLength?: number;
  capabilities: string[];
  metadataVersion?: string;
}
```

**Connection metadata**

``` ts
interface AIConnectionMetadata {
  id: string;
  ownerType: "hub" | "app" | "device";
  ownerId: string;
  providerId: string;
  mode: "hub" | "app" | "local";
  baseUrl?: string;
  credentialRef?: string;
  isActive: boolean;
}
```

`credentialRef` chỉ là reference nội bộ, không phải secret; không
resolve ở renderer.

Model catalog có thể sync/cache không cần API Key. Inference mới cần
credential hoặc runtime endpoint.

### 6.4 Request routing

``` text
AI Feature / UI
      ↓
App AI Gateway
      ↓
Resolve selected connection + policy
      ├── mode=hub
      │     → Hub AI Relay
      │     → Hub connection secret
      │     → Provider
      ├── mode=app
      │     → App server adapter
      │     → app-owned secret store
      │     → Provider
      └── mode=local
            → Local runtime adapter
            → local provider
```

Không để từng feature tự fetch provider URL và tự xử lý
stream/error/retry.

### 6.5 Credential security

-   Browser renderer không giữ provider API key dài hạn.
-   Không lưu provider secret trong localStorage.
-   Server secret ở server-side storage/environment/vault.
-   Electron dùng OS credential store/keychain qua main process/secure
    IPC.
-   Không expose secret qua preload API.
-   Không log API key, auth header, relay token hoặc signed URL.
-   Không đưa Hub App Secret vào frontend bundle.
-   Hub-managed connection cần app grant/operation scope.
-   Local service cần pairing/authentication và loopback protections.
-   Backend không fetch URL tùy ý; chống SSRF, DNS rebinding, cloud
    metadata/private network access trái policy.

### 6.6 Localhost failure guard

-   Hosted Hub trên Vercel không thể gọi `127.0.0.1` của desktop user.
-   Nếu mode `local`, AI Gateway route local, không gọi Hub relay.
-   Nếu mode `hub`, base URL phải là endpoint mà Hub server reach được.
-   Không tự đổi mode khi lỗi nếu có thể gửi dữ liệu sang nơi khác.
-   Hiển thị lỗi rõ ràng khi local runtime offline.
-   Health check chạy ở đúng runtime sẽ thực hiện inference.

### 6.7 Fallback

-   Chỉ fallback giữa connections được user/app cho phép.
-   Không tự fallback từ local/private provider sang cloud provider nếu
    chưa có consent.
-   Hiển thị provider/connection thực tế được dùng.
-   Timeout/retry có giới hạn.
-   Streaming retry chỉ khi semantics cho phép; không tự gửi lại prompt
    sau khi đã có output một phần.

------------------------------------------------------------------------

## 7. TM Hub AI Control Plane changes

Audit implementation hiện tại trước khi thay schema/API.

Mục tiêu: 1. Provider Registry. 2. Model Catalog. 3. Hub-owned Shared
Connections. 4. App-owned connection metadata/grants nếu Hub cần quản lý
authorization metadata. 5. AI policy và usage/audit. 6. Relay chỉ cho
Hub-managed connections.

Không làm: - Không để Hub gọi local URLs. - Không gửi Hub API keys cho
app. - Không trộn AI connection grants với Storage Gateway grants. -
Không để `is_shared` tự cấp quyền. - Không thay đổi Storage
Gateway/Cloudinary Media Gateway như side effect của AI work.

### 7.1 Connection ownership

Phân biệt: - Hub-owned connection. - App-owned connection. -
Device/local connection.

Nếu app-owned secret lưu trên app backend, Hub chỉ giữ registry metadata
khi thực sự cần; không tạo vault thứ hai nếu `connections` hiện tại đã
có encrypted credential model.

### 7.2 Grants

Với Hub-managed shared connection: - Grant explicit theo app,
connection, operations, model/provider restrictions nếu cần. - Có
revoke/expiry/audit. - Resolve credential bằng connection ID cụ thể,
không lấy "first row by provider". - Không lẫn grant AI với Storage
Gateway.

### 7.3 Catalog sync

-   Hub là nguồn chuẩn cho provider/model definitions Hub quản lý.
-   App cache local copy được.
-   Có catalog version/updatedAt hoặc sync cursor.
-   Sync idempotent.
-   Không xóa model app đang tham chiếu chỉ vì sync tạm thời thiếu.
-   App-specific aliases/metadata phải có namespace/ownership rõ.
-   Model visibility không đồng nghĩa quyền inference.

### 7.4 API

Audit API hiện tại trước; chỉ thêm endpoint khi cần: - Catalog
list/sync. - Connections list/detail metadata. - Grants list/manage. -
Relay chỉ cho Hub-managed. - Usage/audit nếu cần.

Mọi API phải enforce auth, app context, permission, ownership, rate
limit và validation.

------------------------------------------------------------------------

## 8. Satellite app changes

### 8.1 `tm-tools`

Mục tiêu: - Giữ Hub login/IAM/routes và `tm-hub-client`. - AI console
hiển thị model catalog và connections theo ownership/mode. - Hỗ trợ
App-managed connection. - Hỗ trợ Local connection tới FreeLLMAPI
desktop. - Chỉ Hub-relay với Hub-managed connection. - Không relay local
URL qua Vercel. - Electron secret storage ở main process/OS credential
store. - Renderer chỉ nhận metadata/status, không nhận raw secret. -
Browser/dev mode phải có behavior rõ ràng, không giả định browser luôn
truy cập local runtime. - Giữ Browser Hub, downloader, FFmpeg, document
studio và các tính năng hiện có.

Migration: 1. Audit `useHubAi`, `aiProviderTransfer`, server AI routes,
Electron secure storage/IPC. 2. Map connection hiện tại sang mode tương
thích. 3. Thêm explicit mode; không đoán mode chỉ từ base URL. 4. Tạo
routing adapter. 5. Migrate từng AI feature. 6. Regression test
chat/stream/model select/provider health check.

### 8.2 `tm-studio`

Mục tiêu: - Giữ Hub login/IAM/routes và `tm-hub-client`. - Giữ
`packages/core` TMCut độc lập. - Giữ local-first project/media/editor
architecture. - AI script/editor/voice/agent dùng App AI Gateway
chung. - Hub catalog vẫn có thể sử dụng. - Local Electron AI vault giữ
secret trong secure storage. - Hub relay chỉ dùng khi mode là hub. -
Không để renderer giữ Hub App Secret. - Không chuyển TMCut domain logic
sang shared library.

Migration: 1. Audit `useHubAi`, `hubAiConnection.ts`, server AI
relay/TTS, Electron AI gateway/secure files. 2. Map connection cũ sang
hub/app/local. 3. Chuẩn hóa request/stream/error contract. 4. Migrate
một feature thử nghiệm (ví dụ AI script). 5. Kiểm tra AI editor,
TTS/voice, agent tools. 6. Regression test editor/project/export.

### 8.3 App tương lai

Mỗi app mới: - Dùng `tm-hub-client` khi cần Control Plane. - Dùng
`@tuanmjnh/ai-client` khi cần gọi AI. - Dùng `@tuanmjnh/ui` và shared packages khi
phù hợp. - Không bắt buộc Hub để dùng App-managed/local AI. - Không copy
shared logic đã có package ổn định. - Giữ domain-specific code tại app.

------------------------------------------------------------------------

## 9. Compatibility and migration

### 9.1 Không migrate ba app cùng lúc

Thứ tự: 1. Xây package và test sample consumer. 2. Migrate một
component/composable nhỏ ở `tm-hub`. 3. Migrate cùng component ở
`tm-tools`. 4. Migrate `tm-studio`. 5. Theo dõi compatibility trước khi
chuyển nhóm tiếp theo.

### 9.2 Consumer compatibility

-   Pin package versions.
-   Không dùng wildcard dependency.
-   Lockfile cập nhật có kiểm soát.
-   Giữ old component wrapper trong deprecation period.
-   Mỗi consumer có PR riêng.
-   Không bắt buộc mọi app update cùng ngày.
-   Rollback bằng cách revert package version.

### 9.3 AI connection migration

Tạo migration report trước: - Connection ID. - Owner app. - Provider. -
Current base URL. - Storage location (không in secret). - Current relay
path. - New mode. - Credential migration action. - Consumer
references. - Risks.

Không tự động coi localhost/private IP là đủ để xác định local mode nếu
runtime chưa được xác minh. Dùng explicit mode sau khi audit.

Không in API keys trong report/log. Không copy plaintext secrets giữa
repositories.

------------------------------------------------------------------------

## 10. Testing and quality gates

### 10.1 Shared packages

Mỗi package: - Unit tests. - Typecheck. - Build. - Package exports
tests. - `npm pack --dry-run`. - Install tarball vào sample Nuxt app. -
Browser/server import boundary tests. - Dependency/license audit.

### 10.2 UI

-   Props/emits/slots contract tests.
-   Keyboard/accessibility.
-   Focus management.
-   Mobile/responsive behavior.
-   Loading/empty/error states.
-   Theme/brand override.
-   Visual regression nếu khả thi.

### 10.3 AI tests

**Hub-managed** - App có grant → relay thành công. - App không có grant
→ 403. - Revoked grant → request tiếp theo bị từ chối. - Secret không
xuất hiện response/log.

**App-managed** - App gọi backend provider adapter. - Credential không
lộ renderer. - App A không dùng credential App B. - Timeout/invalid
key/provider error normalize đúng.

**Local** - Local provider online → request thành công. - Local provider
offline → lỗi local connection rõ. - Hosted Hub không nhận request tới
localhost. - Browser CORS/HTTPS constraints báo rõ. - Electron secret
chỉ truy cập qua secure main-process boundary.

**Catalog** - Sync idempotent. - Metadata không chứa credential. - Model
hiển thị được dù không có connection usable. - Model visibility không tự
cấp quyền inference.

**Regression** - `tm-tools` AI console/chat. - `tm-studio` AI
script/editor/TTS/voice. - Hub login, routes, RBAC, config,
media/storage/notification. - TMCut project/editor/timeline/export. -
Electron packaging.

### 10.4 Release gates

Không hoàn thành phase nếu chưa có kết quả thực tế: - `pnpm typecheck` -
`pnpm lint` - `pnpm test` hoặc scripts phù hợp - `pnpm build` - Package
build/pack/sample install nếu có thay package.

Ghi rõ command, result, environment và test chưa chạy.

------------------------------------------------------------------------

## 11. Phased implementation plan

### Phase 0 --- Multi-repository audit (read-only)

Audit cả ba repository và branch/commit thực tế.

Deliverables: - Repo/stack/dependency map. - Shared component comparison
matrix. - Composable/utils duplication matrix. - AI provider/current
connection flow map. - Current Hub API contracts. - Package candidates
ranked by reuse/risk. - Dependency graph and package names. -
Registry/public-vs-private recommendation. - Migration order. - Exact
file-level change plan.

**Không sửa code, không tạo package, không migrate trong Phase 0. Chờ
owner duyệt.**

### Phase 1 --- Shared package foundation

-   Tạo shared repository nếu được duyệt.
-   pnpm workspace.
-   CI, lint, typecheck, test, build.
-   Changesets/versioning.
-   Package template.
-   Publish dry-run.
-   Sample consumer app.
-   Chưa migrate hàng loạt component.

### Phase 2 --- Extract low-risk primitives

Ưu tiên: 1. `@tuanmjnh/types` 2. `@tuanmjnh/validators` 3. `@tuanmjnh/utils`

Chọn module ít coupling và dùng giống nhau ở ít nhất hai app.

### Phase 3 --- Shared UI foundation

-   Audit duplicate components.
-   Chốt design tokens.
-   Chốt component contracts.
-   Tạo `@tuanmjnh/ui`.
-   Tạo `@tuanmjnh/nuxt` nếu cần auto-import/plugin.
-   Migrate một vertical slice ở từng app.
-   Không ép domain-specific components vào package.

### Phase 4 --- Shared AI client

-   Define provider/model/request/stream/error contracts.
-   Implement adapters.
-   Test browser/server/Electron boundaries.
-   Không đặt secret storage trong generic core.
-   Document adapters và credential security.

### Phase 5 --- TM Hub AI Control Plane

-   Separate provider registry/model catalog/connections.
-   Define Hub-managed vs app-managed vs local metadata.
-   Explicit grants cho Hub-managed shared connections.
-   Restrict relay to Hub-managed mode.
-   Catalog sync/versioning.
-   Backward-compatible API changes.

### Phase 6 --- `tm-tools` migration

-   Implement App AI Gateway.
-   Add explicit connection modes.
-   Integrate FreeLLMAPI local runtime safely.
-   Preserve Hub catalog and Hub-managed connections.
-   Regression tests.

### Phase 7 --- `tm-studio` migration

-   Integrate shared AI client.
-   Keep Electron secure vault.
-   Keep TMCut core/domain logic unchanged.
-   Migrate features incrementally.
-   Regression tests.

### Phase 8 --- Consolidate remaining shared components/composables

-   Move only components proven identical.
-   Deprecate local duplicates.
-   Update app docs.
-   Remove old copies only after all consumers migrate and tests pass.

### Phase 9 --- Future app template

Sau khi packages và integration contracts ổn định, tạo starter: - Nuxt 4
app base. - `tm-hub-client` integration. - Optional `@tuanmjnh/ui`,
`@tuanmjnh/nuxt`. - Optional `@tuanmjnh/ai-client`. - Auth/RBAC/navigation
adapters. - Testing/build/CI conventions. - Environment/secret guide.

Không tạo template lớn trước khi package APIs ổn định.

### Phase 10 --- Hardening and release

-   Security review.
-   Package API review.
-   SemVer/changelog.
-   Consumer compatibility.
-   Publish release.
-   Docs/upgrade guides.
-   Rollback plan.

------------------------------------------------------------------------

## 12. Mandatory AI agent workflow

### Before changing code

1.  Inspect current branch, commit and dirty working tree in each repo.
2.  Read `AGENTS.md`, `README.md`, package scripts and architecture
    docs.
3.  Do not assume GitHub snapshot matches local checkout.
4.  Search usages before changing exports/props/composables.
5.  Compare actual implementations, not filenames alone.
6.  Map dependencies and runtime boundaries.
7.  Write implementation plan with exact files and risks.
8.  Phase 0 is read-only.

### While implementing

-   Work one phase at a time.
-   Prefer additive changes.
-   No mass search-and-replace without reviewing each usage.
-   No app rewrite.
-   No duplicate SDK.
-   No hidden runtime coupling.
-   No credentials in public packages.
-   No secrets in frontend bundle.
-   No breaking API without migration plan.
-   No deletion of old implementation until consumers verified.
-   Do not modify TMCut engine as part of shared UI extraction.
-   Do not change Hub Storage Gateway as a side effect of AI work.
-   Stop and ask when decision affects credential ownership, data
    migration, package visibility or security.

### Required phase report

``` text
PHASE:
Status: Complete / Partial / Blocked

Repositories / branches / commits:
Files inspected:
Files created:
Files modified:

Findings:
Architecture changes:
Package changes:
API changes:
Database/migration:
AI connection changes:
UI/composable changes:
Security changes:
Consumer impact:

Tests executed:
Commands:
Results:

Compatibility:
Known issues:
Risks:
Rollback:
Next phase:
Owner decisions required:
```

------------------------------------------------------------------------

## 13. Definition of Done

### Shared libraries

-   [ ] Shared repo/package boundaries documented.
-   [ ] No mega package.
-   [ ] No dependency cycles.
-   [ ] Browser/server/Electron boundaries enforced.
-   [ ] Vue not bundled as duplicate runtime.
-   [ ] Package exports/types work from installed tarball.
-   [ ] Versioning/changelog/release workflow exists.
-   [ ] At least two real apps consume first shared packages.
-   [ ] No app-specific secret/business logic leaked into public
    packages.

### TM Hub

-   [ ] Hub remains Control Plane.
-   [ ] Provider Registry and Model Catalog separated from Connections.
-   [ ] Hub-managed relay only resolves Hub-owned connections.
-   [ ] App grants explicit and revocable.
-   [ ] AI secret never leaves server.
-   [ ] Localhost URLs never relayed by hosted Hub.
-   [ ] Existing IAM/RBAC/Storage/Media/Notification behavior stable.

### Satellite apps

-   [ ] `tm-tools` supports required AI modes.
-   [ ] `tm-studio` supports required AI modes.
-   [ ] Existing Hub login/RBAC/navigation works.
-   [ ] Electron secrets stay in secure main-process/OS storage
    boundary.
-   [ ] App-managed/local AI does not require Hub relay.
-   [ ] Model catalog sync does not expose credentials.
-   [ ] Domain-specific features remain in their apps.
-   [ ] TMCut core not unintentionally refactored.

### Quality

-   [ ] Typecheck/lint/tests/build pass with evidence.
-   [ ] Migration and rollback documented.
-   [ ] Consumer upgrade guide exists.
-   [ ] Release notes and package API docs exist.

------------------------------------------------------------------------

## 14. Instructions to start

Start **Phase 0 --- Multi-repository audit only**.

Inspect current local checkouts of `tm-hub`, `tm-tools`, and
`tm-studio`. Compare actual source, package manifests, component
contracts, composables, AI connection flows, Electron secure storage,
Hub API contracts and tests.

Return: 1. Current architecture and dependency map for all three apps.
2. Duplicate component matrix with exact paths and API/behavior
differences. 3. Duplicate composable/utilities matrix with exact paths
and runtime dependencies. 4. Recommended package boundaries and code
that must remain app-specific. 5. Current AI request flow in each app
and where Hub relay is used. 6. Security assessment of credentials and
local provider routing. 7. Migration plan for Hybrid AI Provider
Architecture. 8. Registry/public-vs-private recommendation for shared
packages. 9. File-level changes per phase. 10. Risks, test plan,
rollback and owner decisions.

**Do not create or modify files in Phase 0. Do not publish packages. Do
not change databases, APIs or credentials. Wait for owner approval
before Phase 1.**

Mục tiêu không phải làm mọi repository giống hệt nhau. Mục tiêu là tạo
một hệ sinh thái TM dễ bảo trì: code thực sự dùng chung có một
implementation đáng tin cậy, mỗi app vẫn độc lập về domain, và AI
connections hoạt động đúng trên cloud, app backend và local desktop.
