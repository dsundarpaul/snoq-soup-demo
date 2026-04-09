# Vercel deployment checklist — Web (`@souqsnap/web`)

## How to use this document (LLM / agent)

- Work **top to bottom**. Each **GATE** is blocking until all checkboxes in it are satisfied.
- Run listed commands from the **repository root** unless the command starts with `cd apps/web`.
- Next.js **bakes `NEXT_PUBLIC_*` at build time** — changing them requires a **new deployment**.
- Server-only vars (e.g. `BACKEND_URL`) apply to **Node server routes**; they do not need the `NEXT_PUBLIC_` prefix.

---

## GATE 0 — Repository & toolchain

- [x] **Node**: Use Node **>= 20.18.0** (root `package.json` → `engines`). Match Vercel Project → Settings → General → Node.js Version.
- [x] **Package manager**: **pnpm** (root `packageManager`). Ensure Vercel uses pnpm for consistent lockfile resolution (`apps/web/vercel.json` uses root `pnpm install` when Root Directory is `apps/web`).

---

## GATE 1 — Local build parity (catch errors before Vercel)

From **repository root**:

```bash
pnpm install
pnpm turbo run build --filter=@souqsnap/web
```

- [x] **`next build` completes** with exit code 0 (no TS errors surfaced during build).

Stricter pre-deploy checks:

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm lint
```

- [x] `pnpm typecheck` passes (`tsc --noEmit`).
- [x] `pnpm lint` passes (eslint; warnings only, exit code 0).

---

## GATE 2 — Required environment variables on Vercel

### Server (API proxy — `app/api/[...path]/route.ts`)

- [ ] **BACKEND_URL** — Set in **Production** (and Preview if previews should proxy). Must be the **origin of the Nest API** (no trailing slash issues: code normalizes). **In production, if unset, the proxy returns 503** with a clear message.
- [ ] Value format: `https://your-api-host` (scheme + host; path is appended as `/api/...` by the route).

### Client (`NEXT_PUBLIC_*` — inlined at build)

Configure as needed for how the browser talks to the API:

- [ ] **NEXT_PUBLIC_API_URL** — Used in `src/lib/app-config.ts` (`API_ORIGIN`). Set if the client must call the API on a different origin than the page.
- [ ] **NEXT_PUBLIC_BASE_URL** or **NEXT_PUBLIC_APP_URL** — Public site base for generated links (`getPublicSiteUrl` / `publicUrls` in `app-config.ts`). At least one should match the deployed web URL in production if you rely on absolute links.

### Optional features

- [ ] **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** — Required only if Google Maps / Places features are used (`merchant-dashboard.tsx` for map embed; also `google-places-autocomplete` if used).

- [x] **`NEXT_PUBLIC_*` inventory** (grep `process.env.NEXT_PUBLIC` in `apps/web`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Copy `apps/web/.env.example` on Vercel.

---

## GATE 3 — Vercel project configuration

- [ ] **Root Directory**: Set to **`apps/web`** (recommended) so `apps/web/vercel.json` applies; *or* monorepo root with equivalent install/build commands.
- [x] **Build / install** (when Root Directory is `apps/web`): `vercel.json` runs `cd ../.. && pnpm install` and `pnpm turbo run build --filter=@souqsnap/web`. If Root Directory is repo root instead, use: `pnpm turbo run build --filter=@souqsnap/web`.
- [ ] **Output**: Default Next.js on Vercel (`.next`); no custom output mismatch.
- [ ] **Framework Preset**: Next.js; align Node with `engines` (Next **16.x** in `apps/web/package.json`).

---

## GATE 4 — Post-deploy smoke checks

- [ ] Open production URL; main layout renders without 500.
- [ ] Call an API-backed page; **Network** tab shows `/api/...` succeeding (proxy + cookies if auth).
- [ ] If **503** from `/api/*`: verify **BACKEND_URL** and that the API allows the Vercel deployment origin (CORS / cookies as designed).

---

## Quick reference — commands (copy/paste)

| Goal        | Command |
|------------|---------|
| Web build  | `pnpm turbo run build --filter=@souqsnap/web` |
| Web types  | `cd apps/web && pnpm typecheck` |
| Web lint   | `cd apps/web && pnpm lint` |

---

## Common Vercel build failures (triage)

| Symptom | Likely cause |
|--------|----------------|
| TS errors during `next build` | Run `cd apps/web && pnpm typecheck`; fix strict null/React 19 types. |
| ESLint fails on Vercel | Run `cd apps/web && pnpm lint` locally; align eslint-config-next with Next version. |
| API routes 503 in prod | **BACKEND_URL** missing or wrong. |
| Wrong API host in browser | **NEXT_PUBLIC_*** URLs wrong or stale — **redeploy** after changing them. |
| Maps broken | **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** missing or restricted by HTTP referrer. |
