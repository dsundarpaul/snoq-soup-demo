# Front-end API integration audit

**Date:** 2026-04-04  
**Scope:** Validate `apps/web/docs/api-contract.md` against actual call sites in `apps/web`, and against implemented routes in `apps/api` (Nest).  
**Purpose:** Drive a single coordinated update of the Next.js client so it matches the real backend contract you choose (legacy Express-style paths vs Nest `api/v1` + JWT).

---

## 1. Executive summary

| Area | Verdict |
| --- | --- |
| **`api-contract.md` vs `apps/web`** | The contract describes the **intended Express-era API** (sessions, flat `/api/...` paths). The web app largely follows those paths, but **many files moved** from `src/views/...` to `src/sections/...` (and App Router). The **client inventory table in the contract is outdated**. |
| **`apps/web` vs `apps/api` (Nest)** | The Nest app uses **`/api/v1`** global prefix, **`auth/*` grouping**, **JWT** (access + refresh), and **different path shapes** (`merchants/me/drops`, `vouchers/:id/promo-code`, etc.). **Most web URLs and payloads do not match Nest as-is.** |
| **BFF** | `apps/web/app/api/[...path]/route.ts` forwards to `{BACKEND_URL}/api/{path}`. If Nest stays on `/api/v1/...`, the proxy target must either include `v1` in paths or the server must also expose **legacy aliases** under `/api/...`. |
| **Staff scanner assignments** | `useStaffScannerAssignments()` is **entirely mock/local state** — no API module exists in the contract or Nest for that UI. |

---

## 2. Contract document fixes (no code change required)

Update `api-contract.md` when you next edit it:

1. **Client inventory:** Replace `src/views/*` with current locations, for example:
   - `src/sections/home/home-page.tsx`, `home-header.tsx` — drops, hunter profile, logout  
   - `src/sections/drop/drop-view.tsx`, `src/sections/common/ar-game.tsx` — active drops, claim  
   - `src/sections/merchant/*` — merchant auth, dashboard, store, verify email  
   - `src/sections/treasure-hunter/*` — hunter auth, profile, leaderboard, history  
   - `src/sections/admin/admin-dashboard.tsx`, `admin-login.tsx` — platform admin  
   - `src/sections/scanner/scanner.tsx`, `staff-scanner.tsx` — redeem / staff flow  
   - `src/sections/voucher/voucher-view.tsx`, `src/components/voucher-display.tsx` — magic voucher, code, email  

2. **Auth model:** The contract still describes **Express sessions** (merchant/admin cookies). The **Nest app uses JWT** in responses; the web today expects **cookie sessions** for merchant/admin. Call this out explicitly as a **migration axis** (either Nest adds session compatibility, or the web stores tokens and sends `Authorization`).

3. **Default dev backend port:** Contract / BFF comment mentions Express on `5000`; Nest defaults to **`PORT` (e.g. 3001)** in `main.ts`. Align env docs with whatever you run behind `BACKEND_URL`.

---

## 3. Global integration decisions (pick one strategy)

These affect **every** module; the front end should not be updated piecemeal without choosing:

| Decision | Option A — **Backend compatibility layer** | Option B — **Front-end rewrite to Nest** |
| --- | --- | --- |
| **URL prefix** | Mount Nest (or a thin gateway) so legacy paths like `/api/merchants/login` work without `v1`. | Change all clients to `/api/v1/...` (or centralize in one `apiBase` + version). |
| **Auth** | Issue session cookies compatible with the web, or BFF exchanges JWT↔cookie. | After login, store `accessToken` / `refreshToken`; send `Authorization: Bearer ...`; implement refresh + logout via `POST /api/v1/auth/logout` with body. |
| **Merchant login identifier** | Accept `username` as today’s web sends. | Change web to send **email** (Nest `LoginDto` is email + password, min 8). |

Until one strategy is chosen, **payload and status-code testing on the front end will be misleading**.

---

## 4. Module-by-module findings

Legend: **Contract** = `api-contract.md` · **Web** = current `apps/web` · **Nest** = `apps/api` with prefix `/api/v1`.

### 4.1 Drops and public store

| Contract | Web | Nest (effective path) | Notes |
| --- | --- | --- | --- |
| `GET /api/drops/active` → array + `captureCount` | `queryKey` → `GET /api/drops/active` (default `queryFn`, no query params) | `GET /api/v1/drops/active?lat=&lng=&radius=` (**required** geo query) | **Mismatch:** Nest requires **lat/lng/radius**; web loads **all active** drops. Response shape: Nest returns `{ drops, total }` with `location: { lat, lng }`, `rewardValue` as **number**; web uses **flat** `latitude`/`longitude` and **string** `rewardValue` + optional `captureCount`. |
| `GET /api/store/:username` | `fetch /api/store/${username}` | `GET /api/v1/merchants/:username/public` | **Path mismatch.** Response shape must be aligned (`merchant` + `drops` vs `MerchantPublicResponseDto`). |

**Front-end actions (if targeting Nest):** Add geolocation (or agreed defaults) for active drops; map response fields to existing UI types; change store URL to `merchants/:username/public` (or add backend alias).

**Back-end actions (if keeping current web):** Support `GET /drops/active` without geo (or optional geo) and return drops compatible with `Drop` + `captureCount`; add `GET /store/:username` alias.

---

### 4.2 Vouchers

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `POST /api/vouchers/claim` | `apiRequest` body `{ dropId, deviceId }` (optional email/phone in schema, not always sent) | `POST /api/v1/vouchers/claim` — **public**, throttled; **`ClaimVoucherDto`** requires **`dropId` + deviceId** (regex `[a-zA-Z0-9_-]+`), optional **`hunterId`**. Identity: **JWT hunter first** (cookie/header), else **deviceId** resolves/creates anonymous hunter. Optional **`X-Device-Id`** header if aligned with body. | **Partial:** No `userEmail`/`userPhone` on Nest DTO. **Response:** Nest **`ClaimVoucherResponseDto`** / **`VoucherResponseDto`** includes **`claimedWithoutRegisteredAccount`** for anonymous claims; shape still differs from oldest contract (`magicLink` vs nested fields). |
| `POST /api/vouchers/redeem` | Merchant scanner: `{ voucherId }` only (`scanner.tsx`) | `POST /api/v1/vouchers/redeem` requires **JWT** + roles **merchant \| scanner**; body **`voucherId` + `magicToken`** | **Auth and body mismatch** vs contract (“public”). |
| `GET /api/vouchers/magic/:token` | `queryKey` `["/api/vouchers/magic", token]` | `GET /api/v1/vouchers/magic/:token` | Path aligns modulo `v1`; **response DTO** vs web types must be verified field-by-field. |
| `GET /api/vouchers/:id/code?token=` | `fetch .../code?token=`; UI expects `{ code }` | `GET /api/v1/vouchers/:id/promo-code?magicToken=` returns `{ promoCode }` | **Path + query + field name mismatch** (`code` vs `promoCode`, `token` vs `magicToken`). |
| `POST /api/vouchers/send-email` | `voucher-display.tsx` — **raw fetch**, no `credentials` | `POST .../send-email` — Nest **`JwtAuthGuard`** | **Public vs authenticated mismatch.** |
| `POST /api/vouchers/send-whatsapp` | UI uses **wa.me** link, not API (contract says unused) | Exists with JWT | No web change unless product wants server-side Twilio. |

**Front-end actions:** Map claim/redeem/magic/promo-code responses; add `magicToken` to redeem calls; use `promo-code` + `magicToken` query or add backend alias; fix send-email to send **Bearer** token or backend makes route public.

**Back-end actions:** Optional legacy aliases `/vouchers/:id/code` and `?token=`; document whether redeem is public or JWT-only.

---

### 4.3 Merchant auth and account

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `POST /api/merchants/login` | `POST` with **`merchantLoginSchema` → username + password** | `POST /api/v1/auth/merchant/login` with **email + password** (min 8, complexity) | **Path + identifier + password rules mismatch.** Response: web expects **profile-only JSON**; Nest returns **`AuthResponseDto`** (`accessToken`, `refreshToken`, `user`). |
| `POST /api/merchants/logout` | `fetch` POST, some with `credentials` | `POST /api/v1/auth/logout` + JWT + **`refreshToken` in body** | **Mismatch.** |
| `GET /api/merchants/me` | default `queryFn` | `GET /api/v1/merchants/me` + JWT | Path grouping differs (`merchants` vs `auth`); **auth mechanism** differs. |
| `PATCH /api/merchant/logo` body `{ logoUrl }` | `apiRequest` as contract | `PATCH /api/v1/merchants/me/logo` with body **`logoUrl`** (not nested `{ logoUrl }` object — Nest uses `@Body("logoUrl")`) | Confirm content-type JSON shape matches (`{ "logoUrl": "..." }` is fine). |
| `POST /api/merchant/signup` | `businessName`, `email`, `password` (min 6 in form schema) | `POST /api/v1/auth/merchant/register` — password **min 8 + upper + number** | **Validation mismatch.** |
| Verify / resend / forgot / reset | Paths under `/api/merchant/...` | Under `/api/v1/auth/merchant/...` | **Prefix `auth` + `v1`.** |

**Front-end actions:** Centralize auth: tokens or cookies; align login field (email vs username); adjust signup password rules to Nest or relax Nest; point verify/forgot/reset to `auth/...` paths.

---

### 4.4 Merchant drops, analytics, promo codes

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `GET/POST /api/merchants/drops` | Uses `/api/merchants/drops` | `GET/POST /api/v1/merchants/me/drops` | **Path mismatch.** |
| `PATCH/DELETE .../drops/:id` | `/api/merchants/drops/:id` | `/api/v1/merchants/me/drops/:id` | **Path mismatch.** Nest delete returns **204** no body; web sometimes calls `response.json()`. |
| `GET .../stats` | `/api/merchants/stats` | `GET /api/v1/merchants/me/stats` | **Path mismatch.** |
| `GET .../analytics?from&to` | `fetch` with **`from`, `to`** | `GET /api/v1/merchants/me/analytics` (no `from`/`to` in controller — service-defined) | **Query param mismatch**; **response** must match `merchant-dashboard.types.ts` (`AnalyticsData`) or UI refactored. |
| `POST .../drops/:id/codes` body `{ codes: string[] }` | As contract | `POST /api/v1/merchants/me/drops/:dropId/codes/bulk` body **`{ codes: [{ code: string }, ...] }`** | **Payload mismatch** (strings vs objects). |
| `GET .../drops/:id/codes` | Expects **`{ codes, stats }`** per `merchant-dashboard.types.ts` | `GET .../codes` returns **`PromoCodeListDto`**: `items`, `total`, `page`, `limit`, `totalPages` | **Response mismatch.** Optional: `GET .../codes/stats` for `PromoCodeStatsDto`. |
| `DELETE .../drops/:id/codes` | Web calls DELETE | Nest `DELETE` on same base path returns **`{ deletedCount }`**, not `{ success: true }` | **Shape mismatch.** |

**Front-end actions:** Update all merchant-scoped paths to `merchants/me/...`; transform bulk upload payload; map promo list + stats from `items` + optional stats endpoint; handle 204 on delete drop.

**Back-end actions:** Optional legacy routes; implement analytics date range if product requires `from`/`to`.

---

### 4.5 Scanner (merchant staff)

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `POST /api/merchant/scanner-token` | `apiRequest` (no body in hooks) | `POST /api/v1/merchants/me/scanner-token` + optional **`expiresIn`** | Path mismatch; body optional aligns. |
| `GET /api/merchant/scanner-token` | Not a dedicated hook query in all places; staff link regenerates via POST | `GET /api/v1/merchants/me/scanner-token` | Align listing vs regenerate UX. |
| `GET /api/scanner/:token/validate` | raw `fetch` | `GET /api/v1/scanner/:token/validate` | OK modulo `v1`; use `resolveBrowserApiUrl` + `credentials` if ever needed. |
| `POST /api/scanner/:token/redeem` | `{ voucherId }` | **`{ voucherId, magicToken }`** | **Body mismatch.** |

**Staff assignments UI:** `useStaffScannerAssignments()` — **mock only**; not in contract; **no Nest endpoints** reviewed for multi-staff expiry. Treat as **out of scope** for API parity until specified.

---

### 4.6 Treasure hunter

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `GET /api/hunter/profile?deviceId=` | Widespread **raw `fetch`** (inconsistent with `resolveBrowserApiUrl`) | `GET /api/v1/hunters/me` + **JWT + DeviceGuard** (device from header/query/body) | **Model mismatch:** contract is **public deviceId**; Nest is **authenticated** profile. |
| `GET /api/hunter/history?deviceId=` | raw `fetch` | `GET /api/v1/hunters/me/history` + JWT + device | Same as above. |
| `GET /api/leaderboard?limit=` | React Query default `queryFn` | `GET /api/v1/leaderboard?limit=` (default **50** in controller) | Contract default **10**; Nest default **50** — **minor**. |
| `POST /api/hunter/signup` | Full **`hunterSignupSchema`** (DOB, gender, mobile, etc.) | `POST /api/v1/auth/hunter/register` — **`RegisterHunterDto`**: email, password, deviceId, optional nickname only | **Large payload mismatch** (extra fields ignored or rejected if forwarded). |
| `POST /api/hunter/login` | email, password, deviceId | `POST /api/v1/auth/hunter/login` — **`LoginDto`**; optional **`deviceId`** is ignored (no merge on login). | Web may still send **`deviceId`**; backend does not use it for login. |
| `POST /api/hunter/logout` + `{ deviceId }` → `newDeviceId` | Web sends body; some code expects anonymous continuation | `POST /api/v1/auth/logout` expects **refreshToken** | **Mismatch.** |
| `PATCH /api/hunter/profile` | `Record<string, unknown>` | `PATCH /api/v1/hunters/me/profile` + hunter role | Field-level DTO alignment needed. |
| `PATCH /api/hunter/nickname` | Not used (profile PATCH used) | `PATCH /api/v1/hunters/me/nickname` | Contract accurate; optional optimization. |

**Front-end actions:** Decide device-only vs JWT for hunter; if JWT: store tokens after login/signup, attach device header consistently, replace public `deviceId` query usage; align signup payload with Nest or extend Nest DTO.

---

### 4.7 Uploads

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `POST /api/uploads/request-url` body `{ name, size?, contentType? }` | `use-upload.ts` — **raw fetch**, `{ name, size, contentType }` | `POST /api/v1/upload/presign` + **JWT**; DTO **`filename`, `contentType`, `size`** | **Path, field names (`name` vs `filename`), auth mismatch.** Response: contract `uploadURL, objectPath, metadata`; Nest **`presignedUrl`, `key`, `publicUrl`, `expiresIn`**. |

**Front-end actions:** Map request/response; send `Authorization`; rename fields or add BFF adapter.

---

### 4.8 Pitch deck

| Contract | `GET /api/pitch-deck/download` unused | **No matching controller** in Nest grep | Either static asset in Next or new Nest endpoint.

---

### 4.9 Platform admin

| Contract | Web | Nest | Notes |
| --- | --- | --- | --- |
| `POST /api/admin/login` | `apiRequest` | `POST /api/v1/auth/admin/login` | Path under `auth`. |
| `POST /api/admin/logout` | `apiRequest` | `POST /api/v1/auth/logout` with refresh | Same as merchant. |
| `GET /api/admin/session` | default `queryFn` | **No `admin/session` route** | **Missing in Nest** — web needs **`/auth/me`**-style or decode JWT / profile endpoint. |
| `GET /api/admin/stats` | default `queryFn` | `GET /api/v1/admin/stats` + JWT admin | OK modulo `v1` + JWT. |
| `GET /api/admin/analytics` | default `queryFn` | `GET /api/v1/admin/analytics?days=&granularity=` | Web may expect different query than **`days`/`granularity`**. |
| Merchants / users / drops CRUD | Matches contract paths | `admin/*` exists with **different query params** (pagination, filters) | **Response shapes** (list wrappers) must match tables in `admin-dashboard.tsx`. |
| `GET/POST /api/admin/drops/:id/codes` | Used in `admin-dashboard` | **No admin promo-code routes found** | **Gap:** admin promo management may be missing or under another module. |

**Front-end actions:** Session → JWT; align analytics query params; verify list DTOs vs UI; implement or drop admin promo endpoints.

---

## 5. What you do **not** need to re-check on the front end (if backend adapts)

If the **API team adds a compatibility gateway** that:

- Exposes **exact** legacy paths (`/api/merchants/login`, `/api/drops/active` without geo, etc.)  
- Preserves **session cookies** or transparently sets them from JWT  
- Maps **response JSON** to the shapes already assumed in `merchant-dashboard.types.ts`, `voucher-display`, and `shared/schema.ts`  

…then the front end can limit changes to **environment** (`BACKEND_URL`) and **removing raw `fetch` inconsistencies** (below). This is usually **more work on the gateway** than updating the client.

---

## 6. Low-risk front-end cleanups (valid regardless of backend)

These are **worth doing** in any integration pass:

1. **Raw `fetch("/api/...")`** — Replace with `resolveBrowserApiUrl()` + `credentials: "include"` where cookies matter (contract “Client implementation notes”; still applies in `sections/` and `components/`).  
2. **`useMerchantLoginMutation` / signup mutations** — `apiRequest` already throws on non-OK; redundant `if (!response.ok)` branches after `apiRequest` are **dead code**.  
3. **DELETE handlers** — Avoid `response.json()` when backend returns **204 No Content**.  
4. **Type layers** — Replace `Record<string, unknown>` / loose profile types with DTOs matching the chosen API once stable.

---

## 7. Suggested order of work for the “whole front-end API integration”

1. **Prefix + auth strategy** (`/api/v1`, JWT storage, refresh, logout).  
2. **Auth modules** (merchant, admin, hunter) end-to-end.  
3. **Merchant drops + promo** (paths, bulk codes shape, list/stats mapping).  
4. **Public** drops + store + voucher claim/magic/promo-code.  
5. **Scanner** flows (merchant redeem + staff redeem with `magicToken`).  
6. **Upload** presign.  
7. **Admin** (session replacement, analytics query, drop codes if required).  
8. **Staff assignments** — product decision: real API vs mock.

---

## 8. Reference: Nest global prefix

From `apps/api/src/main.ts`:

```ts
app.setGlobalPrefix("api/v1");
```

All Swagger and e2e tests use `/api/v1/...`. The web and `api-contract.md` currently assume `/api/...` **without** `v1` and **without** the `auth` segment for login flows.

---

*Generated from static analysis of `apps/web` and `apps/api`; run contract tests or e2e against a live server to confirm status codes and edge cases.*
