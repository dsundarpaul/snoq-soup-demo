import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { Types, FlattenMaps } from "mongoose";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { DatabaseService } from "../../database/database.service";
import { DropDocument } from "../../database/schemas/drop.schema";
import { VoucherDocument } from "../../database/schemas/voucher.schema";
import { PromoCodeStatus } from "../../database/schemas/promo-code.schema";
import { ClaimVoucherDto } from "./dto/request/claim-voucher.dto";
import { RedeemVoucherDto } from "./dto/request/redeem-voucher.dto";
import {
  VoucherResponseDto,
  MerchantVoucherResponseDto,
} from "./dto/response/voucher-response.dto";
import { ClaimVoucherResponseDto } from "./dto/response/claim-voucher-response.dto";
import {
  VoucherDetailResponseDto,
  MerchantInfoDto,
} from "./dto/response/voucher-detail-response.dto";
import { RedeemResultDto } from "./dto/response/redeem-result.dto";
import {
  HunterVouchersBucketsDto,
  HunterVouchersPageDto,
  HunterVoucherItemDto,
} from "./dto/response/hunter-vouchers-buckets.dto";
import { config } from "../../config/app.config";
import { MailService } from "../mail/mail.service";
import { DropsService } from "../drops/drops.service";
import { HunterIdentityResolverService } from "../hunter-identity/hunter-identity-resolver.service";
import type { Request } from "express";

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
  private readonly logger = new Logger(VouchersService.name);

  /**
   * Hash a magic token using SHA-256 for secure storage.
   * Magic tokens are bearer credentials and should never be stored in plaintext.
   */
  private hashMagicToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   * Used for comparing sensitive values like magic tokens and hashes.
   */
  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      const bufA = Buffer.from(a, "hex");
      const bufB = Buffer.from(b, "hex");
      return timingSafeEqual(bufA, bufB);
    } catch {
      // Fallback to length-safe comparison if hex parsing fails
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    }
  }

  private buildPublicVoucherUrl(magicToken: string): string {
    const base = config.FRONTEND_URL.replace(/\/$/, "");
    return `${base}/voucher/${encodeURIComponent(magicToken)}`;
  }

  private async resolveHunterNotificationEmail(
    voucher: VoucherDocument,
  ): Promise<string | null> {
    const direct = voucher.claimedBy?.email?.trim();
    if (direct) return direct;

    const hunterId = voucher.claimedBy?.hunterId;
    if (!hunterId) return null;

    const hunter = await this.database.hunters
      .findOne({ _id: hunterId, deletedAt: null })
      .select("email")
      .lean();

    const resolved = hunter?.email?.trim();
    return resolved ?? null;
  }

  constructor(
    private readonly database: DatabaseService,
    private readonly mailService: MailService,
    private readonly dropsService: DropsService,
    private readonly hunterIdentityResolver: HunterIdentityResolverService,
  ) {}

  async claim(
    req: Request,
    dto: ClaimVoucherDto,
  ): Promise<ClaimVoucherResponseDto> {
    const { dropId, deviceId } = dto;
    const identity =
      await this.hunterIdentityResolver.resolvePublicClaimIdentity(req, {
        deviceId,
        hunterId: dto.hunterId,
      });
    const hunterObjectId = identity.hunterObjectId;

    const drop = await this.database.drops.findOne({
      _id: new Types.ObjectId(dropId),
      active: true,
      deletedAt: null,
    });

    if (!drop) {
      throw new NotFoundException("Drop not found or inactive");
    }

    const now = new Date();
    if (drop.schedule?.start && now < drop.schedule.start) {
      throw new BadRequestException("Drop has not started yet");
    }
    if (drop.schedule?.end && now > drop.schedule.end) {
      throw new BadRequestException("Drop has ended");
    }

    const existingClaim = await this.database.vouchers.findOne({
      dropId: new Types.ObjectId(dropId),
      "claimedBy.hunterId": hunterObjectId,
      deletedAt: null,
    });

    if (existingClaim) {
      throw new ConflictException("Voucher already claimed by this hunter");
    }

    const cap = this.getLimitedAvailabilityCap(drop);
    let claimedCountBefore = 0;
    if (cap !== null) {
      claimedCountBefore = await this.database.vouchers.countDocuments({
        dropId: new Types.ObjectId(dropId),
        deletedAt: null,
      });

      if (claimedCountBefore >= cap) {
        await this.deactivateLimitedDropIfAtOrOverCount(
          drop,
          claimedCountBefore,
        );
        throw new BadRequestException("Drop capture limit reached");
      }
    }

    const magicToken = randomBytes(16).toString("hex");
    const magicTokenHash = this.hashMagicToken(magicToken);

    let voucher;
    try {
      voucher = await this.database.vouchers.create({
        dropId: new Types.ObjectId(dropId),
        merchantId: drop.merchantId,
        magicToken,
        magicTokenHash,
        claimedBy: {
          deviceId,
          hunterId: hunterObjectId,
        },
        claimedWithoutRegisteredAccount:
          identity.claimedWithoutRegisteredAccount,
        redeemed: false,
        redeemedAt: null,
        redeemedBy: {},
      });
    } catch (err: unknown) {
      const mongoError = err as {
        code?: number;
        keyValue?: Record<string, unknown>;
      };
      if (mongoError.code === 11000) {
        throw new ConflictException("Voucher already claimed by this hunter");
      }
      throw err;
    }

    if (cap != null) {
      await this.deactivateLimitedDropIfAtOrOverCount(
        drop,
        claimedCountBefore + 1,
      );
    }

    await this.assignPromoCode(
      voucher._id as Types.ObjectId,
      drop._id as Types.ObjectId,
      hunterObjectId,
    );

    await this.database.hunters.findByIdAndUpdate(hunterObjectId, {
      $inc: { "stats.totalClaims": 1 },
    });

    const merchantDoc = await this.database.merchants
      .findById(drop.merchantId)
      .select(
        "businessName username logoUrl storeLocation businessPhone businessHours",
      )
      .lean();

    const merchantRecord = merchantDoc as Record<string, unknown> | null;
    const merchantDisplayName =
      merchantRecord &&
      typeof merchantRecord.businessName === "string" &&
      merchantRecord.businessName.trim()
        ? merchantRecord.businessName.trim()
        : "";
    const dropName =
      drop && typeof drop.name === "string" && drop.name.trim()
        ? drop.name.trim()
        : "Reward";

    const notifyEmail = identity.hunterEmailTrimmed;
    if (notifyEmail) {
      void this.mailService
        .sendRewardClaimedNotification(
          notifyEmail,
          this.buildPublicVoucherUrl(magicToken),
          dropName,
          merchantDisplayName,
        )
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to send reward claimed notification: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
    }

    const base = this.toResponseDto(voucher, drop);
    return {
      ...base,
      merchant: this.mapMerchantLeanToInfoDto(merchantRecord),
    };
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

    // Check magic token by comparing hashed values using constant-time comparison
    const inputTokenHash = this.hashMagicToken(magicToken);
    // Prefer hash comparison if available, fallback to plaintext for legacy vouchers
    const tokenValid = voucher.magicTokenHash
      ? this.safeCompare(voucher.magicTokenHash, inputTokenHash)
      : this.safeCompare(voucher.magicToken ?? "", magicToken);
    if (!tokenValid) {
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

    // Mark as redeemed atomically - prevents race conditions
    // Only update if still unredeemed, ensuring no double-redemption
    const redeemedVoucher = await this.database.vouchers.findOneAndUpdate(
      {
        _id: voucher._id,
        redeemed: false, // Atomic condition
      },
      {
        $set: {
          redeemed: true,
          redeemedAt: now,
          redeemedBy: {
            type: redeemerType,
            id: redeemerId,
          },
        },
      },
      { new: true },
    );

    if (!redeemedVoucher) {
      throw new BadRequestException("Voucher has already been redeemed");
    }

    // Increment hunter stats if hunterId exists
    if (redeemedVoucher.claimedBy?.hunterId) {
      await this.database.hunters.findByIdAndUpdate(
        redeemedVoucher.claimedBy.hunterId,
        {
          $inc: { "stats.totalRedemptions": 1 },
        },
      );
    }

    void (async () => {
      try {
        const to = await this.resolveHunterNotificationEmail(redeemedVoucher);
        if (!to) return;

        const merchantLean = await this.database.merchants
          .findById(redeemedVoucher.merchantId)
          .select("businessName")
          .lean();

        const mr = merchantLean as { businessName?: string } | null;
        const merchantDisplayName =
          mr?.businessName && typeof mr.businessName === "string"
            ? mr.businessName.trim()
            : "";

        const dropDisplayName =
          typeof drop.name === "string" && drop.name.trim()
            ? drop.name.trim()
            : "Reward";

        await this.mailService.sendRewardRedeemedNotification(
          to,
          this.buildPublicVoucherUrl(magicToken),
          dropDisplayName,
          merchantDisplayName,
          redeemedVoucher.redeemedAt!,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to send reward redeemed notification: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();

    // Get promo code if assigned
    const promoCode = await this.database.promoCodes.findOne({
      voucherId: redeemedVoucher._id,
    });

    // Type-safe refactor: safely get IDs
    const voucherIdStr = redeemedVoucher._id?.toString() ?? "";

    return {
      voucherId: voucherIdStr,
      voucher: this.toResponseDto(redeemedVoucher, drop),
      success: true,
      message: "Voucher redeemed successfully",
      redeemedAt: redeemedVoucher.redeemedAt!,
      redeemedByType: redeemerType,
      redeemedById: redeemerId,
      promoCode: promoCode?.code,
      dropName: drop.name,
      merchantName: "", // Will be populated by controller if needed
    };
  }

  async findByMagicToken(token: string): Promise<VoucherDetailResponseDto> {
    // Hash token for secure lookup
    const tokenHash = this.hashMagicToken(token);
    const voucher = await this.database.vouchers.findOne({
      $or: [{ magicTokenHash: tokenHash }, { magicToken: token }],
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException("Voucher not found");
    }

    return this.toDetailResponseDto(voucher);
  }

  private buildHunterVoucherFilter(hunterId: string): VoucherFilter {
    return {
      deletedAt: null,
      $or: [{ "claimedBy.hunterId": new Types.ObjectId(hunterId) }],
    };
  }

  private async hydrateHunterVoucherItems(
    vouchersList: Array<Record<string, unknown>>,
  ): Promise<HunterVoucherItemDto[]> {
    const voucherDocs = vouchersList as unknown as VoucherDocument[];
    const dropIdStrs = [
      ...new Set(
        voucherDocs
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

    const merchantIdStrs = [
      ...new Set(
        drops
          .map((d) =>
            d.merchantId
              ? typeof d.merchantId === "string"
                ? d.merchantId
                : d.merchantId.toString()
              : "",
          )
          .filter(Boolean),
      ),
    ];

    const merchants =
      merchantIdStrs.length > 0
        ? await this.database.merchants
            .find({
              _id: {
                $in: merchantIdStrs.map((id) => new Types.ObjectId(id)),
              },
              deletedAt: null,
            })
            .select(
              "businessName username logoUrl storeLocation businessPhone businessHours",
            )
            .lean()
        : [];

    const merchantMap = new Map(
      merchants.map((m) => [m._id.toString(), m as Record<string, unknown>]),
    );

    const items: HunterVoucherItemDto[] = [];
    for (const v of voucherDocs) {
      const dropIdStr =
        typeof v.dropId === "string" ? v.dropId : (v.dropId?.toString() ?? "");
      const doc = dropMap.get(dropIdStr);
      if (!doc) continue;

      const merchantIdForDrop =
        typeof doc.merchantId === "string"
          ? doc.merchantId
          : (doc.merchantId?.toString() ?? "");

      items.push({
        voucher: this.toResponseDto(v, null),
        drop: this.dropsService.toResponseDto(doc),
        merchant: this.mapMerchantLeanToInfoDto(
          merchantMap.get(merchantIdForDrop) ?? null,
        ),
      });
    }
    return items;
  }

  async findByHunter(
    hunterId: string,
    unredeemedLimit?: number,
    redeemedLimit?: number,
  ): Promise<HunterVouchersBucketsDto> {
    const hunter = await this.database.hunters
      .findOne({ _id: hunterId, deletedAt: null })
      .select("_id")
      .lean();

    if (!hunter) {
      return {
        unredeemed: [],
        redeemed: [],
        unredeemedTotal: 0,
        redeemedTotal: 0,
        claimedDropIds: [],
      };
    }

    const baseFilter = this.buildHunterVoucherFilter(hunterId);
    const unredeemedFilter = { ...baseFilter, redeemed: false };
    const redeemedFilter = { ...baseFilter, redeemed: true };

    const unredeemedQuery = this.database.vouchers
      .find(unredeemedFilter)
      .sort({ claimedAt: -1 });
    if (unredeemedLimit && unredeemedLimit > 0) {
      unredeemedQuery.limit(unredeemedLimit);
    }

    const redeemedQuery = this.database.vouchers
      .find(redeemedFilter)
      .sort({ claimedAt: -1 });
    if (redeemedLimit && redeemedLimit > 0) {
      redeemedQuery.limit(redeemedLimit);
    }

    const [
      unredeemedDocs,
      redeemedDocs,
      unredeemedTotal,
      redeemedTotal,
      claimedDropIdsRaw,
    ] = await Promise.all([
      unredeemedQuery.lean(),
      redeemedQuery.lean(),
      this.database.vouchers.countDocuments(unredeemedFilter),
      this.database.vouchers.countDocuments(redeemedFilter),
      this.database.vouchers.distinct("dropId", baseFilter),
    ]);

    const [unredeemed, redeemed] = await Promise.all([
      this.hydrateHunterVoucherItems(unredeemedDocs),
      this.hydrateHunterVoucherItems(redeemedDocs),
    ]);

    const claimedDropIds = (claimedDropIdsRaw as unknown[])
      .map((id) => (id ? String(id) : ""))
      .filter(Boolean);

    return {
      unredeemed,
      redeemed,
      unredeemedTotal,
      redeemedTotal,
      claimedDropIds,
    };
  }

  async findByHunterPaginated(
    hunterId: string,
    status: "unredeemed" | "redeemed" | "all",
    page = 1,
    limit = 20,
  ): Promise<HunterVouchersPageDto> {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

    const hunter = await this.database.hunters
      .findOne({ _id: hunterId, deletedAt: null })
      .select("_id")
      .lean();

    if (!hunter) {
      return {
        items: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      };
    }

    const baseFilter = this.buildHunterVoucherFilter(hunterId);
    const filter: Record<string, unknown> = { ...baseFilter };
    if (status === "unredeemed") filter.redeemed = false;
    if (status === "redeemed") filter.redeemed = true;

    const skip = (safePage - 1) * safeLimit;

    const [docs, total] = await Promise.all([
      this.database.vouchers
        .find(filter)
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      this.database.vouchers.countDocuments(filter),
    ]);

    const items = await this.hydrateHunterVoucherItems(docs);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async findByMerchant(
    merchantId: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ): Promise<{
    vouchers: MerchantVoucherResponseDto[];
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
        const dto = this.toMerchantResponseDto(
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _magicLink: string,
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
    this.logger.warn("WhatsApp integration not implemented");
  }

  async getPromoCode(
    voucherId: string,
    magicToken: string,
  ): Promise<string | null> {
    // Hash token for secure lookup
    const tokenHash = this.hashMagicToken(magicToken);
    const voucher = await this.database.vouchers.findOne({
      _id: new Types.ObjectId(voucherId),
      $or: [{ magicTokenHash: tokenHash }, { magicToken }],
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
    hunterId: Types.ObjectId,
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
          hunterId: hunterId,
          assignedAt: new Date(),
        },
      },
      { sort: { createdAt: 1 } },
    );

    // If no promo code available, that's okay - voucher still valid
    if (!promoCode) {
      this.logger.debug(`No promo code available for drop ${dropId}`);
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
      claimedWithoutRegisteredAccount: Boolean(
        (voucher as { claimedWithoutRegisteredAccount?: boolean })
          .claimedWithoutRegisteredAccount,
      ),
    };
  }

  /**
   * Merchant-facing voucher response - excludes sensitive magicToken.
   * Merchants should not see bearer tokens that belong to hunters.
   */
  private toMerchantResponseDto(
    voucher: VoucherDocument | FlattenMaps<VoucherDocument>,
    drop?: DropDocument | FlattenMaps<DropDocument> | null,
  ): MerchantVoucherResponseDto {
    const dto = this.toResponseDto(voucher, drop);
    // Remove magicToken - merchants should not see bearer tokens
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { magicToken: _, ...merchantDto } = dto;
    return merchantDto;
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

    const merchantInfo = this.mapMerchantLeanToInfoDto(
      merchant as Record<string, unknown> | null,
    );

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

  private mapMerchantLeanToInfoDto(
    merchant: Record<string, unknown> | null,
  ): MerchantInfoDto {
    if (!merchant || !merchant._id) {
      return {
        id: "",
        name: "",
        username: "",
        logoUrl: null,
        storeLocation: null,
        businessPhone: null,
        businessHours: null,
      };
    }

    const sl = merchant.storeLocation as
      | {
          lat?: number;
          lng?: number;
          address?: string;
          city?: string;
          state?: string;
          pincode?: string;
          landmark?: string;
          howToReach?: string;
        }
      | null
      | undefined;

    return {
      id: (merchant._id as { toString(): string }).toString(),
      name: String(merchant.businessName ?? ""),
      username: String(merchant.username ?? ""),
      logoUrl: (merchant.logoUrl as string | null) ?? null,
      storeLocation: sl
        ? {
            lat: sl.lat ?? 0,
            lng: sl.lng ?? 0,
            address: sl.address,
            city: sl.city,
            state: sl.state,
            pincode: sl.pincode,
            landmark: sl.landmark,
            howToReach: sl.howToReach,
          }
        : null,
      businessPhone: (merchant.businessPhone as string | null) ?? null,
      businessHours: (merchant.businessHours as string | null) ?? null,
    };
  }

  private getLimitedAvailabilityCap(drop: DropDocument): number | null {
    const availability = drop.availability;
    if (!availability || availability.type !== "limited") {
      return null;
    }
    const limit = Number(availability.limit);
    if (!Number.isFinite(limit) || limit < 1) {
      return null;
    }
    return limit;
  }

  private async deactivateLimitedDropIfAtOrOverCount(
    drop: DropDocument,
    voucherCount: number,
  ): Promise<void> {
    const cap = this.getLimitedAvailabilityCap(drop);
    if (cap == null || voucherCount < cap) {
      return;
    }
    const updated = await this.database.drops.findOneAndUpdate(
      { _id: drop._id, active: true, deletedAt: null },
      { $set: { active: false } },
    );
    if (updated) {
      await this.dropsService.notifyActiveDropsListingChanged();
    }
  }
}
