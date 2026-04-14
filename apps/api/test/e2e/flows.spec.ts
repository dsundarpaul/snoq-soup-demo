import { faker } from "@faker-js/faker";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { startE2eMongo } from "./mongo-test-server";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("SouqSnap E2E Flows", () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryReplSet;
  let merchantToken: string;
  let hunterToken: string;
  let adminToken: string;
  let merchantId: string;
  let dropId: string;
  let voucherId: string;
  let magicToken: string;
  let scannerToken: string;
  const deviceId = faker.string.uuid();

  beforeAll(async () => {
    mongoServer = await startE2eMongo();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe("1. Public Endpoints", () => {
    it("GET /api/v1/drops/active - should return active drops", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/drops/active")
        .expect(200);

      expect(response.body).toHaveProperty("drops");
      expect(Array.isArray(response.body.drops)).toBe(true);
    });

    it("GET /api/v1/merchants/:username/public - should return public merchant profile", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/merchants/${faker.internet.userName()}/public`)
        .expect(200);

      expect(response.body).toHaveProperty("businessName");
    });

    it("GET /api/v1/leaderboard - should return leaderboard", async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/leaderboard?limit=${faker.number.int({ min: 5, max: 20 })}`,
        )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("2. Merchant Flow", () => {
    const merchantEmail = faker.internet.email();
    const merchantUsername = faker.internet.userName();

    it("POST /api/v1/auth/merchant/register - should register merchant", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: merchantEmail,
          password: faker.internet.password({ length: 12, memorable: false }),
          businessName: faker.company.name(),
          username: merchantUsername,
        })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("role", "merchant");
      merchantId = response.body.user.id;
    });

    it("POST /api/v1/auth/merchant/login - should login merchant", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/login")
        .send({
          email: merchantEmail,
          password: faker.internet.password({ length: 12, memorable: false }),
        })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      merchantToken = response.body.accessToken;
    });

    it("GET /api/v1/merchants/me - should get merchant profile", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", merchantId);
      expect(response.body).toHaveProperty("businessName");
    });

    it("PATCH /api/v1/merchants/me/logo - should update merchant logo", async () => {
      const response = await request(app.getHttpServer())
        .patch("/api/v1/merchants/me/logo")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({ logoUrl: faker.image.url() })
        .expect(200);

      expect(response.body).toHaveProperty("logoUrl");
    });

    it("POST /api/v1/merchants/me/scanner-token - should generate scanner token", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/scanner-token")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty("scannerToken");
      scannerToken = response.body.scannerToken;
    });

    it("GET /api/v1/merchants/me/scanner-token - should get current scanner token", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me/scanner-token")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("scannerToken");
    });

    it("POST /api/v1/merchants/me/drops - should create a drop", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: faker.commerce.productName(),
          description: faker.lorem.sentence(),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          radius: faker.number.int({ min: 10, max: 100 }),
          rewardValue: faker.commerce.productName(),
          availabilityType: "unlimited",
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name");
      dropId = response.body.id;
    });

    it("GET /api/v1/merchants/me/drops - should get merchant drops", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("PATCH /api/v1/merchants/me/drops/:id - should update a drop", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/merchants/me/drops/${dropId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: faker.commerce.productName(),
          description: faker.lorem.sentence(),
        })
        .expect(200);

      expect(response.body).toHaveProperty("name");
    });

    it("POST /api/v1/merchants/me/drops/:dropId/codes - should add promo codes", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/merchants/me/drops/${dropId}/codes/bulk`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          codes: Array.from({ length: 3 }, () =>
            faker.string.alphanumeric(8).toUpperCase(),
          ),
        })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    it("GET /api/v1/merchants/me/drops/:dropId/codes - should get promo codes", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/merchants/me/drops/${dropId}/codes`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("codes");
      expect(response.body).toHaveProperty("total");
    });

    it("POST /api/v1/auth/merchant/forgot-password - should request password reset", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/forgot-password")
        .send({ email: merchantEmail })
        .expect(200);

      expect(response.body).toHaveProperty("message");
    });

    it("POST /api/v1/auth/logout - should logout merchant", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({ refreshToken: faker.string.uuid() })
        .expect(200);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("3. Hunter Flow", () => {
    const hunterEmail = faker.internet.email();

    it("POST /api/v1/auth/hunter/device-login - should login/create hunter by device", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/device-login")
        .send({ deviceId })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
      hunterToken = response.body.accessToken;
    });

    it("POST /api/v1/auth/hunter/register - should register hunter with email", async () => {
      const newDeviceId = faker.string.uuid();
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/register")
        .send({
          deviceId: newDeviceId,
          email: hunterEmail,
          password: faker.internet.password({ length: 12, memorable: false }),
          nickname: faker.internet.userName(),
        })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("user");
    });

    it("POST /api/v1/auth/hunter/login - should login hunter with credentials", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/login")
        .send({
          email: hunterEmail,
          password: faker.internet.password({ length: 12, memorable: false }),
        })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      hunterToken = response.body.accessToken;
    });

    it("GET /api/v1/hunters/me - should get hunter profile", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/hunters/me")
        .set("Authorization", `Bearer ${hunterToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("nickname");
    });

    it("PATCH /api/v1/hunters/me/nickname - should update hunter nickname", async () => {
      const response = await request(app.getHttpServer())
        .patch("/api/v1/hunters/me/nickname")
        .set("Authorization", `Bearer ${hunterToken}`)
        .send({ nickname: faker.internet.userName() })
        .expect(200);

      expect(response.body).toHaveProperty("nickname");
    });

    it("PATCH /api/v1/hunters/me/profile - should update hunter profile", async () => {
      const response = await request(app.getHttpServer())
        .patch("/api/v1/hunters/me/profile")
        .set("Authorization", `Bearer ${hunterToken}`)
        .send({
          gender: faker.person.sex(),
          mobileCountryCode: faker.helpers.arrayElement([
            "+966",
            "+971",
            "+965",
          ]),
          mobileNumber: faker.string.numeric(9),
        })
        .expect(200);

      expect(response.body).toHaveProperty("gender");
    });

    it("GET /api/v1/hunters/me/history - should get hunter voucher history", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/hunters/me/history")
        .set("Authorization", `Bearer ${hunterToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("vouchers");
      expect(Array.isArray(response.body.vouchers)).toBe(true);
    });

    it("POST /api/v1/auth/hunter/forgot-password - should request hunter password reset", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/hunter/forgot-password")
        .send({ email: hunterEmail })
        .expect(200);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("4. Voucher Flow", () => {
    it("POST /api/v1/vouchers/claim - should claim a voucher", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", deviceId)
        .send({
          dropId,
          userEmail: faker.internet.email(),
          userPhone: faker.phone.number(),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("magicToken");
      expect(response.body).toHaveProperty("drop");
      voucherId = response.body.id;
      magicToken = response.body.magicToken;
    });

    it("GET /api/v1/vouchers/magic/:token - should get voucher by magic token", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/vouchers/magic/${magicToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("voucher");
      expect(response.body).toHaveProperty("drop");
    });

    it("GET /api/v1/vouchers/:id/promo-code - should get promo code for voucher", async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/vouchers/${voucherId}/promo-code?magicToken=${magicToken}`,
        )
        .expect(200);

      expect(response.body).toHaveProperty("promoCode");
    });

    it("GET /api/v1/hunters/me/vouchers - should get hunter vouchers", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/hunters/me/vouchers")
        .set("Authorization", `Bearer ${hunterToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("unredeemed");
      expect(response.body).toHaveProperty("redeemed");
      expect(Array.isArray(response.body.unredeemed)).toBe(true);
      expect(Array.isArray(response.body.redeemed)).toBe(true);
    });
  });

  describe("5. Scanner Flow", () => {
    it("GET /api/v1/scanner/:token/validate - should validate scanner token", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/scanner/${scannerToken}/validate`)
        .expect(200);

      expect(response.body).toHaveProperty("valid");
      expect(response.body).toHaveProperty("businessName");
    });

    it("POST /api/v1/scanner/:token/redeem - should redeem voucher via scanner", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/scanner/${scannerToken}/redeem`)
        .send({
          voucherId,
          magicToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("voucher");
    });
  });

  describe("6. Admin Flow", () => {
    it("POST /api/v1/auth/admin/login - should login as admin", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/admin/login")
        .send({
          email: process.env.ADMIN_EMAIL || "admin@souqsnap.com",
          password: process.env.ADMIN_PASSWORD || "AdminPass123!",
        })
        .expect(200);

      expect(response.body).toHaveProperty("accessToken");
      adminToken = response.body.accessToken;
    });

    it("GET /api/v1/admin/stats - should get platform stats", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalMerchants");
      expect(response.body).toHaveProperty("totalDrops");
      expect(response.body).toHaveProperty("totalVouchers");
    });

    it("GET /api/v1/admin/analytics - should get platform analytics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/analytics?days=30&granularity=daily")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("labels");
      expect(response.body).toHaveProperty("datasets");
    });

    it("GET /api/v1/admin/merchants - should list all merchants", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/merchants")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("merchants");
      expect(response.body).toHaveProperty("total");
    });

    it("PATCH /api/v1/admin/merchants/:id - should update merchant", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/merchants/${merchantId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          businessName: faker.company.name(),
        })
        .expect(200);

      expect(response.body).toHaveProperty("businessName");
    });

    it("GET /api/v1/admin/drops - should list all drops", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");
    });

    it("POST /api/v1/admin/drops - should create drop as admin", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/admin/drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          merchantId,
          name: faker.commerce.productName(),
          description: faker.lorem.sentence(),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          radius: faker.number.int({ min: 10, max: 100 }),
          rewardValue: faker.commerce.productName(),
          availabilityType: "unlimited",
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });

    it("GET /api/v1/admin/users - should list all users", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });
  });

  describe("7. Error Handling", () => {
    it("should return 401 for unauthorized access", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/merchants/me")
        .expect(401);
    });

    it("should return 404 for invalid merchant", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/merchants/nonexistent/public")
        .expect(404);
    });

    it("should return 400 for invalid drop data", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/vouchers/claim")
        .set("X-Device-ID", deviceId)
        .send({
          dropId: "invalid-id",
        })
        .expect(400);
    });
  });
});
