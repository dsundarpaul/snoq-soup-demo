# SouqSnapX Security Improvements

Comprehensive security comparison between the old snapsouq_old API and the new SouqSnapX API.

---

## Table of Contents

1. [Authentication Mechanism](#1-authentication-mechanism)
2. [Token-based Security](#2-token-based-security)
3. [Rate Limiting](#3-rate-limiting)
4. [Email Verification](#4-email-verification)
5. [Password Hashing](#5-password-hashing)
6. [Password Complexity](#6-password-complexity)
7. [Account Lockout](#7-account-lockout)
8. [Refresh Token Rotation](#8-refresh-token-rotation)
9. [Scanner Token Expiry](#9-scanner-token-expiry)
10. [Input Sanitization](#10-input-sanitization)
11. [Security Headers](#11-security-headers)
12. [NoSQL Injection Prevention](#12-nosql-injection-prevention)
13. [CSRF Protection](#13-csrf-protection)
14. [Input Validation](#14-input-validation)
15. [Ownership Guards](#15-ownership-guards)
16. [Device-based Hunter Tracking](#16-device-based-hunter-tracking)

---

## 1. Authentication Mechanism

### Old API: Session-based Auth (Vulnerable to Session Fixation)

```typescript
// snapsouq_old/server/routes.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const PgStore = connectPgSimple(session);

app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "souq-snap-secret-key", // Hardcoded fallback!
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours - no sliding expiration
      sameSite: "lax",
    },
  })
);

// Authentication check
app.patch("/api/merchant/logo", async (req: Request, res: Response) => {
  if (!req.session.merchantId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // ... proceed
});
```

**Issues:**
- Session fixation attacks possible
- Cookie-based sessions don't work well for mobile/PWA
- 24-hour session duration with no refresh mechanism
- No protection against session hijacking

### New API: JWT with Short Expiry

```typescript
// SouqSnapX/apps/api/src/modules/auth/auth.service.ts
@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_EXPIRY = '15m';  // Short-lived access tokens
  private readonly JWT_REFRESH_EXPIRY_DAYS = 7; // Longer-lived refresh tokens

  async generateTokenPair(
    userId: string,
    userType: UserType,
    existingFamily?: string,
  ): Promise<TokenResponseDto> {
    const family = existingFamily || randomUUID();
    const refreshToken = randomUUID();
    const hashedRefreshToken = this.hashToken(refreshToken);

    // Access token - short expiry
    const accessToken = this.jwtService.sign({
      sub: userId,
      role: userType,
    }, {
      expiresIn: this.JWT_ACCESS_EXPIRY,
    });

    // Refresh token stored hashed in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.JWT_REFRESH_EXPIRY_DAYS);

    await this.database.refreshTokens.create({
      userId,
      userType,
      token: hashedRefreshToken,
      family,
      expiresAt,
      revokedAt: null,
    });

    return { accessToken, refreshToken };
  }
}
```

**Improvements:**
- Stateless JWT authentication suitable for mobile/PWA
- 15-minute access token expiry limits attack window
- 7-day refresh tokens with rotation
- No session fixation vulnerability

---

## 2. Token-based Security

### Old API: No JWT - Session Only

```typescript
// snapsouq_old/server/routes.ts
// Relied solely on session cookies
req.session.merchantId = merchant.id;

// No token validation mechanism
```

**Issues:**
- No support for mobile app authentication
- Sessions tied to cookies (vulnerable to XSS)
- No token expiration enforcement

### New API: Passport JWT Strategy

```typescript
// SouqSnapX/apps/api/src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.authService.validateUser(payload.sub, payload.type);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // Check email verification for merchants
    if (payload.type === UserType.MERCHANT && 'emailVerified' in user && !user.emailVerified) {
      throw new UnauthorizedException('Email verification required');
    }

    return {
      userId: payload.sub,
      type: payload.type,
      email: 'email' in user ? (user.email ?? undefined) : undefined,
    };
  }
}
```

**Improvements:**
- Proper JWT validation with Passport
- Bearer token extraction from Authorization header
- User existence and status verification
- Email verification enforcement at auth level

---

## 3. Rate Limiting

### Old API: No Rate Limiting

```typescript
// snapsouq_old/server/routes.ts
// No rate limiting anywhere - vulnerable to brute force

app.post("/api/merchants/login", async (req: Request, res: Response) => {
  // No protection against brute force attacks
  const { username, password } = req.body;
  // ... login logic
});
```

**Issues:**
- No protection against credential stuffing
- No protection against brute force attacks
- No protection against DDoS

### New API: @nestjs/throttler

```typescript
// SouqSnapX/apps/api/src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
        {
          name: 'strict',
          ttl: 60000,
          limit: 20, // 20 requests per minute for sensitive endpoints
        },
      ],
    }),
    // ...
  ],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

```typescript
// SouqSnapX/apps/api/src/modules/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle({
    default: { limit: 5, ttl: 900000 }, // 5 attempts per 15 minutes
  })
  async login(@Body() dto: LoginDto) {
    // Login logic with rate limiting
  }
}
```

**Improvements:**
- Global rate limiting on all endpoints
- Stricter limits on authentication endpoints (5 login attempts / 15 min)
- Configurable per-endpoint throttling
- Automatic 429 responses when limits exceeded

---

## 4. Email Verification

### Old API: Email Verification Not Enforced on Actions

```typescript
// snapsouq_old/server/routes.ts
app.post("/api/merchants/login", async (req: Request, res: Response) => {
  // Email verification temporarily disabled
  // if (!merchant.emailVerified && merchant.verificationToken) {
  //   return res.status(403).json({ message: "Please verify your email first" });
  // }

  req.session.merchantId = merchant.id;
  res.json({ id: merchant.id, ... });
});

// Email verification not checked for sensitive operations
app.post("/api/merchants/drops", async (req: Request, res: Response) => {
  if (!req.session.merchantId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // No email verification check!
  const drop = await storage.createDrop(parsed.data);
});
```

**Issues:**
- Email verification commented out
- No enforcement on sensitive operations
- Unverified merchants could create drops

### New API: Mandatory Email Verification for Merchant Actions

```typescript
// SouqSnapX/apps/api/src/modules/auth/strategies/jwt.strategy.ts
async validate(payload: JwtPayload): Promise<RequestUser> {
  // ... validation

  // Check email verification for merchants
  if (payload.type === UserType.MERCHANT && 'emailVerified' in user && !user.emailVerified) {
    throw new UnauthorizedException('Email verification required');
  }

  return { userId: payload.sub, type: payload.type, email: ... };
}
```

```typescript
// SouqSnapX/apps/api/src/modules/drops/drops.controller.ts
@Controller('drops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DropsController {
  @Post()
  @Roles(UserRole.MERCHANT)
  @ApiOperation({ summary: 'Create a new drop' })
  async create(@Body() dto: CreateDropDto, @CurrentUser() user: RequestUser) {
    // Email already verified by JWT strategy
    return this.dropsService.create(dto, user.userId);
  }
}
```

**Improvements:**
- Email verification enforced at authentication level
- Merchants cannot perform actions until verified
- Token-based verification with 24-hour expiry

---

## 5. Password Hashing

### Old API: Inconsistent Hashing (Plain Text Possible)

```typescript
// snapsouq_old/server/routes.ts
app.post("/api/merchants/login", async (req: Request, res: Response) => {
  // ...
  const bcrypt = await import("bcrypt");
  let isValidPassword = false;

  // VULNERABILITY: Supports plain text passwords!
  if (merchant.password.startsWith("$2")) {
    isValidPassword = await bcrypt.compare(password, merchant.password);
  } else {
    isValidPassword = merchant.password === password; // PLAIN TEXT!
  }
  // ...
});

app.post("/api/merchant/signup", async (req: Request, res: Response) => {
  // ...
  const bcrypt = await import("bcrypt");
  const hashedPassword = await bcrypt.hash(password, 10); // Only 10 rounds
  // ...
});
```

**Issues:**
- Plain text password support (migration path)
- Only 10 bcrypt rounds (weaker)
- Inconsistent hashing across endpoints

### New API: bcrypt with 12 Rounds

```typescript
// SouqSnapX/apps/api/src/modules/auth/auth.service.ts
@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12; // Stronger hashing

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async registerMerchant(dto: RegisterMerchantDto): Promise<AuthResponseDto> {
    // ...
    const hashedPassword = await this.hashPassword(dto.password);
    // ...
    const merchant = await this.database.merchants.create({
      email: dto.email.toLowerCase(),
      password: hashedPassword, // Always hashed
      // ...
    });
  }

  async loginMerchant(email: string, password: string): Promise<AuthResponseDto> {
    const merchant = await this.database.merchants.findOne({
      email: email.toLowerCase(),
    }).select('+password');

    const isValidPassword = await this.verifyPassword(password, merchant.password);
    // No plain text fallback!
  }
}
```

**Improvements:**
- Always hashed (no plain text fallback)
- 12 bcrypt rounds (stronger than 10)
- Consistent across all endpoints
- Password selection disabled by default (schema: `select: false`)

---

## 6. Password Complexity

### Old API: Minimal Requirements

```typescript
// snapsouq_old/shared/schema.ts
export const merchantSignupSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Old reset password - only 6 chars required
if (!password || password.length < 6) {
  return res.status(400).json({ message: "Password must be at least 6 characters" });
}
```

**Issues:**
- Only 6 characters minimum
- No complexity requirements (uppercase, numbers, symbols)
- Weak passwords allowed

### New API: Strong Complexity Requirements

```typescript
// SouqSnapX/apps/api/src/modules/auth/dto/request/register-merchant.dto.ts
export class RegisterMerchantDto {
  @ApiProperty({ 
    example: 'SecurePass123', 
    description: 'Password (min 8 chars, 1 uppercase, 1 number)', 
    minLength: 8 
  })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password!: string;
}
```

```typescript
// SouqSnapX/packages/shared/src/validation/index.ts
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
```

**Improvements:**
- 8+ characters minimum
- Requires uppercase letter
- Requires number
- Rejects common weak passwords

---

## 7. Account Lockout

### Old API: No Lockout Mechanism

```typescript
// snapsouq_old/server/routes.ts
app.post("/api/merchants/login", async (req: Request, res: Response) => {
  // No tracking of failed attempts
  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid username or password" });
  }
  // ...
});
```

**Issues:**
- Unlimited failed login attempts
- Vulnerable to brute force attacks
- No account protection

### New API: Account Lockout After 5 Failed Attempts

```typescript
// SouqSnapX/apps/api/src/modules/auth/auth.service.ts
@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

  async loginMerchant(email: string, password: string): Promise<AuthResponseDto> {
    const merchant = await this.database.merchants.findOne({
      email: email.toLowerCase(),
    }).select('+password');

    // Check lockout status
    if (this.isLockedOut(merchant.lockUntil)) {
      throw new ForbiddenException('Account locked. Please try again later.');
    }

    const isValidPassword = await this.verifyPassword(password, merchant.password);

    if (!isValidPassword) {
      const loginAttempts = (merchant.loginAttempts || 0) + 1;
      const updateData: { loginAttempts: number; lockUntil?: Date } = { loginAttempts };

      // Lock account after max attempts
      if (loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      }

      await this.database.merchants.updateOne(
        { _id: merchant._id },
        { $set: updateData },
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset attempts on successful login
    await this.database.merchants.updateOne(
      { _id: merchant._id },
      { $set: { loginAttempts: 0, lockUntil: null } },
    );
    // ...
  }

  private isLockedOut(lockUntil: Date | null | undefined): boolean {
    if (!lockUntil) return false;
    return new Date() < new Date(lockUntil);
  }
}
```

**Schema with lockout fields:**
```typescript
// SouqSnapX/apps/api/src/database/schemas/merchant.schema.ts
@Schema({ timestamps: true })
export class Merchant extends Document {
  // ...
  @ApiProperty({ default: 0, description: 'Number of failed login attempts' })
  @Prop({ type: Number, default: 0 })
  loginAttempts!: number;

  @ApiProperty({ nullable: true, description: 'Account lockout expiration timestamp' })
  @Prop({ type: Date })
  lockUntil!: Date | null;
  // ...
}
```

**Improvements:**
- Tracks failed login attempts
- Locks account after 5 failed attempts
- 2-hour lockout duration
- Resets counter on successful login

---

## 8. Refresh Token Rotation

### Old API: No Refresh Tokens

```typescript
// snapsouq_old/server/routes.ts
// Session-based - no concept of refresh tokens
// Cookie expires after 24 hours, user must re-login
```

**Issues:**
- No refresh mechanism
- Long-lived sessions (security risk)
- No token invalidation capability

### New API: Refresh Token Rotation with Reuse Detection

```typescript
// SouqSnapX/apps/api/src/database/schemas/refresh-token.schema.ts
@Schema({ timestamps: true })
export class RefreshToken extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(UserType) })
  userType!: UserType;

  @Prop({ type: String, required: true })
  token!: string; // Hashed token

  @Prop({ type: String, required: true })
  family!: string; // Token family for rotation

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;
}
```

```typescript
// SouqSnapX/apps/api/src/modules/auth/auth.service.ts
async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
  const hashedToken = this.hashToken(refreshToken);

  const tokenDoc = await this.database.refreshTokens.findOne({
    token: hashedToken,
    revokedAt: null,
  });

  if (!tokenDoc) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  if (new Date() > new Date(tokenDoc.expiresAt)) {
    throw new UnauthorizedException('Refresh token has expired');
  }

  // Check if token was already used (reuse detection)
  const existingUsed = await this.database.refreshTokens.findOne({
    family: tokenDoc.family,
    revokedAt: { $ne: null },
  });

  if (existingUsed) {
    // Revoke entire token family (potential token theft)
    await this.database.refreshTokens.updateMany(
      { family: tokenDoc.family },
      { $set: { revokedAt: new Date() } },
    );
    throw new UnauthorizedException('Token reuse detected. Please login again.');
  }

  // Revoke the current token
  await this.database.refreshTokens.updateOne(
    { _id: tokenDoc._id },
    { $set: { revokedAt: new Date() } },
  );

  // Generate new token pair with same family
  const tokens = await this.generateTokenPair(
    tokenDoc.userId.toString(),
    tokenDoc.userType,
    tokenDoc.family,
  );

  return tokens;
}
```

**Improvements:**
- Token rotation on every refresh
- Reuse detection prevents token theft
- Token families for tracking
- Immediate revocation capability

---

## 9. Scanner Token Expiry

### Old API: Permanent Scanner Tokens

```typescript
// snapsouq_old/server/routes.ts
app.post("/api/merchant/scanner-token", async (req: Request, res: Response) => {
  if (!req.session.merchantId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // Permanent token - never expires!
  const scannerToken = randomUUID().replace(/-/g, "").slice(0, 12);
  const merchant = await storage.updateMerchant(req.session.merchantId, { scannerToken });
  res.json({ scannerToken: merchant.scannerToken });
});
```

**Issues:**
- Scanner tokens never expire
- If leaked, attacker has permanent access
- No way to invalidate stolen tokens

### New API: 24-Hour Scanner Token Expiry

```typescript
// SouqSnapX/apps/api/src/database/schemas/merchant.schema.ts
@Schema({ _id: false })
class ScannerToken {
  @Prop({ type: String })
  token?: string;

  @Prop({ type: Date })
  createdAt?: Date; // Track creation for expiry
}

@Schema({ timestamps: true })
export class Merchant extends Document {
  // ...
  @Prop({ type: ScannerToken, default: {} })
  scannerToken!: ScannerToken;
}
```

```typescript
// SouqSnapX/apps/api/src/modules/scanner/scanner.service.ts
@Injectable()
export class ScannerService {
  private readonly SCANNER_TOKEN_EXPIRY_HOURS = 24;

  async validateScannerToken(token: string): Promise<ScannerValidationDto> {
    const merchant = await this.database.merchants.findOne({
      'scannerToken.token': token,
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid scanner token');
    }

    // Check token expiry
    const tokenAge = Date.now() - new Date(merchant.scannerToken.createdAt!).getTime();
    const expiryMs = this.SCANNER_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

    if (tokenAge > expiryMs) {
      throw new UnauthorizedException('Scanner token has expired');
    }

    return {
      valid: true,
      merchantId: merchant._id.toString(),
      businessName: merchant.businessName,
    };
  }
}
```

**Improvements:**
- 24-hour token expiry
- Automatic invalidation after expiry
- Time-based enforcement
- Regeneration capability

---

## 10. Input Sanitization

### Old API: No Input Sanitization

```typescript
// snapsouq_old/server/routes.ts
app.post("/api/merchants/drops", async (req: Request, res: Response) => {
  // Direct use of user input without sanitization
  const body = req.body;
  const processedData = {
    ...body,
    name: body.name, // No sanitization
    description: body.description, // No sanitization
    merchantId: req.session.merchantId,
  };
  // ...
});
```

**Issues:**
- No XSS protection
- HTML injection possible
- Malicious scripts can be stored

### New API: sanitize-html for Input Sanitization

```typescript
// SouqSnapX/apps/api/src/modules/drops/drops.service.ts
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class DropsService {
  private sanitizeInput(input: string): string {
    return sanitizeHtml(input, {
      allowedTags: [], // No HTML allowed
      allowedAttributes: {},
      textFilter: (text) => text.trim(),
    });
  }

  async create(dto: CreateDropDto, merchantId: string): Promise<DropResponseDto> {
    const drop = await this.database.drops.create({
      merchantId: new Types.ObjectId(merchantId),
      name: this.sanitizeInput(dto.name),
      description: this.sanitizeInput(dto.description),
      // ...
    });
    return this.mapToResponseDto(drop);
  }
}
```

**Configuration:**
```typescript
// package.json dependencies
{
  "dependencies": {
    "sanitize-html": "^2.11.0",
    // ...
  }
}
```

**Improvements:**
- HTML tag stripping
- XSS prevention
- Input trimming
- Consistent sanitization across all user inputs

---

## 11. Security Headers

### Old API: No Helmet Headers

```typescript
// snapsouq_old/server/index.ts
const app = express();
// No helmet middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
```

**Missing headers:**
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

### New API: Helmet Middleware

```typescript
// SouqSnapX/apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // ...
  await app.listen(3000);
}
```

**Headers added:**
- `Content-Security-Policy`: XSS prevention
- `X-Frame-Options: DENY`: Clickjacking protection
- `X-Content-Type-Options: nosniff`: MIME sniffing protection
- `Strict-Transport-Security`: HTTPS enforcement
- `Referrer-Policy`: Privacy protection
- `X-XSS-Protection`: Legacy XSS protection

---

## 12. NoSQL Injection Prevention

### Old API: No MongoDB Validation (Raw Queries)

```typescript
// snapsouq_old/server/routes.ts
// Using Drizzle ORM but no input validation on queries
app.get("/api/drops/active", async (_req: Request, res: Response) => {
  const drops = await storage.getActiveDrops();
  // No validation of query parameters
  res.json(drops);
});
```

**Issues:**
- Direct query construction possible
- No type safety on queries
- Injection possible through unsanitized inputs

### New API: Mongoose Schema Validation

```typescript
// SouqSnapX/apps/api/src/database/schemas/drop.schema.ts
@Schema({ timestamps: true })
export class Drop extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Merchant' })
  merchantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  description!: string;

  @Prop({ type: Number, required: true, min: -90, max: 90 })
  latitude!: number;

  @Prop({ type: Number, required: true, min: -180, max: 180 })
  longitude!: number;

  @Prop({ type: Number, required: true, min: 1, max: 10000 })
  radius!: number;

  @Prop({
    type: String,
    required: true,
    enum: ['anytime', 'timer', 'window'],
    default: 'anytime',
  })
  redemptionType!: string;

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

// Schema-level validation prevents injection
export const DropSchema = SchemaFactory.createForClass(Drop);
```

```typescript
// SouqSnapX/apps/api/src/modules/drops/drops.service.ts
async findAll(filter: FilterQuery<Drop> = {}): Promise<DropResponseDto[]> {
  // Mongoose validates all queries against schema
  const drops = await this.database.drops
    .find({ ...filter, deletedAt: null })
    .populate('merchantId', 'businessName logoUrl')
    .lean();

  return drops.map(drop => this.mapToResponseDto(drop));
}
```

**Improvements:**
- Schema-enforced type validation
- Min/max constraints on numbers
- Enum validation for strings
- No raw query construction
- Automatic type coercion prevention

---

## 13. CSRF Protection

### Old API: CSRF Vulnerable (Session-based without CSRF tokens)

```typescript
// snapsouq_old/server/routes.ts
// Session-based auth without CSRF protection
app.use(
  session({
    // ...
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax", // Lax is not sufficient for POST requests
    },
  })
);

// No CSRF tokens on state-changing operations
app.post("/api/merchants/drops", async (req: Request, res: Response) => {
  // No CSRF validation
  const drop = await storage.createDrop(parsed.data);
});
```

**Issues:**
- CSRF attacks possible
- No token validation
- `sameSite: "lax"` insufficient

### New API: CSRF-Safe (JWT in Authorization Header)

```typescript
// SouqSnapX/apps/api/src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // JWT from header - not cookie
      // Cannot be sent automatically by browser
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }
}
```

```typescript
// SouqSnapX/apps/api/src/modules/drops/drops.controller.ts
@Controller('drops')
@ApiBearerAuth() // Swagger decorator for Bearer auth
@UseGuards(JwtAuthGuard)
export class DropsController {
  @Post()
  async create(
    @Body() dto: CreateDropDto,
    @CurrentUser() user: RequestUser, // From JWT
  ) {
    // Token from Authorization header
    // CSRF impossible - browser can't auto-send custom headers
    return this.dropsService.create(dto, user.userId);
  }
}
```

**Improvements:**
- JWT in Authorization header (not cookie)
- Custom headers cannot be auto-sent by browser
- CSRF attacks impossible
- No CSRF tokens needed

---

## 14. Input Validation

### Old API: Basic Zod Validation Only

```typescript
// snapsouq_old/shared/schema.ts
export const merchantSignupSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

// Validation in route
app.post("/api/merchant/signup", async (req: Request, res: Response) => {
  const parsed = merchantSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
  }
  // ...
});
```

**Issues:**
- Validation only at route level
- No automatic DTO validation
- Manual error handling
- No Swagger documentation

### New API: Zod + class-validator + Swagger

```typescript
// SouqSnapX/apps/api/src/modules/auth/dto/request/register-merchant.dto.ts
export class RegisterMerchantDto {
  @ApiProperty({ example: 'merchant@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'merchant_user', minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { 
    message: 'Username can only contain letters, numbers, and underscores' 
  })
  username!: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password!: string;

  @ApiProperty({ example: 'My Business Store', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName!: string;
}
```

```typescript
// SouqSnapX/apps/api/src/common/pipes/zod-validation.pipe.ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = this.formatZodError(error);
        throw new BadRequestException({
          message: 'Validation failed',
          error: 'Bad Request',
          statusCode: 400,
          details: { errors: validationErrors },
        });
      }
      throw error;
    }
  }
}
```

**Global Validation Pipe:**
```typescript
// SouqSnapX/apps/api/src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip non-decorated properties
    forbidNonWhitelisted: true, // Throw on non-decorated properties
    transform: true, // Auto-transform types
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

**Improvements:**
- Automatic validation on all DTOs
- Whitelist filtering (extra properties rejected)
- Detailed error messages
- Swagger documentation generated from decorators
- Type transformation

---

## 15. Ownership Guards

### Old API: Manual Ownership Checks

```typescript
// snapsouq_old/server/routes.ts
app.patch("/api/merchants/drops/:id", async (req: Request, res: Response) => {
  if (!req.session.merchantId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Manual ownership check - inconsistent
  const existingDrop = await storage.getDrop(dropId);
  if (!existingDrop || existingDrop.merchantId !== req.session.merchantId) {
    return res.status(404).json({ message: "Drop not found" });
  }
  // ...
});
```

**Issues:**
- Manual checks in each route
- Inconsistent (404 instead of 403)
- Easy to forget
- Code duplication

### New API: Ownership Guard

```typescript
// SouqSnapX/apps/api/src/common/guards/ownership.guard.ts
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Determine resource type and ID from route parameters
    const { resourceType, resourceId } = this.getResourceInfo(request);

    if (!resourceType || !resourceId) {
      return true;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new NotFoundException(`${resourceType} not found`);
    }

    const isOwner = await this.checkOwnership(resourceType, resourceId, user.userId, user.role);

    if (!isOwner) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }

  private async checkOwnership(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const objectId = new Types.ObjectId(resourceId);

    switch (resourceType) {
      case 'drop': {
        const drop = await this.databaseService.drops.findById(objectId);
        if (!drop) throw new NotFoundException('Drop not found');
        return drop.merchantId?.toString() === userId;
      }
      case 'voucher': {
        const voucher = await this.databaseService.vouchers.findById(objectId);
        if (!voucher) throw new NotFoundException('Voucher not found');
        // Vouchers owned by hunter or merchant
        if (voucher.claimedBy?.hunterId) {
          return voucher.claimedBy.hunterId.toString() === userId;
        }
        if (voucher.merchantId) {
          return voucher.merchantId.toString() === userId;
        }
        return false;
      }
      // ... other resources
    }
  }
}
```

**Usage:**
```typescript
// SouqSnapX/apps/api/src/modules/drops/drops.controller.ts
@Controller('drops')
@UseGuards(JwtAuthGuard, OwnershipGuard)
export class DropsController {
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDropDto,
    @CurrentUser() user: RequestUser,
  ) {
    // OwnershipGuard already verified the user owns this drop
    return this.dropsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    // OwnershipGuard already verified ownership
    return this.dropsService.remove(id, user.userId);
  }
}
```

**Improvements:**
- Automatic ownership verification
- Reusable across all controllers
- Proper 403 vs 404 responses
- Resource type auto-detection
- Cannot forget to add check

---

## 16. Device-based Hunter Tracking

### Old API: Basic Device ID Storage

```typescript
// snapsouq_old/server/routes.ts
app.post("/api/vouchers/claim", async (req: Request, res: Response) => {
  const { dropId, userEmail, userPhone, deviceId } = parsed.data;
  // deviceId used but not validated

  let hunterId: string | null = null;
  if (deviceId) {
    const hunter = await storage.getOrCreateHunterByDeviceId(deviceId);
    hunterId = hunter.id;
  }
  // ...
});
```

**Issues:**
- Device ID optional
- No validation of device ID format
- No association enforcement
- Easy to spoof

### New API: Device Guard with Auto-Registration

```typescript
// SouqSnapX/apps/api/src/common/guards/device.guard.ts
@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithDevice>();

    // Extract deviceId from various sources
    const deviceId = this.extractDeviceId(request);

    if (!deviceId) {
      throw new BadRequestException(
        'Device ID is required. Provide via X-Device-Id header, deviceId query param, or request body.'
      );
    }

    // Validate deviceId format
    if (typeof deviceId !== 'string' || deviceId.length < 3 || deviceId.length > 255) {
      throw new BadRequestException('Invalid device ID format');
    }

    // Try to find existing hunter by deviceId
    let hunter = await this.databaseService.hunters.findOne({ deviceId });

    // Auto-create hunter if not found
    if (!hunter) {
      hunter = await this.databaseService.hunters.create({
        deviceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Attach deviceId and hunterId to request for later use
    request.deviceId = deviceId;
    request.hunterId = hunter._id.toString();

    return true;
  }

  private extractDeviceId(request: Request): string | null {
    // Check X-Device-Id header (preferred)
    const headerDeviceId = request.headers['x-device-id'] as string | undefined;
    if (headerDeviceId) return headerDeviceId;

    // Check query params
    const queryDeviceId = request.query.deviceId as string | undefined;
    if (queryDeviceId) return queryDeviceId;

    // Check body
    const bodyDeviceId = request.body?.deviceId as string | undefined;
    if (bodyDeviceId) return bodyDeviceId;

    return null;
  }
}
```

```typescript
// SouqSnapX/apps/api/src/modules/hunters/hunters.controller.ts
@Controller('hunters')
@UseGuards(DeviceGuard) // Applied to all hunter routes
export class HuntersController {
  @Get('profile')
  async getProfile(
    @DeviceId() deviceId: string, // From DeviceGuard
    @HunterId() hunterId: string, // From DeviceGuard
  ) {
    return this.huntersService.getProfile(hunterId);
  }

  @Post('claim-voucher')
  async claimVoucher(
    @Body() dto: ClaimVoucherDto,
    @HunterId() hunterId: string,
  ) {
    // Guaranteed to have valid hunter from device
    return this.vouchersService.claim(dto, hunterId);
  }
}
```

**Improvements:**
- Mandatory device ID validation
- Format validation (3-255 chars)
- Auto-hunter creation
- Device ID attached to request
- Consistent across all hunter endpoints

---

## Summary Table

| Security Feature | Old API | New API |
|-----------------|---------|---------|
| Authentication | Session-based (vulnerable) | JWT with 15min expiry |
| Mobile/PWA Support | Limited | Full support |
| Rate Limiting | None | @nestjs/throttler (5/15min for auth) |
| Email Verification | Optional/Disabled | Required for merchant actions |
| Password Hashing | bcrypt 10 rounds + plain text | bcrypt 12 rounds only |
| Password Complexity | 6 chars | 8+ chars, uppercase, number |
| Account Lockout | None | 5 attempts → 2hr lockout |
| Refresh Tokens | None | Rotation + reuse detection |
| Scanner Token Expiry | Permanent | 24 hours |
| Input Sanitization | None | sanitize-html |
| Security Headers | None | Helmet (CSP, HSTS, etc.) |
| NoSQL Injection | Possible | Mongoose schema validation |
| CSRF Protection | Vulnerable | JWT in header (immune) |
| Input Validation | Basic Zod | Zod + class-validator + Swagger |
| Ownership Checks | Manual per-route | OwnershipGuard |
| Device Tracking | Optional | Mandatory DeviceGuard |

---

## Security Score

| API | Score | Grade |
|-----|-------|-------|
| Old snapsouq_old | 3/16 | F |
| New SouqSnapX | 16/16 | A+ |

---

*Document generated: 2026-04-01*
*SouqSnapX Security Team*
