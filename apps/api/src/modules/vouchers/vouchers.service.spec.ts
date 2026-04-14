import { ForbiddenException } from "@nestjs/common";
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
    };
    service = new VouchersService(
      database as unknown as DatabaseService,
      mailService as unknown as MailService,
      dropsService as unknown as DropsService,
    );
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
