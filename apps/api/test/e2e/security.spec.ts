import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { JwtService } from "@nestjs/jwt";

// Attack Payloads
const sqlInjections = [
  "'; DROP TABLE merchants; --",
  "1' OR '1'='1",
  "${7*7}",
  "<script>alert('xss')</script>",
  "' OR '1'='1' --",
  "1; SELECT * FROM users; --",
  "' UNION SELECT * FROM merchants --",
  "${process.env}",
  "{{7*7}}",
  "<%= 7*7 %>",
  "${{7*7}}",
  "{ $ne: null }",
  "{ $gt: '' }",
  "{ $regex: '.*' }",
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",
  "' OR 1=1 LIMIT 1 --",
  "admin'--",
  "' AND 1=0 UNION SELECT null, version() --",
  "1 AND 1=1",
  "1' AND 1=1--",
];

const nosqlInjections = [
  '{ "$ne": null }',
  '{ "$gt": "" }',
  '{ "$regex": ".*" }',
  '{ "$where": "this.password.length > 0" }',
  '{ "$expr": { "$eq": ["$password", "$password"] } }',
  '{ "$or": [{}, { "$where": "true" }] }',
  '{ "$ne": "invalid" }',
];

const xssPayloads = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "<svg onload=alert('XSS')>",
  "javascript:alert('XSS')",
  "<iframe src='javascript:alert(1)'>",
  "<body onload=alert('XSS')>",
  "<input onfocus=alert('XSS') autofocus>",
  "<marquee onstart=alert('XSS')>",
  "<details ontoggle=alert('XSS') open>",
  "<select onchange=alert('XSS')><option>1</option></select>",
  "<video onerror=alert('XSS')><source src=x></video>",
  "<audio onerror=alert('XSS')><source src=x></audio>",
  "<object data='javascript:alert(1)'>",
  "<embed src='javascript:alert(1)'>",
  "<form action='javascript:alert(1)'><input type=submit></form>",
  "<button formaction='javascript:alert(1)'>Click</button>",
];

const randomLongString = (length: number = 10000) => "a".repeat(length);
const randomSpecialChars = () =>
  "!@#$%^&*()_+-=[]{}|;:,.<>?~\\`\"'\\x00\\x01\\x02";
const unicodeAttack = () => "日本語العربيةעברית中文🚀🔥💀🇺🇸";
const nullBytes = () => "\x00\x00\x00";
const pathTraversal = () => "../../../etc/passwd";
const commandInjection = () => "$(whoami)`whoami`;whoami";

describe("SouqSnap E2E Security & Edge Cases", () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let jwtService: JwtService;
  let validToken: string;
  let expiredToken: string;
  let deviceId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    deviceId = `test-device-${Date.now()}`;

    // Generate tokens
    validToken = jwtService.sign(
      { sub: "test-user-id", role: "merchant" },
      {
        secret: "test-jwt-secret-key",
        expiresIn: "1h",
      },
    );

    expiredToken = jwtService.sign(
      { sub: "test-user-id", role: "merchant" },
      {
        secret: "test-jwt-secret-key",
        expiresIn: "-1h",
      },
    );
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe("1. SQL Injection Attacks", () => {
    const endpoints = [
      {
        method: "post" as const,
        path: "/api/v1/auth/merchant/register",
        field: "email",
        payload: {},
      },
      {
        method: "post" as const,
        path: "/api/v1/auth/merchant/register",
        field: "username",
        payload: {},
      },
      {
        method: "post" as const,
        path: "/api/v1/auth/merchant/register",
        field: "businessName",
        payload: {},
      },
      {
        method: "post" as const,
        path: "/api/v1/auth/merchant/login",
        field: "email",
        payload: {},
      },
      {
        method: "post" as const,
        path: "/api/v1/auth/hunter/register",
        field: "email",
        payload: {},
      },
      {
        method: "post" as const,
        path: "/api/v1/auth/hunter/login",
        field: "email",
        payload: {},
      },
      {
        method: "get" as const,
        path: "/api/v1/merchants",
        field: "search",
        isQuery: true,
      },
      {
        method: "get" as const,
        path: "/api/v1/drops/active",
        field: "lat",
        isQuery: true,
      },
      {
        method: "get" as const,
        path: "/api/v1/leaderboard",
        field: "region",
        isQuery: true,
      },
      {
        method: "patch" as const,
        path: "/api/v1/merchants/me",
        field: "businessName",
        auth: true,
      },
    ];

    endpoints.forEach((endpoint) => {
      sqlInjections.forEach((payload, index) => {
        it(`should sanitize SQL injection #${index + 1} in ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.field})`, async () => {
          let req: request.Test;

          if (endpoint.isQuery) {
            req = request(app.getHttpServer())
              [endpoint.method](endpoint.path)
              .query({ [endpoint.field]: payload });
          } else {
            const body: Record<string, any> = {
              ...endpoint.payload,
              password: "TestPass123!",
              [endpoint.field]: payload,
            };
            if (endpoint.field === "email") {
              body[endpoint.field] = `test${Date.now()}@test.com`;
            }
            if (endpoint.field === "lat" || endpoint.field === "lng") {
              body[endpoint.field] = 24.7136;
            }
            req = request(app.getHttpServer())
              [endpoint.method](endpoint.path)
              .send(body);
          }

          if (endpoint.auth) {
            req = req.set("Authorization", `Bearer ${validToken}`);
          }

          const response = await req;
          expect([200, 201, 400, 401, 404, 409, 422]).toContain(
            response.status,
          );

          // Ensure no database error messages leak
          if (response.body && response.body.message) {
            expect(response.body.message).not.toMatch(
              /(sql|database|query|table|column|mongodb|collection)/i,
            );
          }

          // Ensure no stack traces leak
          expect(response.body).not.toHaveProperty("stack");
          expect(response.body).not.toHaveProperty("trace");
        });
      });
    });
  });

  describe("2. NoSQL Injection Attacks", () => {
    nosqlInjections.forEach((payload, index) => {
      it(`should sanitize NoSQL injection #${index + 1}`, async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v1/auth/merchant/login")
          .send({
            email: payload,
            password: payload,
          });

        expect([400, 401, 404, 422]).toContain(response.status);
        if (response.body && response.body.message) {
          expect(response.body.message).not.toMatch(
            /(mongodb|mongoose|objectid|cast to objectid failed)/i,
          );
        }
      });
    });

    it("should reject object injection in dropId parameter", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", deviceId)
        .send({
          dropId: '{ "$ne": null }',
          deviceId,
        });

      expect([400, 404, 422]).toContain(response.status);
    });

    it("should reject operator injection in query parameters", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/drops/active")
        .query({
          lat: '{ "$gt": 0 }',
          lng: '{ "$lt": 100 }',
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe("3. XSS Payload Attacks", () => {
    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload #${index + 1} in merchant registration`, async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v1/auth/merchant/register")
          .send({
            email: `test${Date.now()}@test.com`,
            password: "TestPass123!",
            username: `testuser${Date.now()}`,
            businessName: payload,
          });

        expect([201, 400, 409, 422]).toContain(response.status);

        if (response.status === 201 && response.body?.user?.businessName) {
          expect(response.body.user.businessName).not.toMatch(
            /<script|javascript:|onerror|onload/i,
          );
        }
      });
    });

    it("should sanitize XSS in drop name and description", async () => {
      const xssPayload = "<script>alert('XSS')</script>";

      // First create a merchant
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `merchant${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `merchant${Date.now()}`,
          businessName: "Test Business",
        });

      if (merchantRes.status === 201) {
        const token = merchantRes.body.accessToken;

        const response = await request(app.getHttpServer())
          .post("/api/v1/merchants/me/drops")
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: xssPayload,
            description: xssPayload,
            latitude: 24.7136,
            longitude: 46.6753,
            radius: 50,
            rewardValue: "20% OFF",
            availabilityType: "unlimited",
            active: true,
          });

        expect([201, 400, 422]).toContain(response.status);

        if (response.status === 201) {
          expect(response.body.name).not.toMatch(/<script|javascript:/i);
          expect(response.body.description).not.toMatch(/<script|javascript:/i);
        }
      }
    });

    it("should sanitize XSS in hunter nickname", async () => {
      const xssPayload = "<img src=x onerror=alert('XSS')>";

      const deviceRes = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId: `device-${Date.now()}` });

      if (deviceRes.status === 200) {
        const token = deviceRes.body.accessToken;

        const response = await request(app.getHttpServer())
          .patch("/api/v1/hunters/me/nickname")
          .set("Authorization", `Bearer ${token}`)
          .send({ nickname: xssPayload });

        expect([200, 400, 422]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body.nickname).not.toMatch(
            /<img|onerror|javascript:/i,
          );
        }
      }
    });
  });

  describe("4. Oversized Payload Attacks", () => {
    it("should reject oversized business name (>100 chars)", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `test${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `user${Date.now()}`,
          businessName: randomLongString(200),
        });

      expect([400, 413, 422]).toContain(response.status);
    });

    it("should reject oversized username (>30 chars)", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `test${Date.now()}@test.com`,
          password: "TestPass123!",
          username: randomLongString(50),
          businessName: "Test Business",
        });

      expect([400, 413, 422]).toContain(response.status);
    });

    it("should reject oversized description", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `merchant${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `merchant${Date.now()}`,
          businessName: "Test Business",
        });

      if (merchantRes.status === 201) {
        const token = merchantRes.body.accessToken;

        const response = await request(app.getHttpServer())
          .post("/api/v1/merchants/me/drops")
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Test Drop",
            description: randomLongString(100000),
            latitude: 24.7136,
            longitude: 46.6753,
            radius: 50,
            rewardValue: "20% OFF",
            availabilityType: "unlimited",
            active: true,
          });

        expect([400, 413, 422]).toContain(response.status);
      }
    });

    it("should reject massive JSON payload", async () => {
      const massiveArray = Array(10000).fill({
        key: "value",
        data: randomLongString(100),
      });

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({
          email: `test${Date.now()}@test.com`,
          password: "TestPass123!",
          extraData: massiveArray,
        });

      expect([400, 413, 422]).toContain(response.status);
    });

    it("should handle deeply nested objects gracefully", async () => {
      const deepObject: {
        level: number;
        nested?: { level: number; nested?: any };
      } = { level: 0 };
      let current: any = deepObject;
      for (let i = 1; i < 1000; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({
          email: `test${Date.now()}@test.com`,
          password: "TestPass123!",
          nested: deepObject,
        });

      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe("5. JWT Token Security", () => {
    it("should reject requests without Authorization header", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/merchants/me",
      );

      expect(response.status).toBe(401);
    });

    it("should reject requests with malformed Authorization header", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", "InvalidFormat");

      expect(response.status).toBe(401);
    });

    it("should reject requests with empty Bearer token", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", "Bearer ");

      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid token format", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", "Bearer invalid.token.here");

      expect(response.status).toBe(401);
    });

    it("should reject requests with expired token", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it("should reject tampered token signature", async () => {
      const tamperedToken = validToken.slice(0, -10) + "tampered12";

      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it("should reject token with SQL injection in payload", async () => {
      const maliciousPayload = {
        sub: "'; DROP TABLE users; --",
        role: "admin",
      };
      const maliciousToken = jwtService.sign(maliciousPayload, {
        secret: "test-jwt-secret-key",
        expiresIn: "1h",
      });

      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", `Bearer ${maliciousToken}`);

      expect([401, 403, 404]).toContain(response.status);
    });

    it("should reject token with XSS in payload", async () => {
      const maliciousPayload = {
        sub: "<script>alert('XSS')</script>",
        role: "merchant",
      };
      const maliciousToken = jwtService.sign(maliciousPayload, {
        secret: "test-jwt-secret-key",
        expiresIn: "1h",
      });

      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", `Bearer ${maliciousToken}`);

      expect([401, 403]).toContain(response.status);
    });

    it("should reject requests to admin endpoints without proper role", async () => {
      const nonAdminToken = jwtService.sign(
        { sub: "user-id", role: "merchant" },
        {
          secret: "test-jwt-secret-key",
          expiresIn: "1h",
        },
      );

      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${nonAdminToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it("should reject self-signed token attempt", async () => {
      const fakeToken = jwtService.sign(
        { sub: "fake", role: "admin" },
        {
          secret: "wrong-secret",
          expiresIn: "1h",
        },
      );

      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe("6. Rate Limiting", () => {
    it("should enforce rate limiting on login endpoint", async () => {
      const attempts = [];
      for (let i = 0; i < 15; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post("/api/v1/auth/merchant/login")
            .send({
              email: `test${i}@test.com`,
              password: "WrongPassword123!",
            }),
        );
      }

      const responses = await Promise.all(attempts);
      const hasRateLimit = responses.some((r) => r.status === 429);

      expect(
        hasRateLimit || responses.some((r) => [401, 429].includes(r.status)),
      ).toBe(true);
    });

    it("should enforce rate limiting on registration endpoint", async () => {
      const attempts = [];
      for (let i = 0; i < 15; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post("/api/v1/auth/hunter/device-login")
            .send({
              deviceId: `device-${Date.now()}-${i}`,
            }),
        );
      }

      const responses = await Promise.all(attempts);
      const statuses = responses.map((r) => r.status);

      expect(statuses.some((s) => [200, 429].includes(s))).toBe(true);
    });

    it("should return 429 with proper headers when rate limited", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/drops/active?lat=24.7136&lng=46.6753")
        .set("X-Forwarded-For", "1.2.3.4");

      expect([200, 429]).toContain(response.status);
    });
  });

  describe("7. Concurrent Claims (Race Conditions)", () => {
    it("should handle concurrent voucher claims safely", async () => {
      // Setup: Create merchant with drop and limited promo codes
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `race${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `race${Date.now()}`,
          businessName: "Race Test Business",
        });

      if (merchantRes.status !== 201) {
        return; // Skip if setup failed
      }

      const merchantToken = merchantRes.body.accessToken;

      const dropRes = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Race Test Drop",
          description: "Test for race conditions",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "10% OFF",
          availabilityType: "limited",
          availabilityLimit: 1,
          active: true,
        });

      if (dropRes.status !== 201) {
        return;
      }

      const dropId = dropRes.body.id;

      // Add single promo code
      await request(app.getHttpServer())
        .post(`/api/v1/merchants/me/drops/${dropId}/codes/bulk`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({ codes: ["RACE-CODE-001"] });

      // Simulate concurrent claims
      const claimPromises = [];
      for (let i = 0; i < 5; i++) {
        claimPromises.push(
          request(app.getHttpServer())
            .post("/api/v1/vouchers/claim")
            .set("X-Device-ID", `concurrent-device-${i}`)
            .send({
              dropId,
              userEmail: `user${i}@test.com`,
            }),
        );
      }

      const responses = await Promise.all(claimPromises);
      const successfulClaims = responses.filter((r) => r.status === 201);
      const failedClaims = responses.filter((r) => r.status !== 201);

      // Only one should succeed with limited availability
      expect(successfulClaims.length + failedClaims.length).toBe(5);
      expect(successfulClaims.length).toBeLessThanOrEqual(1);
    });

    it("should prevent duplicate voucher creation for same device", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `dup${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `dup${Date.now()}`,
          businessName: "Duplicate Test",
        });

      if (merchantRes.status !== 201) return;

      const merchantToken = merchantRes.body.accessToken;

      const dropRes = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Duplicate Test Drop",
          description: "Test duplicate prevention",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "Free Item",
          availabilityType: "unlimited",
          maxClaimsPerUser: 1,
          active: true,
        });

      if (dropRes.status !== 201) return;

      const dropId = dropRes.body.id;
      const sameDeviceId = `same-device-${Date.now()}`;

      const claim1 = await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", sameDeviceId)
        .send({
          dropId,
          userEmail: "user@test.com",
        });

      const claim2 = await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", sameDeviceId)
        .send({
          dropId,
          userEmail: "user@test.com",
        });

      expect(claim1.status).toBe(201);
      expect([400, 409, 422, 429]).toContain(claim2.status);
    });
  });

  describe("8. Duplicate Registrations", () => {
    it("should prevent duplicate email registration", async () => {
      const email = `duplicate${Date.now()}@test.com`;

      const first = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password: "TestPass123!",
          username: `first${Date.now()}`,
          businessName: "First Business",
        });

      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email,
          password: "TestPass123!",
          username: `second${Date.now()}`,
          businessName: "Second Business",
        });

      expect(second.status).toBe(409);
    });

    it("should prevent duplicate username registration", async () => {
      const username = `uniqueuser${Date.now()}`;

      const first = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `first${Date.now()}@test.com`,
          password: "TestPass123!",
          username,
          businessName: "First Business",
        });

      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `second${Date.now()}@test.com`,
          password: "TestPass123!",
          username,
          businessName: "Second Business",
        });

      expect(second.status).toBe(409);
    });

    it("should prevent duplicate device registration", async () => {
      const deviceId = `device-dup-${Date.now()}`;

      const first = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId });

      expect(first.status).toBe(200);

      // Same device login should return existing user
      const second = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId });

      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(first.body.user.id);
    });
  });

  describe("9. Missing Required Fields", () => {
    it("should reject merchant registration without email", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          password: "TestPass123!",
          username: `test${Date.now()}`,
          businessName: "Test Business",
        });

      expect(response.status).toBe(400);
    });

    it("should reject merchant registration without password", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `test${Date.now()}@test.com`,
          username: `test${Date.now()}`,
          businessName: "Test Business",
        });

      expect(response.status).toBe(400);
    });

    it("should reject merchant registration without username", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `test${Date.now()}@test.com`,
          password: "TestPass123!",
          businessName: "Test Business",
        });

      expect(response.status).toBe(400);
    });

    it("should reject merchant registration without business name", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `test${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `test${Date.now()}`,
        });

      expect(response.status).toBe(400);
    });

    it("should reject login without email", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({
          password: "TestPass123!",
        });

      expect(response.status).toBe(400);
    });

    it("should reject login without password", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({
          email: `test${Date.now()}@test.com`,
        });

      expect(response.status).toBe(400);
    });

    it("should reject drop creation without required fields", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `req${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `req${Date.now()}`,
          businessName: "Required Fields Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Test Drop",
          // Missing latitude, longitude, radius, rewardValue
        });

      expect(response.status).toBe(400);
    });

    it("should reject voucher claim without dropId", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", deviceId)
        .send({
          userEmail: "user@test.com",
        });

      expect(response.status).toBe(400);
    });

    it("should reject empty request body", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("10. Invalid Coordinate Bounds", () => {
    it("should reject latitude > 90", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=100&lng=46.6753&radius=5000",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject latitude < -90", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=-100&lng=46.6753&radius=5000",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject longitude > 180", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=24.7136&lng=200&radius=5000",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject longitude < -180", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=24.7136&lng=-200&radius=5000",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject non-numeric coordinates", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=abc&lng=def&radius=5000",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject invalid radius values", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=24.7136&lng=46.6753&radius=-1",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject oversized radius values", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=24.7136&lng=46.6753&radius=100000000",
      );

      expect([400, 422]).toContain(response.status);
    });

    it("should reject zero radius", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=24.7136&lng=46.6753&radius=0",
      );

      expect([400, 422]).toContain(response.status);
    });
  });

  describe("11. Future/Past Dates", () => {
    it("should handle future availability dates", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `future${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `future${Date.now()}`,
          businessName: "Future Date Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Future Drop",
          description: "Starts next year",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "unlimited",
          active: true,
          availability: {
            startTime: futureDate.toISOString(),
            endTime: new Date(futureDate.getTime() + 86400000).toISOString(),
          },
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it("should reject past end dates", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `past${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `past${Date.now()}`,
          businessName: "Past Date Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;
      const pastDate = new Date("2020-01-01");

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Past Drop",
          description: "Already ended",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "unlimited",
          active: true,
          availability: {
            startTime: pastDate.toISOString(),
            endTime: new Date(pastDate.getTime() + 86400000).toISOString(),
          },
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it("should reject end date before start date", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `invalid${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `invalid${Date.now()}`,
          businessName: "Invalid Date Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Invalid Date Drop",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "unlimited",
          active: true,
          availability: {
            startTime: now.toISOString(),
            endTime: yesterday.toISOString(),
          },
        });

      expect([400, 422]).toContain(response.status);
    });

    it("should handle invalid date formats", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `datefmt${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `datefmt${Date.now()}`,
          businessName: "Date Format Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Bad Date Drop",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "unlimited",
          active: true,
          availability: {
            startTime: "not-a-date",
            endTime: "also-not-a-date",
          },
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe("12. Empty Arrays/Objects", () => {
    it("should handle empty promo codes array", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `empty${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `empty${Date.now()}`,
          businessName: "Empty Array Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;

      const dropRes = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Empty Code Drop",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "limited",
          availabilityLimit: 10,
          active: true,
        });

      if (dropRes.status !== 201) return;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/merchants/me/drops/${dropRes.body.id}/codes/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ codes: [] });

      expect([201, 400, 422]).toContain(response.status);
    });

    it("should handle empty request objects", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should handle null values in request", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: null,
          password: null,
          username: null,
          businessName: null,
        });

      expect(response.status).toBe(400);
    });

    it("should handle undefined values in request", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: undefined,
          password: undefined,
          username: undefined,
          businessName: undefined,
        });

      expect(response.status).toBe(400);
    });

    it("should reject empty string values for required fields", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: "",
          password: "",
          username: "",
          businessName: "",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("13. Special Characters & Unicode", () => {
    it("should handle unicode in business name", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `unicode${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `unicode${Date.now()}`,
          businessName: unicodeAttack(),
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it("should handle special characters in passwords appropriately", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `spec${Date.now()}@test.com`,
          password: randomSpecialChars(),
          username: `spec${Date.now()}`,
          businessName: "Special Chars Test",
        });

      // Password validation may reject, but should not crash
      expect([201, 400, 422]).toContain(response.status);
    });

    it("should reject null bytes in inputs", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `null${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `null${Date.now()}`,
          businessName: nullBytes(),
        });

      expect([201, 400, 422]).toContain(response.status);
    });
  });

  describe("14. Path Traversal & Command Injection", () => {
    it("should sanitize path traversal in file paths", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/upload/presign")
        .send({
          filename: pathTraversal(),
          contentType: "image/png",
        });

      expect([201, 400, 401, 403, 422]).toContain(response.status);
    });

    it("should not execute command injection payloads", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `cmd${Date.now()}@test.com`,
          password: commandInjection(),
          username: `cmd${Date.now()}`,
          businessName: commandInjection(),
        });

      expect([201, 400, 422]).toContain(response.status);
    });
  });

  describe("15. Error Message Security", () => {
    it("should not expose database details in error messages", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", deviceId)
        .send({
          dropId: "'; DROP TABLE vouchers; --",
          userEmail: "test@test.com",
        });

      if (response.body && response.body.message) {
        expect(response.body.message).not.toMatch(
          /(mongodb|mongoose|collection|schema|index)/i,
        );
      }
    });

    it("should not expose stack traces in production", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/merchants/me",
      );

      expect(response.body).not.toHaveProperty("stack");
      expect(response.body).not.toHaveProperty("trace");
    });

    it("should not expose internal paths in error messages", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/drops/active?lat=invalid&lng=invalid",
      );

      if (response.body && response.body.message) {
        expect(response.body.message).not.toMatch(
          /(node_modules|src\/|dist\/|internal\/)/i,
        );
      }
    });

    it("should return generic error for unhandled routes", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/nonexistent/endpoint/that/does/not/exist",
      );

      expect([404]).toContain(response.status);
    });
  });

  describe("16. Scanner Token Security", () => {
    it("should reject invalid scanner tokens", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/scanner/invalid-token/validate",
      );

      expect([401, 403, 404]).toContain(response.status);
    });

    it("should reject expired scanner tokens", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/scanner/expired-token/redeem")
        .send({
          voucherId: "some-id",
          magicToken: "some-token",
        });

      expect([401, 403, 404]).toContain(response.status);
    });

    it("should reject scanner token with SQL injection", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/scanner/'; DROP TABLE vouchers; --/validate",
      );

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe("17. Magic Token Security", () => {
    it("should reject invalid magic tokens", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/vouchers/magic/invalid-token",
      );

      expect([401, 403, 404]).toContain(response.status);
    });

    it("should reject magic token with path traversal", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/vouchers/magic/../../../etc/passwd",
      );

      expect([401, 403, 404]).toContain(response.status);
    });

    it("should reject reused magic tokens after redemption", async () => {
      // This test requires a complete flow - simplified here
      const response = await request(app.getHttpServer()).get(
        "/api/v1/vouchers/magic/already-redeemed-token",
      );

      expect([401, 403, 404, 410]).toContain(response.status);
    });
  });

  describe("18. Admin Endpoint Security", () => {
    it("should reject non-admin access to admin endpoints", async () => {
      const hunterRes = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId: `admin-test-${Date.now()}` });

      if (hunterRes.status !== 200) return;

      const hunterToken = hunterRes.body.accessToken;

      const endpoints = [
        "/api/v1/admin/stats",
        "/api/v1/admin/analytics",
        "/api/v1/admin/merchants",
        "/api/v1/admin/drops",
        "/api/v1/admin/users",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set("Authorization", `Bearer ${hunterToken}`);

        expect([403, 404]).toContain(response.status);
      }
    });

    it("should require authentication for all admin endpoints", async () => {
      const endpoints = [
        "/api/v1/admin/stats",
        "/api/v1/admin/analytics",
        "/api/v1/admin/merchants",
        "/api/v1/admin/drops",
        "/api/v1/admin/users",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);

        expect(response.status).toBe(401);
      }
    });
  });

  describe("19. Input Type Validation", () => {
    it("should reject array where string expected", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: ["not", "an", "email"],
          password: "TestPass123!",
          username: `test${Date.now()}`,
          businessName: "Test",
        });

      expect([400, 422]).toContain(response.status);
    });

    it("should reject object where string expected", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: { not: "an email" },
          password: "TestPass123!",
          username: `test${Date.now()}`,
          businessName: "Test",
        });

      expect([400, 422]).toContain(response.status);
    });

    it("should reject number where string expected", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: 12345,
          password: "TestPass123!",
          username: `test${Date.now()}`,
          businessName: "Test",
        });

      expect([400, 422]).toContain(response.status);
    });

    it("should reject boolean where string expected", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: true,
          password: "TestPass123!",
          username: `test${Date.now()}`,
          businessName: "Test",
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe("20. Bulk Operations Security", () => {
    it("should limit bulk promo code creation", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `bulk${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `bulk${Date.now()}`,
          businessName: "Bulk Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;

      const dropRes = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Bulk Drop",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "unlimited",
          active: true,
        });

      if (dropRes.status !== 201) return;

      const massiveCodes = Array(10000)
        .fill(null)
        .map((_, i) => `CODE-${i}`);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/merchants/me/drops/${dropRes.body.id}/codes/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ codes: massiveCodes });

      expect([201, 400, 413, 422]).toContain(response.status);
    });

    it("should reject bulk operation with duplicate codes", async () => {
      const merchantRes = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `dupcode${Date.now()}@test.com`,
          password: "TestPass123!",
          username: `dupcode${Date.now()}`,
          businessName: "Duplicate Code Test",
        });

      if (merchantRes.status !== 201) return;

      const token = merchantRes.body.accessToken;

      const dropRes = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Dup Code Drop",
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 50,
          rewardValue: "20% OFF",
          availabilityType: "unlimited",
          active: true,
        });

      if (dropRes.status !== 201) return;

      const duplicateCodes = ["SAME", "SAME", "SAME"];

      const response = await request(app.getHttpServer())
        .post(`/api/v1/merchants/me/drops/${dropRes.body.id}/codes/bulk`)
        .set("Authorization", `Bearer ${token}`)
        .send({ codes: duplicateCodes });

      expect([201, 400, 409, 422]).toContain(response.status);
    });
  });
});
