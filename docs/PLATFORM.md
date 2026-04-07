# SouqSnap Platform Documentation

## Overview

SouqSnap is a **Location-Based AR Rewards Platform** that connects merchants with treasure hunters (users) through gamified location-based voucher drops. The platform operates on a three-sided marketplace:

1. **Merchants** - Create and manage reward drops at physical locations
2. **Hunters** - Discover, claim, and redeem vouchers using the mobile app
3. **Admins** - Oversee platform operations and analytics

---

## Core Concepts

### Drops
A "Drop" is a location-based reward placed by a merchant at specific GPS coordinates. Key properties:

| Property | Description |
|----------|-------------|
| **Location** | GeoJSON Point with lat/lng coordinates |
| **Radius** | Capture radius (5-1000 meters, default 15m) |
| **Reward Value** | Text description of the reward (e.g., "50% OFF") |
| **Redemption Type** | `anytime`, `timer` (X minutes after claim), or `window` (deadline) |
| **Availability** | `unlimited` or `limited` (cap on total claims) |
| **Schedule** | Optional start/end time window for availability |
| **Active** | Boolean flag to enable/disable the drop |

### Vouchers
When a hunter claims a drop, a voucher is created:

- **Magic Token** - Unique cryptographically secure token (16-byte hex) for accessing the voucher
- **Claim Data** - Device ID, optional Hunter ID, email, phone
- **Redemption Status** - Tracks if/when redeemed and by whom (merchant or scanner)
- **QR Data** - Base64-encoded JSON with voucher ID, magic token, and drop ID for QR code generation

### Promo Codes
Merchants can attach promo codes to drops that get auto-assigned to vouchers on claim:
- Codes have `available` → `assigned` lifecycle
- First-in-first-out assignment
- Tied to specific vouchers for tracking

---

## User Types & Authentication

### 1. Hunters (End Users)
**Authentication Options:**
- **Device ID** - Anonymous access via unique device identifier (no registration required)
- **Email + Password** - Optional account creation for cross-device sync

**Key Features:**
- Browse active drops on map (geospatial query within radius)
- Claim drops (creates voucher)
- View voucher history and leaderboards
- Update profile (nickname, DOB, gender, mobile)

**Schema Highlights:**
```typescript
{
  deviceId: string (unique)
  nickname?: string
  email?: string (unique, sparse)
  password?: string (hashed, bcrypt 12 rounds)
  profile: { dateOfBirth, gender, mobile: { countryCode, number } }
  stats: { totalClaims, totalRedemptions }
}
```

### 2. Merchants
**Authentication:**
- Email + Password (bcrypt hashed)
- Account lockout after 5 failed attempts (2-hour lock)
- Email verification required (24-hour token expiry)

**Key Features:**
- Create/edit/delete drops
- View drop analytics (claims, redemptions, conversion rates)
- Generate scanner tokens for staff redemption
- Manage promo codes

**Schema Highlights:**
```typescript
{
  email: string (unique, lowercase)
  username: string (unique, lowercase) 
  password: string (hashed, select: false)
  businessName: string
  logoUrl?: string
  emailVerified: boolean
  emailVerification: { token, expiresAt }
  passwordReset: { token, expiresAt }
  scannerToken: { token, createdAt }
  loginAttempts: number
  lockUntil?: Date
}
```

### 3. Admins
**Authentication:**
- Email + Password with same lockout protection

**Key Features:**
- View platform-wide stats and analytics
- Manage all merchants and drops
- Time-series analytics (hourly/daily/weekly/monthly)
- User search and filtering

---

## Authentication System

### JWT Token Flow

```
Access Token  → 15-minute expiry
Refresh Token → 7-day expiry, stored hashed (SHA-256)
```

**Token Family Pattern:**
- Refresh tokens belong to a "family" (UUID)
- Token rotation on refresh (old revoked, new issued)
- **Token reuse detection** - If a revoked token is used, the entire family is revoked (security measure against theft)

**Login Flow:**
1. Credentials validated
2. Lockout check (max 5 attempts, 2-hour lock)
3. Tokens generated (access + refresh)
4. Refresh token stored hashed with family ID

### Guards & Authorization

| Guard | Purpose |
|-------|---------|
| `JwtAuthGuard` | Validates access token |
| `RolesGuard` | Checks user type (merchant/hunter/admin) |
| `OwnershipGuard` | Verifies resource belongs to user |
| `DeviceGuard` | Validates device ID for anonymous access |

---

## Key Workflows

### 1. Claiming a Voucher (Hunter)

```
1. Hunter opens app, sends GPS location
2. GET /drops/active?lat=X&lng=Y&radius=Z
   - Geospatial $geoNear query with 2dsphere index
   - Filters: active=true, within schedule, not deleted
3. Hunter taps drop within capture radius
4. POST /vouchers/claim
   - Validates drop availability
   - Checks: not already claimed by device, within capture limit
   - Creates voucher with magic token
   - Auto-assigns promo code if available
   - Increments hunter stats
5. Returns voucher with magic link for sharing
```

### 2. Redeeming a Voucher (Merchant/Scanner)

**Via Merchant Dashboard:**
```
1. Merchant scans QR code or enters voucher ID + magic token
2. POST /vouchers/redeem
3. Validates redemption constraints (timer/window rules)
4. Marks redeemed, records redeemer type/id
5. Increments hunter redemption stats
```

**Via Scanner Token (Staff):**
```
1. Merchant generates scanner token (24-hour expiry)
2. Staff access /scanner/:token page
3. Validate token GET /scanner/validate
4. Scan voucher QR → POST /scanner/redeem
5. Same validation as merchant redemption
```

### 3. Drop Availability Logic

A drop is available when ALL conditions are true:

1. `active === true`
2. `deletedAt === null`
3. Within schedule (if set):
   - Current time >= schedule.start (if set)
   - Current time <= schedule.end (if set)
4. Within availability limit (if `limited`):
   - Total claims < availability.limit
5. Within redemption schedule (if configured):
   - dayOfWeek check (if set)
   - startHour <= currentHour < endHour (if set)

---

## Analytics & Statistics

### Merchant Analytics

| Metric | Calculation |
|--------|-------------|
| Total Drops | Count by merchantId |
| Active Drops | active=true AND (no end OR end >= now) |
| Total Vouchers | Claims on merchant's drops |
| Redemption Rate | redeemedVouchers / totalVouchers × 100 |
| Avg Time to Redemption | Mean hours between claimedAt and redeemedAt |
| Drop Performance | Per-drop claims, redemptions, conversion rate |

### Admin Platform Analytics

Time-series aggregation supporting:
- Granularity: hourly, daily, weekly, monthly
- Metrics: merchantsOverTime, dropsOverTime, claimsOverTime, redemptionsOverTime, huntersOverTime
- Period: Configurable (default 30 days)

---

## Database Schema Comparison

### New API (MongoDB + Mongoose)

| Collection | Key Indexes |
|------------|-------------|
| `drops` | location: 2dsphere, merchantId + active, schedule dates |
| `merchants` | email (unique), username (unique), scannerToken (sparse) |
| `hunters` | deviceId (unique), email (sparse unique), stats.totalClaims |
| `vouchers` | magicToken (unique), dropId, merchantId + redeemed, claimedBy.deviceId |
| `promo_codes` | dropId + status, dropId + code (unique) |
| `admins` | email (unique) |
| `refresh_tokens` | token, userId + userType, family |

### Old Repo (PostgreSQL + Drizzle)

| Table | Key Columns |
|-------|-------------|
| `drops` | latitude, longitude (separate float columns), no geospatial index |
| `merchants` | Same fields, session-based auth |
| `vouchers` | Same concept, PostgreSQL native UUID |
| `treasure_hunters` | Same as hunters |
| `promo_codes` | Same concept |

---

## API Endpoints Summary

### Public (No Auth)
- `GET /drops/active` - Find nearby drops
- `GET /drops/:id` - Get drop details
- `GET /merchants/:username` - Get public merchant profile
- `GET /scanner/:token/validate` - Validate scanner token
- `POST /scanner/:token/redeem` - Redeem via scanner

### Hunter Auth
- `POST /auth/hunters/register` - Register with email
- `POST /auth/hunters/login` - Login with email
- `POST /auth/hunters/device` - Login via device ID (anonymous)
- `POST /vouchers/claim` - Claim a drop
- `GET /vouchers` - My vouchers
- `GET /vouchers/magic/:token` - Get voucher by magic token
- `GET /hunters/me/history` - Claim history
- `GET /hunters/leaderboard` - Top hunters
- `PATCH /hunters/me/profile` - Update profile

### Merchant Auth
- `POST /auth/merchants/register`
- `POST /auth/merchants/login`
- `GET /merchants/me` - Get profile
- `GET /merchants/me/drops` - My drops
- `POST /merchants/me/drops` - Create drop
- `PATCH /merchants/me/drops/:id` - Update drop
- `DELETE /merchants/me/drops/:id` - Delete drop
- `GET /merchants/me/stats` - Statistics
- `GET /merchants/me/analytics` - Detailed analytics
- `POST /merchants/me/scanner-token` - Generate scanner token
- `GET /vouchers/redeem` - Redeem voucher (via query params)

### Admin Auth
- `POST /auth/admin/login`
- `GET /admin/stats` - Platform stats
- `GET /admin/analytics` - Platform analytics
- `GET /admin/merchants` - List all merchants
- `GET /admin/users` - List all hunters
- `GET /admin/drops` - List all drops

---

## Comparison: New API vs Old Repo

### What's New/Improved

| Feature | Old Repo | New API |
|---------|----------|---------|
| **Database** | PostgreSQL + Drizzle ORM | MongoDB + Mongoose |
| **Geospatial** | Separate lat/lng columns | GeoJSON Point with 2dsphere index |
| **Nearby Query** | Manual calculation | MongoDB $geoNear aggregation |
| **Authentication** | Session-based (express-session + PostgreSQL) | JWT with refresh token rotation |
| **API Framework** | Express with manual routes | NestJS with decorators |
| **Documentation** | None | Swagger/OpenAPI decorators |
| **Soft Deletes** | Hard deletes | `deletedAt` timestamp pattern |
| **Token Security** | Plain scanner tokens | Hashed refresh tokens, token families |
| **Account Lockout** | None | 5 attempts → 2-hour lock |
| **DTO Validation** | Zod schemas | class-validator + class-transformer |
| **Code Structure** | Single file routes.ts | Modular architecture (modules/controllers/services) |
| **Email/WhatsApp** | Implemented with nodemailer/twilio | Placeholder (TODO comments) |
| **Type Safety** | Zod inference | Full DTO classes with decorators |

### Features in Old Repo (MISSING in New API)

| Feature | Old Implementation | Status in New API |
|---------|-------------------|-------------------|
| **Email Service** | Nodemailer SMTP with HTML templates | TODO only (console.log) |
| **WhatsApp Service** | Twilio WhatsApp API integration | TODO only (console.log) |
| **Pitch Deck Generation** | PPTXGenJS for downloadable pitch deck | Not present |
| **Object Storage** | Replit Object Storage integration | Not present (different upload approach) |
| **Password Reset** | Full flow with 1-hour expiry tokens | Implemented |
| **Email Verification** | Full flow with 24-hour expiry tokens | Implemented but email sending TODO |
| **Demo Data Seeding** | `seedDemoData()` creates demo merchant/drop | Command exists but minimal |

### Features in New API (Added in Rewrite)

| Feature | Description |
|---------|-------------|
| **JWT Token Family Pattern** | Security against token theft via reuse detection |
| **Refresh Token Rotation** | New refresh token on every access token refresh |
| **Soft Delete Pattern** | `deletedAt` timestamp instead of hard deletes |
| **Geospatial Indexing** | Proper 2dsphere index for location queries |
| **Modular Architecture** | Clean separation with NestJS modules |
| **Database Service Pattern** | Centralized model access via `DatabaseService` |
| **Swagger/OpenAPI** | Auto-generated API documentation |
| **Roles & Guards** | Proper RBAC with `@Roles()` decorator |
| **Aggregation Pipelines** | Complex analytics with MongoDB aggregations |
| **Promo Code Management** | Full CRUD for promo codes |
| **Upload Service** | S3-compatible presigned URL generation |
| **Time-series Analytics** | Hourly/daily/weekly/monthly aggregation support |

---

## Missing Implementations (Action Items)

### Critical - Needed for Production

1. **Email Service Integration**
   - Location: `apps/api/src/modules/auth/auth.service.ts:59-73`
   - Current: Console.log placeholders
   - Needed: Nodemailer or SendGrid integration

2. **WhatsApp Integration**
   - Location: `apps/api/src/modules/vouchers/vouchers.service.ts:315-337`
   - Current: Console.log placeholder
   - Needed: Twilio or similar WhatsApp Business API

3. **Email Template System**
   - Password reset emails
   - Verification emails
   - Voucher sharing emails

### Nice to Have

4. **Pitch Deck Generation** (from old repo)
   - PPTXGenJS integration
   - `/api/pitch-deck/download` endpoint

5. **Enhanced Demo Seeding**
   - More comprehensive demo data
   - Multiple merchant profiles

6. **Background Jobs**
   - Expired drop cleanup
   - Analytics pre-computation
   - Email queue processing

---

## Security Considerations

| Aspect | Implementation |
|--------|---------------|
| Password Hashing | bcrypt, 12 rounds |
| Token Hashing | SHA-256 for refresh tokens |
| JWT Secrets | Environment-based, HS256 |
| Account Lockout | 5 attempts → 2-hour lock |
| Token Reuse Detection | Family-based revocation |
| Input Validation | class-validator DTOs |
| Soft Deletes | Prevents data loss |
| Ownership Guards | Resource-level authorization |

---

## Environment Variables

### Required for New API

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/souqsnap

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# AWS S3 (for upload service)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET_NAME=souqsnap-uploads

# Optional - Email (TODO)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=xxx
EMAIL_PASS=xxx

# Optional - WhatsApp (TODO)
TWILIO_SID=xxx
TWILIO_TOKEN=xxx
TWILIO_PHONE=xxx
```

---

## Architecture Decisions

### Why MongoDB over PostgreSQL?
- **Geospatial queries** - Native 2dsphere indexes and $geoNear
- **Flexible schema** - Drops can have varying redemption/availability configurations
- **Horizontal scaling** - Sharding support for location-based data
- **Document model** - Natural fit for drops with embedded configs

### Why NestJS over Express?
- **Type safety** - First-class TypeScript support
- **Decorators** - Clean metadata-driven development
- **Modularity** - Built-in DI container and module system
- **Documentation** - Swagger integration
- **Testing** - Built-in testing utilities

### Why JWT over Sessions?
- **Stateless** - No session store required
- **Mobile-friendly** - Token-based works better for mobile apps
- **Cross-domain** - Easier for multiple frontend apps
- **Security** - Token rotation and family pattern

---

## Database Migrations & Seeding

### Current Seed Command
```bash
# In apps/api
npx nestjs-command seed:admin
```

Creates a default admin user from environment variables.

### Recommended Seeding
- Demo merchant with drops
- Sample hunters with claims
- Analytics test data
