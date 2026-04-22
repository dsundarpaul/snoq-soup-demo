import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { AuthService } from "../auth/auth.service";
import { UserRole } from "../../common/enums/user-role.enum";
import { FilterQuery, PipelineStage, Types } from "mongoose";
import { DatabaseService } from "../../database/database.service";
import { DropsService } from "../drops/drops.service";
import { CreateDropDto } from "../drops/dto/request/create-drop.dto";
import { UpdateDropDto } from "../drops/dto/request/update-drop.dto";
import { Drop } from "../../database/schemas/drop.schema";
import { UpdateMerchantAdminDto } from "./dto/request/update-merchant-admin.dto";
import { AdminStatsDto } from "./dto/response/admin-stats.dto";
import {
  AdminAnalyticsDto,
  TimeSeriesDataPoint,
} from "./dto/response/admin-analytics.dto";
import {
  MerchantListDto,
  MerchantListItemDto,
} from "./dto/response/merchant-list.dto";
import { UserListDto, UserListItemDto } from "./dto/response/user-list.dto";
import { DropResponseDto } from "../drops/dto/response/drop-response.dto";
import { encodeCsv } from "../../common/utils/csv";
import { AdminCreateDropDto } from "./dto/request/admin-create-drop.dto";

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface MerchantQuery extends PaginationQuery {
  isVerified?: boolean;
  search?: string;
}

export interface UserQuery extends PaginationQuery {
  search?: string;
  minClaims?: number;
}

export interface DropQuery extends PaginationQuery {
  merchantId?: string;
  active?: boolean;
  search?: string;
  status?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly dropsService: DropsService,
    private readonly authService: AuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAdminProfile(userId: string): Promise<{
    admin: { id: string; email: string; name: string };
  }> {
    const admin = await this.database.admins
      .findOne({ _id: userId, deletedAt: null })
      .select("-password")
      .lean();
    if (!admin) {
      throw new UnauthorizedException("Admin not found");
    }
    return {
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
      },
    };
  }

  /**
   * Escape special regex characters to prevent regex injection attacks.
   * User input used in $regex queries must be escaped.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private merchantAccountFlags(merchant: {
    lockUntil?: Date | null;
    suspendedAt?: Date | null;
  }): { isSuspended: boolean; isActive: boolean } {
    const locked =
      merchant.lockUntil != null && new Date() < new Date(merchant.lockUntil);
    const suspended = merchant.suspendedAt != null;
    return {
      isSuspended: suspended,
      isActive: !suspended && !locked,
    };
  }

  private merchantListFilter(
    query: Pick<MerchantQuery, "isVerified" | "search">,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.isVerified !== undefined) {
      filter.emailVerified = query.isVerified;
    }
    if (query.search) {
      const escaped = this.escapeRegex(query.search);
      filter.$or = [
        { businessName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { username: { $regex: escaped, $options: "i" } },
      ] as unknown[];
    }
    return filter;
  }

  private hunterListFilter(
    query: Pick<UserQuery, "search" | "minClaims">,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      const escaped = this.escapeRegex(query.search);
      filter.$or = [
        { deviceId: { $regex: escaped, $options: "i" } },
        { nickname: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ] as unknown[];
    }
    if (query.minClaims !== undefined) {
      filter["stats.totalClaims"] = { $gte: query.minClaims };
    }
    return filter;
  }

  private buildAdminDropsFilter(
    query: Pick<DropQuery, "merchantId" | "active" | "search" | "status">,
  ): FilterQuery<Drop> {
    const baseParts: FilterQuery<Drop>[] = [{ deletedAt: null }];

    if (query.merchantId) {
      if (!Types.ObjectId.isValid(query.merchantId)) {
        throw new BadRequestException("Invalid merchant ID");
      }
      baseParts.push({ merchantId: new Types.ObjectId(query.merchantId) });
    }

    if (query.active !== undefined) {
      baseParts.push({ active: query.active });
    }

    const searchStatusParts = this.dropsService.buildDropSearchAndStatusClauses(
      query.search,
      query.status,
    );

    const allParts = [...baseParts, ...searchStatusParts];
    return allParts.length === 1 ? allParts[0]! : { $and: allParts };
  }

  private formatCsvDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    return "";
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.database.admins.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });
  }

  async getPlatformStats(): Promise<AdminStatsDto> {
    const cacheKey = "admin:stats";
    const cached = await this.cacheManager.get<AdminStatsDto>(cacheKey);
    if (cached) return cached;

    const [
      totalMerchants,
      verifiedMerchants,
      totalDrops,
      activeDrops,
      totalVouchers,
      totalClaims,
      totalRedemptions,
      totalHunters,
    ] = await Promise.all([
      this.database.merchants.countDocuments({ deletedAt: null }),
      this.database.merchants.countDocuments({
        deletedAt: null,
        emailVerified: true,
      }),
      this.database.drops.countDocuments({ deletedAt: null }),
      this.database.drops.countDocuments({ deletedAt: null, active: true }),
      this.database.vouchers.countDocuments({ deletedAt: null }),
      this.database.vouchers.countDocuments({
        deletedAt: null,
        claimedBy: { $exists: true, $ne: {} },
      }),
      this.database.vouchers.countDocuments({
        deletedAt: null,
        redeemed: true,
      }),
      this.database.hunters.countDocuments({ deletedAt: null }),
    ]);

    const redemptionRate = totalClaims > 0 ? totalRedemptions / totalClaims : 0;

    const result: AdminStatsDto = {
      totalMerchants,
      verifiedMerchants,
      totalDrops,
      activeDrops,
      totalVouchers,
      totalClaims,
      totalRedemptions,
      totalHunters: totalHunters,
      redemptionRate: Math.round(redemptionRate * 100) / 100,
      generatedAt: new Date(),
    };

    await this.cacheManager.set(cacheKey, result, 60_000);
    return result;
  }

  async getPlatformAnalytics(
    days = 30,
    granularity: "hourly" | "daily" | "weekly" | "monthly" = "daily",
  ): Promise<AdminAnalyticsDto> {
    const cacheKey = `admin:analytics:${days}:${granularity}`;
    const cached = await this.cacheManager.get<AdminAnalyticsDto>(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (date: Date): string => {
      if (granularity === "hourly") {
        return date.toISOString().slice(0, 13) + ":00";
      }
      return date.toISOString().slice(0, 10);
    };

    const aggregateTimeSeries = async (
      model:
        | typeof this.database.merchants
        | typeof this.database.drops
        | typeof this.database.vouchers
        | typeof this.database.hunters,
      dateField: string,
    ): Promise<TimeSeriesDataPoint[]> => {
      const pipeline: PipelineStage[] = [
        {
          $match: {
            [dateField]: { $gte: startDate, $lte: endDate },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  granularity === "hourly" ? "%Y-%m-%dT%H:00" : "%Y-%m-%d",
                date: `$${dateField}`,
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];

      const results = await model.aggregate(pipeline);
      return results.map((r) => ({
        date: r._id as string,
        value: r.count as number,
      }));
    };

    const voucherClaimedInPeriod: FilterQuery<unknown> = {
      deletedAt: null,
      claimedAt: { $gte: startDate, $lte: endDate },
    };

    const [
      merchantsOverTime,
      dropsOverTime,
      claimsOverTime,
      redemptionsOverTime,
      huntersOverTime,
      claimsByHourAgg,
      topMerchantsAgg,
      topDropsAgg,
      totalClaimsPeriod,
      totalRedemptionsPeriod,
    ] = await Promise.all([
      aggregateTimeSeries(this.database.merchants, "createdAt"),
      aggregateTimeSeries(this.database.drops, "createdAt"),
      aggregateTimeSeries(this.database.vouchers, "claimedAt"),
      this.database.vouchers
        .aggregate([
          {
            $match: {
              redeemedAt: { $gte: startDate, $lte: endDate },
              deletedAt: null,
              redeemed: true,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "hourly" ? "%Y-%m-%dT%H:00" : "%Y-%m-%d",
                  date: "$redeemedAt",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .then((results) =>
          results.map((r) => ({
            date: r._id as string,
            value: r.count as number,
          })),
        ),
      aggregateTimeSeries(this.database.hunters, "createdAt"),
      this.database.vouchers.aggregate<{ _id: number; claims: number }>([
        { $match: voucherClaimedInPeriod },
        { $group: { _id: { $hour: "$claimedAt" }, claims: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.database.vouchers.aggregate<{
        id: string;
        businessName: string;
        voucherCount: number;
        redemptionCount: number;
      }>([
        { $match: voucherClaimedInPeriod },
        {
          $group: {
            _id: "$merchantId",
            voucherCount: { $sum: 1 },
            redemptionCount: { $sum: { $cond: ["$redeemed", 1, 0] } },
          },
        },
        { $sort: { voucherCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "merchants",
            localField: "_id",
            foreignField: "_id",
            as: "merchant",
          },
        },
        { $unwind: { path: "$merchant", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            businessName: {
              $ifNull: ["$merchant.businessName", "Unknown"],
            },
            voucherCount: 1,
            redemptionCount: 1,
          },
        },
      ]),
      this.database.vouchers.aggregate<{
        id: string;
        name: string;
        merchantName: string;
        voucherCount: number;
        redemptionCount: number;
      }>([
        { $match: voucherClaimedInPeriod },
        {
          $group: {
            _id: "$dropId",
            voucherCount: { $sum: 1 },
            redemptionCount: { $sum: { $cond: ["$redeemed", 1, 0] } },
          },
        },
        { $sort: { voucherCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "drops",
            localField: "_id",
            foreignField: "_id",
            as: "drop",
          },
        },
        { $unwind: { path: "$drop", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "merchants",
            localField: "drop.merchantId",
            foreignField: "_id",
            as: "merchant",
          },
        },
        { $unwind: { path: "$merchant", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            name: { $ifNull: ["$drop.name", "Unknown"] },
            merchantName: { $ifNull: ["$merchant.businessName", "—"] },
            voucherCount: 1,
            redemptionCount: 1,
          },
        },
      ]),
      this.database.vouchers.countDocuments(voucherClaimedInPeriod),
      this.database.vouchers.countDocuments({
        deletedAt: null,
        redeemed: true,
        redeemedAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const hourToClaims = new Map(
      claimsByHourAgg.map((r) => [r._id as number, r.claims as number]),
    );
    const claimsByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      claims: hourToClaims.get(hour) ?? 0,
    }));

    const conversionRate =
      totalClaimsPeriod > 0
        ? Math.round((totalRedemptionsPeriod / totalClaimsPeriod) * 1000) / 10
        : 0;

    const result: AdminAnalyticsDto = {
      merchantsOverTime,
      dropsOverTime,
      claimsOverTime,
      redemptionsOverTime,
      huntersOverTime,
      claimsByHour,
      topMerchants: topMerchantsAgg,
      topDrops: topDropsAgg,
      conversionRate,
      periodStart: formatDate(startDate),
      periodEnd: formatDate(endDate),
      granularity,
      generatedAt: new Date(),
    };

    await this.cacheManager.set(cacheKey, result, 60_000);
    return result;
  }

  async findAllMerchants(query: MerchantQuery): Promise<MerchantListDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter = this.merchantListFilter({
      isVerified: query.isVerified,
      search: query.search,
    });

    const [merchants, total] = await Promise.all([
      this.database.merchants
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.database.merchants.countDocuments(filter),
    ]);

    const dropStats = await this.database.drops.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$merchantId",
          totalDrops: { $sum: 1 },
          activeDrops: { $sum: { $cond: ["$active", 1, 0] } },
        },
      },
    ]);

    const dropStatsMap = new Map(dropStats.map((s) => [s._id.toString(), s]));

    const items: MerchantListItemDto[] = merchants.map((m) => {
      const stats = dropStatsMap.get(m._id.toString()) || {
        totalDrops: 0,
        activeDrops: 0,
      };
      const flags = this.merchantAccountFlags(m);
      return {
        id: m._id.toString(),
        email: m.email,
        businessName: m.businessName,
        username: m.username,
        isVerified: m.emailVerified,
        isSuspended: flags.isSuspended,
        isActive: flags.isActive,
        totalDrops: stats.totalDrops,
        activeDrops: stats.activeDrops,
        createdAt: m.createdAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async updateMerchant(
    id: string,
    dto: UpdateMerchantAdminDto,
  ): Promise<MerchantListItemDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid merchant ID");
    }

    const objectId = new Types.ObjectId(id);

    const existing = await this.database.merchants
      .findOne({ _id: objectId, deletedAt: null })
      .lean();

    if (!existing) {
      throw new NotFoundException("Merchant not found");
    }

    const hasMutation =
      dto.businessName !== undefined ||
      dto.logoUrl !== undefined ||
      dto.username !== undefined ||
      dto.isVerified !== undefined ||
      dto.suspended !== undefined;

    if (!hasMutation) {
      throw new BadRequestException("No fields to update");
    }

    if (dto.username) {
      const taken = await this.database.merchants
        .findOne({
          username: dto.username.toLowerCase(),
          _id: { $ne: objectId },
        })
        .lean();
      if (taken) {
        throw new ConflictException("Username already taken");
      }
    }

    if (dto.suspended === true && !existing.emailVerified) {
      throw new BadRequestException(
        "Cannot suspend a merchant until their email is verified",
      );
    }

    const $set: Record<string, unknown> = {};

    if (dto.businessName !== undefined) {
      $set.businessName = dto.businessName.trim();
    }
    if (dto.logoUrl !== undefined) {
      $set.logoUrl = dto.logoUrl;
    }
    if (dto.username) {
      $set.username = dto.username.toLowerCase();
    }

    if (dto.isVerified === true) {
      $set.emailVerified = true;
      $set.emailVerification = {};
    } else if (dto.isVerified === false) {
      $set.emailVerified = false;
    }

    if (dto.suspended === true) {
      if (!existing.suspendedAt) {
        await this.authService.revokeAllUserTokens(id, UserRole.MERCHANT);
      }
      $set.suspendedAt = new Date();
    } else if (dto.suspended === false) {
      $set.suspendedAt = null;
    }

    if (Object.keys($set).length === 0) {
      throw new BadRequestException("No valid fields to update");
    }

    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: objectId, deletedAt: null },
        { $set },
        { new: true, runValidators: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    const dropStats = await this.database.drops.aggregate([
      { $match: { merchantId: objectId, deletedAt: null } },
      {
        $group: {
          _id: "$merchantId",
          totalDrops: { $sum: 1 },
          activeDrops: { $sum: { $cond: ["$active", 1, 0] } },
        },
      },
    ]);

    const stats = dropStats[0] || { totalDrops: 0, activeDrops: 0 };
    const flags = this.merchantAccountFlags(merchant);

    return {
      id: merchant._id.toString(),
      email: merchant.email,
      businessName: merchant.businessName,
      username: merchant.username,
      isVerified: merchant.emailVerified,
      isSuspended: flags.isSuspended,
      isActive: flags.isActive,
      totalDrops: stats.totalDrops,
      activeDrops: stats.activeDrops,
      createdAt: merchant.createdAt,
    };
  }

  async findAllUsers(query: UserQuery): Promise<UserListDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter = this.hunterListFilter({
      search: query.search,
      minClaims: query.minClaims,
    });

    const [hunters, total] = await Promise.all([
      this.database.hunters
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.database.hunters.countDocuments(filter),
    ]);

    const items: UserListItemDto[] = hunters.map((h) => ({
      id: h._id.toString(),
      deviceId: h.deviceId,
      nickname: h.nickname || null,
      email: h.email || null,
      totalClaims: h.stats?.totalClaims || 0,
      totalRedemptions: h.stats?.totalRedemptions || 0,
      createdAt: h.createdAt,
      lastActivity: h.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findAllDrops(query: DropQuery): Promise<{
    items: (DropResponseDto & { merchantName: string })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter = this.buildAdminDropsFilter({
      merchantId: query.merchantId,
      active: query.active,
      search: query.search,
      status: query.status,
    });

    const [drops, total] = await Promise.all([
      this.database.drops
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.database.drops.countDocuments(filter),
    ]);

    const merchantIds = [...new Set(drops.map((d) => d.merchantId.toString()))];
    const merchants = await this.database.merchants
      .find({
        _id: { $in: merchantIds.map((id) => new Types.ObjectId(id)) },
        deletedAt: null,
      })
      .select({ businessName: 1 })
      .lean();
    const merchantNameById = new Map(
      merchants.map((m) => [m._id.toString(), m.businessName ?? ""]),
    );

    const items = drops.map((d) => ({
      ...this.dropsService.toResponseDto(d as Drop),
      merchantName: merchantNameById.get(d.merchantId.toString()) ?? "",
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages && total > 0,
      hasPrevPage: page > 1,
    };
  }

  async merchantsCsv(
    filters: Pick<MerchantQuery, "search" | "isVerified">,
  ): Promise<string> {
    const filter = this.merchantListFilter(filters);
    const merchants = await this.database.merchants
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const rows = merchants.map((m) => {
      const suspended = m.suspendedAt != null;
      return [
        m.businessName ?? "",
        m.email ?? "",
        m.username ?? "",
        m.emailVerified ? "yes" : "no",
        suspended ? "yes" : "no",
        this.formatCsvDate(m.createdAt),
      ];
    });
    return encodeCsv(
      [
        "Business Name",
        "Email",
        "Username",
        "Email verified",
        "Suspended",
        "Created",
      ],
      rows,
    );
  }

  async usersCsv(
    filters: Pick<UserQuery, "search" | "minClaims">,
  ): Promise<string> {
    const filter = this.hunterListFilter(filters);
    const hunters = await this.database.hunters
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const rows = hunters.map((h) => [
      h.nickname ?? "",
      h.email ?? "",
      h.deviceId ?? "",
      h.stats?.totalClaims ?? 0,
      h.stats?.totalRedemptions ?? 0,
      this.formatCsvDate(h.createdAt),
    ]);
    return encodeCsv(
      ["Nickname", "Email", "Device ID", "Claims", "Redemptions", "Joined"],
      rows,
    );
  }

  async dropsCsv(
    filters: Pick<DropQuery, "merchantId" | "active" | "search" | "status">,
  ): Promise<string> {
    const filter = this.buildAdminDropsFilter(filters);
    const drops = await this.database.drops
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const merchantIds = [...new Set(drops.map((d) => d.merchantId.toString()))];
    const merchantDocs = await this.database.merchants
      .find({
        _id: { $in: merchantIds.map((id) => new Types.ObjectId(id)) },
        deletedAt: null,
      })
      .select({ businessName: 1 })
      .lean();
    const merchantNameById = new Map(
      merchantDocs.map((m) => [m._id.toString(), m.businessName ?? ""]),
    );
    const rows = drops.map((d) => {
      const dto = this.dropsService.toResponseDto(d as Drop);
      const merchantName = merchantNameById.get(d.merchantId.toString()) ?? "";
      return [
        dto.name,
        merchantName,
        dto.rewardValue,
        this.formatCsvDate(dto.schedule?.start),
        this.formatCsvDate(dto.schedule?.end),
        dto.active ? "yes" : "no",
        dto.location?.lat ?? "",
        dto.location?.lng ?? "",
        dto.radius,
        this.formatCsvDate(dto.createdAt),
      ];
    });
    return encodeCsv(
      [
        "Name",
        "Merchant",
        "Reward",
        "Start",
        "End",
        "Active",
        "Latitude",
        "Longitude",
        "Radius",
        "Created",
      ],
      rows,
    );
  }

  async createDropAsAdmin(body: AdminCreateDropDto): Promise<unknown> {
    const { merchantId, ...dropData } = body;
    if (typeof merchantId !== "string" || !Types.ObjectId.isValid(merchantId)) {
      throw new BadRequestException("Valid merchantId is required");
    }

    const merchant = await this.database.merchants
      .findOne({ _id: merchantId, deletedAt: null })
      .lean();
    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    return this.dropsService.create(merchantId, dropData as CreateDropDto);
  }

  async updateDropAsAdmin(
    id: string,
    dto: UpdateDropDto,
  ): Promise<DropResponseDto> {
    return this.dropsService.updateAsAdmin(id, dto);
  }

  async deleteDropAsAdmin(
    id: string,
  ): Promise<{ id: string; deletedAt: Date | null }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid drop ID");
    }

    const drop = await this.database.drops
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date(), active: false } },
        { new: true },
      )
      .lean();

    if (!drop) {
      throw new NotFoundException("Drop not found");
    }

    return {
      id: drop._id.toString(),
      deletedAt: drop.deletedAt,
    };
  }
}
