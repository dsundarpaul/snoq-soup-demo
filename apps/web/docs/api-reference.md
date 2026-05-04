# SouqSnap HTTP API reference

Base path: **`/api/v1`** (all routes below are relative to this prefix).

**Full URL:** `{API_ORIGIN}/api/v1/...` where `API_ORIGIN` is the Nest app origin (e.g. `http://localhost:3001`).

**Interactive docs:** When the API runs with `NODE_ENV !== "production"`, OpenAPI is served at **`/api/docs`**.

---

## Conventions

### Authentication

- **Bearer JWT:** `Authorization: Bearer <accessToken>`
- Access tokens are short-lived (~15 minutes). Use **`POST /auth/refresh`** with the refresh token to obtain a new pair.
- **Merchant-only:** After login/register, the API still issues tokens even if `user.emailVerified` is `false`. **Protected merchant routes** (`/merchants/me/*`, merchant drops, upload presign, etc.) run JWT validation that **rejects unverified merchants** with **401** and message **`Email verification required`**. This is not “missing token”; verify email first (`POST /auth/merchant/verify-email/:token`) or use **`POST /auth/merchant/resend-verification`** (body: `{ "email" }`, no auth).

### Hunter device header

- **`DeviceGuard`** still applies to authenticated hunter routes such as **`GET /hunters/me`** and related profile/history endpoints: send **`X-Device-Id`** when the client stores a device id (CORS must allow this header in production via `CORS_ORIGIN`).
- **`POST /vouchers/claim`** is **public** (throttled). Identity is resolved from the **hunter access JWT** (cookie/header) when present; otherwise the **`deviceId`** in the JSON body creates or resolves an anonymous hunter record. Sending **`X-Device-Id`** on claim is optional but harmless if it matches body `deviceId`.

### Success responses

- JSON bodies match the Nest DTOs / service return types unless noted.
- **`204 No Content`** is used for some deletes.

### Error responses

Failures use a consistent envelope (see `HttpExceptionFilter`):

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Human-readable message",
  "error": "Unauthorized",
  "timestamp": "2026-04-06T12:25:07.456Z",
  "path": "/api/v1/..."
}
```

Validation errors may include **`details`** in non-production.

---

## Authentication (`/auth`)

| Method | Path | Intent | Auth | Request body | Success response |
|--------|------|--------|------|--------------|------------------|
| POST | `/auth/merchant/register` | Register merchant; sends verification email (logged in dev). | None | `RegisterMerchantDto`: `email`, `username`, `password`, `businessName` | **201** `AuthResponseDto`: `accessToken`, `refreshToken`, `user` (includes `emailVerified`) |
| POST | `/auth/merchant/login` | Merchant email/password login. | None | `LoginDto`: `email`, `password` | **200** `AuthResponseDto` |
| POST | `/auth/merchant/verify-email/:token` | Confirm email with token from email. | None | — | **200** empty body |
| POST | `/auth/merchant/resend-verification` | Resend verification email if account exists. | None | `ForgotPasswordDto`: `email` | **200** empty |
| POST | `/auth/merchant/forgot-password` | Start password reset flow. | None | `ForgotPasswordDto`: `email` | **200** empty |
| POST | `/auth/merchant/reset-password/:token` | Complete password reset. | None | `ResetPasswordDto`: `password` | **200** empty |
| POST | `/auth/hunter/register` | Register hunter (device + optional email). | None | `RegisterHunterDto`: `deviceId`, `password`, optional `email`, `nickname` | **201** `AuthResponseDto` |
| POST | `/auth/hunter/login` | Hunter email/password login. Optional **`deviceId`** in the body is ignored (does not merge or link sessions). | None | `LoginDto` + optional `deviceId` | **200** `AuthResponseDto` |
| POST | `/auth/hunter/device-login` | Login or auto-create hunter by device. | None | JSON body: `{ "deviceId": string }` | **200** `AuthResponseDto` |
| POST | `/auth/hunter/forgot-password` | Hunter reset request. | None | `ForgotPasswordDto` | **200** empty |
| POST | `/auth/hunter/reset-password/:token` | Hunter reset. | None | `ResetPasswordDto` | **200** empty |
| POST | `/auth/admin/login` | Admin login. | None | `LoginDto` | **200** `AuthResponseDto` |
| POST | `/auth/refresh` | New access + refresh tokens. | None | `RefreshTokenDto`: `refreshToken` | **200** `TokenResponseDto`: `accessToken`, `refreshToken` |
| POST | `/auth/logout` | Revoke refresh token. | Bearer | `RefreshTokenDto` | **200** empty |

**`AuthResponseDto`:** `accessToken`, `refreshToken`, `user` (`id`, `email`, `type`, merchant fields like `emailVerified`, `businessName`, `username`, or hunter `nickname`, `deviceId`, etc.).

### Anonymous session vs registered account

- **`POST /auth/hunter/login`** does **not** merge or move vouchers from an anonymous device hunter. Email/password login only issues tokens for the hunter matched by **email**.
- **Upgrade path:** Register on the **same `deviceId`** as **`device-login`** (see **`POST /auth/hunter/register`**) so anonymous claims stay on one hunter document when adding email/password.
- **Stale JWT:** If **`GET /hunters/me`** returns **401** (e.g. soft-deleted hunter or cookie/session mismatch), **`POST /auth/hunter/device-login`** with **`deviceId`** and **`credentials: 'include'`** can refresh cookies—avoid unbounded retry loops (cap attempts).

---

## Merchants (`/merchants`)

| Method | Path | Intent | Auth | Body / query | Success |
|--------|------|--------|------|--------------|---------|
| GET | `/merchants/me` | Current merchant profile. | Merchant JWT | — | **200** `MerchantResponseDto` |
| PATCH | `/merchants/me` | Update profile. | Merchant JWT | `UpdateMerchantDto` (partial fields) | **200** `MerchantResponseDto` |
| PATCH | `/merchants/me/logo` | Set logo URL (after upload). | Merchant JWT | `{ "logoUrl": string }` | **200** `MerchantResponseDto` |
| POST | `/merchants/me/scanner-token` | Create scanner token for staff QR flow. | Merchant JWT | `GenerateScannerTokenDto` (e.g. `expiresIn`) | **201** `ScannerTokenResponseDto` |
| GET | `/merchants/me/scanner-token` | Get active scanner token. | Merchant JWT | — | **200** `ScannerTokenResponseDto` or null shape per service |
| PUT | `/merchants/me/redeemer-hunters/:hunterId` | Link hunter JWT user so they can redeem your vouchers. | Merchant JWT | — | **200** `{ success: true }` |
| DELETE | `/merchants/me/redeemer-hunters/:hunterId` | Remove redeemer link for a hunter. | Merchant JWT | — | **200** `{ success: true }` |
| GET | `/merchants/me/stats` | Aggregate drop stats. | Merchant JWT | — | **200** `MerchantStatsResponseDto` |
| GET | `/merchants/me/analytics` | Time-series analytics. | Merchant JWT | Query: date range per service | **200** `MerchantAnalyticsResponseDto` |
| GET | `/merchants/:username/public` | Public store page (drops, branding). | None | — | **200** `MerchantPublicResponseDto` |

**Note:** `GET/PATCH /merchants/me` require **verified** merchant email (JWT strategy).

---

## Drops (`/drops`, `/merchants/me/drops`, `/admin/drops`)

| Method | Path | Intent | Auth | Body / query | Success |
|--------|------|--------|------|--------------|---------|
| GET | `/drops/active` | Active drops near a point. | None | Query: `lat`, `lng`, `radius` (meters) | **200** `ActiveDropsResponseDto` |
| GET | `/drops/:id` | Public drop detail; optional user coords. | None | Query: optional `lat`, `lng` | **200** `DropDetailResponseDto` |
| GET | `/merchants/me/drops` | List merchant’s drops (paginated). | Merchant JWT | Query: `page`, `limit` | **200** `{ drops, total, page, limit }` |
| POST | `/merchants/me/drops` | Create drop. | Merchant JWT | `CreateDropDto` | **201** `DropResponseDto` |
| PATCH | `/merchants/me/drops/:id` | Update drop. | Merchant JWT | `UpdateDropDto` | **200** `DropResponseDto` |
| DELETE | `/merchants/me/drops/:id` | Soft-delete drop. | Merchant JWT | — | **204** |
| GET | `/admin/drops` | Admin list (placeholder in `DropsController`). | Admin JWT | Query: `page`, `limit` | **200** stub payload |
| POST | `/admin/drops` | Admin create for any merchant. | Admin JWT | `CreateDropDto` + `merchantId` | **201** `DropResponseDto` |
| PATCH | `/admin/drops/:id` | Admin update (partial impl.). | Admin JWT | `UpdateDropDto` | **200** `DropResponseDto` |
| DELETE | `/admin/drops/:id` | Admin delete (partial impl.). | Admin JWT | — | **204** |

**Admin drops:** Prefer **`/admin/drops`** from `AdminController` for full admin workflows; `DropsController` admin routes may be stubs.

---

## Vouchers (`/vouchers`, `/merchants/me/vouchers`, `/hunters/me/vouchers`)

| Method | Path | Intent | Auth | Body / query | Success |
|--------|------|--------|------|--------------|---------|
| POST | `/vouchers/claim` | Claim voucher for a drop. | Public (rate-limited); optional hunter JWT | `ClaimVoucherDto`: **`dropId`**, **`deviceId`**, optional **`hunterId`** (must match session/device when sent). Response includes **`claimedWithoutRegisteredAccount`** when claim used device-only or unregistered JWT identity. | **201** `ClaimVoucherResponseDto` |
| POST | `/vouchers/redeem` | Redeem (merchant, scanner, or linked hunter). | Bearer (merchant, scanner, or hunter with `redeemerMerchantId`) | `RedeemVoucherDto` | **200** `RedeemResultDto` |
| GET | `/vouchers/magic/:token` | Voucher detail via magic link token. | None | — | **200** `VoucherDetailResponseDto` |
| POST | `/vouchers/send-email` | Email voucher to user. | Bearer | `SendEmailDto` (`voucherId`, `email`, `magicLink`) | **200** `{ success: true }` |
| POST | `/vouchers/send-whatsapp` | WhatsApp voucher. | Bearer | `SendWhatsAppDto` | **200** `{ success: true }` |
| GET | `/vouchers/:id/promo-code` | Promo code when magic token valid. | None | Query: `magicToken` | **200** `{ promoCode: string \| null }` |
| GET | `/merchants/me/vouchers` | Merchant’s issued vouchers. | Merchant JWT | Query: `page`, `limit` | **200** `{ vouchers, total }` |
| GET | `/hunters/me/vouchers` | Hunter’s vouchers. | Hunter JWT + device | — | **200** `VoucherResponseDto[]` |

---

## Hunters (`/hunters/me`, `/leaderboard`)

| Method | Path | Intent | Auth | Body / query | Success |
|--------|------|--------|------|--------------|---------|
| GET | `/hunters/me` | Profile; may bootstrap by device. | Bearer + `DeviceGuard` | Header: `X-Device-Id` | **200** `HunterResponseDto` |
| GET | `/hunters/me/history` | Voucher history. | Bearer + device | `X-Device-Id` | **200** `HunterHistoryResponseDto` |
| PATCH | `/hunters/me/profile` | Update profile. | Hunter JWT | `UpdateProfileDto` | **200** `HunterResponseDto` |
| PATCH | `/hunters/me/nickname` | Update nickname. | Hunter JWT | `UpdateNicknameDto` | **200** `HunterResponseDto` |
| GET | `/leaderboard` | Top hunters by claims. | None | Query: `limit` (default 50) | **200** `LeaderboardEntryDto[]` |

---

## Scanner (`/scanner`)

| Method | Path | Intent | Auth | Body | Success |
|--------|------|--------|------|------|---------|
| GET | `/scanner/:token/validate` | Validate staff scanner token. | None (public, throttled) | — | **200** `ScannerValidationDto` |
| POST | `/scanner/:token/redeem` | Redeem with scanner token. | None (public, throttled) | `RedeemByScannerDto` (`voucherId`, `magicToken`) | **200** `ScannerRedeemResultDto` |

---

## Upload (`/upload`)

| Method | Path | Intent | Auth | Body | Success |
|--------|------|--------|------|------|---------|
| POST | `/upload/presign` | Presigned PUT URL for object storage. | Bearer (user id in token) | `PresignUploadDto` (`filename`, `contentType`, `size`) | **201** `PresignResponseDto` |
| GET | `/upload/:key(*)` | Redirect to public file URL. | None | — | **302** redirect |

**Note:** Unverified merchants cannot use presign (same JWT rules as other merchant routes).

---

## Promo codes (`/merchants/me/drops/:dropId/codes`)

All routes: **Merchant JWT** + `RolesGuard` merchant.

| Method | Path | Intent | Body / query | Success |
|--------|------|--------|--------------|---------|
| POST | `/merchants/me/drops/:dropId/codes` | Create one code. | `CreatePromoCodeDto` | **201** `PromoCodeResponseDto` |
| POST | `/merchants/me/drops/:dropId/codes/bulk` | Bulk create. | `BulkCreatePromoCodesDto` | **201** `PromoCodeResponseDto[]` |
| GET | `/merchants/me/drops/:dropId/codes` | List/filter/paginate. | Query: `status`, `page`, `limit` | **200** `PromoCodeListDto` |
| GET | `/merchants/me/drops/:dropId/codes/stats` | Stats for drop. | — | **200** `PromoCodeStatsDto` |
| DELETE | `/merchants/me/drops/:dropId/codes` | Delete unused codes for drop. | — | **200** `{ deletedCount }` |

---

## Admin (`/admin`)

All routes: **Admin JWT** + admin role.

| Method | Path | Intent | Query / body | Success |
|--------|------|--------|--------------|---------|
| GET | `/admin/stats` | Platform stats. | — | **200** `AdminStatsDto` |
| GET | `/admin/analytics` | Platform time-series. | `days`, `granularity` | **200** `AdminAnalyticsDto` |
| GET | `/admin/merchants` | List merchants. | `page`, `limit`, `isVerified`, `search` | **200** `MerchantListDto` |
| PATCH | `/admin/merchants/:id` | Update merchant. | `UpdateMerchantAdminDto` | **200** `MerchantListItemDto` |
| GET | `/admin/users` | List hunters/users. | `page`, `limit`, `search`, `minClaims` | **200** `UserListDto` |
| GET | `/admin/drops` | List drops (filters). | `page`, `limit`, `merchantId`, `active`, `search` | **200** (service shape) |
| POST | `/admin/drops` | Create drop for merchant. | Admin DTO | **201** created drop |
| PATCH | `/admin/drops/:id` | Update drop. | body | **200** updated |
| DELETE | `/admin/drops/:id` | Soft-delete drop. | — | **200** `{ id, deletedAt }` |

---

## Web client alignment

- **`apps/web`** uses `apiFetch` / `apiFetchMaybeRetry` with `inferAuthRoleFromPath`: paths containing **`/merchants/me`** or **`/upload/presign`** attach the **merchant** access token; **`/hunters/me`** uses **hunter**; **`/admin/`** uses **admin**.
- **`POST /auth/*`** and public routes should pass **`auth: undefined`** so no Bearer header is sent.

---

*Generated from Nest controllers in `apps/api/src/modules`. For field-level schemas, use Swagger at `/api/docs` or the DTO files next to each module.*
