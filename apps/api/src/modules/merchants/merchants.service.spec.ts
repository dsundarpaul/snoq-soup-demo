import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { MerchantsService } from "./merchants.service";
import { DatabaseService } from "../../database/database.service";
import { DropsService } from "../drops/drops.service";

describe("MerchantsService", () => {
  let service: MerchantsService;
  let database: {
    merchants: { findOneAndUpdate: jest.Mock };
  };
  let dropsService: Record<string, never>;

  beforeEach(() => {
    database = {
      merchants: {
        findOneAndUpdate: jest.fn(),
      },
    };
    dropsService = {};
    service = new MerchantsService(
      database as unknown as DatabaseService,
      dropsService as unknown as DropsService,
    );
  });

  describe("clearStoreLocation", () => {
    const merchantObjectId = new Types.ObjectId();

    it("throws when merchant is not found", async () => {
      database.merchants.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.clearStoreLocation(merchantObjectId.toString()),
      ).rejects.toThrow(NotFoundException);

      expect(database.merchants.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: merchantObjectId.toString(), deletedAt: null },
        { $set: { storeLocation: null } },
        { new: true },
      );
    });

    it("returns profile with storeLocation null", async () => {
      const now = new Date();
      database.merchants.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: merchantObjectId,
          email: "store@example.com",
          businessName: "Test Store",
          logoUrl: null,
          username: "teststore",
          emailVerified: true,
          storeLocation: null,
          createdAt: now,
          updatedAt: now,
        }),
      });

      const result = await service.clearStoreLocation(
        merchantObjectId.toString(),
      );

      expect(result.id).toBe(merchantObjectId.toString());
      expect(result.storeLocation).toBeNull();
    });
  });
});
