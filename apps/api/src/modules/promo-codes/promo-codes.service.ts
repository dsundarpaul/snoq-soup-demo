import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { DatabaseService } from "@/database/database.service";
import {
  PromoCode,
  PromoCodeStatus,
} from "@/database/schemas/promo-code.schema";
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

    // Type-safe refactor: use proper filter type
    const filter: PromoCodeFilter = {
      dropId: new Types.ObjectId(dropId),
      deletedAt: null,
    };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.database.promoCodes
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.database.promoCodes.countDocuments(filter),
    ]);

    return {
      items: items.map((pc) => this.toResponseDto(pc as PromoCode)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    return {
      id,
      dropId: dropIdStr,
      merchantId: merchantIdStr,
      code: promoCode.code,
      status: promoCode.status as PromoCodeStatus,
      voucherId: voucherIdStr,
      assignedAt: promoCode.assignedAt,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
  }
}
