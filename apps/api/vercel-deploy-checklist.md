# Vercel deployment checklist — API (`@souqsnap/api`)

## How to use this document (LLM / agent)

- Work **top to bottom**. Treat each **GATE** as blocking: do not mark the deploy ready until all items in that gate pass.
- Prefer **commands exactly as written** (repo root: `personal-deploy`; adjust only if the workspace root differs).
- After fixing failures, **re-run the gate** that failed before continuing.
- Canonical env reference: `apps/api/.env.example` (copy names and semantics from there; production values live in Vercel, not in git).

---

## GATE 0 — Repository & toolchain

- [ ] **Node**: Use Node **>= 20.18.0** (see root `package.json` → `engines`). Align Vercel Project → Settings → General → Node.js Version.
- [ ] **Package manager**: **pnpm only** (root `packageManager`: `pnpm@10.33.0`). Vercel should use pnpm (no npm/yarn lockfile takeover).
- [ ] **Monorepo**: This app depends on workspace package `@souqsnap/shared`. Turbo `build` uses `dependsOn: ["^build"]`, so **shared builds before** the API when using Turbo from root.

---

## GATE 1 — Local build parity (catch compile errors before Vercel)

Run from **repository root**:

```bash
pnpm install
pnpm turbo run build --filter=@souqsnap/api
```

- [ ] Command completes with **exit code 0**.
- [ ] No TypeScript errors from `nest build` (Nest CLI).

Optional stricter gates (recommended before deploy):

```bash
pnpm turbo run typecheck --filter=@souqsnap/api
pnpm turbo run lint --filter=@souqsnap/api
```

- [ ] `typecheck` passes (`tsc --noEmit` in `apps/api`).
- [ ] `lint` passes (or team policy allows known exceptions — do not leave new violations).

---

## GATE 2 — Vercel project configuration

- [ ] **Root Directory**: Set to `apps/api` *or* keep monorepo root and override **Install** / **Build** so dependencies resolve (see below). Pick one consistent layout; mixed configs cause “module not found” on Vercel.
- [ ] **Install command** (if building from monorepo root): e.g. `pnpm install` (frozen lockfile in CI is common: `pnpm install --frozen-lockfile`).
- [ ] **Build command** (examples):
  - From root: `pnpm turbo run build --filter=@souqsnap/api`
  - From `apps/api`: `pnpm build` (requires `node_modules` and workspace linking correct for your Vercel root choice).
- [ ] **Output**: Nest outputs to `dist/`; production entry in `package.json` is `node dist/src/main` (`start:prod`). Confirm Vercel’s **Nest** preset or custom start matches this output path.
- [ ] **Framework**: Repo includes `vercel.json` with `"framework": "nestjs"` — keep in sync with Vercel dashboard if you override behavior.

---

## GATE 3 — Environment variables (runtime; avoid “works locally, fails in prod”)

Set in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use preview APIs).

- [ ] **MONGODB_URI** — reachable from Vercel’s regions (Atlas IP allowlist / VPC as required).
- [ ] **JWT_SECRET** — strong, unique per environment.
- [ ] **CORS_ORIGIN** — comma-separated allowed web origins (matches `app.config` / production CORS in `main.ts`).
- [ ] **FRONTEND_URL**, **FRONTEND_HUNTER_URL**, **FRONTEND_MERCHANT_URL**, **FRONTEND_ADMIN_URL** — match real deployed URLs where used for links/CORS-related behavior.
- [ ] **S3 / MinIO** variables — production bucket, keys, region, public URL if applicable (`apps/api/.env.example` groups: `MINIO_*`, `S3_*`).
- [ ] **SMTP_***, **TWILIO_*** — if those code paths run in production.
- [ ] **PORT** — usually provided by the platform; only set explicitly if your hosting layer requires it.

- [ ] No secrets committed; `.env` files gitignored.

---

## GATE 4 — Smoke checks after deploy

- [ ] Health or bootstrap route responds (whatever your app exposes first).
- [ ] MongoDB connection succeeds (no startup crash loop).
- [ ] CORS: browser calls from the live web origin succeed for authenticated/unauthenticated routes as designed.

---

## Quick reference — commands (copy/paste)

| Goal        | From repo root |
|------------|----------------|
| API build  | `pnpm turbo run build --filter=@souqsnap/api` |
| API types  | `pnpm turbo run typecheck --filter=@souqsnap/api` |
| API lint   | `pnpm turbo run lint --filter=@souqsnap/api` |
| API tests  | `cd apps/api && pnpm test` |
| API E2E    | `cd apps/api && pnpm test:e2e` |

---

## Common Vercel build failures (triage)

| Symptom | Likely cause |
|--------|----------------|
| Cannot find module `@souqsnap/shared` | Wrong Vercel root / install did not hoist workspace packages; use monorepo-aware install from root. |
| `nest: command not found` | DevDependency not installed; install must run in correct workspace. |
| TypeScript errors only on Vercel | Node/tsconfig mismatch; run local `pnpm turbo run typecheck --filter=@souqsnap/api`. |
| Boot crash in prod | Missing env vars (see GATE 3) or DB/network access. |
