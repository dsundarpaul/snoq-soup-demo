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
import { HunterVouchersBucketsDto } from "./dto/response/hunter-vouchers-buckets.dto";
import { MailService } from "../mail/mail.service";
import { DropsService } from "../drops/drops.service";

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
  constructor(
    private readonly database: DatabaseService,
    private readonly mailService: MailService,
    private readonly dropsService: DropsService,
  ) {}

  async claim(
    dto: ClaimVoucherDto & { deviceResolvedHunterId?: string },
  ): Promise<VoucherResponseDto> {
    const {
      dropId,
      deviceId,
      hunterId: hunterIdRaw,
      deviceResolvedHunterId,
    } = dto;

    let linkedHunterId: Types.ObjectId | undefined;
    if (deviceResolvedHunterId?.trim()) {
      try {
        linkedHunterId = new Types.ObjectId(deviceResolvedHunterId.trim());
      } catch {
        linkedHunterId = undefined;
      }
    }

    if (hunterIdRaw?.trim()) {
      const trimmed = hunterIdRaw.trim();
      let candidate: Types.ObjectId;
      try {
        candidate = new Types.ObjectId(trimmed);
      } catch {
        throw new BadRequestException("Invalid hunter ID");
      }
      // if (linkedHunterId && !linkedHunterId.equals(candidate)) {
      //   throw new BadRequestException("Hunter does not match device");
      // }
      if (!linkedHunterId) {
        const hunter = await this.database.hunters
          .findOne({
            _id: candidate,
            // deviceId,
            deletedAt: null,
          })
          .select("_id")
          .lean();
        if (hunter?._id) {
          linkedHunterId = hunter._id as Types.ObjectId;
        }
      }
    }

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
    // const claimedAt = new Date();
    // const expiresAt = this.computeVoucherExpiresAt(drop, claimedAt);

    // Create voucher
    const voucher = await this.database.vouchers.create({
      dropId: new Types.ObjectId(dropId),
      merchantId: drop.merchantId,
      magicToken,
      claimedBy: {
        deviceId,
        hunterId: linkedHunterId,
      },
      // claimedAt,
      // expiresAt,
      redeemed: false,
      redeemedAt: null,
      redeemedBy: {},
    });

    // Assign promo code if available
    await this.assignPromoCode(
      voucher._id as Types.ObjectId,
      drop._id as Types.ObjectId,
    );

    if (linkedHunterId) {
      await this.database.hunters.findByIdAndUpdate(linkedHunterId, {
        $inc: { "stats.totalClaims": 1 },
      });
    }

    return this.toResponseDto(voucher, drop);
  }

  async redeem(
    dto: RedeemVoucherDto,
    redeemerType: "merchant" | "scanner" | "hunter",
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

    const now = new Date();

    if (voucher.expiresAt && now > voucher.expiresAt) {
      throw new ForbiddenException("Voucher has expired");
    }

    const voucherMerchantId = voucher.merchantId?.toString() ?? "";

    // Check redemption constraints
    if (voucher.expiresAt == null && drop.redemption?.type === "timer") {
      // Check timer constraint (must redeem within X minutes of claim)
      const claimTime = voucher.claimedAt.getTime();
      const minutesElapsed = (now.getTime() - claimTime) / (1000 * 60);

      if (drop.redemption.minutes && minutesElapsed > drop.redemption.minutes) {
        throw new ForbiddenException(
          `Voucher must be redeemed within ${drop.redemption.minutes} minutes of claim`,
        );
      }
    } else if (
      voucher.expiresAt == null &&
      drop.redemption?.type === "window"
    ) {
      if (drop.redemption.deadline && now > drop.redemption.deadline) {
        throw new ForbiddenException("Redemption window has expired");
      }
    }

    if (redeemerType === "hunter") {
      const hunter = await this.database.hunters
        .findOne({ _id: redeemerId, deletedAt: null })
        .lean();
      if (!hunter) {
        throw new ForbiddenException("Hunter not found");
      }
      const link = hunter.redeemerMerchantId?.toString() ?? "";
      if (!link || link !== voucherMerchantId) {
        throw new ForbiddenException(
          "Hunter is not authorized to redeem for this merchant",
        );
      }
    }

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

  async findByHunter(hunterId: string): Promise<HunterVouchersBucketsDto> {
    const hunter = await this.database.hunters
      .findOne({ _id: hunterId, deletedAt: null })
      .select("deviceId")
      .lean();

    if (!hunter) {
      return { unredeemed: [], redeemed: [] };
    }

    const filter: VoucherFilter = {
      deletedAt: null,
      $or: [{ "claimedBy.hunterId": new Types.ObjectId(hunterId) }],
    };

    if (hunter.deviceId) {
      filter.$or.push({ "claimedBy.deviceId": hunter.deviceId });
    }

    const vouchersList = await this.database.vouchers
      .find(filter)
      .sort({ claimedAt: -1 })
      .lean();

    const dropIdStrs = [
      ...new Set(
        vouchersList
          .map((v) =>
            v.dropId
              ? typeof v.dropId === "string"
                ? v.dropId
                : v.dropId.toString()
              : "",
          )
          .filter(Boolean),
      ),
    ];

    const drops =
      dropIdStrs.length > 0
        ? await this.database.drops
            .find({
              _id: { $in: dropIdStrs.map((id) => new Types.ObjectId(id)) },
              deletedAt: null,
            })
            .lean()
        : [];

    const dropMap = new Map(
      drops.map((d) => [d._id.toString(), d as DropDocument]),
    );

    const unredeemed: HunterVouchersBucketsDto["unredeemed"] = [];
    const redeemed: HunterVouchersBucketsDto["redeemed"] = [];

    for (const v of vouchersList) {
      const dropIdStr =
        typeof v.dropId === "string" ? v.dropId : (v.dropId?.toString() ?? "");
      const doc = dropMap.get(dropIdStr);
      if (!doc) {
        continue;
      }

      const dropDto = this.dropsService.toResponseDto(doc);
      const voucherDto = this.toResponseDto(v as VoucherDocument, null);

      const item = { voucher: voucherDto, drop: dropDto };
      if (v.redeemed) {
        redeemed.push(item);
      } else {
        unredeemed.push(item);
      }
    }

    return { unredeemed, redeemed };
  }

  async findByMerchant(
    merchantId: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ): Promise<{
    vouchers: VoucherResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const merchantObjectId = new Types.ObjectId(merchantId);

    const filter: Record<string, unknown> = {
      merchantId: merchantObjectId,
      deletedAt: null,
    };

    if (status === "redeemed") {
      filter.redeemed = true;
    } else if (status === "active") {
      filter.redeemed = false;
    }

    let dropIdFilter: Types.ObjectId[] | undefined;
    if (search) {
      const regex = new RegExp(search, "i");
      const matchingDrops = await this.database.drops
        .find({ merchantId: merchantObjectId, name: regex, deletedAt: null })
        .select("_id")
        .lean();
      dropIdFilter = matchingDrops.map((d) => d._id as Types.ObjectId);
      filter.dropId = { $in: dropIdFilter };
    }

    const [vouchers, total] = await Promise.all([
      this.database.vouchers
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.database.vouchers.countDocuments(filter),
    ]);

    const dropIds = [
      ...new Set(vouchers.map((v) => (v.dropId ? v.dropId.toString() : ""))),
    ].filter(Boolean);
    const drops =
      dropIds.length > 0
        ? await this.database.drops
            .find({
              _id: {
                $in: dropIds.map((id) => new Types.ObjectId(id)),
              },
            })
            .lean()
        : [];
    const dropMap = new Map(
      drops.map((d) => [d._id.toString(), d as DropDocument]),
    );

    const hunterIdStrings = new Set<string>();
    for (const v of vouchers) {
      const hid = v.claimedBy?.hunterId;
      if (!hid) continue;
      const s = typeof hid === "string" ? hid : hid.toString();
      if (Types.ObjectId.isValid(s)) {
        hunterIdStrings.add(s);
      }
    }

    const hunterDocs =
      hunterIdStrings.size > 0
        ? await this.database.hunters
            .find({
              _id: {
                $in: [...hunterIdStrings].map((id) => new Types.ObjectId(id)),
              },
              deletedAt: null,
            })
            .select("nickname email")
            .lean()
        : [];

    const hunterById = new Map(
      hunterDocs.map((h) => [
        h._id.toString(),
        {
          nickname: h.nickname ?? null,
          email: h.email ?? null,
        },
      ]),
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      vouchers: vouchers.map((v) => {
        const dto = this.toResponseDto(
          v as VoucherDocument,
          dropMap.get(v.dropId?.toString() ?? "") ?? null,
        );
        const hid = dto.claimedBy?.hunterId;
        if (hid) {
          const hunter = hunterById.get(hid);
          if (hunter) {
            dto.claimedBy = {
              ...dto.claimedBy,
              ...(hunter.nickname != null && hunter.nickname !== ""
                ? { name: hunter.nickname }
                : {}),
              email: dto.claimedBy.email ?? hunter.email ?? undefined,
            };
          }
        }
        return dto;
      }),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async sendByEmail(
    voucherId: string,
    email: string,
    magicLink: string,
    magicToken: string,
  ): Promise<void> {
    const voucher = await this.database.vouchers.findOne({
      _id: new Types.ObjectId(voucherId),
      magicToken,
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException("Voucher not found");
    }

    // Update voucher with email
    voucher.claimedBy = {
      ...voucher.claimedBy,
      email,
    };

    await voucher.save();

    const dropDoc = await this.database.drops.findById(voucher.dropId);
    const dropName =
      dropDoc && "name" in dropDoc && dropDoc.name
        ? String(dropDoc.name)
        : "Reward";

    await this.mailService.sendVoucherMagicLink(email, magicLink, dropName);
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

  private computeVoucherExpiresAt(
    drop: DropDocument | FlattenMaps<DropDocument>,
    claimedAt: Date,
  ): Date | null {
    const candidates: number[] = [];
    const abs = drop.voucherAbsoluteExpiresAt;
    if (abs) {
      candidates.push(new Date(abs).getTime());
    }
    const ttl = drop.voucherTtlHoursAfterClaim;
    if (ttl != null && ttl >= 1) {
      const t = new Date(claimedAt);
      t.setHours(t.getHours() + ttl);
      candidates.push(t.getTime());
    }
    if (drop.redemption?.type === "window" && drop.redemption.deadline) {
      candidates.push(new Date(drop.redemption.deadline).getTime());
    }
    if (drop.redemption?.type === "timer" && drop.redemption.minutes) {
      const t = new Date(claimedAt);
      t.setMinutes(t.getMinutes() + drop.redemption.minutes);
      candidates.push(t.getTime());
    }
    if (candidates.length === 0) {
      return null;
    }
    return new Date(Math.min(...candidates));
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
          termsAndConditions: drop.termsAndConditions ?? null,
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
      expiresAt: voucher.expiresAt ?? null,
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

    const [drop, promoCode, merchant] = await Promise.all([
      this.database.drops.findById(voucher.dropId).lean(),
      this.database.promoCodes.findOne({ voucherId: voucher._id }).lean(),
      this.database.merchants
        .findById(voucher.merchantId)
        .select(
          "businessName username logoUrl storeLocation businessPhone businessHours",
        )
        .lean(),
    ]);

    const dropIdStr = drop?._id?.toString() ?? "";

    const dropData = drop
      ? {
          id: dropIdStr,
          name: drop.name,
          description: drop.description,
          rewardValue: drop.rewardValue,
          logoUrl: drop.logoUrl ?? null,
          termsAndConditions: drop.termsAndConditions ?? null,
        }
      : {
          id: "",
          name: "",
          description: "",
          rewardValue: "",
          logoUrl: null,
          termsAndConditions: null,
        };

    const redemptionConfig = drop?.redemption
      ? {
          type: drop.redemption.type,
          minutes: drop.redemption.minutes,
          deadline: drop.redemption.deadline,
        }
      : {
          type: "anytime" as const,
        };

    const sl = merchant?.storeLocation ?? null;

    const merchantInfo = merchant
      ? {
          id: merchant._id.toString(),
          name: merchant.businessName,
          username: merchant.username,
          logoUrl: merchant.logoUrl ?? null,
          storeLocation: sl
            ? {
                lat: sl.lat,
                lng: sl.lng,
                address: sl.address,
                city: sl.city,
                state: sl.state,
                pincode: sl.pincode,
                landmark: sl.landmark,
                howToReach: sl.howToReach,
              }
            : null,
          businessPhone:
            ((merchant as Record<string, unknown>).businessPhone as
              | string
              | null) ?? null,
          businessHours:
            ((merchant as Record<string, unknown>).businessHours as
              | string
              | null) ?? null,
        }
      : {
          id: "",
          name: "",
          username: "",
          logoUrl: null,
          storeLocation: null,
          businessPhone: null,
          businessHours: null,
        };

    const detailDto: VoucherDetailResponseDto = {
      ...baseDto,
      drop: dropData,
      merchant: merchantInfo,
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
