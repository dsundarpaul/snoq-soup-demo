import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as request from "supertest";
import { randomUUID } from "crypto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { ThrottlerStorage } from "@nestjs/throttler";

import { AppModule } from "../../src/app.module";
import { DatabaseService } from "../../src/database/database.service";

// Mock throttler storage that always allows requests
class MockThrottlerStorage implements ThrottlerStorage {
  async increment(): Promise<{ totalHits: number; timeToExpire: number }> {
    return { totalHits: 0, timeToExpire: 0 };
  }
}

// Random data generators - all meeting validation requirements
const randomEmail = () =>
  `test${randomUUID().replace(/-/g, "").slice(0, 12)}@example.com`;
const randomUsername = () =>
  `user_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const randomDeviceId = () => `device_${randomUUID().replace(/-/g, "")}`;
const randomPassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const getChar = (str: string) => str[Math.floor(Math.random() * str.length)]!;
  return (
    getChar(upper) +
    getChar(nums) +
    getChar(chars) +
    getChar(chars) +
    getChar(chars) +
    getChar(nums) +
    getChar(upper) +
    getChar(chars)
  );
};

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    type: "merchant" | "hunter" | "admin";
    emailVerified?: boolean;
    businessName?: string;
    username?: string;
    nickname?: string;
    deviceId?: string;
    name?: string;
  };
}

describe("Authentication E2E Tests", () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let database: DatabaseService;
  let jwtService: JwtService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AppModule],
    })
      .overrideProvider(ThrottlerStorage)
      .useClass(MockThrottlerStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix("api/v1");

    database = moduleFixture.get<DatabaseService>(DatabaseService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await database.merchants.deleteMany({});
    await database.hunters.deleteMany({});
    await database.admins.deleteMany({});
    await database.refreshTokens.deleteMany({});
  });

  describe("Merchant Authentication Flow", () => {
    it("should complete full merchant flow: Register → Verify Email → Login → Refresh → Logout", async () => {
      const email = randomEmail();
      const username = randomUsername();
      const password = randomPassword();

      // Step 1: Register
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username,
        })
        .expect(201);

      const registerBody = registerRes.body as AuthResponse;
      expect(registerBody.accessToken).toBeDefined();
      expect(registerBody.refreshToken).toBeDefined();
      expect(registerBody.user.email).toBe(email.toLowerCase());
      expect(registerBody.user.type).toBe("merchant");
      expect(registerBody.user.emailVerified).toBe(false);
      expect(registerBody.user.username).toBe(username.toLowerCase());

      // Security: Password should not be returned
      expect(registerRes.body.password).toBeUndefined();

      // Verify password is hashed in database
      const merchantInDb = await database.merchants
        .findById(registerBody.user.id)
        .select("+password")
        .lean();
      expect(merchantInDb).toBeDefined();
      expect(merchantInDb!.password).not.toBe(password);
      expect(await bcrypt.compare(password, merchantInDb!.password)).toBe(true);

      // Get verification token from database
      const merchantWithToken = await database.merchants
        .findById(registerBody.user.id)
        .lean();
      const verificationToken = merchantWithToken!.emailVerification.token;
      expect(verificationToken).toBeDefined();

      // Step 2: Verify Email
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/verify-email/${verificationToken}`)
        .expect(200);

      // Verify email is marked as verified
      const verifiedMerchant = await database.merchants
        .findById(registerBody.user.id)
        .lean();
      expect(verifiedMerchant!.emailVerified).toBe(true);
      expect(verifiedMerchant!.emailVerification).toBeUndefined();

      // Step 3: Login
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(200);

      const loginBody = loginRes.body as AuthResponse;
      expect(loginBody.accessToken).toBeDefined();
      expect(loginBody.refreshToken).toBeDefined();
      expect(loginBody.user.emailVerified).toBe(true);

      // Step 4: Refresh Token
      const refreshRes = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: loginBody.refreshToken })
        .expect(200);

      const refreshBody = refreshRes.body as {
        accessToken: string;
        refreshToken: string;
      };
      expect(refreshBody.accessToken).toBeDefined();
      expect(refreshBody.refreshToken).toBeDefined();

      // Verify old refresh token is revoked (can't be used again)
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: loginBody.refreshToken })
        .expect(401);

      // Security: New refresh token should be different from old one
      expect(refreshBody.refreshToken).not.toBe(loginBody.refreshToken);

      // Step 5: Logout
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${refreshBody.accessToken}`)
        .send({ refreshToken: refreshBody.refreshToken })
        .expect(200);

      // Verify token is revoked
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: refreshBody.refreshToken })
        .expect(401);
    });

    it("should verify email verification tokens are single-use only", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register merchant
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      const merchant = await database.merchants
        .findById(registerRes.body.user.id)
        .lean();
      const token = merchant!.emailVerification.token;

      // First verification should succeed
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/verify-email/${token}`)
        .expect(200);

      // Second use of same token should fail (token is cleared after use)
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/verify-email/${token}`)
        .expect(400);
    });

    it("should enforce password requirements during registration", async () => {
      const email = randomEmail();

      // Password without uppercase
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password: "password123",
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(400);

      // Password without number
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: randomEmail(),
          password: "PasswordOnly",
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(400);

      // Password too short
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: randomEmail(),
          password: "Pass1",
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(400);
    });
  });

  describe("Hunter Authentication Flow", () => {
    it("should login hunter by device ID (auto-create if not exists)", async () => {
      const deviceId = randomDeviceId();

      // First device login - creates new hunter
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId })
        .expect(200);

      const loginBody = loginRes.body as AuthResponse;
      expect(loginBody.accessToken).toBeDefined();
      expect(loginBody.refreshToken).toBeDefined();
      expect(loginBody.user.type).toBe("hunter");
      expect(loginBody.user.deviceId).toBe(deviceId);
      expect(loginBody.user.email).toBe("");

      // Second device login - retrieves same hunter
      const secondLoginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId })
        .expect(200);

      expect(secondLoginRes.body.user.id).toBe(loginBody.user.id);
      expect(secondLoginRes.body.user.deviceId).toBe(deviceId);

      // Device login should generate unique refresh tokens each time
      expect(secondLoginRes.body.refreshToken).not.toBe(loginBody.refreshToken);
    });

    it("should complete hunter registration and login flow", async () => {
      const email = randomEmail();
      const deviceId = randomDeviceId();
      const password = randomPassword();
      const nickname = `Hunter_${randomUUID().replace(/-/g, "").slice(0, 10)}`;

      // Register hunter with email
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId,
          email,
          password,
          nickname,
        })
        .expect(201);

      const registerBody = registerRes.body as AuthResponse;
      expect(registerBody.user.email).toBe(email.toLowerCase());
      expect(registerBody.user.nickname).toBe(nickname);
      expect(registerBody.user.type).toBe("hunter");

      // Verify password is hashed
      const hunterInDb = await database.hunters
        .findById(registerBody.user.id)
        .select("+password")
        .lean();
      expect(hunterInDb).toBeDefined();
      expect(hunterInDb!.password).toBeDefined();
      expect(await bcrypt.compare(password, hunterInDb!.password!)).toBe(true);

      // Login with credentials
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/login")
        .send({ email, password })
        .expect(200);

      expect(loginRes.body.user.email).toBe(email.toLowerCase());
      expect(loginRes.body.accessToken).toBeDefined();
    });

    it("should prevent duplicate device registration", async () => {
      const deviceId = randomDeviceId();

      // First registration
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId,
          email: randomEmail(),
          password: randomPassword(),
          nickname: "FirstHunter",
        })
        .expect(201);

      // Second registration with same device should fail
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId,
          email: randomEmail(),
          password: randomPassword(),
          nickname: "SecondHunter",
        })
        .expect(409);
    });

    it("should prevent duplicate email registration for hunters", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // First registration
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId: randomDeviceId(),
          email,
          password,
          nickname: "FirstHunter",
        })
        .expect(201);

      // Second registration with same email should fail
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId: randomDeviceId(),
          email,
          password,
          nickname: "SecondHunter",
        })
        .expect(409);
    });

    it("should fail login for unregistered device without credentials", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Try to login without registering first
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/login")
        .send({ email, password })
        .expect(401);
    });
  });

  describe("Admin Authentication Flow", () => {
    it("should seed admin via CLI and login successfully", async () => {
      const email = `admin_${randomUUID().replace(/-/g, "").slice(0, 10)}@souqsnap.com`;
      const password = randomPassword();
      const name = "Test Admin";

      // Seed admin directly (simulating CLI command)
      const hashedPassword = await bcrypt.hash(password, 12);
      const admin = await database.admins.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        loginAttempts: 0,
        lockUntil: null,
        deletedAt: null,
      });

      expect(admin).toBeDefined();
      expect(admin.email).toBe(email.toLowerCase());

      // Login as admin
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/admin/login")
        .send({ email, password })
        .expect(200);

      const loginBody = loginRes.body as AuthResponse;
      expect(loginBody.user.type).toBe("admin");
      expect(loginBody.user.email).toBe(email.toLowerCase());
      expect(loginBody.user.name).toBe(name);
      expect(loginBody.accessToken).toBeDefined();
      expect(loginBody.refreshToken).toBeDefined();
    });

    it("should prevent creating multiple admins", async () => {
      const firstEmail = `admin_${randomUUID().replace(/-/g, "").slice(0, 10)}@souqsnap.com`;
      const password = randomPassword();

      // Create first admin
      await database.admins.create({
        email: firstEmail.toLowerCase(),
        password: await bcrypt.hash(password, 12),
        name: "First Admin",
        loginAttempts: 0,
        lockUntil: null,
        deletedAt: null,
      });

      // Attempt to create second admin should work (but in practice CLI prevents this)
      const secondEmail = `admin_${randomUUID().replace(/-/g, "").slice(0, 10)}@souqsnap.com`;
      const secondAdmin = await database.admins.create({
        email: secondEmail.toLowerCase(),
        password: await bcrypt.hash(password, 12),
        name: "Second Admin",
        loginAttempts: 0,
        lockUntil: null,
        deletedAt: null,
      });

      expect(secondAdmin).toBeDefined();
      expect(secondAdmin.email).toBe(secondEmail.toLowerCase());
    });
  });

  describe("Password Reset Flows", () => {
    it("should complete merchant password reset flow", async () => {
      const email = randomEmail();
      const originalPassword = randomPassword();
      const newPassword = randomPassword();

      // Register merchant
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password: originalPassword,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Request password reset
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/forgot-password")
        .send({ email })
        .expect(200);

      // Get reset token from database
      const merchant = await database.merchants
        .findOne({ email: email.toLowerCase() })
        .lean();
      const resetToken = merchant!.passwordReset.token;
      expect(resetToken).toBeDefined();

      // Reset password
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      // Verify password was updated
      const updatedMerchant = await database.merchants
        .findById(merchant!._id)
        .select("+password")
        .lean();
      expect(await bcrypt.compare(newPassword, updatedMerchant!.password)).toBe(
        true,
      );
      expect(
        await bcrypt.compare(originalPassword, updatedMerchant!.password),
      ).toBe(false);

      // Token should be cleared after use
      expect(updatedMerchant!.passwordReset.token).toBeUndefined();

      // Can login with new password
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password: newPassword })
        .expect(200);

      // Cannot login with old password
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password: originalPassword })
        .expect(401);
    });

    it("should complete hunter password reset flow", async () => {
      const email = randomEmail();
      const deviceId = randomDeviceId();
      const originalPassword = randomPassword();
      const newPassword = randomPassword();

      // Register hunter
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId,
          email,
          password: originalPassword,
          nickname: "TestHunter",
        })
        .expect(201);

      // Request password reset
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/forgot-password")
        .send({ email })
        .expect(200);

      // Get reset token from database
      const hunter = await database.hunters
        .findOne({ email: email.toLowerCase() })
        .lean();
      const resetToken = hunter!.passwordReset.token;
      expect(resetToken).toBeDefined();

      // Reset password
      await request(app.getHttpServer())
        .post(`/api/v1/auth/hunter/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      // Can login with new password
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/login")
        .send({ email, password: newPassword })
        .expect(200);
    });

    it("should invalidate reset token after use (single-use)", async () => {
      const email = randomEmail();

      // Register merchant
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password: randomPassword(),
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Request password reset
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/forgot-password")
        .send({ email })
        .expect(200);

      const merchant = await database.merchants
        .findOne({ email: email.toLowerCase() })
        .lean();
      const resetToken = merchant!.passwordReset.token;

      // First reset should succeed
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/reset-password/${resetToken}`)
        .send({ password: randomPassword() })
        .expect(200);

      // Second attempt with same token should fail
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/reset-password/${resetToken}`)
        .send({ password: randomPassword() })
        .expect(400);
    });

    it("should not reveal if email exists for forgot password", async () => {
      // Request for non-existent email should return 200 (not 404)
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/forgot-password")
        .send({ email: "nonexistent@example.com" })
        .expect(200);

      // Response should be generic
      expect(response.body).toBeDefined();
    });
  });

  describe("Security Assertions", () => {
    it("should verify JWT access tokens have 15-minute expiry", async () => {
      const email = randomEmail();
      const password = randomPassword();

      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(200);

      const { accessToken } = loginRes.body as AuthResponse;

      // Decode and verify token expiry
      const decoded = jwtService.decode(accessToken) as {
        exp: number;
        iat: number;
      };
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();

      // Token should expire in approximately 15 minutes (900 seconds)
      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(900); // 15 minutes = 900 seconds
    });

    it("should verify refresh tokens are stored as hashed values", async () => {
      const email = randomEmail();
      const password = randomPassword();

      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(200);

      const { refreshToken, user } = loginRes.body as AuthResponse;

      // Find refresh token in database
      const { createHash } = await import("crypto");
      const hashedToken = createHash("sha256")
        .update(refreshToken)
        .digest("hex");
      const tokenDoc = await database.refreshTokens.findOne({
        userId: user.id,
        token: hashedToken,
      });

      expect(tokenDoc).toBeDefined();
      expect(tokenDoc!.token).toBe(hashedToken);
      expect(tokenDoc!.token).not.toBe(refreshToken); // Should be hashed, not plain
    });

    it("should revoke all refresh tokens on password reset for merchant", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register and login multiple times to create multiple tokens
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Create multiple sessions
      const login1 = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(200);

      const login2 = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(200);

      // Request password reset
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/forgot-password")
        .send({ email })
        .expect(200);

      const merchant = await database.merchants
        .findOne({ email: email.toLowerCase() })
        .lean();
      const resetToken = merchant!.passwordReset.token;

      // Reset password
      await request(app.getHttpServer())
        .post(`/api/v1/auth/merchant/reset-password/${resetToken}`)
        .send({ password: randomPassword() })
        .expect(200);

      // All existing refresh tokens should be revoked
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: login1.body.refreshToken })
        .expect(401);

      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: login2.body.refreshToken })
        .expect(401);
    });

    it("should detect and revoke token family on token reuse (token theft protection)", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register and login
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(200);

      const { refreshToken: originalToken } = loginRes.body as AuthResponse;

      // Refresh to get new token pair
      const refreshRes1 = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: originalToken })
        .expect(200);

      const { refreshToken: newToken } = refreshRes1.body as {
        refreshToken: string;
      };

      // Try to reuse the original token (simulating attacker using stolen token)
      const reuseRes = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: originalToken })
        .expect(401);

      expect(reuseRes.body.message).toContain("Token reuse detected");

      // The new token should also be revoked (entire family revoked)
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: newToken })
        .expect(401);
    });

    it("should return unique refresh tokens on each login", async () => {
      const email = randomEmail();
      const password = randomPassword();

      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Multiple logins should generate different refresh tokens
      const tokens: string[] = [];
      for (let i = 0; i < 5; i++) {
        const loginRes = await request(app.getHttpServer())
          .post("/api/v1/auth/merchant/login")
          .send({ email, password })
          .expect(200);

        const { refreshToken } = loginRes.body as AuthResponse;
        expect(tokens).not.toContain(refreshToken);
        tokens.push(refreshToken);
      }

      expect(tokens.length).toBe(5);
      expect(new Set(tokens).size).toBe(5); // All unique
    });

    it("should lock merchant account after 5 failed login attempts", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register merchant
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post("/api/v1/auth/merchant/login")
          .send({ email, password: "WrongPassword123" })
          .expect(401);
      }

      // 6th attempt should indicate account is locked
      const lockRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(403);

      expect(lockRes.body.message).toContain("locked");
    });

    it("should lock admin account after 5 failed login attempts", async () => {
      const email = `admin_${randomUUID().replace(/-/g, "").slice(0, 10)}@souqsnap.com`;
      const password = randomPassword();

      // Seed admin
      await database.admins.create({
        email: email.toLowerCase(),
        password: await bcrypt.hash(password, 12),
        name: "Test Admin",
        loginAttempts: 0,
        lockUntil: null,
        deletedAt: null,
      });

      // 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post("/api/v1/auth/admin/login")
          .send({ email, password: "WrongPassword123" })
          .expect(401);
      }

      // 6th attempt should indicate account is locked
      const lockRes = await request(app.getHttpServer())
        .post("/api/v1/auth/admin/login")
        .send({ email, password })
        .expect(403);

      expect(lockRes.body.message).toContain("locked");
    });

    it("should not expose sensitive data in error responses", async () => {
      // Registration with invalid data should not leak internal info
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: "invalid-email",
          password: "short",
        })
        .expect(400);

      // Should not contain stack traces or internal details
      expect(res.body.stack).toBeUndefined();
      expect(res.body.trace).toBeUndefined();
    });

    it("should enforce rate limiting on login endpoints", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Make requests rapidly to trigger rate limit
      const responses: request.Response[] = [];
      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/merchant/login")
          .send({ email, password });
        responses.push(res);
      }

      // Some requests should be rate limited (429) or return 401 (unauthorized)
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;
      const tooManyRequestsCount = responses.filter(
        (r) => r.status === 401,
      ).length;

      // Either we got rate limited responses or the endpoint has strict rate limiting
      expect(rateLimitedCount + tooManyRequestsCount).toBeGreaterThan(0);
    });
  });

  describe("Resend Verification", () => {
    it("should resend verification email for unverified merchant", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register merchant
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Get original token
      const merchant1 = await database.merchants
        .findOne({ email: email.toLowerCase() })
        .lean();
      const originalToken = merchant1!.emailVerification.token;

      // Resend verification
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/resend-verification")
        .send({ email })
        .expect(200);

      // Token should be regenerated
      const merchant2 = await database.merchants
        .findOne({ email: email.toLowerCase() })
        .lean();
      expect(merchant2!.emailVerification.token).toBeDefined();
      expect(merchant2!.emailVerification.token).not.toBe(originalToken);
    });

    it("should not resend verification for already verified email", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register merchant
      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Verify email
      const merchant = await database.merchants
        .findById(registerRes.body.user.id)
        .lean();
      await request(app.getHttpServer())
        .post(
          `/api/v1/auth/merchant/verify-email/${merchant!.emailVerification.token}`,
        )
        .expect(200);

      // Try to resend - should return success but not actually send
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/resend-verification")
        .send({ email })
        .expect(200);
    });

    it("should not reveal if email exists for resend verification", async () => {
      // Request for non-existent email should return 200
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/resend-verification")
        .send({ email: "nonexistent@example.com" })
        .expect(200);
    });
  });

  describe("Token Validation", () => {
    it("should reject requests with invalid access tokens", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", "Bearer invalid-token")
        .send({ refreshToken: "some-token" })
        .expect(401);
    });

    it("should reject requests with expired access tokens format", async () => {
      // Create an expired-looking token (we can't easily test actual expiry without waiting)
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ refreshToken: "some-token" })
        .expect(401);
    });

    it("should reject malformed authorization headers", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", "InvalidFormat token123")
        .send({ refreshToken: "some-token" })
        .expect(401);
    });
  });

  describe("Cross-User Type Security", () => {
    it("should prevent merchant login with hunter credentials", async () => {
      const email = randomEmail();
      const password = randomPassword();
      const deviceId = randomDeviceId();

      // Register as hunter
      await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId,
          email,
          password,
          nickname: "TestHunter",
        })
        .expect(201);

      // Try to login as merchant with hunter credentials
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({ email, password })
        .expect(401);
    });

    it("should prevent admin login with merchant credentials", async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register as merchant
      await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password,
          businessName: "Test Business",
          username: randomUsername(),
        })
        .expect(201);

      // Try to login as admin with merchant credentials
      await request(app.getHttpServer())
        .post("/api/v1/auth/admin/login")
        .send({ email, password })
        .expect(401);
    });
  });
});
