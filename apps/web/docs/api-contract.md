# Souq-Snap API contract

Authoritative behavior, status codes, and payloads are defined by the Express app in `dump/output/server/routes.ts` plus `dump/output/server/replit_integrations/object_storage/routes.ts` (upload presign). Zod validation for many bodies lives in `src/shared/schema.ts` (mirrors `dump/output/shared/schema.ts`).

**Session auth (Express):** `express-session` with Postgres store (`connect-pg-simple`). `SessionData` includes optional `merchantId` (merchant dashboard) and `adminId` (platform admin). Cookie: `httpOnly`, `sameSite: "lax"`, `secure` in production, `maxAge` 24h. Treasure hunter flows use **`deviceId`** in query/body, not a server session.

**Next.js client:** `apiRequest` and the default React Query `queryFn` use `resolveBrowserApiUrl` from `src/lib/app-config.ts`. By default that resolves to **same-origin** `/api/...`. Set `NEXT_PUBLIC_RELATIVE_API=false` to use an absolute API base (`NEXT_PUBLIC_API_ORIGIN` or `NEXT_PUBLIC_APP_URL`). Raw `fetch("/api/...")` bypasses that helper in several places (see [Client implementation notes](#client-implementation-notes)).

**BFF proxy:** Route Handlers under `app/api/[...path]/route.ts` forward to `BACKEND_URL` so the browser can stay on the Next origin while the real API runs on Nest or Express. Forward `Cookie` (and other listed headers) so merchant/admin sessions keep working until you migrate auth.

---

## Client inventory (call sites → routes)

| Souq-Snap file | Mechanism | Routes |
| --- | --- | --- |
| `src/lib/queryClient.ts` | `apiRequest`, default `queryFn` | All paths built from `queryKey.join("/")` or passed to `apiRequest` |
| `src/views/home.tsx`, `src/views/drop-view.tsx`, `src/views/ar-game.tsx` | React Query | `GET /api/drops/active` |
| `src/views/ar-game.tsx` | `apiRequest` | `POST /api/vouchers/claim` |
| `src/views/merchant-store.tsx` | React Query + raw `fetch` | `GET /api/store/:username` |
| `src/views/voucher-view.tsx` | React Query (`queryKey` → `GET /api/vouchers/magic/:token`) | Magic voucher page |
| `src/components/voucher-display.tsx` | raw `fetch` | `GET /api/vouchers/:id/code`, `POST /api/vouchers/send-email` |
| `src/views/scanner.tsx` | `apiRequest` | `POST /api/vouchers/redeem` |
| `src/views/staff-scanner.tsx` | raw `fetch` + `apiRequest` | `GET /api/scanner/:token/validate`, `POST /api/scanner/:token/redeem` |
| `src/views/admin-login.tsx` | `apiRequest` | `POST /api/merchants/login`, `POST /api/merchant/resend-verification` |
| `src/views/merchant-signup.tsx` | `apiRequest` | `POST /api/merchant/signup` |
| `src/views/verify-email.tsx` | raw `fetch` | `POST /api/merchant/verify/:token` |
| `src/views/forgot-password.tsx` | `apiRequest` | `POST /api/merchant/forgot-password` |
| `src/views/reset-password.tsx` | `apiRequest` | `POST /api/merchant/reset-password/:token` |
| `src/views/admin-dashboard.tsx` | React Query, `apiRequest`, raw `fetch` | Merchant session, drops, stats, analytics, promo codes, scanner token, upload, logo, logout |
| `src/hooks/use-upload.ts` | raw `fetch` | `POST /api/uploads/request-url` |
| `src/views/leaderboard.tsx` | React Query + raw `fetch` | `GET /api/leaderboard`, `GET /api/hunter/profile` |
| `src/views/claim-history.tsx` | raw `fetch` | `GET /api/hunter/history`, `GET /api/hunter/profile` |
| `src/views/profile.tsx` | raw `fetch` + `apiRequest` | Hunter profile, signup, login, PATCH profile, logout |
| `src/views/hunter-forgot-password.tsx` | `apiRequest` | `POST /api/hunter/forgot-password` |
| `src/views/hunter-reset-password.tsx` | `apiRequest` | `POST /api/hunter/reset-password/:token` |
| `src/views/platform-admin-login.tsx` | `apiRequest` | `POST /api/admin/login` |
| `src/views/platform-admin-dashboard.tsx` | React Query, `apiRequest`, raw `fetch` | Admin session, stats, analytics, merchants, drops, users, promo codes |

---

## Endpoints

### Drops and public store

| Method + path | Used by UI? | Auth | Intent |
| --- | --- | --- | --- |
| `GET /api/drops/active` | Yes | Public | Active drops with `captureCount` per drop. |
| `GET /api/store/:username` | Yes | Public | Merchant summary (`businessName`, `username`, `logoUrl`) and time/limit-filtered active drops with counts. |

**`GET /api/drops/active`** — Success: JSON array of drops + `captureCount`. Errors: `500` `{ message }`.

**`GET /api/store/:username`** — Success: `{ merchant, drops }`. Errors: `404` merchant not found; `500` fetch failure.

---

### Vouchers

| Method + path | Used by UI? | Auth | Schema / notes |
| --- | --- | --- | --- |
| `POST /api/vouchers/claim` | Yes | Public | `claimVoucherSchema`: `dropId`, optional `userEmail`, `userPhone`, `deviceId` |
| `POST /api/vouchers/redeem` | Yes | Public | `redeemVoucherSchema`: `voucherId` |
| `GET /api/vouchers/magic/:token` | Yes | Public | Load voucher + drop + `businessName` |
| `GET /api/vouchers/:id/code` | Yes | Query `token` must match voucher `magicToken` | Public with token gate |
| `POST /api/vouchers/send-email` | Yes | Public | Body: `voucherId`, `email`, `magicLink` |
| `POST /api/vouchers/send-whatsapp` | **No** | Public | Body: `voucherId`, `phone`, `magicLink`; Twilio optional |

**`POST /api/vouchers/claim`** — Success: `{ voucher, drop, magicLink, promoCode }`. Errors: `400` validation / inactive drop / limits; `404` drop; `500`.

**`POST /api/vouchers/redeem`** — Success: `{ success: true, voucher, drop }` or `{ success: false, message }` or `{ success: false, alreadyRedeemed: true, voucher }`. Errors: `400` invalid body; `500`.

**`GET /api/vouchers/magic/:token`** — Success: `{ voucher, drop, businessName }`. Errors: `404`; `500`.

**`GET /api/vouchers/:id/code?token=`** — Success: `{ code: string | null }`. Errors: `400` missing token; `403` invalid token; `500`.

**`POST /api/vouchers/send-email`** — Success: `{ success: true }` (email only if SMTP configured). Errors: `400` missing fields; `404` voucher; `500`.

**`POST /api/vouchers/send-whatsapp`** — Success: `{ success, sent?, message? }` if Twilio missing, `sent: false`. Errors: `400`; `404`; `500`.

---

### Merchant auth and account (non-session)

| Method + path | Used by UI? | Auth | Schema / body |
| --- | --- | --- | --- |
| `POST /api/merchant/signup` | Yes | Public | `merchantSignupSchema` |
| `POST /api/merchant/verify/:token` | Yes | Public | Path token |
| `POST /api/merchant/resend-verification` | Yes | Public | `{ email }` |
| `POST /api/merchant/forgot-password` | Yes | Public | `{ email }` |
| `POST /api/merchant/reset-password/:token` | Yes | Public | `{ password }` (min 6 chars) |
| `POST /api/merchants/login` | Yes | Public → sets session | `merchantLoginSchema` |
| `POST /api/merchants/logout` | Yes | Session | Destroys session |
| `GET /api/merchants/me` | Yes | `merchantId` session | Merchant profile |
| `PATCH /api/merchant/logo` | Yes | `merchantId` session | `{ logoUrl }` |

**`POST /api/merchants/login`** — Success: `{ id, username, businessName, email }`, sets `merchantId`. Errors: `400` invalid body; `401` bad credentials; `500`.

**`GET /api/merchants/me`** — Success: `{ id, username, businessName, email, logoUrl }`. Errors: `401`; `404`; `500`.

**`PATCH /api/merchant/logo`** — Success: `{ logoUrl }`. Errors: `401`; `404`; `500`.

---

### Merchant drops, analytics, promo codes

All require `merchantId` in session unless noted.

| Method + path | Used by UI? |
| --- | --- |
| `GET /api/merchants/drops` | Yes |
| `POST /api/merchants/drops` | Yes |
| `PATCH /api/merchants/drops/:id` | Yes |
| `DELETE /api/merchants/drops/:id` | Yes |
| `GET /api/merchants/stats` | Yes |
| `GET /api/merchants/analytics` | Yes |
| `POST /api/merchants/drops/:id/codes` | Yes |
| `GET /api/merchants/drops/:id/codes` | Yes |
| `DELETE /api/merchants/drops/:id/codes` | Yes |

**`POST /api/merchants/drops`** — Body preprocessed then validated with `insertDropSchema` (includes `merchantId` from session). Errors: `400` `{ message, errors }`; `500`.

**`PATCH /api/merchants/drops/:id`** — Partial drop fields; `404` if not owned. Errors: `500`.

**`DELETE /api/merchants/drops/:id`** — Success: `{ success: true, message }`. Errors: `500`.

**`GET /api/merchants/stats`** — JSON stats object from storage.

**`GET /api/merchants/analytics`** — Analytics object. Errors: `500` `{ message }`.

**Promo codes:** `POST` body `{ codes: string[] }` → `{ added, stats }`. `GET` → `{ codes, stats }`. `DELETE` → `{ success: true }`. Errors: `400` / `404` / `500`.

---

### Scanner (merchant staff)

| Method + path | Used by UI? | Auth |
| --- | --- | --- |
| `POST /api/merchant/scanner-token` | Yes | Merchant session |
| `GET /api/merchant/scanner-token` | Yes | Merchant session |
| `GET /api/scanner/:token/validate` | Yes | Public |
| `POST /api/scanner/:token/redeem` | Yes | Public | Body `{ voucherId }` |

**Validate** — Success: `{ valid: true, businessName }`. Errors: `404` invalid link; `500`.

**Redeem** — Same shape as voucher redeem; `403` if voucher wrong merchant; `404` / `400` as in handler.

---

### Treasure hunter

| Method + path | Used by UI? | Auth |
| --- | --- | --- |
| `GET /api/hunter/profile?deviceId=` | Yes | Public (device id) |
| `GET /api/hunter/history?deviceId=` | Yes | Public |
| `GET /api/leaderboard?limit=` | Yes | Public (default limit 10) |
| `POST /api/hunter/signup` | Yes | Public | Body includes `deviceId` + `hunterSignupSchema` fields |
| `POST /api/hunter/login` | Yes | Public | `{ email, password, deviceId? }` |
| `POST /api/hunter/forgot-password` | Yes | Public | `{ email }` |
| `POST /api/hunter/reset-password/:token` | Yes | Public | `{ password }` |
| `POST /api/hunter/logout` | Yes | Public | `{ deviceId }` — returns new anonymous `newDeviceId` |
| `PATCH /api/hunter/profile` | Yes | Public (device) | Signed-up users only for profile fields |
| `PATCH /api/hunter/nickname` | **No** | Public | `{ deviceId, nickname }` |

**`PATCH /api/hunter/nickname`** — Updates nickname by device. Not referenced in current Next client (UI may use profile PATCH instead). Errors: `400`; `404`; `500`.

---

### Uploads (object storage)

| Method + path | Used by UI? | Auth |
| --- | --- | --- |
| `POST /api/uploads/request-url` | Yes | Public in reference server (harden for production) |

**Body:** `{ name` (required), `size`, `contentType` }.

**Success:** `{ uploadURL, objectPath, metadata: { name, size, contentType } }`.

**Errors:** `400` missing `name`; `500` `{ error }`.

**Note:** `GET /objects/:objectPath(*)` serves files on the **Express** host, not under `/api`; clients store `objectPath` and may need absolute URLs to that origin for display unless you proxy or use a CDN.

---

### Pitch deck (backend-only in current UI)

| Method + path | Used by UI? | Auth |
| --- | --- | --- |
| `GET /api/pitch-deck/download` | **No** | Public |

**Success:** `200` binary PPTX (`Content-Disposition: attachment; filename=Souq-Snap-Pitch-Deck.pptx`). **Errors:** `500` `{ message }`.

---

### Platform admin

| Method + path | Used by UI? | Auth |
| --- | --- | --- |
| `POST /api/admin/login` | Yes | Public → sets `adminId` |
| `POST /api/admin/logout` | Yes | Clears `adminId` |
| `GET /api/admin/session` | Yes | `adminId` session |
| `GET /api/admin/stats` | Yes | `requireAdmin` |
| `GET /api/admin/analytics` | Yes | `requireAdmin` |
| `GET /api/admin/merchants` | Yes | `requireAdmin` |
| `PATCH /api/admin/merchants/:id` | Yes | Body `{ emailVerified: boolean }` |
| `GET /api/admin/drops` | Yes | `requireAdmin` |
| `POST /api/admin/drops` | Yes | `requireAdmin` |
| `PATCH /api/admin/drops/:id` | Yes | `requireAdmin` |
| `DELETE /api/admin/drops/:id` | Yes | `requireAdmin` |
| `POST /api/admin/drops/:id/codes` | Yes | `requireAdmin` |
| `GET /api/admin/drops/:id/codes` | Yes | `requireAdmin` |
| `GET /api/admin/users` | Yes | `requireAdmin` |
| `POST /api/admin/setup` | **No** | Public with **`setupKey === SESSION_SECRET`** |

**Admin protected errors:** `401` `{ message }` (“Admin authentication required” / “Not authenticated”).

**`POST /api/admin/setup`** — Body `{ email, password, name, setupKey }`. Success: `{ message, admin }`. Errors: `400` missing fields / admin exists; `403` invalid setup key; `500`.

---

## Client implementation notes

These files use **raw `fetch` with a `/api/...` string** (not `apiRequest` / `resolveBrowserApiUrl`). If you change API base URL rules, update these to use `resolveBrowserApiUrl` or a shared helper with `credentials: "include"` where needed:

- `src/views/merchant-store.tsx` — `GET /api/store/:username`
- `src/components/voucher-display.tsx` — voucher code + send email
- `src/views/admin-dashboard.tsx` — logout, promo `GET`, uploads
- `src/views/platform-admin-dashboard.tsx` — promo `GET`
- `src/views/leaderboard.tsx` — hunter profile
- `src/views/claim-history.tsx` — history + profile
- `src/views/profile.tsx` — hunter profile `GET`
- `src/views/verify-email.tsx` — verify POST
- `src/views/staff-scanner.tsx` — validate GET
- `src/hooks/use-upload.ts` — presign

Default React Query `queryFn` already uses `resolveBrowserApiUrl` on the joined `queryKey`.

---

## Environment: relative API vs BFF proxy

| Variable | Role |
| --- | --- |
| _(default)_ | Browser calls same-origin `/api/...` (Next Route Handlers). |
| `NEXT_PUBLIC_RELATIVE_API=false` | Use absolute API URL: `NEXT_PUBLIC_API_ORIGIN` or `NEXT_PUBLIC_APP_URL` (`src/lib/app-config.ts`). |
| `BACKEND_URL` | **Server-only.** Origin of Nest/Express (no trailing slash). The catch-all proxy forwards to `{BACKEND_URL}/api/...`. In `next dev`, if unset, the proxy defaults to `http://localhost:5000`. **Production** must set this. |

If the browser and API are on different registrable domains, session cookies must be configured for a shared parent domain or you move merchant/admin to tokens (see below).

---

## Nest migration / handoff checklist

Use this document as a **module and DTO checklist** (controllers mirroring route groups: vouchers, merchants, hunter, admin, uploads).

**Session vs JWT**

- **Today:** Merchant and admin rely on **opaque session cookies** backed by Postgres; hunter flows are mostly **device id + optional account** without a shared session cookie model.
- **Nest options:** (1) **Keep session store compatible** (e.g. connect-style sessions or Nest session + same cookie name/attributes) and forward `Cookie` through the BFF until clients switch. (2) **JWT in httpOnly cookies** or Authorization header — requires client changes to login/logout and CSRF strategy. (3) **Separate** merchant vs admin issuers if you split APIs.

**Proxy:** Until Nest hosts all routes, `BACKEND_URL` can point at the existing Express process; swap the URL when Nest is ready without changing client paths if the contract stays stable.

**Hardening:** Lock down `POST /api/uploads/request-url`, `POST /api/admin/setup`, and Twilio/email-dependent routes for production.
