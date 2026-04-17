import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { VouchersService } from "./vouchers.service";
import { DatabaseService } from "../../database/database.service";
import { MailService } from "../mail/mail.service";
import { DropsService } from "../drops/drops.service";

describe("VouchersService", () => {
  let service: VouchersService;
  let mailService: { sendVoucherMagicLink: jest.Mock };
  let dropsService: { toResponseDto: jest.Mock };
  let database: {
    vouchers: {
      findOne: jest.Mock;
      find: jest.Mock;
      countDocuments: jest.Mock;
      create: jest.Mock;
    };
    drops: { findOne: jest.Mock; findById: jest.Mock };
    promoCodes: { findOne: jest.Mock; findOneAndUpdate: jest.Mock };
    hunters: { findByIdAndUpdate: jest.Mock; findOne: jest.Mock };
    merchants: { findById: jest.Mock };
  };

  beforeEach(() => {
    mailService = {
      sendVoucherMagicLink: jest.fn().mockResolvedValue(undefined),
    };
    dropsService = {
      toResponseDto: jest.fn().mockReturnValue({
        id: "drop",
        name: "Drop",
        location: { lat: 0, lng: 0 },
        radius: 15,
        rewardValue: "",
        redemption: { type: "anytime" },
        availability: { type: "unlimited" },
        active: true,
        merchantId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    database = {
      vouchers: {
        findOne: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn(),
        create: jest.fn(),
      },
      drops: { findOne: jest.fn(), findById: jest.fn() },
      promoCodes: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
      hunters: { findByIdAndUpdate: jest.fn(), findOne: jest.fn() },
      merchants: {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      },
    };
    service = new VouchersService(
      database as unknown as DatabaseService,
      mailService as unknown as MailService,
      dropsService as unknown as DropsService,
    );
  });

  describe("claim", () => {
    const dropId = new Types.ObjectId();
    const hunterId = new Types.ObjectId();
    const merchantId = new Types.ObjectId();
    const voucherId = new Types.ObjectId();

    const baseDrop = {
      _id: dropId,
      merchantId,
      active: true,
      deletedAt: null,
      schedule: undefined,
      availability: { type: "unlimited" as const },
    };

    it("rejects when deviceResolvedHunterId is missing", async () => {
      await expect(
        service.claim({
          dropId: dropId.toString(),
          deviceId: "device_a",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when body hunterId does not match device-resolved hunter", async () => {
      const other = new Types.ObjectId();
      await expect(
        service.claim({
          dropId: dropId.toString(),
          deviceId: "device_a",
          hunterId: other.toString(),
          deviceResolvedHunterId: hunterId.toString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when hunter is not found", async () => {
      database.hunters.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.claim({
          dropId: dropId.toString(),
          deviceId: "device_a",
          hunterId: hunterId.toString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when drop is missing", async () => {
      database.hunters.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: hunterId,
            email: "hunter@test.com",
          }),
        }),
      });
      database.drops.findOne.mockResolvedValue(null);

      await expect(
        service.claim({
          dropId: dropId.toString(),
          deviceId: "device_a",
          hunterId: hunterId.toString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects duplicate claim for same hunter and drop", async () => {
      database.hunters.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: hunterId,
            email: "hunter@test.com",
          }),
        }),
      });
      database.drops.findOne.mockResolvedValue(baseDrop);
      database.vouchers.findOne.mockResolvedValue({ _id: voucherId });

      await expect(
        service.claim({
          dropId: dropId.toString(),
          deviceId: "device_a",
          hunterId: hunterId.toString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates voucher scoped to resolved hunter", async () => {
      const now = new Date();
      database.hunters.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: hunterId,
            email: "hunter@test.com",
          }),
        }),
      });
      database.drops.findOne.mockResolvedValue(baseDrop);
      database.vouchers.findOne.mockResolvedValue(null);
      database.vouchers.countDocuments.mockResolvedValue(0);
      database.vouchers.create.mockResolvedValue({
        _id: voucherId,
        dropId,
        merchantId,
        magicToken: "tok",
        claimedBy: { deviceId: "device_a", hunterId },
        claimedAt: now,
        expiresAt: null,
        redeemed: false,
        redeemedAt: null,
        redeemedBy: {},
        createdAt: now,
        updatedAt: now,
      });
      database.promoCodes.findOneAndUpdate.mockResolvedValue(null);
      database.hunters.findByIdAndUpdate.mockResolvedValue(null);
      database.merchants.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: merchantId,
            businessName: "Test Merchant",
            username: "testmerchant",
            logoUrl: null,
            storeLocation: null,
            businessPhone: "+966500000000",
            businessHours: "9-5",
          }),
        }),
      });

      const claimResult = await service.claim({
        dropId: dropId.toString(),
        deviceId: "device_a",
        hunterId: hunterId.toString(),
        deviceResolvedHunterId: hunterId.toString(),
      });

      expect(claimResult.merchant.name).toBe("Test Merchant");
      expect(claimResult.merchant.businessPhone).toBe("+966500000000");

      expect(database.vouchers.findOne).toHaveBeenCalledWith({
        dropId: new Types.ObjectId(dropId.toString()),
        "claimedBy.hunterId": hunterId,
        deletedAt: null,
      });
      expect(database.vouchers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          claimedBy: {
            deviceId: "device_a",
            hunterId,
          },
        }),
      );
      expect(database.hunters.findByIdAndUpdate).toHaveBeenCalledWith(
        hunterId,
        { $inc: { "stats.totalClaims": 1 } },
      );
    });
  });

  describe("redeem", () => {
    const merchantId = new Types.ObjectId();
    const dropId = new Types.ObjectId();
    const voucherId = new Types.ObjectId();

    function mockVoucher(overrides: Record<string, unknown>) {
      const now = new Date();
      return {
        _id: voucherId,
        magicToken: "magic",
        redeemed: false,
        claimedAt: now,
        redeemedAt: null,
        merchantId,
        dropId,
        claimedBy: {},
        createdAt: now,
        updatedAt: now,
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
    }

    it("rejects when voucher.expiresAt is in the past", async () => {
      database.vouchers.findOne.mockResolvedValue(
        mockVoucher({
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );
      database.drops.findById.mockResolvedValue({
        _id: dropId,
        name: "Drop",
        description: "",
        rewardValue: "",
        logoUrl: null,
        redemption: { type: "anytime" },
      });

      await expect(
        service.redeem(
          {
            voucherId: voucherId.toString(),
            magicToken: "magic",
          },
          "merchant",
          merchantId.toString(),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows hunter redeem when redeemerMerchantId matches voucher merchant", async () => {
      const hunterDbId = new Types.ObjectId();
      const v = mockVoucher({ expiresAt: null });
      database.vouchers.findOne.mockResolvedValue(v);
      database.drops.findById.mockResolvedValue({
        _id: dropId,
        name: "Drop",
        description: "",
        rewardValue: "",
        logoUrl: null,
        redemption: { type: "anytime" },
      });
      database.hunters.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: hunterDbId,
          redeemerMerchantId: merchantId,
          deletedAt: null,
        }),
      });
      database.promoCodes.findOne.mockResolvedValue(null);

      await service.redeem(
        {
          voucherId: voucherId.toString(),
          magicToken: "magic",
        },
        "hunter",
        hunterDbId.toString(),
      );

      expect(v.save).toHaveBeenCalled();
      expect(v.redeemed).toBe(true);
      expect(
        (v as unknown as { redeemedBy: { type: string; id: string } })
          .redeemedBy,
      ).toEqual({
        type: "hunter",
        id: hunterDbId.toString(),
      });
    });

    it("rejects hunter redeem when not linked to merchant", async () => {
      const hunterDbId = new Types.ObjectId();
      const otherMerchant = new Types.ObjectId();
      const v = mockVoucher({ expiresAt: null });
      database.vouchers.findOne.mockResolvedValue(v);
      database.drops.findById.mockResolvedValue({
        _id: dropId,
        name: "Drop",
        description: "",
        rewardValue: "",
        logoUrl: null,
        redemption: { type: "anytime" },
      });
      database.hunters.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: hunterDbId,
          redeemerMerchantId: otherMerchant,
          deletedAt: null,
        }),
      });

      await expect(
        service.redeem(
          {
            voucherId: voucherId.toString(),
            magicToken: "magic",
          },
          "hunter",
          hunterDbId.toString(),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
