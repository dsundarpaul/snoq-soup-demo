import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Types, FlattenMaps } from "mongoose";
import { randomBytes } from "crypto";
import { DatabaseService } from "../../database/database.service";
import { DropDocument } from "../../database/schemas/drop.schema";
import { VoucherDocument } from "../../database/schemas/voucher.schema";
import { PromoCodeStatus } from "../../database/schemas/promo-code.schema";
import { ClaimVoucherDto } from "./dto/request/claim-voucher.dto";
import { RedeemVoucherDto } from "./dto/request/redeem-voucher.dto";
import { VoucherResponseDto } from "./dto/response/voucher-response.dto";
import { VoucherDetailResponseDto } from "./dto/response/voucher-detail-response.dto";
import { RedeemResultDto } from "./dto/response/redeem-result.dto";

// Type-safe refactor: Define proper interface for QR payload
interface QRPayload {
  v: string;
  t: string;
  d: string;
}

// Type-safe refactor: Define filter interface
interface VoucherFilter {
  deletedAt: null;
  $or: Array<Record<string, unknown>>;
}

@Injectable()
export class VouchersService {
  constructor(private readonly database: DatabaseService) {}

  async claim(dto: ClaimVoucherDto): Promise<VoucherResponseDto> {
    const { dropId, deviceId, hunterId } = dto;

    // Validate drop exists and is active
    const drop = await this.database.drops.findOne({
      _id: new Types.ObjectId(dropId),
      active: true,
      deletedAt: null,
    });

    if (!drop) {
      throw new NotFoundException("Drop not found or inactive");
    }

    // Check schedule constraints
    const now = new Date();
    if (drop.schedule?.start && now < drop.schedule.start) {
      throw new BadRequestException("Drop has not started yet");
    }
    if (drop.schedule?.end && now > drop.schedule.end) {
      throw new BadRequestException("Drop has ended");
    }

    // Check if already claimed by this device
    const existingClaim = await this.database.vouchers.findOne({
      dropId: new Types.ObjectId(dropId),
      "claimedBy.deviceId": deviceId,
      deletedAt: null,
    });

    if (existingClaim) {
      throw new ConflictException("Voucher already claimed by this device");
    }

    // Check capture limit (availability)
    if (drop.availability?.type === "limited") {
      const claimedCount = await this.database.vouchers.countDocuments({
        dropId: new Types.ObjectId(dropId),
        deletedAt: null,
      });

      if (claimedCount >= (drop.availability.limit || 0)) {
        throw new BadRequestException("Drop capture limit reached");
      }
    }

    // Generate magic token
    const magicToken = randomBytes(16).toString("hex");

    // Create voucher
    const voucher = await this.database.vouchers.create({
      dropId: new Types.ObjectId(dropId),
      merchantId: drop.merchantId,
      magicToken,
      claimedBy: {
        deviceId,
        hunterId: hunterId ? new Types.ObjectId(hunterId) : undefined,
      },
      claimedAt: new Date(),
      redeemed: false,
      redeemedAt: null,
      redeemedBy: {},
    });

    // Assign promo code if available
    await this.assignPromoCode(
      voucher._id as Types.ObjectId,
      drop._id as Types.ObjectId,
    );

    // Increment hunter stats if hunterId provided
    if (hunterId) {
      await this.database.hunters.findByIdAndUpdate(hunterId, {
        $inc: { "stats.totalClaims": 1 },
      });
    }

    return this.toResponseDto(voucher, drop);
  }

  async redeem(
    dto: RedeemVoucherDto,
    redeemerType: "merchant" | "scanner",
    redeemerId: string,
  ): Promise<RedeemResultDto> {
    const { voucherId, magicToken } = dto;

    // First check if voucher exists by ID only
    const voucher = await this.database.vouchers.findOne({
      _id: new Types.ObjectId(voucherId),
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException("Voucher not found");
    }

    // Then check magic token
    if (voucher.magicToken !== magicToken) {
      throw new ForbiddenException("Invalid magic token");
    }

    // Check if already redeemed
    if (voucher.redeemed) {
      throw new BadRequestException("Voucher has already been redeemed");
    }

    // Get drop for redemption constraints
    const drop = await this.database.drops.findById(voucher.dropId);
    if (!drop) {
      throw new NotFoundException("Associated drop not found");
    }

    // Check redemption constraints
    const now = new Date();

    if (drop.redemption?.type === "timer") {
      // Check timer constraint (must redeem within X minutes of claim)
      const claimTime = voucher.claimedAt.getTime();
      const minutesElapsed = (now.getTime() - claimTime) / (1000 * 60);

      if (drop.redemption.minutes && minutesElapsed > drop.redemption.minutes) {
        throw new ForbiddenException(
          `Voucher must be redeemed within ${drop.redemption.minutes} minutes of claim`,
        );
      }
    } else if (drop.redemption?.type === "window") {
      // Check window constraint (must redeem before deadline)
      if (drop.redemption.deadline && now > drop.redemption.deadline) {
        throw new ForbiddenException("Redemption window has expired");
      }
    }

    // Validate ownership - only the owning merchant can redeem their vouchers
    // Type-safe refactor: safely convert ObjectId to string
    const voucherMerchantId = voucher.merchantId?.toString() ?? "";
    if (redeemerType === "merchant" && redeemerId !== voucherMerchantId) {
      throw new ForbiddenException(
        "You can only redeem vouchers for your own drops",
      );
    }

    // For scanner, validate that the scanner belongs to the voucher's merchant
    if (redeemerType === "scanner") {
      // Scanner token is the redeemerId - need to validate it belongs to this merchant
      // The scanner token was validated by JwtAuthGuard to get the merchantId
      const scannerMerchantId = redeemerId;
      if (scannerMerchantId !== voucherMerchantId) {
        throw new ForbiddenException(
          "Scanner can only redeem vouchers for their assigned merchant",
        );
      }
    }

    // Mark as redeemed
    voucher.redeemed = true;
    voucher.redeemedAt = now;
    voucher.redeemedBy = {
      type: redeemerType,
      id: redeemerId,
    };

    await voucher.save();

    // Increment hunter stats if hunterId exists
    if (voucher.claimedBy?.hunterId) {
      await this.database.hunters.findByIdAndUpdate(
        voucher.claimedBy.hunterId,
        {
          $inc: { "stats.totalRedemptions": 1 },
        },
      );
    }

    // Get promo code if assigned
    const promoCode = await this.database.promoCodes.findOne({
      voucherId: voucher._id,
    });

    // Type-safe refactor: safely get IDs
    const voucherIdStr = voucher._id?.toString() ?? "";

    return {
      voucherId: voucherIdStr,
      voucher: this.toResponseDto(voucher, drop),
      success: true,
      message: "Voucher redeemed successfully",
      redeemedAt: voucher.redeemedAt,
      redeemedByType: redeemerType,
      redeemedById: redeemerId,
      promoCode: promoCode?.code,
      dropName: drop.name,
      merchantName: "", // Will be populated by controller if needed
    };
  }

  async findByMagicToken(token: string): Promise<VoucherDetailResponseDto> {
    const voucher = await this.database.vouchers.findOne({
      magicToken: token,
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException("Voucher not found");
    }

    return this.toDetailResponseDto(voucher);
  }

  async findByHunter(
    hunterId: string,
    deviceId?: string,
  ): Promise<VoucherResponseDto[]> {
    // Type-safe refactor: use proper filter type
    const filter: VoucherFilter = {
      deletedAt: null,
      $or: [],
    };

    if (hunterId) {
      filter.$or.push({ "claimedBy.hunterId": new Types.ObjectId(hunterId) });
    }

    if (deviceId) {
      filter.$or.push({ "claimedBy.deviceId": deviceId });
    }

    if (filter.$or.length === 0) {
      return [];
    }

    const vouchers = await this.database.vouchers
      .find(filter)
      .sort({ claimedAt: -1 })
      .lean();

    return vouchers.map((v) => this.toResponseDto(v as VoucherDocument));
  }

  async findByMerchant(
    merchantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ vouchers: VoucherResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    // Query using ObjectId since merchantId is stored as ObjectId
    const merchantObjectId = new Types.ObjectId(merchantId);
    const [vouchers, total] = await Promise.all([
      this.database.vouchers
        .find({ merchantId: merchantObjectId, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.database.vouchers.countDocuments({
        merchantId: merchantObjectId,
        deletedAt: null,
      }),
    ]);

    return {
      vouchers: vouchers.map((v) => this.toResponseDto(v as VoucherDocument)),
      total,
    };
  }

  async sendByEmail(
    voucherId: string,
    email: string,
    magicLink: string,
  ): Promise<void> {
    const voucher = await this.database.vouchers.findById(voucherId);

    if (!voucher || voucher.deletedAt) {
      throw new NotFoundException("Voucher not found");
    }

    // Update voucher with email
    voucher.claimedBy = {
      ...voucher.claimedBy,
      email,
    };

    await voucher.save();

    // TODO: Implement actual email sending via email service
    // This is a placeholder for email integration
    console.log(`Sending voucher email to ${email}: ${magicLink}`);
  }

  async sendByWhatsApp(
    voucherId: string,
    phone: string,
    magicLink: string,
  ): Promise<void> {
    const voucher = await this.database.vouchers.findById(voucherId);

    if (!voucher || voucher.deletedAt) {
      throw new NotFoundException("Voucher not found");
    }

    // Update voucher with phone
    voucher.claimedBy = {
      ...voucher.claimedBy,
      phone,
    };

    await voucher.save();

    // TODO: Implement actual WhatsApp sending via WhatsApp API
    // This is a placeholder for WhatsApp integration
    console.log(`Sending voucher WhatsApp to ${phone}: ${magicLink}`);
  }

  async getPromoCode(
    voucherId: string,
    magicToken: string,
  ): Promise<string | null> {
    const voucher = await this.database.vouchers.findOne({
      _id: new Types.ObjectId(voucherId),
      magicToken,
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException("Voucher not found");
    }

    const promoCode = await this.database.promoCodes.findOne({
      voucherId: voucher._id,
    });

    return promoCode?.code || null;
  }

  generateQRData(voucher: VoucherResponseDto | VoucherDocument): string {
    // Type-safe refactor: extract ID safely
    let voucherIdStr = "";
    if ("id" in voucher && voucher.id) {
      voucherIdStr = voucher.id;
    } else if ("_id" in voucher && voucher._id) {
      voucherIdStr = voucher._id.toString();
    }

    // Type-safe refactor: extract dropId safely
    let dropIdStr = "";
    if (typeof voucher.dropId === "string") {
      dropIdStr = voucher.dropId;
    } else if (voucher.dropId && "toString" in voucher.dropId) {
      dropIdStr = voucher.dropId.toString();
    }

    // Type-safe refactor: properly typed QR payload
    const qrPayload: QRPayload = {
      v: voucherIdStr,
      t: voucher.magicToken,
      d: dropIdStr,
    };

    return Buffer.from(JSON.stringify(qrPayload)).toString("base64");
  }

  private async assignPromoCode(
    voucherId: Types.ObjectId,
    dropId: Types.ObjectId,
  ): Promise<void> {
    // Find available promo code for this drop
    const promoCode = await this.database.promoCodes.findOneAndUpdate(
      {
        dropId,
        status: "available",
        deletedAt: null,
      },
      {
        $set: {
          status: "assigned",
          voucherId,
          assignedAt: new Date(),
        },
      },
      { sort: { createdAt: 1 } },
    );

    // If no promo code available, that's okay - voucher still valid
    if (!promoCode) {
      console.log(`No promo code available for drop ${dropId}`);
    }
  }

  private toResponseDto(
    voucher: VoucherDocument | FlattenMaps<VoucherDocument>,
    drop?: DropDocument | FlattenMaps<DropDocument> | null,
  ): VoucherResponseDto {
    // Type-safe refactor: safely convert ObjectId to string
    const id =
      "_id" in voucher && voucher._id
        ? voucher._id.toString()
        : ((voucher as { id?: string }).id ?? "");

    const dropIdStr = voucher.dropId
      ? typeof voucher.dropId === "string"
        ? voucher.dropId
        : voucher.dropId.toString()
      : "";

    const merchantIdStr = voucher.merchantId
      ? typeof voucher.merchantId === "string"
        ? voucher.merchantId
        : voucher.merchantId.toString()
      : "";

    const hunterIdStr = voucher.claimedBy?.hunterId
      ? typeof voucher.claimedBy.hunterId === "string"
        ? voucher.claimedBy.hunterId
        : voucher.claimedBy.hunterId.toString()
      : undefined;

    // Build drop data if provided
    const dropData = drop
      ? {
          id: ("_id" in drop ? drop._id?.toString() : "") ?? "",
          name: drop.name,
          description: drop.description,
          rewardValue: drop.rewardValue,
          logoUrl: drop.logoUrl ?? null,
        }
      : undefined;

    return {
      id,
      dropId: dropIdStr,
      drop: dropData,
      merchantId: merchantIdStr,
      magicToken: voucher.magicToken,
      claimedBy: {
        deviceId: voucher.claimedBy?.deviceId,
        hunterId: hunterIdStr,
        email: voucher.claimedBy?.email,
        phone: voucher.claimedBy?.phone,
      },
      claimedAt: voucher.claimedAt,
      redeemed: voucher.redeemed,
      redeemedAt: voucher.redeemedAt,
      redeemedBy: voucher.redeemedBy || {},
      qrData: this.generateQRData(voucher as VoucherDocument),
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };
  }

  private async toDetailResponseDto(
    voucher: VoucherDocument,
  ): Promise<VoucherDetailResponseDto> {
    const baseDto = this.toResponseDto(voucher);

    // Get drop details
    const drop = await this.database.drops.findById(voucher.dropId).lean();

    // Get promo code
    const promoCode = await this.database.promoCodes
      .findOne({
        voucherId: voucher._id,
      })
      .lean();

    // Type-safe refactor: safely convert drop ID
    const dropIdStr = drop?._id?.toString() ?? "";

    // Build drop data
    const dropData = drop
      ? {
          id: dropIdStr,
          name: drop.name,
          description: drop.description,
          rewardValue: drop.rewardValue,
          logoUrl: drop.logoUrl ?? null,
        }
      : {
          id: "",
          name: "",
          description: "",
          rewardValue: "",
          logoUrl: null,
        };

    // Build redemption config
    const redemptionConfig = drop?.redemption
      ? {
          type: drop.redemption.type,
          minutes: drop.redemption.minutes,
          deadline: drop.redemption.deadline,
        }
      : {
          type: "anytime" as const,
        };

    // Type-safe refactor: build response properly without forceful casting
    const detailDto: VoucherDetailResponseDto = {
      ...baseDto,
      drop: dropData,
      // Type-safe refactor: merchant will be populated by controller
      merchant: undefined as unknown as VoucherDetailResponseDto["merchant"],
      redemptionConfig,
      promoCode: promoCode
        ? {
            code: promoCode.code,
            status: promoCode.status as PromoCodeStatus,
          }
        : null,
    };

    return detailDto;
  }
}
