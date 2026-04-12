# Revert Vercel Blob → S3 (MinIO) Upload

## Current State (Temporary — Vercel Blob)

Upload flow: Client sends file as `multipart/form-data` to `POST /api/v1/s3/upload` → API uploads to Vercel Blob via `@vercel/blob` `put()` → returns `{ publicUrl }`.

**Auth:** `@vercel/blob` only uses `BLOB_READ_WRITE_TOKEN` (or an explicit `token` / client token). `VERCEL_OIDC_TOKEN` does not replace it; OIDC is for third-party cloud federation, not the Blob HTTP API.

### Files involved in Vercel Blob implementation

| File | Role |
|------|------|
| `apps/api/src/modules/s3/blob.service.ts` | Vercel Blob upload logic |
| `apps/api/src/modules/s3/s3.controller.ts` | Has both `POST /s3/upload` (Blob) and `POST /s3/signed-url` (S3) endpoints |
| `apps/api/src/modules/s3/s3.module.ts` | Registers both `S3Service` + `BlobService` |
| `apps/api/src/config/app.config.ts` | `config.blob.token` reads `BLOB_READ_WRITE_TOKEN` |
| `apps/web/src/hooks/use-upload.ts` | Sends file as FormData to `/api/v1/s3/upload` |
| `apps/web/src/sections/merchant/merchant-profile/merchant-profile-information-tab.tsx` | Inline upload → FormData to `/api/v1/s3/upload` |
| `apps/web/src/sections/merchant/merchant-drop-sheet.tsx` | Inline upload → FormData to `/api/v1/s3/upload` |

---

## Target State (Permanent — S3/MinIO Presigned URLs)

Upload flow: Client requests presigned URL from `POST /api/v1/s3/signed-url` → Client PUTs file directly to S3 → saves `publicUrl`.

The S3 presigned URL endpoint already exists and is fully wired. `S3Service` uses `minio` package with `config.s3`.

---

## Revert Steps

### 1. API Changes

#### Delete `blob.service.ts`
```bash
rm apps/api/src/modules/s3/blob.service.ts
```

#### Update `s3.controller.ts`
Remove: `POST /s3/upload` endpoint, `BlobService` injection, `FileInterceptor`, all multer-related imports.

Keep only the `POST /s3/signed-url` endpoint. Controller should look like:

```typescript
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { S3Service } from "./s3.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GetSignedUrlDto } from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";

@ApiTags("S3")
@Controller("s3")
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post("signed-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate presigned URL for file upload" })
  @ApiResponse({ status: 201, type: SignedUrlResponseDto })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @HttpCode(HttpStatus.CREATED)
  async getSignedUrl(
    @Body() dto: GetSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    return this.s3Service.generateSignedUrl(
      dto.namespace,
      dto.fileName,
      dto.contentType,
      dto.size,
    );
  }
}
```

#### Update `s3.module.ts`
Remove `BlobService` from providers and exports:

```typescript
import { Module } from "@nestjs/common";
import { S3Service } from "./s3.service";
import { S3Controller } from "./s3.controller";

@Module({
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
```

#### Remove from `app.config.ts`
Delete the `blob` config block:
```typescript
// DELETE THIS:
blob: {
  token: e.BLOB_READ_WRITE_TOKEN ?? "",
},
```

#### Remove dependency
```bash
cd apps/api && pnpm remove @vercel/blob @types/multer
```

### 2. Web Changes

All three upload locations need to revert from 1-step multipart to 2-step presigned URL flow.

#### `apps/web/src/hooks/use-upload.ts`

Replace FormData upload with presigned URL flow:
1. `POST /api/v1/s3/signed-url` with `{ fileName, contentType, size, namespace }` (JSON)
2. `PUT` file to returned `url`
3. Return `publicUrl`

Response shape from signed-url endpoint: `{ url: string, publicUrl: string }`

#### `merchant-profile-information-tab.tsx` and `merchant-drop-sheet.tsx`

Same pattern — replace:
```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("namespace", "merchants");
const uploadRes = await apiFetchMaybeRetry("POST", "/api/v1/s3/upload", {
  auth: "merchant", body: formData, json: false,
});
const { publicUrl } = await uploadRes.json();
```

With:
```typescript
const signedUrlRes = await apiFetchMaybeRetry("POST", "/api/v1/s3/signed-url", {
  auth: "merchant",
  body: { fileName: file.name, contentType: file.type, size: file.size, namespace: "merchants" },
});
const { url, publicUrl } = await signedUrlRes.json();
await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
// publicUrl is ready to save
```

### 3. Environment

- Remove `BLOB_READ_WRITE_TOKEN` from `.env` and `.env.example`
- Ensure S3 env vars are set: `S3_HOST`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_DEFAULT_BUCKET`, `S3_SUB_PATH`, `S3_PUBLIC_URL`, `S3_REGION`

### 4. Verify

```bash
cd apps/api && pnpm typecheck
cd apps/web && pnpm typecheck
```

### 5. Data Migration (if needed)

Files already uploaded to Vercel Blob will have URLs like `https://*.public.blob.vercel-storage.com/...`. These URLs remain accessible even after switching. If you want to migrate existing images to S3, you'll need a script to download from Blob URLs and re-upload to S3, then update `logoUrl` fields in MongoDB.
