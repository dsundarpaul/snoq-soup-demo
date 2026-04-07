# SouqSnap Security Review

**Review Date:** April 2, 2026  
**Platform:** SouqSnap API (NestJS + MongoDB)  
**Scope:** Full-stack security assessment of backend API  
**Reviewer:** AI Security Analysis

---

## Executive Summary

**Overall Security Posture:** MODERATE-HIGH (7.5/10)  
**Critical Issues:** 4  
**High Issues:** 8  
**Medium Issues:** 12  
**Low Issues:** 6

The platform has a solid security foundation with JWT authentication, bcrypt password hashing, rate limiting, and soft-delete patterns. However, several critical vulnerabilities exist around device ID spoofing, geolocation spoofing, missing email verification enforcement, and inadequate business logic protections against abuse.

---

## CRITICAL SEVERITY (Fix Immediately)

### 1. Device ID Spoofing - Complete Authentication Bypass

**Risk:** HIGH | **Exploitability:** TRIVIAL | **Impact:** COMPLETE ACCOUNT TAKEOVER

**Vulnerability:**
The `DeviceGuard` (`device.guard.ts:39-45`) only validates deviceId length (3-255 chars) with NO cryptographic verification. Attackers can impersonate any hunter by sending a victim's deviceId.

```typescript
// Current (BROKEN)
if (typeof deviceId !== "string" || deviceId.length < 3 || deviceId.length > 255) {
  throw new BadRequestException("Invalid device ID format");
}
```

**Attack Scenario:**
1. Attacker harvests device IDs from API responses or brute-forces common patterns
2. Attacker calls `POST /vouchers/claim` with victim's deviceId
3. Attacker steals all vouchers from victim's claim history
4. Attacker calls `GET /hunters/me/history` to view victim's complete activity

**Proof of Concept:**
```bash
# Impersonate any hunter
curl -X POST https://api.souqsnap.com/vouchers/claim \
  -H "X-Device-Id: victim-device-123" \
  -d '{"dropId": "..."}'
```

**Remediation:**
```typescript
// SOLUTION 1: Device Binding with Public Key Cryptography
// Device generates RSA keypair on first install, registers public key
// All requests include signed challenges

// SOLUTION 2: Firebase App Check / reCAPTCHA v3
// Verify requests come from legitimate app installation

// SOLUTION 3: Device Fingerprinting + Confidence Score
interface DeviceFingerprint {
  userAgentHash: string;
  screenResolution: string;
  timezone: string;
  installedFonts: string[];
  webglRenderer: string;
  confidenceScore: number; // Reject if < 0.8
}
```

**Priority:** P0 - Fix within 24 hours

---

### 2. Magic Token Entropy Insufficient

**Risk:** MEDIUM | **Exploitability:** MODERATE | **Impact:** UNAUTHORIZED VOUCHER ACCESS

**Vulnerability:**
`vouchers.service.ts:84` uses `randomBytes(16).toString("hex")` = 128-bit tokens displayed in URLs.

```typescript
const magicToken = randomBytes(16).toString("hex"); // 32 hex chars = 128 bits
```

**Attack Scenario:**
Magic links shared via SMS/WhatsApp may be logged by carriers/ intermediaries. 128-bit tokens are theoretically guessable at scale.

**Remediation:**
```typescript
// Increase to 256-bit minimum
const magicToken = randomBytes(32).toString("base64url"); // 256 bits, URL-safe

// Add token binding to voucher context
const magicToken = generateToken({
  voucherId,
  dropId,
  deviceId,
  timestamp: Date.now(),
  nonce: randomBytes(16),
});
```

---

### 3. Email Verification Not Enforced

**Risk:** HIGH | **Exploitability:** TRIVIAL | **Impact:** ACCOUNT ABUSE, SPAM

**Vulnerability:**
`jwt.strategy.ts:51-57` has code to check email verification but `verifyEmail` is never called during registration flow. Merchants get full access immediately.

**Current Flow:**
1. Register → Immediate JWT tokens returned
2. Email sent but not required
3. Attacker can create infinite accounts with fake emails

**Remediation:**
1. Remove tokens from registration response
2. Add `emailVerified: false` to JWT and reject in guard
3. Require verification before any drop creation

---

### 4. Geolocation Spoofing - No Server-Side Validation

**Risk:** HIGH | **Exploitability:** EASY | **Impact:** FRAUDULENT CLAIMS

**Vulnerability:**
`drops.controller.ts:53-62` accepts any lat/lng from client with NO verification:

```typescript
async findActiveNearby(
  @Query("lat") lat: number,
  @Query("lng") lng: number,
  @Query("radius") radius: number,
): Promise<ActiveDropsResponseDto>
```

**Attack Scenario:**
Attacker uses GPS spoofing app or simply modifies API calls to claim drops from anywhere in the world without physical presence.

**Remediation:**
```typescript
// SOLUTION 1: IP Geolocation Validation
import geoip from 'geoip-lite';

async validateLocation(lat: number, lng: number, req: Request) {
  const clientIp = req.ip;
  const geo = geoip.lookup(clientIp);
  
  if (!geo) throw new ForbiddenException("Location validation failed");
  
  const distance = calculateDistance(lat, lng, geo.ll[0], geo.ll[1]);
  if (distance > 50) { // 50km tolerance
    throw new ForbiddenException("GPS location doesn't match IP geolocation");
  }
}

// SOLUTION 2: AR/Photo Proof of Location (Advanced)
// Require photo upload with EXIF GPS data at claim time

// SOLUTION 3: Location Confidence Score
interface LocationVerification {
  gps: { lat, lng, accuracy };
  ipGeo: { country, city, lat, lng };
  wifiTriangulation?: { ... };
  cellTower?: { ... };
  confidence: number; // Must be > 0.7
}
```

---

## HIGH SEVERITY (Fix Within 1 Week)

### 5. Missing Request Signing for Critical Operations

**Risk:** HIGH | **Impact:** REPLAY ATTACKS, REQUEST TAMPERING

**Vulnerability:**
Voucher claims and redemptions have no request signing or nonce verification. Attackers can replay legitimate requests.

**Remediation:**
```typescript
// Add HMAC signature to sensitive requests
interface SignedRequest {
  payload: any;
  timestamp: number;
  nonce: string;
  signature: string; // HMAC-SHA256(clientSecret + payload + timestamp + nonce)
}

// Server validates signature and checks nonce cache (prevent replay)
```

---

### 6. Scanner Token Has No Expiration Check in Redeem Flow

**Risk:** MEDIUM | **Impact:** UNAUTHORIZED REDEMPTIONS

**Vulnerability:**
`scanner.service.ts:103-107` validates token on redeem but `vouchers.controller.ts:79-86` calls `redeem` directly without expiration check.

**Current:**
```typescript
async redeem(
  @Body() dto: RedeemVoucherDto,
  @Request() req: ExpressRequest,
): Promise<RedeemResultDto> {
  const redeemerType = (req as any).user.type; // Could be stale scanner token
  const redeemerId = (req as any).user.userId;
  return this.vouchersService.redeem(dto, redeemerType, redeemerId);
}
```

**Remediation:**
Add scanner token expiration check in JwtStrategy or create dedicated ScannerJwtStrategy.

---

### 7. No Webhook Validation for External Services

**Risk:** HIGH | **Impact:** PAYMENT FRAUD, DATA EXFILTRATION

**Vulnerability:**
When email/WhatsApp webhooks are implemented (currently TODO), there's no signature validation for incoming webhooks.

**Remediation:**
```typescript
// Implement webhook signature validation
function validateWebhookSignature(payload: any, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

### 8. Missing Database Encryption at Rest

**Risk:** MEDIUM | **Impact:** DATA BREACH EXPOSURE

**Vulnerability:**
MongoDB connection string has no encryption options. PII (emails, phone numbers, device IDs) stored in plaintext.

**Remediation:**
```typescript
// Enable MongoDB Client-Side Field Level Encryption
const keyVaultNamespace = 'encryption.__keyVault';
const kmsProviders = {
  aws: { accessKeyId, secretAccessKey },
  // or local for dev
};

// Encrypt sensitive fields
@Prop({ 
  type: String,
  encrypt: {
    keyId: '/emailKey',
    algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
  }
})
email!: string;
```

---

### 9. No Rate Limiting Per-Device for Claims

**Risk:** MEDIUM | **Impact:** VOUCHER HOARDING, DROP DEPLETION

**Vulnerability:**
Only global rate limits exist. A single device can claim all vouchers from a limited drop.

**Remediation:**
```typescript
@Injectable()
export class ClaimRateLimitGuard implements CanActivate {
  constructor(@InjectRedis() private redis: Redis) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId = request.deviceId;
    const dropId = request.body.dropId;
    
    const key = `claims:${deviceId}:${dropId}`;
    const claims = await this.redis.incr(key);
    
    if (claims === 1) {
      await this.redis.expire(key, 3600); // 1 hour window
    }
    
    if (claims > 3) { // Max 3 claims per device per drop per hour
      throw new TooManyRequestsException("Claim limit reached for this device");
    }
    
    return true;
  }
}
```

---

### 10. File Upload - Path Traversal Risk

**Risk:** MEDIUM | **Impact:** ARBITRARY FILE OVERWRITE

**Vulnerability:**
`upload.service.ts:137-141` generates S3 keys with user-provided filename extension:

```typescript
private generateKey(userId: string, originalFilename: string): string {
  const extension = extname(originalFilename).toLowerCase();
  return `uploads/${userId}/${timestamp}-${uuid}${extension}`;
}
```

If `originalFilename` is `../../../etc/passwd`, this could traverse directories (though S3 may prevent this).

**Remediation:**
```typescript
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

private generateKey(userId: string, originalFilename: string): string {
  const extension = extname(originalFilename).toLowerCase();
  
  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new BadRequestException("Invalid file extension");
  }
  
  // Sanitize filename - remove path components
  const safeUuid = randomUUID();
  return `uploads/${userId}/${Date.now()}-${safeUuid}${extension}`;
}
```

---

### 11. Missing Audit Logging

**Risk:** HIGH | **Impact:** UNDETECTED BREACHES, COMPLIANCE FAILURE

**Vulnerability:**
No comprehensive audit trail for:
- Login attempts (success/failure)
- Voucher claims/redeems
- Admin actions
- Sensitive data access

**Remediation:**
```typescript
@Injectable()
export class AuditService {
  async log(event: AuditEvent) {
    await this.database.auditLogs.create({
      timestamp: new Date(),
      userId: event.userId,
      userType: event.userType,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      success: event.success,
      details: event.details,
      // Immutable, never deleted
    });
  }
}
```

---

### 12. JWT Secret Rotation Not Supported

**Risk:** MEDIUM | **Impact:** EXTENDED BREACH WINDOW

**Vulnerability:**
Single `JWT_SECRET` env var with no versioning. If leaked, all tokens compromised with no way to invalidate.

**Remediation:**
```typescript
// Implement JWT key rotation
interface JwtKey {
  kid: string;          // Key ID
  secret: string;       // Actual secret
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

// JWT header includes kid for verification
const token = jwt.sign(payload, currentKey.secret, { 
  header: { kid: currentKey.kid }
});

// Verification looks up correct key by kid
```

---

## MEDIUM SEVERITY (Fix Within 1 Month)

### 13. CORS Configuration Too Permissive

**Vulnerability:**
`main.ts:30-35` allows all origins in development:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(",") || true, // true = any origin!
  credentials: true,
});
```

**Remediation:**
```typescript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://app.souqsnap.com'
];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

---

### 14. Missing Content Security Policy Headers

**Vulnerability:**
Helmet is configured but CSP `scriptSrc` allows `'unsafe-inline'` which defeats XSS protection.

**Remediation:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // Remove unsafe-inline
      styleSrc: ["'self'"],
      connectSrc: ["'self'", process.env.API_URL],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
```

---

### 15. Password Complexity Requirements Weak

**Vulnerability:**
`register-merchant.dto.ts:39-43` only requires 1 uppercase + 1 number. No special chars, common password check.

**Remediation:**
```typescript
import { zxcvbn } from 'zxcvbn'; // Or similar

@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/, {
  message: "Password must be 12+ chars with uppercase, lowercase, number, and special char"
})

// Additional entropy check
validatePasswordStrength(password: string) {
  const result = zxcvbn(password);
  if (result.score < 3) {
    throw new BadRequestException(`Password too weak: ${result.feedback.suggestions.join(', ')}`);
  }
}
```

---

### 16. No Database Connection Encryption

**Vulnerability:**
`database.module.ts:22-24` doesn't enforce TLS for MongoDB connection.

**Remediation:**
```typescript
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri: configService.get('MONGODB_URI'),
    ssl: true,
    sslValidate: true,
    sslCA: fs.readFileSync('./rds-combined-ca-bundle.pem'),
    retryWrites: true,
    w: 'majority',
  }),
});
```

---

### 17. Missing API Versioning Strategy

**Vulnerability:**
URL versioning (`/api/v1/`) but no sunset policy or deprecation warnings.

**Remediation:**
```typescript
// Add deprecation headers
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
})

// Middleware to add deprecation warnings
@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.startsWith('/api/v1/')) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date('2026-12-31').toUTCString());
      res.setHeader('Link', '</api/v2/users>; rel="successor-version"');
    }
    next();
  }
}
```

---

### 18. Scanner Token Insufficiently Random

**Vulnerability:**
`merchants.service.ts:68` uses 32-byte hex = 64 chars but doesn't include timestamp binding.

**Remediation:**
```typescript
async generateScannerToken(id: string): Promise<ScannerTokenResponseDto> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Include merchantId in token hash for binding
  const tokenHash = createHash('sha256')
    .update(token + id + expiresAt.toISOString())
    .digest('hex');
  
  return {
    token: `${token}.${expiresAt.getTime()}`, // Include expiry in token
    expiresAt,
  };
}
```

---

### 19. Missing Health Check Security

**Vulnerability:**
Health endpoint (if exists) likely exposed without authentication, revealing system info.

**Remediation:**
```typescript
@Controller('health')
export class HealthController {
  @Get()
  @UseGuards(InternalGuard) // Only allow from internal network/monitoring
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

---

### 20. Error Messages Leak Information

**Vulnerability:**
`http-exception.filter.ts:37` returns detailed error messages to client.

**Remediation:**
```typescript
private extractMessage(exceptionResponse: string | object): string {
  // In production, return generic messages
  if (process.env.NODE_ENV === 'production') {
    const status = exception.getStatus();
    if (status >= 500) return 'Internal server error';
    if (status === 401) return 'Authentication required';
    if (status === 403) return 'Access denied';
    return 'Request failed';
  }
  // Development: detailed messages
  // ...
}
```

---

### 21. No Distributed Tracing

**Vulnerability:**
Can't trace requests across services or identify attack patterns.

**Remediation:**
```typescript
// Add OpenTelemetry
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT,
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new MongooseInstrumentation(),
  ],
});
```

---

### 22. Business Logic: No Cooldown Between Claims

**Vulnerability:**
Hunter can claim multiple drops in rapid succession without rate limiting per drop type.

**Remediation:**
Add cooldown period between claims from same device:
```typescript
const COOLDOWN_SECONDS = 30;
const key = `claim:cooldown:${deviceId}`;
const lastClaim = await redis.get(key);

if (lastClaim && Date.now() - parseInt(lastClaim) < COOLDOWN_SECONDS * 1000) {
  throw new TooManyRequestsException(`Wait ${COOLDOWN_SECONDS}s between claims`);
}

await redis.setex(key, COOLDOWN_SECONDS, Date.now().toString());
```

---

### 23. No Fraud Detection for Redemptions

**Vulnerability:**
Merchant can redeem same voucher multiple times (race condition), or redeem at impossible speeds.

**Remediation:**
```typescript
// Distributed lock for redemption
async redeemWithLock(voucherId: string, redeemerId: string) {
  const lockKey = `redeem:lock:${voucherId}`;
  const lock = await redis.set(lockKey, redeemerId, 'EX', 10, 'NX');
  
  if (!lock) {
    throw new ConflictException("Redemption in progress");
  }
  
  try {
    return await this.performRedemption(voucherId, redeemerId);
  } finally {
    await redis.del(lockKey);
  }
}
```

---

### 24. Missing Data Retention Policy

**Vulnerability:**
No automatic purging of old refresh tokens, audit logs, or soft-deleted records.

**Remediation:**
```typescript
// MongoDB TTL indexes
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

// Hard delete job for soft-deleted records older than 30 days
@Injectable()
export class DataRetentionService {
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldData() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await Promise.all([
      this.database.vouchers.deleteMany({ deletedAt: { $lt: cutoff } }),
      this.database.drops.deleteMany({ deletedAt: { $lt: cutoff } }),
      // ...
    ]);
  }
}
```

---

## LOW SEVERITY (Fix When Convenient)

### 25. Missing Security Headers

Add:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), camera=(self)`

---

### 26. API Documentation Reveals Internal Details

Swagger docs (`main.ts:54-78`) exposed in production may reveal sensitive endpoints.

**Remediation:**
```typescript
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

---

### 27. No Request ID Tracking

Add correlation ID for request tracing:
```typescript
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

### 28. Missing Input Sanitization for Search

Search endpoints may be vulnerable to NoSQL injection if user input passed directly to `$regex`.

**Remediation:**
```typescript
// Escape regex special characters
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

### 29. No Backup Verification

Database backups may be untested. Add automated restore testing.

---

### 30. Dependency Vulnerability Scanning Missing

Add `npm audit` and Snyk/Dependabot to CI/CD pipeline.

---

## SECURITY ENHANCEMENTS (Creative & Advanced)

### A. Behavioral Biometrics for Hunters

Implement device behavior fingerprinting:
```typescript
interface BehaviorProfile {
  typingSpeed: number;
  swipePatterns: Vector[];
  gyroscopeUsage: Pattern;
  sessionDuration: Statistics;
  claimTimeOfDay: Histogram;
}

// Detect account takeover via behavioral anomaly detection
if (behaviorScore < 0.3) {
  await requireAdditionalVerification(deviceId);
}
```

### B. Honeypot Drops

Create invisible drops to detect GPS spoofers:
```typescript
@Cron(CronExpression.EVERY_HOUR)
async createHoneypotDrops() {
  // Create drops at impossible locations (middle of ocean, Antarctica)
  // Log any claims as fraudulent device IDs
  const honeypot = await this.drops.create({
    location: { lat: 0, lng: 0 }, // Atlantic Ocean
    name: "[HONEYPOT] Do Not Claim",
    invisible: true, // Not shown in normal listings
  });
}
```

### C. Zero-Knowledge Proofs for Location

Use zk-SNARKs to prove location without revealing exact coordinates:
```typescript
// Hunter generates proof: "I'm within 15m of drop" without revealing lat/lng
const proof = generateZkProof({
  privateInput: { lat: userLat, lng: userLng },
  publicInput: { dropLocationHash, radius },
});

// Server verifies proof without learning user location
const valid = verifyZkProof(proof);
```

### D. Blockchain-Based Voucher Anchoring

Anchor voucher claims to blockchain for immutable audit trail:
```typescript
async anchorVoucher(voucherId: string) {
  const tx = await ethereumContract.methods.claim(
    hash(voucherId),
    hash(dropId),
    timestamp
  ).send();
  
  return tx.hash; // Permanent, tamper-proof record
}
```

### E. Dynamic Risk-Based Authentication

Adjust security requirements based on risk score:
```typescript
interface RiskFactors {
  newDevice: boolean;
  unusualLocation: boolean;
  rapidClaims: boolean;
  torExitNode: boolean;
  failedAttempts: number;
}

function calculateRiskScore(factors: RiskFactors): number {
  return weightedSum(factors); // 0-100
}

// High risk: require MFA
// Medium risk: require email verification
// Low risk: standard JWT
```

### F. Differential Privacy for Analytics

Add noise to analytics to prevent individual tracking:
```typescript
function anonymizeStats(stats: PlatformStats): AnonymizedStats {
  return {
    totalMerchants: stats.totalMerchants + laplaceNoise(1),
    totalClaims: roundToNearest100(stats.totalClaims),
    // Remove individual-identifying aggregations
  };
}
```

---

## COMPLIANCE CHECKLIST

| Requirement | Status | Notes |
|-------------|--------|-------|
| GDPR Right to Erasure | ⚠️ Partial | Soft delete only, no hard delete API |
| GDPR Data Portability | ❌ Missing | No export user data endpoint |
| GDPR Consent Tracking | ❌ Missing | No consent management |
| PCI DSS | ⚠️ N/A | No payment processing yet |
| SOC 2 Audit Logging | ❌ Missing | No comprehensive audit trail |
| CCPA Data Inventory | ⚠️ Partial | PII identified but not cataloged |
| KSA PDPL (Saudi) | ⚠️ Partial | Location data needs explicit consent |

---

## PRIORITY ACTION PLAN

### Week 1 (Critical)
1. Implement device fingerprinting + confidence score
2. Add server-side geolocation validation (IP + GPS correlation)
3. Enforce email verification before merchant activation
4. Fix scanner token expiration checks
5. Add per-device rate limiting for claims

### Week 2 (High)
6. Implement comprehensive audit logging
7. Add request signing for voucher operations
8. Enable MongoDB encryption at rest
9. Implement distributed locking for redemptions
10. Fix CORS to not allow `true` in production

### Week 3 (Medium)
11. Add JWT key rotation
12. Implement webhook signature validation
13. Add password strength validation with zxcvbn
14. Enable MongoDB TLS
15. Add security headers

### Month 2 (Ongoing)
16. Implement behavioral biometrics
17. Add honeypot drops
18. Create GDPR compliance endpoints
19. Add differential privacy to analytics
20. Implement backup verification

---

## SECURITY METRICS TO TRACK

```typescript
// Track these in your monitoring dashboard
interface SecurityMetrics {
  // Authentication
  failedLoginAttempts: Counter;
  accountLockouts: Counter;
  tokenReuseDetections: Counter;
  
  // Fraud
  suspiciousLocationClaims: Counter;
  honeypotTriggers: Counter;
  rapidClaimSequences: Counter;
  
  // Abuse
  rateLimitHits: Counter;
  deviceIdCollisions: Counter;
  scannerTokenFailures: Counter;
  
  // Compliance
  dataExportRequests: Counter;
  deletionRequests: Counter;
  auditLogEntries: Counter;
}
```

---

*This review represents a point-in-time assessment. Security is an ongoing process requiring continuous monitoring, testing, and improvement.*
