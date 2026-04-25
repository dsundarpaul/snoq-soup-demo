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
import { CreatePromoCodeDto } from "./dto/request/create-promo-code.dto";
import { BulkCreatePromoCodesDto } from "./dto/request/bulk-create-promo-codes.dto";
import {
  PromoCodeHunterSummaryDto,
  PromoCodeResponseDto,
} from "./dto/response/promo-code-response.dto";
import {
  PromoCodeListDto,
  PromoCodeStatsDto,
} from "./dto/response/promo-code-list.dto";

export type DropPromoAccess =
  | { scope: "merchant"; merchantId: string }
  | { scope: "admin" };

@Injectable()
export class PromoCodesService {
  constructor(private readonly database: DatabaseService) {}

  async create(
    merchantId: string,
    dropId: string,
    dto: CreatePromoCodeDto
  ): Promise<PromoCodeResponseDto> {
    const codeUpper = dto.code.toUpperCase().trim();

    const existing = await this.database.promoCodes.findOne({
      dropId: new Types.ObjectId(dropId),
      code: codeUpper,
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictException(
        `Promo code '${codeUpper}' already exists for this drop`
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
    dropId: string,
    dto: BulkCreatePromoCodesDto,
    access: DropPromoAccess
  ): Promise<PromoCodeResponseDto[]> {
    const merchantId = await this.resolveMerchantIdForDrop(dropId, access);

    const codes = dto.codes.map((c) => c.code.toUpperCase().trim());
    const duplicates = codes.filter(
      (item, index) => codes.indexOf(item) !== index
    );

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate codes in request: ${[...new Set(duplicates)].join(", ")}`
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
        `Codes already exist for this drop: ${existingCodeValues.join(", ")}`
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
      { ordered: false }
    );

    // Type-safe refactor: cast to PromoCode[] since insertMany returns the created docs
    return (createdPromoCodes as PromoCode[]).map((pc) =>
      this.toResponseDto(pc)
    );
  }

  async findByDrop(
    dropId: string,
    status?: PromoCodeStatus,
    page = 1,
    limit = 20
  ): Promise<PromoCodeListDto> {
    const match: Record<string, unknown> = {
      dropId: new Types.ObjectId(dropId),
      deletedAt: null,
    };

    if (status) {
      match.status = status;
    }

    const skip = (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      this.database.promoCodes
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ nickname?: string | null; email?: string | null }>({
          path: "hunterId",
          select: "nickname email",
        })
        .lean()
        .exec(),
      this.database.promoCodes.countDocuments(match),
    ]);

    const items = rawItems.map((doc) => {
      const dto = this.toResponseDto(doc as unknown as PromoCode);
      dto.hunter = this.hunterSummaryFromLeanRef(doc.hunterId);
      dto.assignedToName = this.hunterDisplayNameFromLeanRef(doc.hunterId);
      return dto;
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async resolveMerchantIdForDrop(
    dropId: string,
    access: DropPromoAccess
  ): Promise<string> {
    if (access.scope === "merchant") {
      return access.merchantId;
    }
    const drop = await this.database.drops.findById(dropId).lean();
    if (!drop || drop.deletedAt) {
      throw new NotFoundException("Drop not found");
    }
    const mid = this.stringifyId(drop.merchantId);
    if (!mid) {
      throw new NotFoundException("Drop not found");
    }
    return mid;
  }

  async findAvailableForDrop(
    dropId: string
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
    voucherId: string
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
      { new: true }
    );

    return promoCode ? this.toResponseDto(promoCode) : null;
  }

  async deleteByDrop(dropId: string): Promise<{ deletedCount: number }> {
    const result = await this.database.promoCodes.updateMany(
      {
        dropId: new Types.ObjectId(dropId),
        status: PromoCodeStatus.AVAILABLE,
        deletedAt: null,
      },
      {
        $set: { deletedAt: new Date() },
      }
    );

    return { deletedCount: result.modifiedCount };
  }

  async deleteOne(
    dropId: string,
    codeId: string,
  ): Promise<{ deleted: boolean }> {
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
        "Only available (unassigned) promo codes can be deleted"
      );
    }

    await this.database.promoCodes.updateOne(
      { _id: new Types.ObjectId(codeId) },
      { $set: { deletedAt: new Date() } }
    );

    return { deleted: true };
  }

  async getStats(dropId: string): Promise<PromoCodeStatsDto> {
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

  private hunterSummaryFromLeanRef(
    hunterId: unknown
  ): PromoCodeHunterSummaryDto | null {
    if (hunterId == null) return null;
    if (typeof hunterId !== "object" || hunterId instanceof Types.ObjectId) {
      return null;
    }
    if (!("_id" in hunterId)) return null;
    const o = hunterId as {
      _id: Types.ObjectId;
      nickname?: string | null;
      email?: string | null;
    };
    return {
      id: o._id.toString(),
      nickname: o.nickname ?? null,
      email: o.email ?? null,
    };
  }

  private hunterDisplayNameFromLeanRef(hunterId: unknown): string | null {
    const summary = this.hunterSummaryFromLeanRef(hunterId);
    if (!summary) return null;
    const nick = summary.nickname?.trim();
    if (nick) return nick;
    const em = summary.email?.trim();
    return em || null;
  }

  private stringifyId(id: unknown): string | null {
    if (id == null) return null;
    if (typeof id === "string") return id;
    if (id instanceof Types.ObjectId) return id.toString();
    if (typeof id === "object" && id !== null && "_id" in id) {
      return this.stringifyId((id as { _id: unknown })._id);
    }
    return null;
  }

  private toResponseDto(promoCode: PromoCode): PromoCodeResponseDto {
    const id =
      "_id" in promoCode && promoCode._id ? promoCode._id.toString() : "";
    const dropIdStr = this.stringifyId(promoCode.dropId) ?? "";
    const merchantIdStr = this.stringifyId(promoCode.merchantId) ?? "";
    const voucherIdStr = this.stringifyId(promoCode.voucherId);
    const hunterRef = (promoCode as PromoCode & { hunterId?: unknown })
      .hunterId;
    const hunterIdStr = this.stringifyId(hunterRef);

    return {
      id,
      dropId: dropIdStr,
      merchantId: merchantIdStr,
      code: promoCode.code,
      status: promoCode.status as PromoCodeStatus,
      voucherId: voucherIdStr,
      hunterId: hunterIdStr,
      hunter: null,
      assignedAt: promoCode.assignedAt,
      assignedToName: null,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
  }
}
