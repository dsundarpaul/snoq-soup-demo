# SouqSnap V2 — Complete Rewrite Plan

## Table of Contents
1. [Product Definition](#1-product-definition)
2. [Architecture Overview](#2-architecture-overview)
3. [Backend Design (NestJS + Mongoose)](#3-backend-design)
4. [Frontend Design (Next.js)](#4-frontend-design)
5. [Database Schema Design](#5-database-schema-design)
6. [Validation Strategy](#6-validation-strategy)
7. [Security Design](#7-security-design)
8. [AR & Geolocation](#8-ar--geolocation)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Product Definition

### Purpose
SouqSnap is a **location-based AR rewards platform** for the Saudi Arabian market. Merchants create geolocation-based reward "drops" that customers discover and claim through an AR camera experience. The platform bridges physical retail and digital engagement.

**Tagline**: Hunt. Claim. Reward.

### Core Features
1. **Drop Management** — Merchants create location-based reward drops with GPS coordinates, radius, reward value, and availability rules
2. **AR Hunt Mode** — Customers use their phone camera to find and claim nearby drops through an immersive overlay experience
3. **Voucher System** — Claimed rewards become vouchers with QR codes, magic links, timer-based redemption windows, and promo code assignment
4. **QR Scanning** — Merchants and staff scan customer vouchers for redemption via authenticated or token-based scanner
5. **Analytics Dashboard** — Merchants view claims, redemptions, conversion rates, and performance metrics
6. **Platform Administration** — Super admins manage all merchants, drops, users, and platform-wide analytics
7. **Bilingual Support** — Full English/Arabic with RTL layout
8. **PWA** — Installable as a Progressive Web App with offline capabilities

### User Roles & Workflows

| Role | Authentication | Primary Workflow |
|------|---------------|-----------------|
| **Hunter** (Customer) | Device ID + optional email/password signup | Browse drops → AR hunt → Claim voucher → Share/redeem |
| **Merchant** | Email/password with email verification | Register → Verify email → Create drops → Manage analytics → Scan/redeem vouchers |
| **Staff** | Token-based (no login) | Open scanner link → Scan QR → Redeem voucher |
| **Platform Admin** | Email/password | Login → Manage merchants/drops/users → View platform analytics |

### AR Capabilities (Web Experience)
The AR experience uses a **camera-overlay approach** (not WebXR/A-Frame):
- Rear camera feed as full-screen backdrop
- CSS-positioned 3D coin overlays that scale/translate based on distance and compass bearing
- Device orientation (compass) integration for directional guidance
- GPS-based proximity detection for claim eligibility
- Capture animation (particle burst) on successful claim
- Crosshair/directional arrows when target is off-screen

### Functional Requirements

| ID | Requirement | Priority |
|----|------------|----------|
| FR-01 | Hunters can browse all active drops with distance calculation | P0 |
| FR-02 | Hunters can claim a drop when physically within GPS radius | P0 |
| FR-03 | Hunters receive a voucher with QR code upon claiming | P0 |
| FR-04 | Merchants can create, update, delete drops with location, reward, availability rules | P0 |
| FR-05 | Merchants can scan QR codes to redeem vouchers | P0 |
| FR-06 | Staff can redeem vouchers via token-based scanner links | P0 |
| FR-07 | Vouchers have redemption types: anytime, timer (X minutes), window (deadline) | P0 |
| FR-08 | Drops have availability types: unlimited, limited (capture limit) | P0 |
| FR-09 | Merchants can upload promo codes per drop, auto-assigned on claim | P1 |
| FR-10 | Hunters can share vouchers via email, WhatsApp, magic link | P1 |
| FR-11 | Merchants have a public store page at /store/:username | P1 |
| FR-12 | Full EN/AR bilingual support with RTL | P0 |
| FR-13 | Dark/light theme | P1 |
| FR-14 | PWA installable with service worker | P2 |
| FR-15 | Platform admin can manage all merchants, drops, users | P0 |
| FR-16 | Platform-wide and per-merchant analytics | P1 |
| FR-17 | Leaderboard for hunters | P2 |
| FR-18 | Drop scheduling with start/end times | P1 |
| FR-19 | AR camera hunt mode with 3D coin overlays | P0 |
| FR-20 | AR-based drop placement for merchants | P2 |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | API response time (p95) | < 200ms |
| NFR-02 | Time to first byte (Next.js) | < 500ms |
| NFR-03 | Concurrent users supported | 1,000+ |
| NFR-04 | File upload max size | 5MB |
| NFR-05 | JWT access token lifetime | 15 minutes |
| NFR-06 | JWT refresh token lifetime | 7 days |
| NFR-07 | Password hashing | bcrypt, 12 rounds |
| NFR-08 | All API endpoints validated with DTOs | 100% |
| NFR-09 | HTTPS enforced in production | Yes |
| NFR-10 | Rate limiting on auth endpoints | 5 attempts / 15 min |
| NFR-11 | Rate limiting on voucher claim | 10 claims / hour / device |
| NFR-12 | Lighthouse PWA score | > 90 |
| NFR-13 | Accessibility | WCAG AA |
| NFR-14 | Database query optimization | Indexed, paginated, aggregated |

---

## 2. Architecture Overview

### Monorepo Structure
```
SouqSnap/
├── apps/
│   ├── web/                      # Next.js 15 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (public)/
│   │   │   │   ├── (hunter)/
│   │   │   │   ├── (merchant)/
│   │   │   │   └── (admin)/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── providers/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                      # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   └── pipes/
│       │   ├── database/         # Global database module
│       │   │   ├── database.module.ts
│       │   │   ├── database.service.ts
│       │   │   └── schemas/
│       │   │       ├── merchant.schema.ts
│       │   │       ├── drop.schema.ts
│       │   │       ├── voucher.schema.ts
│       │   │       └── ...
│       │   └── modules/
│       │       ├── auth/
│       │       ├── merchants/
│       │       ├── drops/
│       │       ├── vouchers/
│       │       ├── hunters/
│       │       ├── admin/
│       │       ├── scanner/
│       │       ├── upload/
│       │       └── promo-codes/
│       │           └── dto/
│       │               ├── request/
│       │               └── response/
│       ├── nest-cli.json
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   ├── constants/
│       │   ├── validation/
│       │   └── utils/
│       └── package.json
│
├── turbo.json
├── package.json
└── .env.example
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | SSR, route groups for role separation, API routes for proxying |
| Frontend UI | shadcn/ui + Radix + Tailwind CSS | Same as V1, proven stack |
| Frontend State | TanStack React Query v5 | Same as V1, excellent server state management |
| Frontend Forms | React Hook Form + Zod | Same as V1 |
| Backend | NestJS 11 | Modular, scalable, TypeScript-first |
| Database | MongoDB via Mongoose 8 | Per requirements; geospatial indexes for location queries |
| Auth | Passport + JWT | Access token (15min) + refresh token (7d) for all roles |
| File Storage | MinIO (S3-compatible, self-hosted) | Presigned URL uploads, runs on VPS |
| Email | Nodemailer (SMTP) | Same as V1 |
| Messaging | Twilio WhatsApp API | Same as V1 |
| Maps | Leaflet + OpenStreetMap | Same as V1, consider Mapbox for production |
| QR | `qrcode` (gen) + `html5-qrcode` (scan) | Same as V1 |
| i18n | Custom context (same approach as V1) | 391 keys already translated; migrate as-is |
| Charts | Recharts | Same as V1 |
| Animations | Framer Motion + CSS | Same as V1 |
| Deployment | Vercel (web) + VPS (API + MongoDB + MinIO) | Per user decision |

### Communication Flow
```
[Next.js on Vercel] --HTTPS--> [NestJS on VPS] --Mongoose--> [MongoDB on VPS]
                                  |
                                  +--> [MinIO on VPS] (file uploads)
                                  +--> [SMTP Server] (emails)
                                  +--> [Twilio API] (WhatsApp)
```

---

## 3. Backend Design (NestJS + Mongoose)

### Project Structure
```
apps/api/src/
├── main.ts
├── app.module.ts
├── config/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── database/                    # Global database module
│   ├── database.module.ts
│   ├── database.service.ts      # Exports all models as properties
│   └── schemas/
│       ├── base.schema.ts
│       ├── merchant.schema.ts
│       ├── drop.schema.ts
│       ├── voucher.schema.ts
│       ├── hunter.schema.ts
│       ├── admin.schema.ts
│       ├── promo-code.schema.ts
│       └── refresh-token.schema.ts
└── modules/
    ├── auth/
    ├── merchants/
    ├── drops/
    ├── vouchers/
    ├── hunters/
    ├── admin/
    ├── scanner/
    ├── upload/
    └── promo-codes/
        ├── dto/
        │   ├── request/         # Request DTOs
        │   │   └── create-drop.dto.ts
        │   └── response/        # Response DTOs
        │       └── list-response.dto.ts
        ├── promo-codes.module.ts
        ├── promo-codes.controller.ts
        └── promo-codes.service.ts
```

### Database Module (Global)

The database module is a global module that centralizes all Mongoose schemas and exposes models via `DatabaseService`.

**Pattern:**
```typescript
// database.service.ts
@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(Merchant.name) readonly merchants: Model<Merchant>,
    @InjectModel(Drop.name) readonly drops: Model<Drop>,
    @InjectModel(Voucher.name) readonly vouchers: Model<Voucher>,
    @InjectModel(Hunter.name) readonly hunters: Model<Hunter>,
    @InjectModel(Admin.name) readonly admins: Model<Admin>,
    @InjectModel(PromoCode.name) readonly promoCodes: Model<PromoCode>,
    @InjectModel(RefreshToken.name) readonly refreshTokens: Model<RefreshToken>,
  ) {}
}
```

**Usage in Services:**
```typescript
@Injectable()
export class DropsService {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string) {
    return this.database.drops.findById(id).lean();
  }

  async findActive() {
    return this.database.drops.find(
      { active: true },
      null,
      { limit: 50, sort: { createdAt: -1 } }
    ).lean();
  }
}
```

### Schema as Single Source of Truth

Schemas are decorated with:
- `@nestjs/mongoose` — database layer
- `@nestjs/swagger` — API documentation
- `class-validator` — validation

**Example:**
```typescript
// schemas/merchant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

@Schema({ timestamps: true })
export class Merchant {
  @ApiProperty({ example: 'merchant@example.com' })
  @IsEmail()
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Prop({ required: true, select: false })
  password: string;
}

export const MerchantSchema = SchemaFactory.createForClass(Merchant);
```

### DTO Strategy

**Location Rule:**
- Request DTOs: `src/modules/{module}/dto/request/*.dto.ts`
- Response DTOs: `src/modules/{module}/dto/response/*.dto.ts`

**List Response (Shared):**
```typescript
// dto/response/list-response.dto.ts
export class ListResponseDto<T> {
  @ApiProperty({ isArray: true })
  results: T[];

  @ApiProperty()
  total: number;
}
```

**Extending from Schema:**
```typescript
// dto/request/create-merchant.dto.ts
import { OmitType } from '@nestjs/swagger';
import { Merchant } from '../../../database/schemas/merchant.schema';

export class CreateMerchantDto extends OmitType(Merchant, ['_id', 'createdAt', 'updatedAt'] as const) {}
```

### Swagger Requirements

All controllers must have:
- `@ApiTags('Name')` at class level
- `@ApiOperation({ summary: '...' })` per method
- `@ApiResponse({ status: 200, type: Dto })` per method
- `@ApiBearerAuth()` for protected routes

### Response Format

Return objects directly. No wrapping.
```typescript
// CORRECT
return drop;

// INCORRECT
return { success: true, data: drop };
```

### Query Patterns

Use query options in find methods. Never chain `.limit()`, `.sort()`, or `.exec()`.
```typescript
// CORRECT
await this.database.drops.find(
  { active: true },
  null,
  { limit: 20, sort: { createdAt: -1 } }
).lean();

// FORBIDDEN
await this.database.drops.find({ active: true }).limit(20).sort({ createdAt: -1 }).exec();
```

### Module Endpoints

#### `AuthModule`
```
POST   /auth/merchant/register
POST   /auth/merchant/login
POST   /auth/merchant/verify-email/:token
POST   /auth/merchant/resend-verification
POST   /auth/merchant/forgot-password
POST   /auth/merchant/reset-password/:token

POST   /auth/hunter/register
POST   /auth/hunter/login
POST   /auth/hunter/forgot-password
POST   /auth/hunter/reset-password/:token

POST   /auth/admin/login

POST   /auth/refresh
POST   /auth/logout
```

#### `MerchantsModule`
```
GET    /merchants/me
PATCH  /merchants/me
PATCH  /merchants/me/logo
POST   /merchants/me/scanner-token
GET    /merchants/me/scanner-token
GET    /merchants/:username/public    (public store page data)
```

#### `DropsModule`
```
GET    /drops/active?lat=X&lng=X&radius=X    (public, geospatial)
GET    /drops/:id                              (public)

# Merchant-scoped (require merchant role + ownership)
GET    /merchants/me/drops
POST   /merchants/me/drops
PATCH  /merchants/me/drops/:id
DELETE /merchants/me/drops/:id

# Admin-scoped
GET    /admin/drops
POST   /admin/drops
PATCH  /admin/drops/:id
DELETE /admin/drops/:id
```

#### `VouchersModule`
```
POST   /vouchers/claim                  (public, deviceId required)
POST   /vouchers/redeem                 (merchant or scanner token required)
GET    /vouchers/magic/:token           (public, token-gated)
POST   /vouchers/send-email             (authenticated hunter or public with voucher ownership)
POST   /vouchers/send-whatsapp          (authenticated hunter or public with voucher ownership)
GET    /vouchers/:id/promo-code         (magic token required)
```

#### `HuntersModule`
```
GET    /hunters/me                      (authenticated or device ID)
GET    /hunters/me/history              (authenticated or device ID)
PATCH  /hunters/me/profile              (authenticated)
PATCH  /hunters/me/nickname             (authenticated)
GET    /leaderboard?limit=50            (public)
```

#### `PromoCodesModule`
```
POST   /merchants/me/drops/:dropId/codes
GET    /merchants/me/drops/:dropId/codes
DELETE /merchants/me/drops/:dropId/codes
```

#### `ScannerModule`
```
GET    /scanner/:token/validate
POST   /scanner/:token/redeem
```

#### `UploadModule`
```
POST   /upload/presign                  (authenticated)
GET    /upload/:key                     (public or authenticated depending on config)
```

#### `AdminModule`
```
GET    /admin/stats
GET    /admin/analytics
GET    /admin/merchants
PATCH  /admin/merchants/:id
GET    /admin/users
POST   /admin/setup                     (one-time, disabled after first admin)
```

---

## 4. Frontend Design

### Next.js App Router Structure

```
src/app/
├── layout.tsx                    # Root layout (providers, fonts, global styles)
├── (public)/                     # Public route group (no auth required)
│   ├── page.tsx                  # Home — active drops list
│   ├── welcome/page.tsx          # Landing page
│   ├── store/[username]/page.tsx # Merchant public store
│   ├── drop/[id]/page.tsx        # Drop detail page
│   ├── voucher/[token]/page.tsx  # Magic link voucher view
│   └── leaderboard/page.tsx      # Hunter leaderboard
│
├── (hunter)/                     # Hunter route group
│   ├── layout.tsx                # Hunter layout (bottom nav, auth check)
│   ├── hunt/page.tsx             # AR game page
│   ├── history/page.tsx          # Claim history
│   ├── profile/page.tsx          # Hunter profile
│   └── vouchers/page.tsx         # My vouchers
│
├── (merchant)/                   # Merchant dashboard route group
│   ├── layout.tsx                # Merchant layout (sidebar, auth guard)
│   ├── login/page.tsx            # Merchant login
│   ├── signup/page.tsx           # Merchant registration
│   ├── dashboard/                # Dashboard with tabs
│   │   ├── page.tsx              # Overview/stats
│   │   ├── drops/page.tsx        # Drop management
│   │   ├── analytics/page.tsx    # Analytics
│   │   ├── scanner/page.tsx      # QR scanner
│   │   └── settings/page.tsx     # Account settings, scanner tokens
│   ├── verify-email/[token]/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/[token]/page.tsx
│
├── (admin)/                      # Platform admin route group
│   ├── layout.tsx                # Admin layout (sidebar, admin auth guard)
│   ├── login/page.tsx            # Admin login
│   └── dashboard/                # Admin dashboard with tabs
│       ├── page.tsx              # Overview/stats
│       ├── merchants/page.tsx    # Merchant management
│       ├── drops/page.tsx        # Drop management
│       ├── users/page.tsx        # User management
│       └── analytics/page.tsx    # Platform analytics
│
├── scan/                         # Scanner routes
│   ├── page.tsx                  # Merchant scanner (authenticated)
│   └── [token]/page.tsx          # Staff scanner (token-based)
│
├── (auth)/                       # Auth pages
│   ├── hunter/
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   └── ...
│
└── not-found.tsx                 # 404 page
```

### Component Architecture

```
src/components/
├── ui/                           # shadcn/ui components (same as V1, 47 components)
├── ar/                           # AR-related components
│   ├── ar-camera-view.tsx        # Camera feed + 3D coin overlay
│   ├── ar-drop-placer.tsx        # Merchant AR drop placement
│   ├── capture-animation.tsx     # Particle burst on claim
│   └── compass-indicator.tsx     # Directional arrow indicator
├── vouchers/                     # Voucher-related components
│   ├── voucher-display.tsx       # QR code + card + timer
│   ├── voucher-share-dialog.tsx  # Email/WhatsApp/share options
│   └── promo-code-display.tsx    # Promo code reveal
├── drops/                        # Drop-related components
│   ├── drop-card.tsx             # Drop card for listing
│   ├── drop-form.tsx             # Create/edit drop form
│   └── drop-status-badge.tsx     # Active/expired/full badge
├── scanner/                      # Scanner components
│   ├── qr-scanner.tsx            # Reusable QR scanner (shared by merchant + staff)
│   └── scan-result.tsx           # Redemption result display
├── maps/                         # Map components
│   └── map-picker.tsx            # Leaflet location picker
├── layout/                       # Layout components
│   ├── hunter-nav.tsx            # Bottom navigation for hunters
│   ├── merchant-sidebar.tsx      # Sidebar for merchant dashboard
│   └── admin-sidebar.tsx         # Sidebar for admin dashboard
├── upload/                       # Upload components
│   └── file-upload.tsx           # Lightweight file upload (replace Uppy)
├── language-toggle.tsx
├── theme-toggle.tsx
└── pwa-install-prompt.tsx
```

### Key Frontend Patterns

**1. API Client (centralized in `lib/api-client.ts`)**
```typescript
// JWT-aware fetch wrapper
class ApiClient {
  private accessToken: string | null = null;

  async request<T>(method: string, url: string, data?: unknown): Promise<T> {
    // Auto-attach Authorization header
    // On 401: attempt token refresh, then retry
    // On refresh failure: redirect to login
  }
}

export const api = new ApiClient();
```

**2. Auth State (React Context + React Query)**
```typescript
// providers/auth-provider.tsx
// - Stores access/refresh tokens in memory (NOT localStorage for access token)
// - Refresh token in httpOnly cookie (set by backend) OR secure localStorage
// - Provides: user, role, isAuthenticated, login, logout
// - Auto-refreshes token before expiry
```

**3. Route Guards (Next.js Middleware)**
```typescript
// middleware.ts
// - Checks JWT validity for (merchant), (admin), (hunter) route groups
// - Redirects unauthenticated users to appropriate login page
// - Role-based redirect (merchant can't access admin routes)
```

**4. React Query Patterns**
```typescript
// lib/queries/drops.ts — co-located query hooks and keys
export const dropKeys = {
  all: ['drops'] as const,
  active: (lat: number, lng: number) => [...dropKeys.all, 'active', lat, lng] as const,
  detail: (id: string) => [...dropKeys.all, 'detail', id] as const,
};

export function useActiveDrops(lat: number, lng: number) {
  return useQuery({ queryKey: dropKeys.active(lat, lng), queryFn: () => api.get(...) });
}
```

**5. i18n (migrated as-is from V1)**
```typescript
// Same custom LanguageContext approach
// Migrate all 391 keys from V1
// Add new keys for any new features
```

---

## 5. Database Schema Design

### Migration: PostgreSQL → MongoDB

Key changes from V1:
- UUIDs → MongoDB ObjectIds (with optional `legacyId` for migration)
- Flat relational tables → Mongoose schemas with subdocuments where appropriate
- No indexes → Comprehensive indexing strategy
- No audit fields → `createdAt`, `updatedAt`, `deletedAt` on all collections
- Float lat/lng → GeoJSON `Point` with `2dsphere` index
- Text enums → Mongoose enum with validation
- No soft delete → `deletedAt` field with query filters

### Collections

#### `merchants`
```typescript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  businessName: { type: String, required: true, trim: true },
  logoUrl: { type: String, default: null },

  emailVerified: { type: Boolean, default: false },
  emailVerification: {
    token: { type: String, sparse: true },
    expiresAt: { type: Date },                 // NEW: V1 has no expiry
  },

  passwordReset: {                              // NEW: subdocument (V1 has flat fields)
    token: { type: String, sparse: true },
    expiresAt: { type: Date },
  },

  scannerToken: {
    token: { type: String, sparse: true },      // NEW: hashed, full UUID
    createdAt: { type: Date },                   // NEW: track when generated
  },

  loginAttempts: { type: Number, default: 0 },  // NEW: for account lockout
  lockUntil: { type: Date },                    // NEW: for account lockout

  deletedAt: { type: Date, default: null },     // NEW: soft delete
},
{ timestamps: true }

// Indexes:
// { email: 1 }, unique
// { username: 1 }, unique
// { "emailVerification.token": 1 }, sparse
// { "passwordReset.token": 1 }, sparse
// { "scannerToken.token": 1 }, sparse
// { deletedAt: 1 }
```

#### `drops`
```typescript
{
  _id: ObjectId,
  merchantId: { type: ObjectId, ref: 'Merchant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },

  location: {                                   // NEW: GeoJSON Point (replaces flat lat/lng)
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },  // [longitude, latitude]
  },
  radius: { type: Number, required: true, min: 5, max: 1000, default: 15 },

  rewardValue: { type: String, required: true, trim: true },
  logoUrl: { type: String, default: null },

  redemption: {                                 // NEW: subdocument
    type: { type: String, enum: ['anytime', 'timer', 'window'], required: true, default: 'anytime' },
    minutes: { type: Number, min: 1 },          // for 'timer' type
    deadline: { type: Date },                    // for 'window' type
  },

  availability: {                               // NEW: subdocument
    type: { type: String, enum: ['unlimited', 'limited'], required: true, default: 'unlimited' },
    limit: { type: Number, min: 1 },            // for 'limited' type
  },

  schedule: {                                   // NEW: subdocument
    start: { type: Date },
    end: { type: Date },
  },

  active: { type: Boolean, default: true },

  deletedAt: { type: Date, default: null },
},
{ timestamps: true }

// Indexes:
// { location: '2dsphere' }                      — geospatial queries
// { merchantId: 1, active: 1 }                  — merchant's active drops
// { active: 1, 'schedule.start': 1, 'schedule.end': 1 }  — active drop time filtering
// { deletedAt: 1 }
```

#### `vouchers`
```typescript
{
  _id: ObjectId,
  dropId: { type: ObjectId, ref: 'Drop', required: true, index: true },
  merchantId: { type: ObjectId, ref: 'Merchant', required: true, index: true },

  magicToken: { type: String, required: true, unique: true },   // NEW: unique constraint added

  claimedBy: {                                  // NEW: subdocument
    deviceId: { type: String, index: true },
    hunterId: { type: ObjectId, ref: 'Hunter' },
    email: { type: String },
    phone: { type: String },
  },

  claimedAt: { type: Date, default: Date.now },
  redeemedAt: { type: Date, default: null },
  redeemed: { type: Boolean, default: false },
  redeemedBy: {                                // NEW: audit who redeemed
    type: { type: String, enum: ['merchant', 'scanner'] },
    id: { type: String },                      // merchantId or scanner token
  },

  deletedAt: { type: Date, default: null },
},
{ timestamps: true }

// Indexes:
// { magicToken: 1 }, unique
// { dropId: 1 }
// { merchantId: 1, redeemed: 1 }
// { 'claimedBy.deviceId': 1 }
// { 'claimedBy.hunterId': 1 }
// { claimedAt: -1 }
// { deletedAt: 1 }
```

#### `hunters`
```typescript
{
  _id: ObjectId,
  deviceId: { type: String, required: true, unique: true },
  nickname: { type: String, trim: true },

  // Optional account fields (for cross-device sync)
  email: { type: String, sparse: true, unique: true, lowercase: true },
  password: { type: String, select: false },

  profile: {                                    // NEW: subdocument
    dateOfBirth: { type: Date },                // NEW: Date type instead of text
    gender: { type: String, enum: ['male', 'female', 'other'] },
    mobile: {
      countryCode: { type: String },
      number: { type: String },
    },
  },

  passwordReset: {                              // NEW: subdocument
    token: { type: String, sparse: true },
    expiresAt: { type: Date },
  },

  stats: {                                      // NEW: subdocument (denormalized counters)
    totalClaims: { type: Number, default: 0 },
    totalRedemptions: { type: Number, default: 0 },
  },

  deletedAt: { type: Date, default: null },
},
{ timestamps: true }

// Indexes:
// { deviceId: 1 }, unique
// { email: 1 }, sparse, unique
// { 'stats.totalClaims': -1 }                  — leaderboard
// { deletedAt: 1 }
```

#### `admins`
```typescript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true },

  loginAttempts: { type: Number, default: 0 },  // NEW
  lockUntil: { type: Date },                    // NEW

  deletedAt: { type: Date, default: null },
},
{ timestamps: true }

// Indexes:
// { email: 1 }, unique
```

#### `promo_codes`
```typescript
{
  _id: ObjectId,
  dropId: { type: ObjectId, ref: 'Drop', required: true },
  merchantId: { type: ObjectId, ref: 'Merchant', required: true },
  code: { type: String, required: true, trim: true },
  status: { type: String, enum: ['available', 'assigned'], default: 'available' },
  voucherId: { type: ObjectId, ref: 'Voucher', default: null },
  assignedAt: { type: Date, default: null },

  deletedAt: { type: Date, default: null },
},
{ timestamps: true }

// Indexes:
// { dropId: 1, status: 1 }                     — for atomic assignment
// { dropId: 1, code: 1 }, unique               — unique code per drop
// { voucherId: 1 }, sparse
// { merchantId: 1 }
// { deletedAt: 1 }
```

#### `refresh_tokens` (NEW collection)
```typescript
{
  _id: ObjectId,
  userId: { type: ObjectId, required: true, index: true },
  userType: { type: String, enum: ['merchant', 'hunter', 'admin'], required: true },
  token: { type: String, required: true, unique: true },  // hashed refresh token
  family: { type: String, required: true },               // NEW: for reuse detection
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
},
{ timestamps: true }

// Indexes:
// { token: 1 }, unique
// { userId: 1, userType: 1 }
// { expiresAt: 1 }, TTL (auto-delete expired tokens)
```

---

## 6. Validation Strategy

### Three-Layer Validation

#### Layer 1: DTO Validation (Backend — Zod via NestJS Pipes)

Every endpoint has a corresponding Zod-validated DTO. DTOs live in `packages/shared/src/validation/` so they can be reused on the frontend.

**Auth DTOs:**
```typescript
// shared/validation/auth.ts
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const merchantRegisterSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/[A-Z]/, 'At least one uppercase').regex(/[0-9]/, 'At least one number'),
  businessName: z.string().min(2).max(100),
});

export const hunterRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  deviceId: z.string().min(1),
  nickname: z.string().min(2).max(20).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords must match' });
```

**Drop DTOs:**
```typescript
// shared/validation/drop.ts
export const createDropSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(5).max(1000).default(15),
  rewardValue: z.string().min(1).max(100),
  logoUrl: z.string().url().optional().nullable(),
  redemption: z.object({
    type: z.enum(['anytime', 'timer', 'window']),
    minutes: z.number().min(1).max(1440).optional(),    // max 24 hours
    deadline: z.date().optional(),
  }).refine(d => {
    if (d.type === 'timer') return d.minutes !== undefined;
    if (d.type === 'window') return d.deadline !== undefined;
    return true;
  }),
  availability: z.object({
    type: z.enum(['unlimited', 'limited']),
    limit: z.number().min(1).max(100000).optional(),
  }).refine(d => d.type !== 'limited' || d.limit !== undefined),
  schedule: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).refine(d => !d.start || !d.end || d.end > d.start).optional(),
  active: z.boolean().default(true),
});

export const updateDropSchema = createDropSchema.partial();
```

**Voucher DTOs:**
```typescript
// shared/validation/voucher.ts
export const claimVoucherSchema = z.object({
  dropId: z.string().min(1),
  deviceId: z.string().min(1),
  hunterId: z.string().optional(),
});

export const redeemVoucherSchema = z.object({
  voucherId: z.string().min(1),
  magicToken: z.string().min(1),       // NEW: require magic token for verification
});

export const sendVoucherEmailSchema = z.object({
  email: z.string().email(),
  voucherId: z.string().min(1),
  magicLink: z.string().url(),
});

export const sendVoucherWhatsAppSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),  // E.164 format
  voucherId: z.string().min(1),
  magicLink: z.string().url(),
});
```

**Hunter DTOs:**
```typescript
// shared/validation/hunter.ts
export const updateHunterProfileSchema = z.object({
  nickname: z.string().min(2).max(20).optional(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  mobileCountryCode: z.string().max(5).optional(),
  mobileNumber: z.string().regex(/^\d{7,15}$/).optional(),
});
```

**Pagination DTO:**
```typescript
// shared/validation/common.ts
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

#### Layer 2: Access Control Validation (Guards)

| Guard | Purpose | Applied To |
|-------|---------|-----------|
| `JwtAuthGuard` | Validates JWT access token, attaches user to request | All protected routes |
| `RolesGuard` | Checks `user.role` matches `@Roles()` decorator | Merchant routes, admin routes |
| `DeviceGuard` | Validates `deviceId` parameter exists, auto-creates hunter if needed | Hunter routes |
| `OwnershipGuard` | Verifies resource belongs to authenticated user | Drop mutations, promo code operations |
| `Public()` decorator | Skips auth entirely | Active drops, store pages, claim |

#### Layer 3: Business Logic Validation (Services)

| Validation | Location | Description |
|-----------|----------|-------------|
| Drop within capture limit | `VouchersService.claim()` | Atomic `findOneAndUpdate` to check and increment counter |
| Drop schedule active | `VouchersService.claim()` | Check `schedule.start <= now <= schedule.end` |
| Drop is active | `VouchersService.claim()` | Check `drop.active === true` |
| Device hasn't already claimed this drop | `VouchersService.claim()` | Check no existing voucher for this `deviceId` + `dropId` |
| Voucher not already redeemed | `VouchersService.redeem()` | Check `voucher.redeemed === false` |
| Redemption within time window | `VouchersService.redeem()` | Check timer/deadline constraints |
| Voucher belongs to merchant | `VouchersService.redeem()` | Check `voucher.merchantId === merchant.id` |
| Promo code available | `PromoCodesService.assign()` | Atomic `findOneAndUpdate({ status: 'available' })` |
| Email not already registered | `AuthService.register()` | Unique constraint + pre-check |
| Account lockout (5 failed attempts) | `AuthService.login()` | Check `lockUntil`, increment `loginAttempts` |
| Scanner token valid and not expired | `ScannerService.validate()` | Check token exists and `createdAt` within 24h |

### Validation Gap Analysis (V1 → V2)

| V1 Gap | V2 Fix |
|--------|--------|
| No password complexity | Min 8 chars, 1 uppercase, 1 number |
| No email format validation on send-email/send-whatsapp | Zod `.email()` and `.regex()` for phone |
| No Zod on drop update (PATCH) | `updateDropSchema` partial validation |
| No Zod on admin drop CRUD | Same schemas, applied via admin controller |
| No lat/lng bounds checking | `.min(-90).max(90)` and `.min(-180).max(180)` |
| No capture limit overflow check | `.min(1).max(100000)` |
| No promo code uniqueness per drop | Compound unique index `{ dropId: 1, code: 1 }` |
| No leaderboard limit bounds | `paginationSchema` with `.max(100)` |
| No logo URL validation | `.string().url()` + optional domain whitelist |
| No phone number format validation | E.164 regex |
| No rate limiting | NestJS `@nestjs/throttler` module |
| No CSRF protection | JWT in Authorization header (not cookies) is CSRF-safe |
| No voucher claim per-device limit | Business logic check in `VouchersService` |
| No magic token expiry | Configurable TTL (default: 30 days) |
| No scanner token expiry | Auto-expire after 24 hours |

---

## 7. Security Design

### Authentication Flow (JWT)

```
┌──────────┐  POST /auth/login  ┌──────────┐  Verify credentials  ┌─────────┐
│  Client   │ ──────────────────>│   API     │ ────────────────────>│ MongoDB │
│          │  {email, password} │          │  Find user, compare  │         │
│          │ <──────────────────│          │ <────────────────────│         │
│          │  {accessToken,     │          │  Generate JWT pair   │         │
│          │   refreshToken}    │          │  Store refresh hash  │         │
└──────────┘                    └──────────┘                      └─────────┘
     │
     │  Authorization: Bearer <accessToken>
     │  (on every API request)
     │
     │  POST /auth/refresh
     │  {refreshToken}
     │ ──────────────────> Verify refresh token
     │ <────────────────── Issue new pair, revoke old
```

**Token details:**
- Access token: 15 min expiry, contains `{ sub: userId, role, iat, exp }`
- Refresh token: 7 day expiry, stored hashed in `refresh_tokens` collection
- Refresh token rotation: new refresh issued on every refresh, old revoked
- Reuse detection: if a revoked refresh token is used, invalidate entire token family

### Account Lockout
- 5 failed login attempts → account locked for 2 hours
- `loginAttempts` and `lockUntil` fields on merchant and admin schemas
- Successful login resets `loginAttempts` to 0

### Rate Limiting (via `@nestjs/throttler`)
| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Login (all roles) | 5 requests | 15 minutes per IP |
| Register | 3 requests | 60 minutes per IP |
| Forgot password | 3 requests | 15 minutes per IP |
| Voucher claim | 10 claims | 60 minutes per device |
| Scanner validate | 20 requests | 5 minutes per IP |
| General API | 100 requests | 1 minute per IP |
| Upload presign | 10 requests | 5 minutes per user |

### Security Headers
- `Helmet` middleware for security headers
- `Content-Security-Policy` configured for known domains
- `X-Request-ID` for request tracing

### Input Sanitization
- All string inputs trimmed via Zod `.trim()`
- HTML content sanitized via `sanitize-html` before storage
- MongoDB query sanitizer middleware to prevent NoSQL injection

### File Upload Security
- Authentication required for presigned URL generation
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
- Max file size: 5MB
- Virus scanning: optional ClamAV integration

### Admin Setup Security
- One-time setup endpoint disabled after first admin created
- Flag stored in a `system_config` collection: `{ key: 'admin_initialized', value: true }`
- Setup requires `ADMIN_SETUP_KEY` env var match

### V1 Critical Issues → V2 Fixes

| V1 Issue | V2 Fix |
|----------|--------|
| Hardcoded session secret | Fail to start if `JWT_SECRET` is unset |
| Plaintext password fallback | Removed entirely; all passwords bcrypt-hashed via Mongoose pre-save hook |
| Plaintext demo password | No demo data seeding in production |
| Email verification bypassed | Email verification required before merchant actions |
| Public voucher redemption | Requires merchant auth or valid scanner token + magic token |
| Unauthenticated file uploads | Requires authentication |
| No rate limiting | `@nestjs/throttler` on all endpoints |
| Full response body logging | Structured logging with no sensitive data |
| Device ID spoofing | JWT for hunters + device ID as secondary identifier |
| No session invalidation on password change | All refresh tokens revoked on password change |
| Error message info leakage | Generic error messages in production, detailed in development |
| No HTTPS enforcement | NestJS `app.enableCors()` + reverse proxy TLS termination |

---

## 8. AR & Geolocation

### AR Camera Overlay (replacing A-Frame)

The V2 AR experience uses the **camera-overlay approach** from V1's `ar-drop-placer.tsx`, refined and production-ready:

**Components:**
1. `ARCameraView` — Full-screen rear camera feed as backdrop
2. `ARCoinOverlay` — CSS 3D-transformed coin positioned by bearing + distance
3. `CompassIndicator` — Directional arrow when target is off-screen (>45°)
4. `CaptureAnimation` — Particle burst on successful claim
5. `ARDropPlacer` — Merchant-facing drop placement dialog

**Key improvements over V1:**
- Throttled device orientation events (15Hz instead of 60Hz)
- Compass smoothing with rolling average (last 5 readings)
- GPS accuracy threshold check (>50m accuracy = show warning, don't proceed)
- Proper camera stream cleanup via ref-based lifecycle
- Resize listener for `window.innerWidth` updates
- No CDN dependencies (A-Frame removed entirely)

**Shared utilities (in `packages/shared/src/utils/`):**
- `calculateDistance(lat1, lng1, lat2, lng2)` — Haversine formula
- `calculateBearing(lat1, lng1, lat2, lng2)` — Compass bearing
- `getAngleDifference(bearing, heading)` — Angle diff for direction arrows
- `calculateOffsetCoordinates(lat, lng, distance, bearing)` — Forward geodesic

### Geospatial Queries (MongoDB)

V1 loads ALL active drops into memory and filters in JavaScript. V2 uses MongoDB's `2dsphere` index:

```typescript
// DropsService.findActiveNearby()
const drops = await this.dropModel.aggregate([
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distance',
      maxDistance: maxRadius,
      spherical: true,
    }
  },
  { $match: { active: true, deletedAt: null } },
  { $match: { $or: [
    { 'schedule.start': null },
    { 'schedule.start': { $lte: new Date() } }
  ]}},
  { $match: { $or: [
    { 'schedule.end': null },
    { 'schedule.end': { $gte: new Date() } }
  ]}},
  { $lookup: {
    from: 'vouchers',
    localField: '_id',
    foreignField: 'dropId',
    as: 'voucherData'
  }},
  { $addFields: {
    captureCount: { $size: '$voucherData' },
    hasAvailability: {
      $cond: [
        { $eq: ['$availability.type', 'unlimited'] },
        true,
        { $lt: [{ $size: '$voucherData' }, '$availability.limit'] }
      ]
    }
  }},
  { $match: { hasAvailability: true } },
  { $sort: { distance: 1 } },
  { $limit: 50 },
]);
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Initialize monorepo with Turborepo using `pnpm dlx create-turbo@latest`
- [ ] Scaffold Next.js 15 app using `pnpm dlx create-next-app@latest` with App Router
- [ ] Scaffold NestJS app using `pnpm add -g @nestjs/cli` and `nest new api`
- [ ] Set up `packages/shared` with types, constants, Zod schemas
- [ ] Set up MongoDB connection with Mongoose
- [ ] Create all Mongoose schemas with indexes
- [ ] Configure ESLint, Prettier, TypeScript strict mode
- [ ] Set up MinIO on VPS for file storage
- [ ] Set up CI/CD pipeline (GitHub Actions)

**Scaffolding Rule:** Use official CLI commands to initialize apps. Do not manually write `package.json` files or create scaffolding files by hand. After initial scaffold, modify files and install additional dependencies as needed.

**Dependency Rule:** Do not pin specific versions in `package.json`. Install dependencies using `pnpm add package-name` (no version) to get the latest stable version. Only pin versions when there's a specific reason (known bugs, compatibility issues).

### Phase 2: Auth & Core Backend (Week 3-4)
- [ ] Implement `AuthModule` (JWT strategy, refresh tokens, guards)
- [ ] Implement `MerchantsModule` (register, login, profile, email verification)
- [ ] Implement `HuntersModule` (device-based creation, optional signup, profile)
- [ ] Implement `AdminModule` (login, one-time setup)
- [ ] Implement `ScannerModule` (token generation, validation)
- [ ] Add rate limiting, throttler, Helmet
- [ ] Add account lockout mechanism
- [ ] Write unit tests for auth flows

### Phase 3: Business Logic Backend (Week 5-6)
- [ ] Implement `DropsModule` (CRUD, geospatial queries)
- [ ] Implement `VouchersModule` (claim, redeem, share via email/WhatsApp)
- [ ] Implement `PromoCodesModule` (upload, atomic assignment)
- [ ] Implement `UploadModule` (MinIO presigned URLs)
- [ ] Add analytics aggregation pipelines
- [ ] Add pagination to all list endpoints
- [ ] Write integration tests for all modules

### Phase 4: Frontend Foundation (Week 7-8)
- [ ] Set up Next.js App Router with route groups
- [ ] Configure Tailwind CSS, shadcn/ui, fonts
- [ ] Implement auth provider, API client, token refresh
- [ ] Implement Next.js middleware for route guards
- [ ] Build layout components (hunter nav, merchant sidebar, admin sidebar)
- [ ] Migrate i18n system (all 391 keys)
- [ ] Migrate theme system (dark/light)
- [ ] Build shared components (drop-card, voucher-display, scanner)

### Phase 5: Frontend Pages (Week 9-10)
- [ ] Build public pages (home, welcome, store, leaderboard, drop detail)
- [ ] Build hunter pages (AR hunt, history, profile, vouchers)
- [ ] Build merchant dashboard (login, signup, drop CRUD, analytics, scanner, settings)
- [ ] Build admin dashboard (login, overview, merchants, drops, users, analytics)
- [ ] Build scanner pages (merchant scanner, staff scanner)
- [ ] Build auth pages (verify email, forgot/reset password)
- [ ] Build 404 page

### Phase 6: AR & PWA (Week 11)
- [ ] Build AR camera overlay components
- [ ] Build AR drop placement for merchants
- [ ] Implement capture animation
- [ ] Implement compass smoothing and GPS accuracy checks
- [ ] Set up service worker with Workbox
- [ ] Configure PWA manifest with proper icons
- [ ] Build PWA install prompt with iOS fallback

### Phase 7: Polish & Production (Week 12)
- [ ] End-to-end testing
- [ ] Performance audit (Lighthouse, bundle analysis)
- [ ] Security audit (OWASP checklist)
- [ ] Environment variable documentation
- [ ] Deployment setup (Vercel + VPS + MongoDB)
- [ ] Seed script for development data
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Error monitoring setup (Sentry or equivalent)

### Removed from V1
- **Pitch deck** — Dropped per decision
- **A-Frame/AR.js** — Replaced with camera overlay
- **Uppy uploader** — Replaced with lightweight custom upload
- **`users` table** — Legacy orphaned table, not migrated
- **Demo data seeder** — Removed from production, dev-only seed script
- **next-themes** — Was installed but unused in V1; use custom ThemeProvider
- **WebSocket (ws)** — Not needed for current features
- **Passport (passport-local)** — Replaced with JWT strategy
- **PPTXGenJS** — Pitch deck removed
- **Google Cloud Storage** — Replaced with MinIO

### Key Libraries to Migrate (Same as V1)
| Library | Notes |
|---------|-------|
| shadcn/ui (47 components) | Migrate as-is |
| TanStack React Query v5 | Same usage pattern |
| React Hook Form + Zod | Same, with shared schemas from `packages/shared` |
| Framer Motion | Same |
| Recharts | Same |
| Leaflet + react-leaflet | Same |
| qrcode + html5-qrcode | Same |
| Lucide React | Same |
| date-fns | Same |
| Nodemailer | Same |
| Twilio | Same |
| bcrypt | Increase from 10 to 12 rounds |
| clsx + tailwind-merge | Same |
