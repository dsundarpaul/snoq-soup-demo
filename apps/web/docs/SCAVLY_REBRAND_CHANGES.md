# Scavly rebrand — change log (detailed)

This document records the product rename to **Scavly**, the in-app **logo** sourced from the bundled asset, and related **branding** updates across the web app and API. It reflects the state of the codebase after the rebrand work.

## Summary

| Area | What changed |
|------|----------------|
| **Single source of truth (web)** | `APP_NAME` and `appLogo` are exported from [`apps/web/src/lib/app-brand.ts`](apps/web/src/lib/app-brand.ts). |
| **Logo file** | [`apps/web/src/assets/images/logo.png`](apps/web/src/assets/images/logo.png) (transparent PNG) — imported in components; previous public URL `/images/clean_trophy_logo_no_text.png` is no longer used for these surfaces. |
| **Site metadata & PWA** | Root layout, manifest, and offline page use `APP_NAME` and the shared app description. |
| **i18n** | English and Arabic locale **values** updated where they mentioned the old name; **keys** (e.g. `merchant.newToSouqSnap`) kept to avoid a large `TranslationKey` refactor. |
| **Transactional email (API)** | `BRAND_NAME`, header tagline, colors, and verification lead copy in [`email-templates.ts`](apps/api/src/modules/mail/email-templates.ts). |
| **API docs (dev)** | Swagger title/description in [`main.ts`](apps/api/src/main.ts). |

## Web app: brand module

**File:** [`apps/web/src/lib/app-brand.ts`](apps/web/src/lib/app-brand.ts)

- Exports `APP_NAME` = `"Scavly"` (const).
- Exports `appLogo` as `StaticImageData` from `@/assets/images/logo.png` for use with `<img src={appLogo.src} />` and dimensions from the static import when needed.

## Web app: configuration helper

**File:** [`apps/web/src/lib/app-config.ts`](apps/web/src/lib/app-config.ts)

- Adds **`getPublicSiteHostnameOrFallback(fallback = "scavly.com")`**, which parses `process.env.NEXT_PUBLIC_BASE_URL` to a hostname when set, otherwise returns the fallback. Used for pitch-deck CTA text so production domains align with environment configuration.

## Web app: pages & metadata

| File | Changes |
|------|---------|
| [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx) | Imports `APP_NAME` from `app-brand`. Sets `metadata` (`applicationName`, `title` default + template `%s \| ${APP_NAME}`, `description`, `appleWebApp`, `openGraph`, `twitter`, `icons` pointing at `/icons/...`), `APP_DESCRIPTION` ("Hunt, claim, and redeem…"), and `viewport` theme color. |
| [`apps/web/app/manifest.ts`](apps/web/app/manifest.ts) | PWA `name` and `short_name` use `APP_NAME`; description matches the app tagline. |
| [`apps/web/app/offline/page.tsx`](apps/web/app/offline/page.tsx) | Page metadata title template and link copy use `APP_NAME`. |

## Web app: internationalization

| File | Keys (unchanged) | Value updates (summary) |
|------|------------------|-------------------------|
| [`apps/web/src/locales/en.ts`](apps/web/src/locales/en.ts) | e.g. `merchant.newToSouqSnap`, `welcome.whySouqSnap` | "New to Scavly?", "Why Scavly?", merchant drive copy, welcome footer, `store.poweredBy`, etc. |
| [`apps/web/src/locales/ar.ts`](apps/web/src/locales/ar.ts) | Same key names as EN | Product name as **Scavly** in Latin where appropriate; footer, powered-by, "why" heading, drive description. |

## Web app: components and sections (hardcoded or structural)

| File | Purpose of change |
|------|-------------------|
| [`apps/web/src/sections/home/home-header.tsx`](apps/web/src/sections/home/home-header.tsx) | Header wordmark: `appLogo` + `APP_NAME` for image `src`, `alt`, and `<h1>`. |
| [`apps/web/src/sections/merchant/merchant-dashboard-header.tsx`](apps/web/src/sections/merchant/merchant-dashboard-header.tsx) | Fallback when merchant has no `logoUrl`: `appLogo.src`. `alt` uses `APP_NAME` when no business name. `object-contain` vs `object-cover` for default vs uploaded logos. |
| [`apps/web/src/sections/merchant/merchant-store.tsx`](apps/web/src/sections/merchant/merchant-store.tsx) | Public store header and share `title` use `APP_NAME` and bundled logo. |
| [`apps/web/src/sections/merchant/merchant-login.tsx`](apps/web/src/sections/merchant/merchant-login.tsx) | Main heading uses `APP_NAME`. |
| [`apps/web/src/sections/merchant/merchant-forgot-password.tsx`](apps/web/src/sections/merchant/merchant-forgot-password.tsx) | Page `<h1>` uses `APP_NAME`. |
| [`apps/web/src/sections/merchant/merchant-reset-password.tsx`](apps/web/src/sections/merchant/merchant-reset-password.tsx) | Page `<h1>` uses `APP_NAME`. |
| [`apps/web/src/sections/merchant/merchant-profile/merchant-profile-information-tab.tsx`](apps/web/src/sections/merchant/merchant-profile/merchant-profile-information-tab.tsx) | Card description: "Your business identity on {APP_NAME}". |
| [`apps/web/src/sections/treasure-hunter/treasure-hunter-forgot-password.tsx`](apps/web/src/sections/treasure-hunter/treasure-hunter-forgot-password.tsx) | Main heading uses `APP_NAME`. |
| [`apps/web/src/sections/treasure-hunter/treasure-hunter-reset-password.tsx`](apps/web/src/sections/treasure-hunter/treasure-hunter-reset-password.tsx) | Main heading uses `APP_NAME`. |
| [`apps/web/src/sections/voucher/voucher-view.tsx`](apps/web/src/sections/voucher/voucher-view.tsx) | Voucher page title `<h1>` uses `APP_NAME`. |
| [`apps/web/src/components/voucher-display.tsx`](apps/web/src/components/voucher-display.tsx) | SMS / share `message` template: "Your {APP_NAME} voucher is ready! …" |
| [`apps/web/src/components/pwa-install-prompt.tsx`](apps/web/src/components/pwa-install-prompt.tsx) | Install prompt title uses `APP_NAME`. |
| [`apps/web/src/sections/common/welcome.tsx`](apps/web/src/sections/common/welcome.tsx) | Mockup `alt` text and footer wordmark use `APP_NAME`. |
| [`apps/web/src/sections/pitch/pitch-deck.tsx`](apps/web/src/sections/pitch/pitch-deck.tsx) | Imports `APP_NAME` and `getPublicSiteHostnameOrFallback` as `CTA_HOST`. Phone mockup title, cover slide `title`/`tagline` ("Hunt. Claim. Redeem."), solution `description` string, closing slide `cta` hostname. |
| [`apps/web/src/sections/pitch/pitch-deck-export.tsx`](apps/web/src/sections/pitch/pitch-deck-export.tsx) | Print/PDF export deck: same branding pattern; cover tagline; solution paragraph; CTA line shows `CTA_HOST`. |

## API: transactional email

**File:** [`apps/api/src/modules/mail/email-templates.ts`](apps/api/src/modules/mail/email-templates.ts)

- `BRAND_NAME` set to **Scavly** (affects all subjects, plain text, and HTML where the name is interpolated).
- Branded header **tagline** in HTML: **HUNT. CLAIM. REDEEM.**
- **Gradient colors** updated toward brand purple: `COLOR_PRIMARY` `#5E4BB1`, `COLOR_PRIMARY_DARK` `#433B8F`.
- Verification email **lead** line references **Scavly** (no leftover old product name in that sentence).
- All flows using this module remain wired through [`mail.service.ts`](apps/api/src/modules/mail/mail.service.ts) (no API surface change; content only).

**Email in HTML (optional follow-up, not implemented here):** embedding the PNG would require a publicly reachable absolute image URL; current layout uses text in the header.

## API: Swagger (non-production)

**File:** [`apps/api/src/main.ts`](apps/api/src/main.ts)

- `DocumentBuilder` **title** and **description** reference **Scavly** for the non-production OpenAPI (Swagger) UI.

## Intentionally unchanged (per rebrand scope)

The following were **not** renamed to avoid breaking installs, sessions, or build plumbing without a dedicated migration:

- `pnpm` package names (e.g. `@souqsnap/web`, `@souqsnap/api`, `@souqsnap/shared`).
- `tsconfig` path aliases (`@souqsnap/shared`, etc.).
- Vercel / Turbo `buildCommand` filter package names.
- `localStorage` keys (e.g. `souq-snap-lang` in language context) and other stored identifiers such as `souq-snap-device-id`.
- Legacy auth storage key names in `auth-tokens` / `auth-session` (souqsnap-prefixed keys and events).

## Environment and pitch CTA

- **Pitch / export closing slide “domain”** uses `getPublicSiteHostnameOrFallback()`. If **`NEXT_PUBLIC_BASE_URL`** is set at build time (e.g. `https://app.example.com`), the visible hostname (e.g. `app.example.com`) is shown; otherwise the fallback **`scavly.com`** is used.
- Staging and production should set `NEXT_PUBLIC_BASE_URL` to the public site base URL for accurate CTA text.

## Verification commands (suggested)

```bash
pnpm --filter @souqsnap/web typecheck
pnpm --filter @souqsnap/api typecheck
pnpm --filter @souqsnap/web lint
```

After deploy, manually send a **verification**, **password reset**, and **voucher magic link** email and confirm subject lines and body header show **Scavly** and the new tagline.

## Related assets

- Favicon and PWA icons are referenced from [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx) and [`apps/web/app/manifest.ts`](apps/web/app/manifest.ts) under paths like `/icons/icon-192x192.png` and `/icons/icon-512x512.png` — separate from the main wordmark in `src/assets/images/logo.png`.

---

*This file documents implementation details for the Scavly rollout; it is not the product spec.*
