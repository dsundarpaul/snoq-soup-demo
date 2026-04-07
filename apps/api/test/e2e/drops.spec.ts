import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule, getModelToken } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Model } from "mongoose";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { Drop, DropDocument } from "../../src/database/schemas/drop.schema";

// Random data generators for Riyadh area
const randomCoords = () => ({
  lat: 24.6 + Math.random() * 0.2, // Riyadh area: 24.6 - 24.8
  lng: 46.6 + Math.random() * 0.2, // Riyadh area: 46.6 - 46.8
});

const randomRadius = () => Math.floor(10 + Math.random() * 490); // 10-500m

const randomBusinessName = () => {
  const prefixes = [
    "Al",
    "The",
    "Royal",
    "City",
    "Golden",
    "Modern",
    "Classic",
    "Elite",
  ];
  const suffixes = [
    "Cafe",
    "Restaurant",
    "Store",
    "Shop",
    "Mart",
    "Boutique",
    "Hub",
    "Center",
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix} ${Math.floor(Math.random() * 1000)}`;
};

const randomDropName = () => {
  const types = [
    "Flash Sale",
    "Special Offer",
    "Mega Deal",
    "Limited Time",
    "Exclusive",
    "VIP Access",
  ];
  const rewards = [
    "20% OFF",
    "50% OFF",
    "Buy 1 Get 1",
    "Free Item",
    "$10 Credit",
    "Special Gift",
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  return `${type} - ${reward} ${Math.floor(Math.random() * 100)}`;
};

const randomRewardValue = () => {
  const values = [
    "20% OFF",
    "50% OFF",
    "30% OFF",
    "10% OFF",
    "Buy 1 Get 1 Free",
    "Free Coffee",
    "$5 Credit",
    "$10 Gift Card",
  ];
  return values[Math.floor(Math.random() * values.length)];
};

const generateFutureDate = (hoursFromNow: number) => {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
};

// Haversine distance calculation for verification
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

describe("Drops E2E Tests", () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let dropModel: Model<DropDocument>;
  let merchantToken: string;
  let merchantId: string;
  let adminToken: string;
  const createdDropIds: string[] = [];

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

    dropModel = moduleFixture.get<Model<DropDocument>>(
      getModelToken(Drop.name),
    );

    // Register a merchant for testing
    const timestamp = Date.now();
    const merchantResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/merchant/register")
      .send({
        email: `testmerchant${timestamp}@test.com`,
        password: "TestPass123!",
        businessName: randomBusinessName(),
        username: `testmerchant${timestamp}`,
      });

    merchantToken = merchantResponse.body.accessToken;
    merchantId = merchantResponse.body.user.id;

    // Get admin token
    const adminResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .send({
        email: process.env.ADMIN_EMAIL || "admin@souqsnap.com",
        password: process.env.ADMIN_PASSWORD || "AdminPass123!",
      });

    adminToken = adminResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up created drops
    for (const dropId of createdDropIds) {
      await dropModel.findByIdAndDelete(dropId);
    }
    createdDropIds.length = 0;
  });

  describe("1. Create Drop with Geolocation", () => {
    it("POST /api/v1/merchants/me/drops - should create drop with random coordinates", async () => {
      const coords = randomCoords();
      const radius = randomRadius();
      const dropName = randomDropName();
      const rewardValue = randomRewardValue();

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: dropName,
          description: `Test drop created at ${new Date().toISOString()}`,
          lat: coords.lat,
          lng: coords.lng,
          radius: radius,
          rewardValue: rewardValue,
          redemption: {
            type: "single",
            limit: 1,
          },
          availability: {
            startTime: generateFutureDate(-1), // Started 1 hour ago
            endTime: generateFutureDate(24), // Ends in 24 hours
          },
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", dropName);
      expect(response.body).toHaveProperty("location");
      expect(response.body.location.lat).toBeCloseTo(coords.lat, 5);
      expect(response.body.location.lng).toBeCloseTo(coords.lng, 5);
      expect(response.body).toHaveProperty("radius", radius);
      expect(response.body).toHaveProperty("rewardValue", rewardValue);

      createdDropIds.push(response.body.id);
    });

    it("POST /api/v1/merchants/me/drops - should create multiple drops with random locations", async () => {
      const dropCount = 5;
      const drops = [];

      for (let i = 0; i < dropCount; i++) {
        const coords = randomCoords();
        const response = await request(app.getHttpServer())
          .post("/api/v1/merchants/me/drops")
          .set("Authorization", `Bearer ${merchantToken}`)
          .send({
            name: randomDropName(),
            description: `Random drop ${i + 1}`,
            lat: coords.lat,
            lng: coords.lng,
            radius: randomRadius(),
            rewardValue: randomRewardValue(),
            redemption: {
              type: "unlimited",
            },
            availability: {
              startTime: generateFutureDate(-1),
              endTime: generateFutureDate(48),
            },
            active: true,
          })
          .expect(201);

        drops.push(response.body);
        createdDropIds.push(response.body.id);
      }

      expect(drops).toHaveLength(dropCount);
      // Verify all drops have unique IDs and locations
      const uniqueIds = new Set(drops.map((d: any) => d.id));
      expect(uniqueIds.size).toBe(dropCount);
    });
  });

  describe("2. Geospatial Query - Active Drops Nearby", () => {
    it("GET /api/v1/drops/active - should find drops within search radius", async () => {
      // Create a drop at a known location
      const centerCoords = { lat: 24.71, lng: 46.675 };
      const dropRadius = 100;

      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Center Location Drop",
          description: "Drop at center for radius testing",
          lat: centerCoords.lat,
          lng: centerCoords.lng,
          radius: dropRadius,
          rewardValue: "25% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-2),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      createdDropIds.push(createResponse.body.id);

      // Search from a location 50m away (should be within drop radius)
      const searchCoords = { lat: 24.71045, lng: 46.675 }; // ~50m north

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=${dropRadius * 2}`,
        )
        .expect(200);

      expect(response.body).toHaveProperty("drops");
      expect(response.body).toHaveProperty("total");
      expect(Array.isArray(response.body.drops)).toBe(true);

      // Should find at least our created drop
      const foundDrop = response.body.drops.find(
        (d: any) => d.id === createResponse.body.id,
      );
      expect(foundDrop).toBeDefined();
      expect(foundDrop).toHaveProperty("distance");
      expect(foundDrop.distance).toBeLessThanOrEqual(dropRadius * 2);
    });

    it("GET /api/v1/drops/active - should exclude drops outside radius", async () => {
      // Create a drop far from search location
      const farCoords = { lat: 24.65, lng: 46.6 }; // Outside Riyadh center
      const searchCoords = { lat: 24.71, lng: 46.675 };
      const searchRadius = 500; // 500m radius

      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Far Away Drop",
          description: "This drop should not be found",
          lat: farCoords.lat,
          lng: farCoords.lng,
          radius: 50,
          rewardValue: "10% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      createdDropIds.push(createResponse.body.id);

      // Search near center location
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=${searchRadius}`,
        )
        .expect(200);

      // Should not find the far away drop
      const foundDrop = response.body.drops.find(
        (d: any) => d.id === createResponse.body.id,
      );
      expect(foundDrop).toBeUndefined();
    });

    it("GET /api/v1/drops/active - should return accurate distance calculations", async () => {
      // Create drop at known location
      const dropCoords = { lat: 24.7136, lng: 46.6753 };
      const searchCoords = { lat: 24.714, lng: 46.6758 }; // ~65m away

      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Distance Test Drop",
          description: "For distance accuracy test",
          lat: dropCoords.lat,
          lng: dropCoords.lng,
          radius: 100,
          rewardValue: "30% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      createdDropIds.push(createResponse.body.id);

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=200`,
        )
        .expect(200);

      const foundDrop = response.body.drops.find(
        (d: any) => d.id === createResponse.body.id,
      );
      expect(foundDrop).toBeDefined();
      expect(foundDrop).toHaveProperty("distance");

      // Calculate expected distance using haversine formula
      const expectedDistance = calculateDistance(
        searchCoords.lat,
        searchCoords.lng,
        dropCoords.lat,
        dropCoords.lng,
      );

      // MongoDB distance should be close to calculated distance (within 10% tolerance)
      const distanceDiff = Math.abs(foundDrop.distance - expectedDistance);
      expect(distanceDiff).toBeLessThan(expectedDistance * 0.1);
    });

    it("GET /api/v1/drops/active - should use 2dsphere index for geospatial queries", async () => {
      // Create multiple drops for index testing
      const drops = [];
      for (let i = 0; i < 10; i++) {
        const coords = randomCoords();
        const response = await request(app.getHttpServer())
          .post("/api/v1/merchants/me/drops")
          .set("Authorization", `Bearer ${merchantToken}`)
          .send({
            name: `Index Test Drop ${i}`,
            description: "Testing 2dsphere index",
            lat: coords.lat,
            lng: coords.lng,
            radius: randomRadius(),
            rewardValue: randomRewardValue(),
            redemption: { type: "unlimited" },
            availability: {
              startTime: generateFutureDate(-1),
              endTime: generateFutureDate(24),
            },
            active: true,
          })
          .expect(201);

        drops.push(response.body);
        createdDropIds.push(response.body.id);
      }

      // Verify index exists on the collection
      const indexes = await dropModel.collection.indexes();
      const has2dsphereIndex = indexes.some(
        (idx) => idx.key && idx.key.location === "2dsphere",
      );
      expect(has2dsphereIndex).toBe(true);

      // Perform query and verify it returns results efficiently
      const searchCoords = randomCoords();
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=1000`,
        )
        .expect(200);

      expect(Array.isArray(response.body.drops)).toBe(true);
    });
  });

  describe("3. Radius Filtering", () => {
    it("GET /api/v1/drops/active - should filter by varying radius sizes", async () => {
      // Create drop at fixed location
      const dropCoords = { lat: 24.72, lng: 46.68 };

      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Radius Filter Test",
          description: "Testing radius filters",
          lat: dropCoords.lat,
          lng: dropCoords.lng,
          radius: 50,
          rewardValue: "40% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      createdDropIds.push(createResponse.body.id);

      // Search location 100m away
      const searchCoords = { lat: 24.7209, lng: 46.68 };

      // Small radius (50m) - should not find
      const smallRadiusResponse = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=50`,
        )
        .expect(200);

      expect(
        smallRadiusResponse.body.drops.some(
          (d: any) => d.id === createResponse.body.id,
        ),
      ).toBe(false);

      // Medium radius (150m) - should find
      const mediumRadiusResponse = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=150`,
        )
        .expect(200);

      expect(
        mediumRadiusResponse.body.drops.some(
          (d: any) => d.id === createResponse.body.id,
        ),
      ).toBe(true);

      // Large radius (500m) - should find
      const largeRadiusResponse = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${searchCoords.lat}&lng=${searchCoords.lng}&radius=500`,
        )
        .expect(200);

      expect(
        largeRadiusResponse.body.drops.some(
          (d: any) => d.id === createResponse.body.id,
        ),
      ).toBe(true);
    });
  });

  describe("4. Drop Scheduling (Start/End Times)", () => {
    it("POST /api/v1/merchants/me/drops - should create scheduled drop", async () => {
      const coords = randomCoords();
      const startTime = generateFutureDate(1); // Starts in 1 hour
      const endTime = generateFutureDate(5); // Ends in 5 hours

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Scheduled Drop",
          description: "Drop with future schedule",
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "50% OFF",
          redemption: { type: "limited", limit: 100 },
          availability: {
            startTime: startTime,
            endTime: endTime,
          },
          schedule: {
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
            startHour: 9,
            endHour: 21,
          },
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.availability.startTime).toBeDefined();
      expect(response.body.availability.endTime).toBeDefined();

      createdDropIds.push(response.body.id);
    });

    it("GET /api/v1/drops/active - should only return active drops within schedule", async () => {
      // Create drop that hasn't started yet
      const coords = randomCoords();
      const futureStart = generateFutureDate(2); // Starts in 2 hours
      const futureEnd = generateFutureDate(10); // Ends in 10 hours

      const futureDropResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Future Drop",
          description: "Not yet active",
          lat: coords.lat,
          lng: coords.lng,
          radius: 100,
          rewardValue: "35% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: futureStart,
            endTime: futureEnd,
          },
          active: true,
        })
        .expect(201);

      createdDropIds.push(futureDropResponse.body.id);

      // Create active drop
      const activeCoords = {
        lat: coords.lat + 0.001,
        lng: coords.lng + 0.001,
      };

      const activeDropResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Active Now Drop",
          description: "Currently active",
          lat: activeCoords.lat,
          lng: activeCoords.lng,
          radius: 100,
          rewardValue: "25% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1), // Started 1 hour ago
            endTime: generateFutureDate(24), // Ends in 24 hours
          },
          active: true,
        })
        .expect(201);

      createdDropIds.push(activeDropResponse.body.id);

      // Search should only return the currently active drop
      const searchResponse = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${activeCoords.lat}&lng=${activeCoords.lng}&radius=200`,
        )
        .expect(200);

      expect(
        searchResponse.body.drops.some(
          (d: any) => d.id === futureDropResponse.body.id,
        ),
      ).toBe(false);
      expect(
        searchResponse.body.drops.some(
          (d: any) => d.id === activeDropResponse.body.id,
        ),
      ).toBe(true);
    });
  });

  describe("5. Capture Limits (Limited vs Unlimited)", () => {
    it("POST /api/v1/merchants/me/drops - should create limited redemption drop", async () => {
      const coords = randomCoords();
      const limit = Math.floor(Math.random() * 50) + 10; // 10-60 limit

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Limited Drop",
          description: `Limited to ${limit} claims`,
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "60% OFF",
          redemption: {
            type: "limited",
            limit: limit,
            totalClaims: 0,
          },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.redemption.type).toBe("limited");

      createdDropIds.push(response.body.id);
    });

    it("POST /api/v1/merchants/me/drops - should create unlimited redemption drop", async () => {
      const coords = randomCoords();

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Unlimited Drop",
          description: "Unlimited claims",
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "15% OFF",
          redemption: {
            type: "unlimited",
          },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.redemption.type).toBe("unlimited");

      createdDropIds.push(response.body.id);
    });

    it("POST /api/v1/merchants/me/drops - should create single redemption drop", async () => {
      const coords = randomCoords();

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Single Redemption Drop",
          description: "One claim per user",
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "100% OFF",
          redemption: {
            type: "single",
            limit: 1,
            maxClaimsPerUser: 1,
          },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.redemption.type).toBe("single");

      createdDropIds.push(response.body.id);
    });

    it("POST /api/v1/merchants/me/drops - should reject limited drop without limit", async () => {
      const coords = randomCoords();

      await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Invalid Limited Drop",
          description: "Missing limit value",
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "40% OFF",
          redemption: {
            type: "limited",
            // Missing limit
          },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(400);
    });
  });

  describe("6. Soft Delete Drops", () => {
    it("DELETE /api/v1/merchants/me/drops/:id - should soft delete drop", async () => {
      // Create a drop first
      const coords = randomCoords();
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "To Be Deleted",
          description: "This drop will be soft deleted",
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "70% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      const dropId = createResponse.body.id;
      createdDropIds.push(dropId);

      // Soft delete the drop
      await request(app.getHttpServer())
        .delete(`/api/v1/merchants/me/drops/${dropId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(204);

      // Verify drop is soft deleted (not in active results)
      const searchResponse = await request(app.getHttpServer())
        .get(
          `/api/v1/drops/active?lat=${coords.lat}&lng=${coords.lng}&radius=1000`,
        )
        .expect(200);

      expect(searchResponse.body.drops.some((d: any) => d.id === dropId)).toBe(
        false,
      );

      // Verify deletedAt is set in database
      const deletedDrop = await dropModel.findById(dropId);
      expect(deletedDrop).toBeDefined();
      expect(deletedDrop!.deletedAt).toBeDefined();
      expect(deletedDrop!.deletedAt).not.toBeNull();
      expect(deletedDrop!.active).toBe(false);
    });

    it("DELETE /api/v1/merchants/me/drops/:id - should not allow deleting others drops", async () => {
      // Register another merchant
      const timestamp = Date.now();
      const otherMerchantResponse = await request(app.getHttpServer())
        .post("/api/v1/auth/merchant/register")
        .send({
          email: `othermerchant${timestamp}@test.com`,
          password: "TestPass123!",
          businessName: "Other Business",
          username: `othermerchant${timestamp}`,
        })
        .expect(201);

      const otherMerchantToken = otherMerchantResponse.body.accessToken;

      // Create drop with first merchant
      const coords = randomCoords();
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Protected Drop",
          description: "Cannot be deleted by others",
          lat: coords.lat,
          lng: coords.lng,
          radius: 100,
          rewardValue: "45% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      const dropId = createResponse.body.id;
      createdDropIds.push(dropId);

      // Try to delete with other merchant's token
      await request(app.getHttpServer())
        .delete(`/api/v1/merchants/me/drops/${dropId}`)
        .set("Authorization", `Bearer ${otherMerchantToken}`)
        .expect(404); // Not found for this merchant
    });

    it("DELETE /api/v1/merchants/me/drops/:id - should return 404 for already deleted drop", async () => {
      // Create and soft delete a drop
      const coords = randomCoords();
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Double Delete Test",
          description: "Testing double delete",
          lat: coords.lat,
          lng: coords.lng,
          radius: 100,
          rewardValue: "20% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      const dropId = createResponse.body.id;
      createdDropIds.push(dropId);

      // First delete
      await request(app.getHttpServer())
        .delete(`/api/v1/merchants/me/drops/${dropId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(204);

      // Second delete should return 404
      await request(app.getHttpServer())
        .delete(`/api/v1/merchants/me/drops/${dropId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(404);
    });
  });

  describe("7. Update Drop Geolocation", () => {
    it("PATCH /api/v1/merchants/me/drops/:id - should update drop location", async () => {
      // Create initial drop
      const initialCoords = randomCoords();
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Movable Drop",
          description: "Location will be updated",
          lat: initialCoords.lat,
          lng: initialCoords.lng,
          radius: 100,
          rewardValue: "30% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      const dropId = createResponse.body.id;
      createdDropIds.push(dropId);

      // Update to new location
      const newCoords = randomCoords();
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/merchants/me/drops/${dropId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          lat: newCoords.lat,
          lng: newCoords.lng,
        })
        .expect(200);

      expect(updateResponse.body.location.lat).toBeCloseTo(newCoords.lat, 5);
      expect(updateResponse.body.location.lng).toBeCloseTo(newCoords.lng, 5);
    });
  });

  describe("8. Admin Drop Management", () => {
    it("POST /api/v1/admin/drops - should create drop as admin for any merchant", async () => {
      const coords = randomCoords();

      const response = await request(app.getHttpServer())
        .post("/api/v1/admin/drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          merchantId: merchantId,
          name: "Admin Created Drop",
          description: "Created by admin for merchant",
          lat: coords.lat,
          lng: coords.lng,
          radius: randomRadius(),
          rewardValue: "90% OFF",
          redemption: { type: "limited", limit: 5 },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("merchantId", merchantId);

      createdDropIds.push(response.body.id);
    });

    it("GET /api/v1/admin/drops - should list all drops as admin", async () => {
      // Create a few drops first
      for (let i = 0; i < 3; i++) {
        const coords = randomCoords();
        const response = await request(app.getHttpServer())
          .post("/api/v1/merchants/me/drops")
          .set("Authorization", `Bearer ${merchantToken}`)
          .send({
            name: `Admin List Test ${i}`,
            description: "For admin listing",
            lat: coords.lat,
            lng: coords.lng,
            radius: randomRadius(),
            rewardValue: randomRewardValue(),
            redemption: { type: "unlimited" },
            availability: {
              startTime: generateFutureDate(-1),
              endTime: generateFutureDate(24),
            },
            active: true,
          })
          .expect(201);

        createdDropIds.push(response.body.id);
      }

      const response = await request(app.getHttpServer())
        .get("/api/v1/admin/drops")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("drops");
    });
  });

  describe("9. Edge Cases and Validation", () => {
    it("should reject end time before start time", async () => {
      const coords = randomCoords();

      await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Invalid Schedule Drop",
          description: "Invalid schedule",
          lat: coords.lat,
          lng: coords.lng,
          radius: 100,
          rewardValue: "10% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(24), // Starts tomorrow
            endTime: generateFutureDate(-1), // Ended yesterday
          },
          active: true,
        })
        .expect(400);
    });

    it("should reject drop without authentication", async () => {
      const coords = randomCoords();

      await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .send({
          name: "Unauthorized Drop",
          description: "Should fail",
          lat: coords.lat,
          lng: coords.lng,
          radius: 100,
          rewardValue: "10% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(401);
    });

    it("should handle very small radius correctly", async () => {
      const coords = randomCoords();
      const tinyRadius = 10; // Minimum allowed

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Tiny Radius Drop",
          description: "Very small capture radius",
          lat: coords.lat,
          lng: coords.lng,
          radius: tinyRadius,
          rewardValue: "5% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      expect(response.body.radius).toBe(tinyRadius);
      createdDropIds.push(response.body.id);
    });

    it("should handle very large radius correctly", async () => {
      const coords = randomCoords();
      const largeRadius = 1000; // Maximum allowed

      const response = await request(app.getHttpServer())
        .post("/api/v1/merchants/me/drops")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send({
          name: "Large Radius Drop",
          description: "Very large capture radius",
          lat: coords.lat,
          lng: coords.lng,
          radius: largeRadius,
          rewardValue: "100% OFF",
          redemption: { type: "unlimited" },
          availability: {
            startTime: generateFutureDate(-1),
            endTime: generateFutureDate(24),
          },
          active: true,
        })
        .expect(201);

      expect(response.body.radius).toBe(largeRadius);
      createdDropIds.push(response.body.id);
    });
  });
});
