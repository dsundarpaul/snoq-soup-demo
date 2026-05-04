import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import type { Request } from "express";
import { VouchersService } from "./vouchers.service";
import { DatabaseService } from "../../database/database.service";
import { MailService } from "../mail/mail.service";
import { DropsService } from "../drops/drops.service";
import { HunterIdentityResolverService } from "../hunter-identity/hunter-identity-resolver.service";

describe("VouchersService", () => {
  let service: VouchersService;
  let mailService: {
    sendVoucherMagicLink: jest.Mock;
    sendRewardClaimedNotification: jest.Mock;
    sendRewardRedeemedNotification: jest.Mock;
  };
  let dropsService: { toResponseDto: jest.Mock };
  let database: {
    vouchers: {
      findOne: jest.Mock;
      find: jest.Mock;
      countDocuments: jest.Mock;
      create: jest.Mock;
      findOneAndUpdate: jest.Mock;
    };
    drops: { findOne: jest.Mock; findById: jest.Mock };
    promoCodes: { findOne: jest.Mock; findOneAndUpdate: jest.Mock };
    hunters: { findByIdAndUpdate: jest.Mock; findOne: jest.Mock };
    merchants: { findById: jest.Mock };
  };
  let hunterIdentityResolver: {
    resolvePublicClaimIdentity: jest.Mock;
  };

  const mockReq = {} as Request;

  beforeEach(() => {
    mailService = {
      sendVoucherMagicLink: jest.fn().mockResolvedValue(undefined),
      sendRewardClaimedNotification: jest.fn().mockResolvedValue(undefined),
      sendRewardRedeemedNotification: jest.fn().mockResolvedValue(undefined),
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
        findOneAndUpdate: jest.fn(),
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
    hunterIdentityResolver = {
      resolvePublicClaimIdentity: jest.fn(),
    };
    service = new VouchersService(
      database as unknown as DatabaseService,
      mailService as unknown as MailService,
      dropsService as unknown as DropsService,
      hunterIdentityResolver as unknown as HunterIdentityResolverService,
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

    it("rejects when identity resolver fails", async () => {
      hunterIdentityResolver.resolvePublicClaimIdentity.mockRejectedValue(
        new BadRequestException("Hunter not found"),
      );

      await expect(
        service.claim(mockReq, {
          dropId: dropId.toString(),
          deviceId: "device_a",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when drop is missing", async () => {
      hunterIdentityResolver.resolvePublicClaimIdentity.mockResolvedValue({
        hunterObjectId: hunterId,
        hunterEmailTrimmed: "hunter@test.com",
        claimedWithoutRegisteredAccount: false,
        resolutionSource: "jwt",
      });
      database.drops.findOne.mockResolvedValue(null);

      await expect(
        service.claim(mockReq, {
          dropId: dropId.toString(),
          deviceId: "device_a",
          hunterId: hunterId.toString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects duplicate claim for same hunter and drop", async () => {
      hunterIdentityResolver.resolvePublicClaimIdentity.mockResolvedValue({
        hunterObjectId: hunterId,
        hunterEmailTrimmed: "hunter@test.com",
        claimedWithoutRegisteredAccount: false,
        resolutionSource: "jwt",
      });
      database.drops.findOne.mockResolvedValue(baseDrop);
      database.vouchers.findOne.mockResolvedValue({ _id: voucherId });

      await expect(
        service.claim(mockReq, {
          dropId: dropId.toString(),
          deviceId: "device_a",
          hunterId: hunterId.toString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates voucher scoped to resolved hunter", async () => {
      const now = new Date();
      hunterIdentityResolver.resolvePublicClaimIdentity.mockResolvedValue({
        hunterObjectId: hunterId,
        hunterEmailTrimmed: "hunter@test.com",
        claimedWithoutRegisteredAccount: false,
        resolutionSource: "jwt",
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
        claimedWithoutRegisteredAccount: false,
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

      const claimResult = await service.claim(mockReq, {
        dropId: dropId.toString(),
        deviceId: "device_a",
        hunterId: hunterId.toString(),
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
          claimedWithoutRegisteredAccount: false,
        }),
      );
      expect(database.hunters.findByIdAndUpdate).toHaveBeenCalledWith(
        hunterId,
        { $inc: { "stats.totalClaims": 1 } },
      );

      expect(mailService.sendRewardClaimedNotification).toHaveBeenCalledWith(
        "hunter@test.com",
        expect.stringMatching(/\/voucher\/[0-9a-f]{32}(?:\/)?$/i),
        "Reward",
        "Test Merchant",
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
      const now = new Date();
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

      database.vouchers.findOneAndUpdate.mockResolvedValue({
        ...v,
        redeemed: true,
        redeemedAt: now,
        redeemedBy: {
          type: "hunter",
          id: hunterDbId.toString(),
        },
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

      expect(database.vouchers.findOneAndUpdate).toHaveBeenCalled();
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
