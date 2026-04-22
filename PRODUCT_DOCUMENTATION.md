# SouqSnap Product Documentation

> **Purpose**: This document captures the essential product knowledge for SouqSnap — a location-based AR rewards platform for the Saudi Arabian market. It focuses on user-facing behavior, business rules, and critical flows rather than technical implementation.
> 
> **Scope**: SouqSnap V2 (NestJS + MongoDB rewrite)
> **Market**: Saudi Arabia (bilingual EN/AR, RTL support)

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Core Entities & Concepts](#2-core-entities--concepts)
3. [Critical User Flows](#3-critical-user-flows)
4. [Feature Descriptions](#4-feature-descriptions)
5. [Behavioral Nuances](#5-behavioral-nuances)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Appendix](#7-appendix)

---

## 1. Overview & Goals

### 1.1 What is SouqSnap?

SouqSnap is a **location-based AR (Augmented Reality) rewards platform** that connects merchants with customers through geolocation-based "drops." 

**Tagline**: *Hunt. Claim. Reward.*

### 1.2 Target Users

| Role | Description | Primary Need |
|------|-------------|--------------|
| **Hunter** (Customer) | General public using mobile devices to discover and claim rewards | Fun discovery, savings on local businesses, gamified experience |
| **Merchant** | Business owners creating reward drops to attract customers | Customer acquisition, foot traffic, conversion tracking |
| **Staff** | Store employees who redeem vouchers without full system access | Simple redemption process, no account needed |
| **Redeemer Hunter** | Trusted hunters authorized to redeem vouchers for a merchant | Delegated redemption rights |
| **Platform Admin** | Internal team managing the platform | Oversight, fraud prevention, merchant support |

### 1.3 Key Problems Solved

1. **For Merchants**: Traditional digital marketing lacks physical-world connection. SouqSnap drives actual foot traffic by requiring physical presence to claim rewards.

2. **For Customers**: Discovery of local deals is passive (email, ads). SouqSnap makes it active and gamified — users "hunt" for rewards in their area.

3. **For Both**: Bridge between digital engagement and physical commerce. No app download required (PWA), works on any modern smartphone.

### 1.4 Geographic Focus

- **Primary market**: Saudi Arabia
- **Localization**: Full bilingual support (English/Arabic) with RTL layouts
- **Map integration**: Uses OpenStreetMap/Leaflet for location services
- **Distance units**: Meters for radius, kilometers for display

---

## 2. Core Entities & Concepts

### 2.1 Domain Entities

#### **Drop**
A location-based reward created by a merchant. Think of it as a digital "treasure" placed at a physical location.

**Key Attributes**:
- **Location**: GPS coordinates with capture radius (5-2000 meters, default 15m)
- **Reward**: Description of what the customer gets (e.g., "50% off coffee")
- **Availability Rules**: Unlimited claims OR limited quantity (e.g., first 100 people)
- **Schedule**: Optional start/end dates (can be always active)
- **Redemption Rules**: When/how the voucher can be redeemed after claim (anytime/timer/window)
- **Terms & Conditions**: Optional text shown during redemption (max 300 chars)
- **Promo Codes**: Optional attached unique codes auto-assigned on claim

**Drop States**:
- **Draft/Inactive**: Created but not visible to hunters
- **Scheduled**: Visible but not yet claimable (future start time)
- **Active**: Currently claimable
- **Expired**: Past end time (if set)
- **Sold Out**: Limited availability reached
- **Soft Deleted**: Marked deleted but preserved for analytics

#### **Voucher**
A claimed reward — the digital certificate a hunter receives after successfully capturing a drop.

**Key Attributes**:
- **Magic Token**: Unique cryptographically secure bearer token (SHA-256 hashed in DB)
- **QR Code**: Generated from voucher data for in-store scanning
- **Claim Information**: Who claimed it, when, from what device
- **Redemption Status**: Whether used, when, and by whom
- **Promo Code**: Optional auto-assigned code for online redemption
- **Expiration**: Calculated at claim time (earliest of multiple possible rules)

**Voucher Lifecycle**:
```
Created (on claim) → Active → Redeemed OR Expired
                    ↓
               Can be shared via email/WhatsApp
```

#### **Hunter**
A customer/user who discovers and claims drops. Can be:
- **Anonymous**: Device-based identification only (auto-created)
- **Registered**: Email/password account for cross-device sync
- **Redeemer**: Authorized by a merchant to redeem vouchers on their behalf

**Key Attributes**:
- **Device ID**: Unique identifier (3-255 chars, alphanumeric + dashes/underscores)
- **Stats**: Total claims, redemptions (for leaderboard)
- **Profile**: Optional nickname, DOB, gender, mobile (for personalization)
- **Redeemer Link**: Optional merchant authorization for delegated redemption

#### **Merchant**
A business owner who creates drops to attract customers.

**Key Attributes**:
- **Public Identity**: Username (for store URL: /store/:username), business name, logo
- **Store Location**: Physical address with navigation details (lat/lng, address, city, landmark, how-to-reach)
- **Verification Status**: Email must be verified before creating drops
- **Scanner Token**: Temporary access token for staff redemption (24-hour expiry, SHA-256 hashed)
- **Business Info**: Phone, hours, logo

**Merchant Account States**:
- **Unverified**: Email not confirmed, cannot create drops
- **Active**: Normal operation
- **Locked**: Too many failed login attempts (5 = 2-hour lockout)
- **Suspended**: Admin action, cannot login

#### **Promo Code**
Optional codes uploaded by merchants, auto-assigned to vouchers on claim.

**Lifecycle**:
1. Merchant uploads codes to a drop (bulk or single)
2. Codes stored as "available"
3. On voucher claim: first available code auto-assigned (atomic operation)
4. Code marked "assigned" with voucher/hunter reference
5. Hunter sees code in their voucher
6. Cannot be deleted once assigned

**Constraints**:
- Unique per drop (case-insensitive)
- Only unassigned codes can be deleted
- Bulk upload with duplicate detection

#### **Scanner Token**
Temporary credential for staff to redeem vouchers without merchant login.

**Key Attributes**:
- **24-hour expiration** from creation
- **SHA-256 hashed** in database (plaintext shown once to merchant)
- **Single merchant association** (token only works for that merchant's vouchers)
- **One active at a time**: New token invalidates old

### 2.2 Entity Relationships

```
Merchant (1)
  │
  ├── has many (N) Drops
  │       │
  │       ├── has many (N) Vouchers
  │       │       │
  │       │       └── has zero or one (0..1) Promo Code
  │       │
  │       └── has many (N) Promo Codes (pool)
  │
  ├── has one (1) Scanner Token (optional, rotating)
  │
  └── has many (N) Redeemer Hunters (authorized)

Hunter (1)
  │
  ├── has many (N) Vouchers (claims)
  │
  └── has zero or one (0..1) Redeemer Merchant (if authorized)

Admin (platform)
  │
  └── manages all entities
```

### 2.3 Critical Business Rules

1. **One voucher per hunter per drop**: Enforced via unique compound index at database level
2. **Device-based or account-based**: Hunters can claim anonymously via device ID OR with registered account
3. **Physical presence required**: GPS proximity check at claim time (within drop radius)
4. **Voucher redemption authorization**: Only the drop's merchant, their staff (via scanner token), or authorized redeemer hunters can redeem
5. **Soft deletes**: Merchants and drops can be "deleted" but remain in database for analytics/history
6. **Promo code uniqueness**: Codes are unique per drop (case-insensitive comparison)
7. **Drop immutability after claims**: Certain drop fields cannot change after first voucher claim
8. **Scanner token rotation**: Only one active token per merchant; new token invalidates old

---

## 3. Critical User Flows

### 3.1 Hunter Discovery & Claim Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  HUNTER JOURNEY: Discover → Claim → Redeem                     │
└─────────────────────────────────────────────────────────────────┘

1. OPEN APP/WEBSITE
   └─> Landing page shows nearby active drops
       └─> Uses geolocation API (with permission)

2. BROWSE DROPS
   ├─> View list of active drops with distances
   ├─> Filter/search by merchant name, reward type
   ├─> Tap drop to see details (reward, terms, time window)
   └─> "Sold Out" badge if availability reached

3. AR HUNT MODE (Optional)
   ├─> Camera opens with location overlay
   ├─> 3D coin appears in direction of drop
   ├─> Distance indicator shows how far
   ├─> Compass arrow when off-screen
   └─> Tap coin to attempt claim

4. CLAIM DROP
   ├─> GPS validates proximity (within radius, accuracy <50m)
   ├─> System checks availability (not expired, not full, not already claimed)
   ├─> Creates hunter account if new device
   ├─> Voucher created with magic token (hashed in DB)
   ├─> Expiration time calculated (earliest of all rules)
   ├─> Promo code assigned (if available, atomic assignment)
   ├─> Hunter stats incremented
   └─> Success animation, voucher displayed with QR

5. SHARE/SAVE VOUCHER
   ├─> Email to self (SMTP configurable)
   ├─> WhatsApp to friend (Twilio optional)
   ├─> Copy magic link
   └─> Share to native apps (if PWA installed)

6. VIEW VOUCHER DETAILS
   ├─> QR code for scanning
   ├─> Promo code (if assigned)
   ├─> Terms & conditions
   ├─> Expiration countdown (if time-limited)
   └─> Drop location with directions link

7. REDEEM AT STORE
   ├─> Present QR code to merchant
   ├─> Merchant scans with their scanner
   ├─> System validates:
   │   ├─ Voucher exists and not redeemed
   │   ├─ Within redemption time rules
   │   ├─ Belongs to scanning merchant
   │   └─ Promo code displayed (if exists)
   └─> Redemption confirmed, reward given

8. POST-REDEMPTION
   └─> Voucher marked redeemed
       └─> Hunter stats updated
           └─> Leaderboard position recalculated
```

### 3.2 Merchant Setup & Drop Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  MERCHANT JOURNEY: Register → Verify → Create → Monitor          │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   ├─> Email, password (min 8 chars + uppercase + number)
   ├─> Business name
   ├─> Username (unique, becomes public store URL: /store/:username)
   └─> Email verification sent immediately

2. EMAIL VERIFICATION
   ├─> Click link in email (expires ~24 hours)
   ├─> Must verify before any drop creation
   ├─> Can resend verification (rate limited: 1 per minute)
   └─> Login blocked until verified

3. DASHBOARD SETUP
   ├─> Upload business logo (S3/MinIO presigned URL)
   ├─> Set store location (map picker)
   │   ├─ GPS coordinates (lat/lng)
   │   ├─ Address, city, state, pincode
   │   ├─ Landmark (e.g., "Near Al Faisaliyah Tower")
   │   └─ How to reach (directions text)
   ├─> Set business hours and contact phone
   └─> Generate scanner token for staff

4. CREATE DROP
   ├─> Basic Info:
   │   ├─ Name (2-100 chars)
   │   ├─ Description (10-1000 chars)
   │   ├─ Reward value description (e.g., "50% OFF")
   │   └─ Terms & conditions (optional, max 300 chars)
   │
   ├─> Location:
   │   ├─ GPS coordinates (map picker or current location)
   │   └─ Capture radius (5-2000 meters, default 15m)
   │
   ├─> Availability:
   │   ├─ Unlimited: Any number of claims
   │   └─ Limited: Set max claims (1-100,000)
   │
   ├─> Schedule (optional):
   │   ├─ Start: When drop becomes claimable
   │   └─ End: When drop expires
   │
   ├─> Redemption Rules:
   │   ├─ Anytime: No time limit to redeem
   │   ├─ Timer: Must redeem within X minutes of claim (max 1440 min = 24 hours)
   │   └─ Window: Must redeem before specific deadline
   │
   ├─> Voucher Expiration (optional):
   │   ├─ Absolute deadline (hard date)
   │   └─ Hours after claim (TTL)
   │
   ├─> Upload promo codes (optional, CSV or bulk paste)
   └─> Activate drop (immediate or scheduled)

5. MANAGE DROPS
   ├─> Edit drop (restricted after first claim)
   ├─> Deactivate/reactivate
   ├─> Soft delete (only if no claims)
   ├─> View claims count in real-time
   └─> Download CSV of all drops

6. VIEW ANALYTICS
   ├─> Overview:
   │   ├─ Total drops created
   │   ├─ Active drops count
   │   ├─ Total vouchers claimed
   │   ├─ Total redemptions
   │   └─ Conversion rate (%)
   │
   ├─> Time Series (30 days default):
   │   ├─ Daily claims
   │   ├─ Daily redemptions
   │   └─ Trend visualization
   │
   ├─> Drop Performance:
   │   ├─ Per-drop claims
   │   ├─ Per-drop redemptions
   │   └─ Conversion rate by drop
   │
   └─> Average time to redemption (hours)

7. MANAGE VOUCHERS
   ├─> List all issued vouchers
   ├─> Filter by redeemed/unredeemed
   ├─> Search by drop name
   ├─> View hunter info (nickname, email if available)
   └─> See claim timestamps

8. REDEMPTION
   ├─> Open QR scanner in dashboard
   ├─> Scan customer's voucher QR
   ├─> See voucher details:
   │   ├─ Drop name and reward
   │   ├─ Terms & conditions
   │   ├─ Expiration status
   │   └─ Promo code (if exists)
   ├─> Confirm redemption
   └─> Customer receives reward

9. STAFF MANAGEMENT
   ├─> Generate scanner token (shown once, 24-hour expiry)
   ├─> Share token with staff
   ├─> Staff uses /scan/:token URL
   └─> Regenerate token to invalidate old

10. PROMO CODE MANAGEMENT
    ├─> Upload codes (single or bulk)
    ├─> View available vs assigned counts
    ├─> Delete unused codes
    └─> See which hunter got which code
```

### 3.3 Staff Redemption Flow (No Login Required)

```
┌─────────────────────────────────────────────────────────────────┐
│  STAFF JOURNEY: Token-based access for in-store employees       │
└─────────────────────────────────────────────────────────────────┘

1. MERCHANT GENERATES SCANNER TOKEN
   ├─> In merchant settings, click "Generate Staff Token"
   ├─> 64-character token generated, SHA-256 hashed in DB
   ├─> Plaintext token shown ONCE to merchant
   ├─> 24-hour expiration set
   └─> Merchant copies and shares with staff

2. STAFF ACCESSES SCANNER
   ├─> Opens unique URL: /scan/:token
   ├─> System validates token (exists, not expired)
   ├─> Shows merchant business name for confirmation
   └─> Scanner interface loads (no login required)

3. SCAN & REDEEM
   ├─> Customer shows voucher QR code
   ├─> Staff scans with device camera
   ├─> System validates:
   │   ├─ Token still valid
   │   ├─ Voucher belongs to this merchant
   │   ├─ Not already redeemed
   │   └─ Within redemption time rules
   ├─> Staff sees confirmation with reward details
   ├─> Staff confirms redemption
   └─> Success screen with redemption timestamp

4. TOKEN EXPIRATION
   └─> After 24 hours, token automatically invalid
       Staff must request new token from merchant
```

### 3.4 Redeemer Hunter Flow (Delegated Redemption)

```
┌─────────────────────────────────────────────────────────────────┐
│  REDEEMER HUNTER: Authorized hunters redeeming for merchants     │
└─────────────────────────────────────────────────────────────────┘

1. MERCHANT AUTHORIZES HUNTER
   ├─> Merchant has trusted hunter (e.g., delivery partner, promoter)
   ├─> Links hunter to merchant account
   └─> Hunter's profile now has "redeemerMerchantId" set

2. HUNTER REDEEMS VOUCHER
   ├─> Hunter with redeemerMerchantId claims drop from any merchant
   ├─> Can redeem vouchers on behalf of their linked merchant
   ├─> System validates redeemerMerchantId matches voucher's merchant
   └─> Redemption processed as "hunter" redeemer type

3. USE CASES
   ├─> Delivery drivers redeeming for merchant
   ├─> Promoters claiming rewards for customers
   └─> Multi-location staff with single hunter account
```

### 3.5 Admin Oversight Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN JOURNEY: Monitor → Investigate → Intervene                │
└─────────────────────────────────────────────────────────────────┘

1. PLATFORM DASHBOARD
   ├─> Total merchants (verified vs unverified)
   ├─> Total drops (active vs inactive)
   ├─> Total vouchers (claimed vs redeemed)
   ├─> Total hunters
   ├─> Platform-wide conversion rate
   └─> Recent activity feed

2. PLATFORM ANALYTICS
   ├─> Time-series charts:
   │   ├─ Merchants over time
   │   ├─ Drops created over time
   │   ├─ Claims over time
   │   ├─ Redemptions over time
   │   └─ Hunters joining over time
   │
   ├─> Granularity: hourly, daily, weekly, monthly
   ├─> Period: Configurable (default 30 days)
   ├─> Peak hours analysis (claims by hour of day)
   ├─> Top performing merchants
   └─> Top performing drops

3. MERCHANT MANAGEMENT
   ├─> List all merchants with filters:
   │   ├─ Verified/unverified
   │   ├─ Active/suspended/locked
   │   └─ Search by name/email/username
   │
   ├─> View merchant details:
   │   ├─ Profile info
   │   ├─ Drop count
   │   ├─ Voucher statistics
   │   └─ Login history
   │
   ├─> Actions:
   │   ├─ Verify/unverify email
   │   ├─ Suspend/unsuspend account
   │   ├─ View as merchant (impersonate)
   │   └─ Download merchant CSV
   │
   └─> Merchant CSV export:
       Business name, email, username, verified status, suspended status, created date

4. DROP MANAGEMENT
   ├─> List all drops across platform
   ├─> Filter by:
   │   ├─ Merchant
   │   ├─ Active status
   │   ├─ Schedule status (upcoming, active, expired)
   │   └─ Search by name
   │
   ├─> Actions:
   │   ├─ Edit any drop
   │   ├─ Soft delete drop
   │   └─ View voucher list for drop
   │
   └─> Drops CSV export

5. USER MANAGEMENT
   ├─> List all hunters
   ├─> Filter by:
   │   ├─ Min claims (e.g., power users)
   │   ├─ Search by device/nickname/email
   │   └─ Date joined
   │
   ├─> View hunter profile:
   │   ├─ Claim history
   │   ├─ Voucher list
   │   └─ Stats
   │
   └─> Users CSV export

6. INTERVENTION CAPABILITIES
   ├─> Suspend fraudulent merchants
   ├─> Delete policy-violating drops
   ├─> Force password resets
   └─> Platform announcements (future)
```

### 3.6 Pitch Deck Generation Flow (Marketing Tool)

```
┌─────────────────────────────────────────────────────────────────┐
│  PITCH DECK: Generate platform presentation for sales           │
└─────────────────────────────────────────────────────────────────┘

1. ACCESS PITCH DECK
   └─> Public or merchant-facing page showing platform overview

2. PITCH DECK SECTIONS
   ├─> Problem: Traditional marketing vs location-based rewards
   ├─> Solution: SouqSnap platform overview
   ├─> How It Works: Hunter and merchant flows
   ├─> Features: AR hunt, analytics, promo codes, etc.
   ├─> Market: Saudi opportunity
   ├─> Business Model: (if applicable)
   └─> Call to Action: Sign up

3. EXPORT OPTIONS
   └─> Download as PPTX (PowerPoint)
       └─> Generated client-side or server-side
```

---

## 4. Feature Descriptions

### 4.1 Drop Management

**Purpose**: Allow merchants to create and manage location-based rewards.

**Trigger**: Merchant clicks "Create Drop" in dashboard.

**Inputs**:
- Name (2-100 chars, required)
- Description (10-1000 chars, required)
- Location coordinates (lat/lng, required)
- Capture radius (5-2000 meters, default 15m)
- Reward value description (text, required)
- Terms & conditions (optional, max 300 chars)
- Logo URL (optional)
- Availability type (unlimited/limited, default unlimited)
- Availability limit (if limited, 1-100,000)
- Schedule start/end (optional dates)
- Redemption type (anytime/timer/window, default anytime)
- Redemption timer minutes (if timer, 1-1440)
- Redemption window deadline (if window)
- Voucher absolute expiry (optional date)
- Voucher TTL hours (optional, 1+ hours)
- Active flag (default true)

**Main Path**:
1. Merchant fills form with validation
2. System validates all required fields
3. Creates drop with "active" status
4. Appears in public listings (if within schedule)
5. Merchant sees confirmation and management options

**Outputs**:
- Drop appears in nearby searches (if active and within schedule)
- Drop appears on merchant's public store page
- Drop becomes claimable by hunters within radius

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Schedule start in future | Drop visible but not claimable; "Starts [date]" badge |
| Schedule end passed | Drop automatically becomes inactive; "Expired" badge |
| Limited availability reached | Drop visible but "Sold Out" badge; unclaimable |
| Merchant not verified | Error on create: "Email verification required" |
| Drop has existing claims | Cannot switch unlimited → limited |
| Drop has existing claims | Cannot reduce availability limit below current claims |
| Drop has existing claims | Cannot change redemption type or timer minutes |
| Soft delete with claims | **Blocked**: Cannot delete drops with claimed vouchers |
| Soft delete with promo codes | **Blocked**: Cannot delete drops with existing promo codes |
| Radius < 5m or > 2000m | Validation error at creation |

### 4.2 Voucher Claiming

**Purpose**: Convert a discovered drop into a claimable voucher.

**Trigger**: Hunter clicks "Claim" or taps AR coin.

**Inputs**:
- Drop ID (required)
- Device ID (required, 3-255 chars, alphanumeric + _-)
- Hunter ID (optional, if registered and logged in)
- User's GPS coordinates (for proximity validation)

**Main Path**:
1. Hunter initiates claim
2. System validates proximity (within drop radius, GPS accuracy <50m)
3. System validates drop is active and within schedule
4. System checks hunter hasn't already claimed this drop (unique index)
5. If new device, creates hunter account automatically
6. Magic token generated (secure random, SHA-256 hashed for storage)
7. Expiration calculated (earliest of all applicable rules)
8. Voucher created with expiration time
9. Promo code assigned atomically if available for this drop
10. Hunter stats incremented
11. Success response with full voucher data

**Outputs**:
- Voucher with magic token (for sharing/linking)
- QR code data (for in-store scanning)
- Expiration timestamp (if applicable)
- Promo code (if assigned)
- Drop details embedded

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Hunter already claimed this drop | Error 409: "Voucher already claimed by this hunter" |
| Drop not yet started | Error 400: "Drop has not started yet" |
| Drop ended | Error 400: "Drop has ended" |
| Limit reached | Error 400: "Drop capture limit reached" |
| GPS accuracy poor (>50m) | Error 400: "GPS accuracy insufficient" |
| Outside capture radius | Error 403: "Not within capture radius" |
| Race condition (simultaneous claims) | Atomic DB operation prevents oversubscription |
| No promo codes available | Voucher created without code (still valid) |
| Device ID invalid format | Error 400: "Invalid device ID format" |

### 4.3 Voucher Redemption

**Purpose**: Convert a claimed voucher into an actual reward at point of sale.

**Trigger**: Merchant or staff scans QR code.

**Inputs**:
- Voucher ID (from QR code)
- Magic token (from QR code, for verification)
- Redeemer credentials:
  - Merchant: JWT authentication
  - Staff: Scanner token
  - Redeemer Hunter: JWT + redeemerMerchantId match

**Main Path**:
1. QR code scanned, data extracted (voucherId + magicToken + dropId)
2. Voucher looked up by ID
3. Magic token validated (SHA-256 hash comparison, timing-safe)
4. Checks performed:
   - Voucher exists and not soft-deleted
   - Not already redeemed (atomic check-and-set)
   - Within redemption time constraints (timer/window rules)
   - Belongs to redeemer's merchant
5. Marked as redeemed with timestamp and redeemer type/id
6. Hunter stats updated (redemption count incremented)
7. Success response with redemption confirmation

**Outputs**:
- Redemption confirmation
- Voucher details (reward value, terms, promo code if exists)
- Timestamp of redemption
- Drop and merchant info

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Already redeemed | Error 400: "Voucher has already been redeemed" |
| Wrong merchant | Error 403: "Voucher does not belong to this merchant" |
| Timer expired | Error 403: "Redemption window expired" |
| Window deadline passed | Error 403: "Redemption window has expired" |
| Voucher expired | Error 403: "Voucher has expired" |
| Invalid magic token | Error 403: "Invalid magic token" |
| Double-redemption attempt | Atomic update prevents second redemption |
| Scanner token expired | Error 403: "Scanner token has expired" |
| Redeemer hunter wrong merchant | Error 403: "Hunter is not authorized to redeem for this merchant" |

### 4.4 AR Hunt Mode

**Purpose**: Gamified discovery experience using phone camera and location.

**Trigger**: Hunter clicks "Hunt" or "AR Mode" button.

**Inputs**:
- Device GPS location
- Device compass heading
- List of nearby drops from API

**Main Path**:
1. Camera feed opens as full-screen background
2. System calculates relative positions:
   - Distance to each drop (Haversine formula for Earth surface)
   - Bearing from current location to drop
   - Offset angle from current heading
3. 3D coin overlays positioned on screen:
   - Scale based on distance (closer = larger)
   - Position based on direction relative to compass
   - Off-screen = directional arrow indicator
4. Distance labels shown
5. Hunter taps coin to attempt claim
6. System validates GPS proximity before allowing claim
7. On successful claim: particle burst animation

**Outputs**:
- Visual AR overlay on camera feed
- Distance indicators
- Directional guidance arrows
- Tap-to-claim interaction
- Success animation on claim

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| GPS accuracy poor (>50m) | Warning banner: "GPS accuracy low", claims disabled |
| No nearby drops | Message: "No drops nearby, keep exploring!" |
| Compass unavailable | Falls back to distance-only list view |
| Camera permission denied | Shows map view as fallback |
| Device orientation changes | Coin positions recalculate |
| Drop goes out of range during hunt | Real-time distance updates, "Too far" warning |

### 4.5 Scanner Token System

**Purpose**: Allow staff redemption without full merchant login credentials.

**Trigger**: Merchant generates token from settings.

**Inputs**:
- Merchant authentication (JWT)
- Expiration duration (default 24 hours, configurable)

**Main Path**:
1. Merchant requests token generation
2. System creates cryptographically secure random token (32+ bytes)
3. SHA-256 hash stored in database
4. Plaintext token returned to merchant (shown ONCE)
5. Merchant shares token with staff via secure channel
6. Staff accesses /scan/:token URL
7. System validates token hash on each request
8. Token expires automatically after duration

**Outputs**:
- Unique token string (64 hex characters)
- Expiration timestamp
- Scanner interface with redemption capability
- Merchant branding confirmation

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Token expired | Error page: "Scanner token has expired. Request new token from merchant." |
| Invalid token | Error: "Invalid scanner token" |
| Merchant generates new token | Old token immediately invalidated (single active token) |
| Token used to redeem wrong merchant | Error: "Voucher does not belong to this merchant" |
| Token partially typed | Error: "Invalid token format" |
| Merchant account suspended | Token becomes invalid immediately |

### 4.6 Promo Code Management

**Purpose**: Distribute unique codes (coupon codes, gift cards, referral codes) with vouchers.

**Trigger**: Merchant uploads codes to a drop.

**Inputs**:
- Drop ID (must belong to merchant)
- Array of unique code strings
- Or single code for individual addition

**Main Path (Bulk Upload)**:
1. Merchant uploads codes (CSV paste or array)
2. System validates:
   - Drop belongs to merchant
   - Codes are unique within this drop (case-insensitive)
   - No duplicates in upload batch
3. Codes stored as "available" status
4. On voucher claim: first available code auto-assigned atomically
5. Code marked "assigned" with voucher/hunter reference
6. Hunter sees code in their voucher view

**Outputs**:
- Available codes count
- Assigned codes count
- Code assigned to voucher (visible to hunter)
- Stats per drop

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Duplicate code in batch | Error: "Duplicate codes in request: CODE1, CODE2" |
| Code already exists for drop | Error: "Codes already exist for this drop: CODE1" |
| No codes available at claim | Voucher created without code (still valid) |
| Delete assigned code | Error: "Only available (unassigned) promo codes can be deleted" |
| Delete all codes for drop | Only deletes available codes, assigned remain |
| Drop deleted | Soft-deleted, codes remain for reference |
| Bulk upload with one duplicate | Entire batch rejected (atomic) |
| Case insensitive duplicate | "CODE123" and "code123" considered duplicate |

### 4.7 Redeemer Hunter Management

**Purpose**: Allow merchants to authorize trusted hunters to redeem vouchers on their behalf.

**Trigger**: Merchant links a hunter to their account.

**Inputs**:
- Hunter ID to authorize
- Merchant authentication

**Main Path**:
1. Merchant selects hunter to authorize (by ID or search)
2. System creates link: hunter.redeemerMerchantId = merchant._id
3. Hunter can now redeem vouchers for this merchant
4. Hunter still claims drops normally (any drop)
5. When redeeming: system checks if redeemerMerchantId matches voucher's merchant

**Outputs**:
- Hunter can redeem vouchers as "hunter" redeemer type
- Appears in merchant's authorized hunters list

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Hunter already linked to another merchant | Replaces old link (one redeemer merchant per hunter) |
| Hunter redeems for wrong merchant | Error 403: "Not authorized to redeem for this merchant" |
| Merchant suspends hunter | Remove link, hunter can no longer redeem |
| Hunter account deleted | Link removed, redemptions no longer possible |

### 4.8 Email & Communication

**Purpose**: Transactional notifications and verification.

**Features**:
- **Email verification**: Required for merchant account activation (configurable, can be disabled via ENABLE_EMAIL)
- **Password reset**: Time-limited token (1 hour)
- **Voucher sharing**: Magic link sent via email (SMTP configurable)
- **WhatsApp sharing**: Server-side or client-side (Twilio optional)

**Configuration Options**:
- Email enabled/disabled (ENABLE_EMAIL env var)
- SMS/WhatsApp enabled/disabled (ENABLE_SMS env var)
- SMTP settings (host, port, user, password, from address)
- Twilio settings (SID, auth token, phone number)

**Triggers**:
- Registration → Verification email (if enabled)
- Forgot password → Reset email
- Share voucher → Email with magic link
- (Future) Claim confirmation → Email receipt
- (Future) Expiration warning → Email reminder

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| Verification email expired | Can request resend (rate limited: 1 per minute minimum) |
| Password reset expired | Must request new reset (1 hour window) |
| Email already verified | Idempotent success (no error) |
| Email sending fails | Logged, user sees success (fail silently to prevent enumeration) |
| SMTP not configured | Feature gracefully disabled, logs warning |
| Twilio not configured | WhatsApp falls back to wa.me links or disabled |
| Email disabled globally | Registration proceeds without verification requirement |

### 4.9 File Upload System

**Purpose**: Allow image uploads (logos, drop images) via presigned URLs.

**Storage Options**:
- **MinIO**: Self-hosted S3-compatible (default for development)
- **AWS S3**: Production cloud storage
- **Vercel Blob**: Serverless hosting option

**Security Features**:
- Presigned URLs (temporary, signed)
- File size limit: 5MB default
- MIME type whitelist: image/jpeg, image/png, image/webp, image/svg+xml
- Path traversal protection
- Extension validation

**Flow**:
1. Client requests presigned URL (authenticated)
2. Server generates signed URL (expires in 5 minutes)
3. Client uploads directly to storage
4. Client receives public URL for display

**Edge Cases**:
| Scenario | Behavior |
|----------|----------|
| File too large | Error: "File size exceeds 5MB limit" |
| Invalid file type | Error: "Invalid file extension. Allowed: jpg, png, webp, svg" |
| Upload after URL expires | Storage rejects with 403 |
| Path traversal attempt | Sanitized to safe filename |
| Unverified merchant | Cannot generate presign URLs (401) |

### 4.10 Analytics & Statistics

**Purpose**: Provide insights to merchants and admins on platform usage.

**Merchant Analytics**:
- **Overview**: Total drops, active drops, total vouchers, redemptions, conversion rate
- **Time Series**: Daily claims and redemptions (30 days)
- **Drop Performance**: Per-drop metrics (claims, redemptions, conversion rate)
- **Average Time to Redemption**: Mean hours between claim and redeem

**Admin Platform Analytics**:
- All merchant metrics aggregated
- Time-series with configurable granularity (hourly, daily, weekly, monthly)
- Peak hours analysis (claims by hour of day)
- Top performing merchants and drops
- User growth tracking

**Export Options**:
- CSV export for merchants (drops list)
- CSV export for admins (merchants, users, drops)
- (Future) PDF reports

### 4.11 Pitch Deck Generation

**Purpose**: Marketing tool to present the SouqSnap platform to potential merchants or investors.

**Content Sections**:
1. **Problem**: Traditional marketing limitations
2. **Solution**: SouqSnap platform overview
3. **How It Works**: Visual flow diagrams
4. **Features**: AR hunt, analytics, promo codes, scanner tokens
5. **Market**: Saudi Arabia opportunity
6. **Benefits**: For merchants and hunters
7. **Call to Action**: Sign up link

**Formats**:
- Interactive web presentation
- PPTX export (PowerPoint download)

---

## 5. Behavioral Nuances

### 5.1 Authentication & Security Behaviors

#### JWT Token System

**Token Structure**:
- **Access Token**: 15-minute expiry, contains user ID and type
- **Refresh Token**: 7-day expiry, stored SHA-256 hashed in database
- **Token Family**: All refresh tokens linked by UUID family ID

**Security Behaviors**:
1. **Token Rotation**: New refresh token issued on every refresh, old one revoked
2. **Reuse Detection**: If a revoked refresh token is used, ENTIRE token family revoked (security measure against theft)
3. **Timing-Safe Comparison**: All token comparisons use `timingSafeEqual` to prevent timing attacks
4. **Account Lockout**:
   - Merchants: 5 failed attempts → 2-hour lockout
   - Hunters: 5 failed attempts → 15-minute lockout
   - Admins: 5 failed attempts → 2-hour lockout

**Rate Limiting Tiers**:
| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Login (all roles) | 5 requests | 15 minutes per IP |
| Register | 3 requests | 60 minutes per IP |
| Forgot password | 3 requests | 15 minutes per IP |
| Voucher claim | 10 claims | 60 minutes per device |
| Scanner validate | 20 requests | 5 minutes per IP |
| General API | 100 requests | 1 minute per IP |
| Upload presign | 10 requests | 5 minutes per user |

#### Device ID Format

**Validation Rules**:
- Length: 3-255 characters
- Allowed characters: `a-zA-Z0-9_-` (alphanumeric, dash, underscore)
- No spaces or special characters
- Case-sensitive

**Auto-Creation**: New device IDs automatically create hunter accounts on first claim

#### Password Requirements

**Merchant & Hunter Accounts**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- bcrypt hashed with 12 rounds

### 5.2 Time-Based Rules

#### Voucher Expiration Calculation

Voucher expiration is calculated at claim time as the **earliest** of all applicable rules:

1. **Absolute deadline**: `voucherAbsoluteExpiresAt` on drop (hard date)
2. **TTL after claim**: Current time + `voucherTtlHoursAfterClaim` hours
3. **Redemption window**: `redemption.deadline` if type is "window"
4. **Redemption timer**: Claim time + `redemption.minutes` if type is "timer"

**Example**: If a drop has:
- TTL: 48 hours after claim
- Redemption window: Must redeem by Dec 31, 2026
- Timer: Must redeem within 60 minutes

Voucher expires at **60 minutes** (earliest).

**Important**: Expiration is **snapshotted at claim time**. Drop rule changes after claim do NOT affect existing vouchers.

#### Redemption Timer Rules

- **Type = "timer"**: Voucher must be redeemed within X minutes of claim time
- Timer starts exactly at `claimedAt` timestamp
- Cannot be extended, paused, or modified
- Grace period: None (strict)

#### Schedule vs Availability

- **Schedule**: When the drop is claimable (dates/times)
  - `startTime`: Drop becomes claimable (can be created before this)
  - `endTime`: Drop stops being claimable
- **Availability**: How many times it can be claimed (quantity)
  - `unlimited`: No cap
  - `limited`: Cap at `availabilityLimit`

**Interaction**:
- A drop can be scheduled but sold out (availability reached before end time)
- A drop can be "active" but not yet started (future schedule)
- A drop can be past its end time but still have availability remaining

#### Time Window Display

**Frontend States**:
- **Not yet active**: "Starts Jan 15, 2026 at 2:30 PM"
- **Active with end**: "Ends Jan 20, 2026 at 11:59 PM"
- **Expired**: "Expired" badge
- **No schedule**: No time badge shown

### 5.3 Drop Modification Restrictions

#### Post-Claim Locking

Once a drop has ≥1 claimed voucher, the following fields become **immutable**:

**Cannot Change**:
- Availability type (unlimited ↔ limited)
- Redemption type (anytime ↔ timer ↔ window)
- Redemption minutes (if timer)
- Redemption deadline (if window)

**Can Only Increase**:
- Availability limit (can increase, cannot decrease)

**Can Always Change**:
- Name
- Description
- Reward value
- Logo
- Radius
- Active flag
- Schedule (can extend end time)

**Soft Delete Rules**:
- ❌ **Blocked** if drop has any claimed vouchers
- ❌ **Blocked** if drop has any promo codes (even unused)
- ✅ **Allowed** only if drop has zero vouchers AND zero promo codes

### 5.4 Geolocation & GPS Behaviors

#### Proximity Calculation

- Uses MongoDB `$geoNear` with `2dsphere` index
- Haversine formula for accurate Earth-surface distance
- Radius cap: 300,000 meters (300km) maximum search distance
- Minimum search: 1,000 meters

#### GPS Accuracy Requirements

**For Claims**:
- GPS accuracy must be ≤50 meters
- If accuracy >50m: Warning shown, claim blocked
- Accuracy reading from `navigator.geolocation` API

**For Nearby Search**:
- No accuracy requirement
- Returns drops sorted by distance
- Includes distance in response

#### AR Positioning

- Compass heading smoothed with rolling average (last 5 readings)
- Throttled to 15Hz updates (not 60Hz for battery)
- Distance affects coin scale (closer = visually larger)
- Off-screen indicators show direction arrow

### 5.5 Token Security Behaviors

#### Magic Tokens

**Generation**:
- 16 bytes random (128 bits entropy)
- Hex encoded (32 characters)
- SHA-256 hashed before storage
- Timing-safe comparison on lookup

**Usage**:
- Bearer token for voucher access
- Included in magic links for sharing
- Never logged or displayed in plaintext (except to voucher owner)

**Expiration**:
- Configurable (default 30 days via `MAGIC_TOKEN_EXPIRY_DAYS`)
- Stored in `expiresAt` field on voucher

#### Scanner Tokens

**Generation**:
- 32 bytes random (256 bits entropy)
- Hex encoded (64 characters)
- SHA-256 hashed in database

**Lifecycle**:
- Shown once to merchant in plaintext
- 24-hour expiration (configurable via `SCANNER_TOKEN_EXPIRY_HOURS`)
- Single active per merchant (new token invalidates old)
- Expiration check on every use

#### Refresh Tokens

**Storage**:
- SHA-256 hashed in database
- Family ID links related tokens
- Expiration date stored
- Revocation timestamp (null until revoked)

**Security**:
- Rotation: New token issued on every refresh
- Reuse detection: Revoked token use → entire family revoked
- Family ID allows detecting token theft patterns

### 5.6 Promo Code Behaviors

#### Assignment Atomicity

Promo code assignment uses `findOneAndUpdate` with status filter to ensure:
- Only one code assigned per voucher
- No double-assignment in race conditions
- FIFO (first uploaded = first assigned)

#### Case Insensitivity

- Codes stored in UPPERCASE
- Duplicate check is case-insensitive
- "CODE123" and "code123" rejected as duplicate

#### Lifecycle Constraints

- **Available** → **Assigned**: Automatic on voucher claim
- **Assigned** → **Available**: Not possible (irreversible)
- **Delete**: Only when status is "available"

### 5.7 Data Retention & Deletion

#### Soft Delete Pattern

All entities use `deletedAt` timestamp instead of hard deletion:
- `null`: Active entity
- `Date`: Soft deleted at this time
- Soft-deleted entities excluded from public queries
- Admins can still view deleted entities

**Purpose**: Preserve historical data for analytics, prevent data loss

#### Cascading Rules

| Action | Effect |
|--------|--------|
| Soft delete drop with vouchers | ❌ **Blocked** (referential integrity) |
| Soft delete drop with promo codes | ❌ **Blocked** |
| Soft delete merchant | ✅ Allowed; drops/vouchers remain |
| Soft delete voucher | ✅ Allowed (archived claim record) |
| Soft delete hunter | ✅ Allowed; vouchers remain |

### 5.8 Email & Communication Behaviors

#### Graceful Degradation

**Email Disabled (ENABLE_EMAIL=false)**:
- Registration proceeds without verification
- Password reset shows token in UI (for development)
- Voucher sharing prompts manual copy
- Warnings logged

**Twilio Not Configured**:
- WhatsApp sharing uses wa.me links (client-side)
- Server-side sending returns "not configured" warning
- No error to user

#### Rate Limiting

**Verification Email**:
- Minimum 60 seconds between resend requests
- Multiple requests within window silently ignored (no error)
- Newest token valid (old tokens invalidated)

### 5.9 API Contract Nuances

#### Versioning

- Base path: `/api/v1/`
- All endpoints prefixed with version
- Future v2 can coexist

#### Response Format

**Success**:
```json
{
  // Direct data object (no wrapper)
}
```

**Error** (HttpExceptionFilter):
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

#### Required Headers

**DeviceGuard Endpoints**:
- `X-Device-Id`: Required for hunter routes
- Must be 3-255 characters

**CORS**:
- `CORS_ORIGIN` env var controls allowed origins
- Preflight handled automatically

---

## 6. Acceptance Criteria

### 6.1 Core Experience

#### Drop Discovery
- [ ] Hunter sees list of active drops within 300km
- [ ] Drops sorted by distance (nearest first)
- [ ] Each drop shows: name, reward, merchant, distance, time window
- [ ] Filter by search text (name, reward, merchant)
- [ ] "Sold Out" badge when availability reached
- [ ] "Starts [date]" badge for scheduled drops
- [ ] "Expired" badge for past drops
- [ ] Real-time distance updates as hunter moves

#### Claim Flow
- [ ] GPS proximity check within radius before claim allowed
- [ ] GPS accuracy check (≤50m) enforced
- [ ] One claim per hunter per drop enforced (error on duplicate)
- [ ] Success: Voucher with QR code displayed immediately
- [ ] Failure: Clear error message with specific reason
- [ ] Promo code auto-assigned if available (shown in voucher)
- [ ] Voucher accessible via magic link without login
- [ ] Anonymous claim creates hunter account automatically

#### Redemption Flow
- [ ] Merchant can scan QR and see voucher details in <1 second
- [ ] Staff can redeem with valid scanner token
- [ ] Double-redemption prevented (atomic, error on attempt)
- [ ] Expired vouchers rejected with clear message
- [ ] Wrong merchant redemption rejected (403)
- [ ] Timer/window violations rejected with specific reason
- [ ] Promo code displayed during redemption (if exists)
- [ ] Redemption confirmation shows timestamp

#### AR Hunt Mode
- [ ] Camera feed opens with <3 second initialization
- [ ] 3D coin appears in correct direction based on compass
- [ ] Distance updates in real-time (5-second refresh)
- [ ] Directional arrow when target off-screen
- [ ] Tap coin initiates claim flow
- [ ] GPS accuracy warning if >50m
- [ ] Graceful fallback to list view if camera denied
- [ ] Particle burst animation on successful claim

### 6.2 Merchant Experience

#### Registration & Verification
- [ ] Registration requires email, password, business name, username
- [ ] Username unique error shown if taken
- [ ] Password strength enforced (8+ chars, uppercase, number)
- [ ] Email verification required before drop creation (if email enabled)
- [ ] Verification email sent automatically on register
- [ ] Can resend verification (rate limited 1/min)
- [ ] Login blocked until verified

#### Drop Management
- [ ] Can create drop with all required fields
- [ ] Form validation shows specific errors per field
- [ ] Map picker for location selection
- [ ] Radius slider (5-2000m) with visual indicator
- [ ] Schedule optional but validated if provided (end > start)
- [ ] Availability limit only shown/applicable if "limited" selected
- [ ] Can edit drop until first claim (then restrictions apply)
- [ ] Soft delete blocked if any claims exist
- [ ] Drop activation/deactivation immediate

#### Analytics Dashboard
- [ ] Overview stats load in <3 seconds
- [ ] Conversion rate calculated correctly (redemptions/claims)
- [ ] Time-series chart shows 30 days by default
- [ ] Drop performance list sortable
- [ ] Average time to redemption shown (hours)
- [ ] CSV export downloads successfully
- [ ] Data updates in near real-time (<30 second delay acceptable)

#### Scanner Token Management
- [ ] Generate token creates unique 64-char string
- [ ] Token shown once with copy button
- [ ] 24-hour expiration displayed
- [ ] New token invalidates old token
- [ ] Token displayed in settings until expired
- [ ] Scanner URL works without login
- [ ] Scanner shows merchant confirmation

#### Promo Code Management
- [ ] Bulk upload accepts comma/newline separated codes
- [ ] Duplicate detection (case-insensitive)
- [ ] Counts update immediately: total/available/assigned
- [ ] Delete unused codes in bulk
- [ ] Cannot delete assigned codes (error shown)
- [ ] Auto-assignment happens at claim time

### 6.3 Hunter Experience

#### Anonymous vs Registered
- [ ] Device-based hunting works without any signup
- [ ] Claims persist to device ID
- [ ] Registration optional from profile page
- [ ] Registered users can view history across devices
- [ ] Login merges device history (if same email)

#### Profile Management
- [ ] Nickname editable (2-20 chars)
- [ ] Optional profile fields: DOB, gender, mobile
- [ ] Stats shown: total claims, redemptions, rank
- [ ] Claim history paginated (20 per page)
- [ ] Leaderboard position shown if ranked

#### Voucher Management
- [ ] My vouchers list shows unredeemed first
- [ ] Each voucher shows: drop name, reward, expiration countdown
- [ ] QR code scannable from screen
- [ ] Promo code visible if assigned
- [ ] Share via email works (if SMTP configured)
- [ ] Share via WhatsApp uses wa.me link
- [ ] Magic link opens voucher directly

### 6.4 Admin Experience

#### Platform Dashboard
- [ ] Total counts: merchants, drops, vouchers, hunters
- [ ] Verified vs unverified merchant breakdown
- [ ] Active vs inactive drops
- [ ] Platform conversion rate (claims → redemptions)
- [ ] Recent activity feed (last 24 hours)

#### Merchant Management
- [ ] List all merchants with pagination (20 per page)
- [ ] Filter: verified/unverified/suspended
- [ ] Search: business name, email, username
- [ ] Suspend/unsuspend action immediate
- [ ] Verify/unverify email action immediate
- [ ] View merchant details: drops, vouchers, stats
- [ ] CSV export with all fields

#### Analytics
- [ ] Time-series charts: merchants, drops, claims, redemptions, hunters
- [ ] Granularity toggle: hourly/daily/weekly/monthly
- [ ] Date range picker (default 30 days)
- [ ] Peak hours heatmap (claims by hour)
- [ ] Top 10 merchants by claims
- [ ] Top 10 drops by claims
- [ ] Conversion rate trend line

#### Intervention
- [ ] Delete any drop (soft delete, admin only)
- [ ] Edit any drop (bypasses post-claim restrictions)
- [ ] Force merchant suspension with reason
- [ ] View full claim history for any user

### 6.5 Security & Trust

#### Authentication
- [ ] JWT tokens expire in 15 minutes (access) / 7 days (refresh)
- [ ] Refresh token rotation working (old revoked)
- [ ] Token reuse detection revokes entire family
- [ ] All tokens hashed in database (never plaintext)
- [ ] Timing-safe comparison used for all token validation

#### Account Security
- [ ] Failed login attempts tracked per account
- [ ] Lockout after 5 failures (2 hours merchants, 15 min hunters)
- [ ] Password reset tokens expire in 1 hour
- [ ] Session invalidation on password change
- [ ] Suspended accounts cannot login (immediate effect)

#### Rate Limiting
- [ ] Login endpoints: 5 per 15 minutes per IP
- [ ] Registration: 3 per hour per IP
- [ ] Claims: 10 per hour per device
- [ ] Returns 429 status with retry-after header

#### Data Protection
- [ ] Soft deletes used (no hard deletion)
- [ ] Deleted entities excluded from public queries
- [ ] Ownership verified on every mutation
- [ ] Role-based access control enforced
- [ ] Input validation on all endpoints

### 6.6 Performance & Reliability

#### Speed Targets
- [ ] Active drops list: <500ms (p95)
- [ ] Claim operation: <2 seconds end-to-end
- [ ] Redemption scan: <1 second processing
- [ ] Analytics queries: <3 seconds
- [ ] Image uploads: <5 seconds for 5MB

#### Availability
- [ ] 99%+ uptime during business hours (6AM-12AM KSA)
- [ ] Health check endpoint responds
- [ ] Database connectivity monitored
- [ ] Graceful degradation if GPS unavailable
- [ ] Works offline for viewing cached vouchers (PWA)

### 6.7 Localization

#### Bilingual Support
- [ ] All UI text available in English and Arabic
- [ ] RTL layout for Arabic (mirrored interface)
- [ ] Date formats: localized (e.g., "15 يناير 2026" for Arabic)
- [ ] Number formats: Arabic numerals or Eastern Arabic per locale
- [ ] Currency: SAR (Saudi Riyal) formatting

#### Language Switching
- [ ] Language toggle in header
- [ ] Preference persisted across sessions
- [ ] Default based on browser locale (fallback to English)
- [ ] All error messages translated

### 6.8 Integration Features

#### Email (if configured)
- [ ] Verification emails sent successfully
- [ ] Password reset emails delivered
- [ ] Voucher sharing emails include magic link
- [ ] HTML templates render correctly
- [ ] Bounces handled gracefully

#### WhatsApp (if configured)
- [ ] Server-side messages sent via Twilio (optional)
- [ ] Client-side wa.me links work as fallback
- [ ] Phone number validation (E.164 format)

#### File Storage
- [ ] Presigned URLs generated in <500ms
- [ ] Uploads succeed to MinIO/S3
- [ ] Public URLs accessible
- [ ] File size limit enforced (5MB)
- [ ] MIME type whitelist enforced

---

## 7. Appendix

### 7.1 Terminology Glossary

| Term | Definition |
|------|------------|
| **Drop** | A location-based reward created by a merchant |
| **Hunter** | A customer/user who discovers and claims drops |
| **Voucher** | A claimed reward, represented as a digital certificate with QR code |
| **Magic Token** | A bearer token that grants access to a voucher (like a password) |
| **Promo Code** | An optional code (coupon, gift card) assigned to vouchers |
| **Scanner Token** | A temporary credential for staff to redeem vouchers without login |
| **Redemption** | The act of using a voucher at point of sale to receive the reward |
| **AR Hunt** | Augmented reality mode where users find drops through camera overlay |
| **Radius** | Geographic distance within which a drop can be claimed (5-2000m) |
| **Availability** | How many times a drop can be claimed (unlimited vs limited) |
| **Schedule** | Time window when a drop is claimable (optional start/end dates) |
| **Redemption Type** | Rules for when a voucher must be redeemed (anytime/timer/window) |
| **Soft Delete** | Marking an entity as deleted without removing it from database |
| **Redeemer Hunter** | A hunter authorized to redeem vouchers for a specific merchant |
| **Token Family** | Group of related refresh tokens for reuse detection |
| **Geohash** | (Not used - we use MongoDB 2dsphere indexes) |
| **Haversine** | Formula for calculating Earth-surface distance between GPS points |
| **2dsphere** | MongoDB geospatial index type for spherical geometry |
| **PWA** | Progressive Web App - installable web application |
| **Presigned URL** | Temporary authenticated URL for direct file upload to storage |
| **Rate Limiting** | Restricting request frequency to prevent abuse |
| **Timing Attack** | Security vulnerability based on measuring operation time |
| **Bearer Token** | Token sent in Authorization header for API access |
| **TTL** | Time To Live - expiration duration |
| **CORS** | Cross-Origin Resource Sharing - browser security mechanism |

### 7.2 Configuration Options

#### Feature Flags (Environment Variables)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENABLE_EMAIL` | Send transactional emails | `true` |
| `ENABLE_SMS` | Enable Twilio WhatsApp | `false` |
| `MAGIC_TOKEN_EXPIRY_DAYS` | Voucher magic link validity | `30` |
| `SCANNER_TOKEN_EXPIRY_HOURS` | Staff token validity | `24` |
| `MAX_FILE_SIZE` | Upload limit in bytes | `5242880` (5MB) |
| `MAX_LOGIN_ATTEMPTS` | Failed logins before lockout | `5` |
| `LOCKOUT_DURATION_MINUTES` | Merchant lockout time | `120` (2 hours) |
| `VOUCHER_CLAIM_LIMIT_PER_DEVICE_HOUR` | Claims per device per hour | `10` |
| `THROTTLER_TTL` | Rate limit window | `60` seconds |
| `THROTTLER_LIMIT` | Requests per window | `100` |

#### Storage Providers

**MinIO (Development)**:
- Endpoint: configurable (default localhost:9000)
- Bucket: `souqsnap-uploads`
- SSL: optional

**AWS S3 (Production)**:
- Region, access key, secret key configurable
- Bucket name configurable
- Public URL for CDN

**Vercel Blob (Serverless)**:
- BLOB_READ_WRITE_TOKEN required
- Automatic hosting

#### Email Providers

**SMTP**:
- Host, port, user, password configurable
- From name and email
- Secure flag for TLS

**SendGrid/Postmark** (future):
- API key based
- Template support

### 7.3 API Versioning & Deprecation

**Current Version**: v1
**Base Path**: `/api/v1/`

**Deprecation Policy** (Future):
- 6-month notice for breaking changes
- Sunset headers in responses
- Version negotiation via Accept header

### 7.4 Error Code Reference

| HTTP Code | Meaning | Common Causes |
|-----------|---------|---------------|
| `400` | Bad Request | Validation failed, missing required fields, invalid format |
| `401` | Unauthorized | Missing/invalid JWT, unverified email, expired token |
| `403` | Forbidden | Wrong ownership, wrong merchant, expired scanner, insufficient role |
| `404` | Not Found | Entity doesn't exist, soft-deleted, wrong ID |
| `409` | Conflict | Duplicate claim, already exists, race condition |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Database error, unexpected exception |

### 7.5 File Upload Specifications

**Allowed MIME Types**:
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)
- `image/svg+xml` (.svg)

**Size Limits**:
- Maximum: 5MB per file
- Recommended: <500KB for logos, <2MB for photos

**Naming**:
- Original filename sanitized
- Path traversal stripped
- Stored as: `uploads/{userId}/{timestamp}-{uuid}.{ext}`

### 7.6 Database Schema Summary

**Collections**:
1. `merchants` - Business accounts
2. `hunters` - Customer accounts (device or registered)
3. `drops` - Location-based rewards
4. `vouchers` - Claimed rewards
5. `promo_codes` - Unique codes for drops
6. `admins` - Platform administrators
7. `refresh_tokens` - JWT refresh token storage
8. `email_verification_tokens` - Email verification state

**Key Indexes**:
- Geospatial: `drops.location` (2dsphere)
- Unique: `merchants.email`, `merchants.username`, `hunters.deviceId`, `vouchers.magicToken`
- Compound unique: `{dropId, claimedBy.hunterId, deletedAt}` (prevents duplicate claims)

### 7.7 Third-Party Integrations

**Maps**:
- Leaflet + OpenStreetMap (default)
- Google Maps (optional, requires API key)
- Directions link to Google Maps

**Communication**:
- SMTP (transactional email)
- Twilio WhatsApp Business API (optional)

**Storage**:
- MinIO (S3-compatible, self-hosted)
- AWS S3 (managed)
- Vercel Blob (serverless)

### 7.8 Browser/Device Support

**Minimum Requirements**:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+

**Required APIs**:
- Geolocation API (with permission)
- Camera API (for AR mode and QR scanning)
- Device Orientation API (for compass in AR)
- LocalStorage/IndexedDB (for PWA caching)

**Graceful Degradation**:
- No camera → List view instead of AR
- No geolocation → Search by location name
- No compass → Distance-only display

---

*Document Version: 2.0*  
*Last Updated: April 2026*  
*Product: SouqSnap V2*  
*Coverage: Complete platform including API, web client, and admin tools*
