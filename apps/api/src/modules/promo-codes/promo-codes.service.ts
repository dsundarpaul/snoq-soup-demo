import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { DatabaseService } from "../../database/database.service";
import {
  PromoCode,
  PromoCodeStatus,
} from "../../database/schemas/promo-code.schema";
import { Voucher } from "../../database/schemas/voucher.schema";
import { CreatePromoCodeDto } from "./dto/request/create-promo-code.dto";
import { BulkCreatePromoCodesDto } from "./dto/request/bulk-create-promo-codes.dto";
import { PromoCodeResponseDto } from "./dto/response/promo-code-response.dto";
import {
  PromoCodeListDto,
  PromoCodeStatsDto,
} from "./dto/response/promo-code-list.dto";

// Type-safe refactor: Define filter interface
interface PromoCodeFilter {
  dropId: Types.ObjectId;
  deletedAt: null;
  status?: PromoCodeStatus;
}

@Injectable()
export class PromoCodesService {
  constructor(private readonly database: DatabaseService) {}

  async create(
    merchantId: string,
    dropId: string,
    dto: CreatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    await this.verifyDropOwnership(dropId, merchantId);

    const codeUpper = dto.code.toUpperCase().trim();

    const existing = await this.database.promoCodes.findOne({
      dropId: new Types.ObjectId(dropId),
      code: codeUpper,
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictException(
        `Promo code '${codeUpper}' already exists for this drop`,
      );
    }

    const promoCode = await this.database.promoCodes.create({
      dropId: new Types.ObjectId(dropId),
      merchantId: new Types.ObjectId(merchantId),
      code: codeUpper,
      status: PromoCodeStatus.AVAILABLE,
      voucherId: null,
      hunterId: null,
      assignedAt: null,
      deletedAt: null,
    });

    return this.toResponseDto(promoCode);
  }

  async bulkCreate(
    merchantId: string,
    dropId: string,
    dto: BulkCreatePromoCodesDto,
  ): Promise<PromoCodeResponseDto[]> {
    await this.verifyDropOwnership(dropId, merchantId);

    const codes = dto.codes.map((c) => c.code.toUpperCase().trim());
    const duplicates = codes.filter(
      (item, index) => codes.indexOf(item) !== index,
    );

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate codes in request: ${[...new Set(duplicates)].join(", ")}`,
      );
    }

    const existingCodes = await this.database.promoCodes
      .find({
        dropId: new Types.ObjectId(dropId),
        code: { $in: codes },
        deletedAt: null,
      })
      .lean();

    if (existingCodes.length > 0) {
      const existingCodeValues = existingCodes.map((c) => c.code);
      throw new ConflictException(
        `Codes already exist for this drop: ${existingCodeValues.join(", ")}`,
      );
    }

    const promoCodeDocs = codes.map((code) => ({
      dropId: new Types.ObjectId(dropId),
      merchantId: new Types.ObjectId(merchantId),
      code,
      status: PromoCodeStatus.AVAILABLE,
      voucherId: null,
      hunterId: null,
      assignedAt: null,
      deletedAt: null,
    }));

    const createdPromoCodes = await this.database.promoCodes.insertMany(
      promoCodeDocs,
      { ordered: false },
    );

    // Type-safe refactor: cast to PromoCode[] since insertMany returns the created docs
    return (createdPromoCodes as PromoCode[]).map((pc) =>
      this.toResponseDto(pc),
    );
  }

  async findByDrop(
    dropId: string,
    merchantId: string,
    status?: PromoCodeStatus,
    page = 1,
    limit = 20,
  ): Promise<PromoCodeListDto> {
    await this.verifyDropOwnership(dropId, merchantId);
    return this.listPromoCodesForDropPage(dropId, status, page, limit);
  }

  async findByDropAsAdmin(
    dropId: string,
    status?: PromoCodeStatus,
    page = 1,
    limit = 20,
  ): Promise<PromoCodeListDto> {
    await this.verifyDropExists(dropId);
    return this.listPromoCodesForDropPage(dropId, status, page, limit);
  }

  async bulkCreateAsAdmin(
    dropId: string,
    dto: BulkCreatePromoCodesDto,
  ): Promise<PromoCodeResponseDto[]> {
    const drop = await this.database.drops.findById(dropId).lean();
    if (!drop || drop.deletedAt) {
      throw new NotFoundException("Drop not found");
    }
    const merchantId = (drop.merchantId as Types.ObjectId).toString();
    return this.bulkCreate(merchantId, dropId, dto);
  }

  private async listPromoCodesForDropPage(
    dropId: string,
    status: PromoCodeStatus | undefined,
    page: number,
    limit: number,
  ): Promise<PromoCodeListDto> {
    const filter: PromoCodeFilter = {
      dropId: new Types.ObjectId(dropId),
      deletedAt: null,
    };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      this.database.promoCodes
        .find(filter)
        .populate({ path: "hunterId", select: "nickname email" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.database.promoCodes.countDocuments(filter),
    ]);

    const fallbackByPromoId = await this.resolveAssigneeNamesFromVouchers(
      rawItems as Record<string, unknown>[],
    );

    return {
      items: (rawItems as Record<string, unknown>[]).map((doc) => {
        const dto = this.toResponseDto(doc as unknown as PromoCode);
        const promoId =
          this.normalizeObjectIdString(doc._id) ?? dto.id;
        const fromPopulate = this.nameFromPopulatedHunterField(doc.hunterId);
        dto.assignedToName =
          fromPopulate ?? fallbackByPromoId.get(promoId) ?? null;
        return dto;
      }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private normalizeObjectIdString(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === "string") {
      const t = value.trim();
      return /^[a-f\d]{24}$/i.test(t) ? t : null;
    }
    if (typeof value === "object" && value !== null && "toString" in value) {
      const s = (value as { toString(): string }).toString();
      return /^[a-f\d]{24}$/i.test(s) ? s : null;
    }
    return null;
  }

  private hunterIdForApi(hunterField: unknown): string | null {
    if (hunterField == null) return null;
    if (typeof hunterField === "object" && hunterField !== null && "_id" in hunterField) {
      return this.normalizeObjectIdString(
        (hunterField as { _id: unknown })._id,
      );
    }
    return this.normalizeObjectIdString(hunterField);
  }

  private nameFromPopulatedHunterField(hunterField: unknown): string | null {
    if (
      hunterField == null ||
      typeof hunterField !== "object" ||
      (!("nickname" in hunterField) && !("email" in hunterField))
    ) {
      return null;
    }
    return this.formatHunterLabel(
      hunterField as { nickname?: string | null; email?: string | null },
    );
  }

  private formatHunterLabel(h: {
    nickname?: string | null;
    email?: string | null;
  }): string | null {
    const nick = h.nickname?.trim();
    if (nick) return nick;
    const em = h.email?.trim();
    if (em) return em;
    return null;
  }

  private async resolveAssigneeNamesFromVouchers(
    docs: Record<string, unknown>[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    const needVoucher: { promoId: string; voucherId: string }[] = [];

    for (const doc of docs) {
      const promoId = this.normalizeObjectIdString(doc._id);
      if (!promoId) continue;
      if (doc.status !== "assigned") continue;
      if (this.nameFromPopulatedHunterField(doc.hunterId)) continue;
      const vid = this.normalizeObjectIdString(doc.voucherId);
      if (vid) needVoucher.push({ promoId, voucherId: vid });
    }

    if (needVoucher.length === 0) {
      return result;
    }

    const voucherIds = [...new Set(needVoucher.map((n) => n.voucherId))].map(
      (id) => new Types.ObjectId(id),
    );
    const vouchers = await this.database.vouchers
      .find({ _id: { $in: voucherIds } })
      .select({ claimedBy: 1 })
      .lean();

    const hunterIds = new Set<string>();
    const voucherById = new Map<string, { claimedBy?: Voucher["claimedBy"] }>();
    for (const v of vouchers) {
      voucherById.set(v._id.toString(), v);
      const hid = this.normalizeObjectIdString(v.claimedBy?.hunterId);
      if (hid) hunterIds.add(hid);
    }

    const hunters =
      hunterIds.size > 0
        ? await this.database.hunters
            .find({
              _id: { $in: [...hunterIds].map((id) => new Types.ObjectId(id)) },
            })
            .select({ nickname: 1, email: 1 })
            .lean()
        : [];

    const labelByHunterId = new Map<string, string | null>();
    for (const h of hunters) {
      labelByHunterId.set(h._id.toString(), this.formatHunterLabel(h));
    }

    for (const { promoId, voucherId } of needVoucher) {
      const v = voucherById.get(voucherId);
      let name: string | null = null;
      const hid = this.normalizeObjectIdString(v?.claimedBy?.hunterId);
      if (hid) {
        name = labelByHunterId.get(hid) ?? null;
      }
      if (!name && v?.claimedBy) {
        const em = v.claimedBy.email?.trim();
        const ph = v.claimedBy.phone?.trim();
        name = em || ph || null;
      }
      if (!result.has(promoId)) {
        result.set(promoId, name);
      }
    }

    return result;
  }

  async findAvailableForDrop(
    dropId: string,
  ): Promise<PromoCodeResponseDto | null> {
    const promoCode = await this.database.promoCodes
      .findOne({
        dropId: new Types.ObjectId(dropId),
        status: PromoCodeStatus.AVAILABLE,
        deletedAt: null,
      })
      .lean();

    return promoCode ? this.toResponseDto(promoCode as PromoCode) : null;
  }

  async assignToVoucher(
    dropId: string,
    voucherId: string,
  ): Promise<PromoCodeResponseDto | null> {
    const promoCode = await this.database.promoCodes.findOneAndUpdate(
      {
        dropId: new Types.ObjectId(dropId),
        status: PromoCodeStatus.AVAILABLE,
        deletedAt: null,
      },
      {
        $set: {
          status: PromoCodeStatus.ASSIGNED,
          voucherId: new Types.ObjectId(voucherId),
          assignedAt: new Date(),
        },
      },
      { new: true },
    );

    return promoCode ? this.toResponseDto(promoCode) : null;
  }

  async deleteByDrop(
    dropId: string,
    merchantId: string,
  ): Promise<{ deletedCount: number }> {
    await this.verifyDropOwnership(dropId, merchantId);

    const result = await this.database.promoCodes.updateMany(
      {
        dropId: new Types.ObjectId(dropId),
        status: PromoCodeStatus.AVAILABLE,
        deletedAt: null,
      },
      {
        $set: { deletedAt: new Date() },
      },
    );

    return { deletedCount: result.modifiedCount };
  }

  async deleteOne(
    dropId: string,
    codeId: string,
    merchantId: string,
  ): Promise<{ deleted: boolean }> {
    await this.verifyDropOwnership(dropId, merchantId);

    if (!Types.ObjectId.isValid(codeId)) {
      throw new BadRequestException("Invalid promo code id");
    }

    const promoCode = await this.database.promoCodes
      .findOne({
        _id: new Types.ObjectId(codeId),
        dropId: new Types.ObjectId(dropId),
        deletedAt: null,
      })
      .lean();

    if (!promoCode) {
      throw new NotFoundException("Promo code not found");
    }

    if (promoCode.status !== PromoCodeStatus.AVAILABLE) {
      throw new BadRequestException(
        "Only available (unassigned) promo codes can be deleted",
      );
    }

    await this.database.promoCodes.updateOne(
      { _id: new Types.ObjectId(codeId) },
      { $set: { deletedAt: new Date() } },
    );

    return { deleted: true };
  }

  async getStats(
    dropId: string,
    merchantId: string,
  ): Promise<PromoCodeStatsDto> {
    await this.verifyDropOwnership(dropId, merchantId);

    const [totalResult, availableResult, assignedResult] = await Promise.all([
      this.database.promoCodes.countDocuments({
        dropId: new Types.ObjectId(dropId),
        deletedAt: null,
      }),
      this.database.promoCodes.countDocuments({
        dropId: new Types.ObjectId(dropId),
        status: PromoCodeStatus.AVAILABLE,
        deletedAt: null,
      }),
      this.database.promoCodes.countDocuments({
        dropId: new Types.ObjectId(dropId),
        status: PromoCodeStatus.ASSIGNED,
        deletedAt: null,
      }),
    ]);

    return {
      dropId,
      total: totalResult,
      available: availableResult,
      assigned: assignedResult,
    };
  }

  private async verifyDropOwnership(
    dropId: string,
    merchantId: string,
  ): Promise<void> {
    const drop = await this.database.drops.findById(dropId).lean();

    if (!drop || drop.deletedAt) {
      throw new NotFoundException("Drop not found or access denied");
    }

    // Type-safe refactor: safely convert ObjectId to string with null check
    const dropMerchantId = drop.merchantId
      ? (drop.merchantId as { toString(): string }).toString()
      : "";
    if (dropMerchantId !== merchantId) {
      throw new NotFoundException("Drop not found or access denied");
    }
  }

  private toResponseDto(promoCode: PromoCode): PromoCodeResponseDto {
    // Type-safe refactor: safely convert ObjectIds to strings
    const id =
      "_id" in promoCode && promoCode._id ? promoCode._id.toString() : "";
    const dropIdStr = promoCode.dropId
      ? typeof promoCode.dropId === "string"
        ? promoCode.dropId
        : (promoCode.dropId as { toString(): string }).toString()
      : "";
    const merchantIdStr = promoCode.merchantId
      ? typeof promoCode.merchantId === "string"
        ? promoCode.merchantId
        : (promoCode.merchantId as { toString(): string }).toString()
      : "";
    const voucherIdStr = promoCode.voucherId
      ? typeof promoCode.voucherId === "string"
        ? promoCode.voucherId
        : (promoCode.voucherId as { toString(): string }).toString()
      : null;

    const hunterRaw = (promoCode as { hunterId?: unknown }).hunterId;

    return {
      id,
      dropId: dropIdStr,
      merchantId: merchantIdStr,
      code: promoCode.code,
      status: promoCode.status as PromoCodeStatus,
      voucherId: voucherIdStr,
      hunterId: this.hunterIdForApi(hunterRaw),
      assignedAt: promoCode.assignedAt,
      assignedToName: null,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
  }

  private async verifyDropExists(dropId: string): Promise<void> {
    const drop = await this.database.drops.findById(dropId).lean();
    if (!drop || drop.deletedAt) {
      throw new NotFoundException("Drop not found or access denied");
    }
  }
}
