import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PipelineStage, Types } from "mongoose";
import { DatabaseService } from "../../database/database.service";
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

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface MerchantQuery extends PaginationQuery {
  isVerified?: boolean;
  isActive?: boolean;
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
}

@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string): Promise<any | null> {
    return this.database.admins.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });
  }

  async getPlatformStats(): Promise<AdminStatsDto> {
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

    return {
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
  }

  async getPlatformAnalytics(
    days = 30,
    granularity: "hourly" | "daily" | "weekly" | "monthly" = "daily",
  ): Promise<AdminAnalyticsDto> {
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

    const [
      merchantsOverTime,
      dropsOverTime,
      claimsOverTime,
      redemptionsOverTime,
      huntersOverTime,
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
    ]);

    return {
      merchantsOverTime,
      dropsOverTime,
      claimsOverTime,
      redemptionsOverTime,
      huntersOverTime,
      periodStart: formatDate(startDate),
      periodEnd: formatDate(endDate),
      granularity,
      generatedAt: new Date(),
    };
  }

  async findAllMerchants(query: MerchantQuery): Promise<MerchantListDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (query.isVerified !== undefined) {
      filter.emailVerified = query.isVerified;
    }

    if (query.search) {
      filter.$or = [
        { businessName: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
        { username: { $regex: query.search, $options: "i" } },
      ] as unknown[];
    }

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
      return {
        id: m._id.toString(),
        email: m.email,
        businessName: m.businessName,
        username: m.username,
        isVerified: m.emailVerified,
        isActive: m.lockUntil ? new Date() < m.lockUntil : true,
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

    if (dto.username) {
      const existing = await this.database.merchants
        .findOne({
          username: dto.username.toLowerCase(),
          _id: { $ne: new Types.ObjectId(id) },
        })
        .lean();
      if (existing) {
        throw new ConflictException("Username already taken");
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.username) {
      updateData.username = dto.username.toLowerCase();
    }

    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    const dropStats = await this.database.drops.aggregate([
      { $match: { merchantId: new Types.ObjectId(id), deletedAt: null } },
      {
        $group: {
          _id: "$merchantId",
          totalDrops: { $sum: 1 },
          activeDrops: { $sum: { $cond: ["$active", 1, 0] } },
        },
      },
    ]);

    const stats = dropStats[0] || { totalDrops: 0, activeDrops: 0 };

    return {
      id: merchant._id.toString(),
      email: merchant.email,
      businessName: merchant.businessName,
      username: merchant.username,
      isVerified: merchant.emailVerified,
      isActive: merchant.lockUntil ? new Date() < merchant.lockUntil : true,
      totalDrops: stats.totalDrops,
      activeDrops: stats.activeDrops,
      createdAt: merchant.createdAt,
    };
  }

  async findAllUsers(query: UserQuery): Promise<UserListDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (query.search) {
      filter.$or = [
        { deviceId: { $regex: query.search, $options: "i" } },
        { nickname: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
      ] as unknown[];
    }

    if (query.minClaims !== undefined) {
      filter["stats.totalClaims"] = { $gte: query.minClaims };
    }

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
    items: DropResponseDto[];
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

    const filter: Record<string, unknown> = { deletedAt: null };

    if (query.merchantId) {
      if (!Types.ObjectId.isValid(query.merchantId)) {
        throw new BadRequestException("Invalid merchant ID");
      }
      filter.merchantId = new Types.ObjectId(query.merchantId);
    }

    if (query.active !== undefined) {
      filter.active = query.active;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ] as unknown[];
    }

    const [drops, total] = await Promise.all([
      this.database.drops
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.database.drops.countDocuments(filter),
    ]);

    const items = drops.map((d) => {
      return {
        id: d._id.toString(),
        name: d.name,
        description: d.description,
        location: {
          lat: d.location.coordinates[1],
          lng: d.location.coordinates[0],
        },
        radius: d.radius,
        rewardValue: d.rewardValue,
        logoUrl: d.logoUrl,
        redemption: d.redemption,
        availability: d.availability,
        schedule: d.schedule,
        active: d.active,
        merchantId: d.merchantId.toString(),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
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

  async createDropAsAdmin(dto: any): Promise<any> {
    if (!Types.ObjectId.isValid(dto.merchantId)) {
      throw new BadRequestException("Invalid merchant ID");
    }

    const merchant = await this.database.merchants
      .findOne({ _id: dto.merchantId, deletedAt: null })
      .lean();
    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    const drop = await this.database.drops.create({
      merchantId: new Types.ObjectId(dto.merchantId),
      name: dto.name,
      description: dto.description,
      location: dto.location,
      radius: dto.radius || 15,
      rewardValue: dto.rewardValue,
      logoUrl: dto.logoUrl || null,
      redemption: dto.redemption || { type: "anytime" },
      availability: dto.availability || { type: "unlimited" },
      schedule: dto.schedule || {},
      active: dto.active !== undefined ? dto.active : true,
    });

    return {
      id: drop._id.toString(),
      merchantId: drop.merchantId.toString(),
      name: drop.name,
      description: drop.description,
      location: drop.location,
      radius: drop.radius,
      rewardValue: drop.rewardValue,
      active: drop.active,
      createdAt: drop.createdAt,
    };
  }

  async updateDropAsAdmin(id: string, dto: any): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid drop ID");
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.radius !== undefined) updateData.radius = dto.radius;
    if (dto.rewardValue !== undefined) updateData.rewardValue = dto.rewardValue;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.redemption !== undefined) updateData.redemption = dto.redemption;
    if (dto.availability !== undefined)
      updateData.availability = dto.availability;
    if (dto.schedule !== undefined) updateData.schedule = dto.schedule;
    if (dto.active !== undefined) updateData.active = dto.active;

    const drop = await this.database.drops
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .lean();

    if (!drop) {
      throw new NotFoundException("Drop not found");
    }

    const merchant = await this.database.merchants
      .findOne({ _id: drop.merchantId, deletedAt: null })
      .lean();

    return {
      id: drop._id.toString(),
      merchantId: drop.merchantId.toString(),
      merchant: merchant
        ? { id: merchant._id.toString(), businessName: merchant.businessName }
        : null,
      name: drop.name,
      description: drop.description,
      location: drop.location,
      radius: drop.radius,
      rewardValue: drop.rewardValue,
      active: drop.active,
      updatedAt: drop.updatedAt,
    };
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
