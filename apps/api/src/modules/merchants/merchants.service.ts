import { Injectable, NotFoundException } from "@nestjs/common";
import { PipelineStage, Types, FlattenMaps } from "mongoose";
import { randomBytes } from "crypto";
import { DatabaseService } from "@/database/database.service";
import { MerchantDocument } from "@/database/schemas/merchant.schema";
import { UpdateMerchantDto } from "./dto/request/update-merchant.dto";
import { MerchantResponseDto } from "./dto/response/merchant-response.dto";
import { MerchantPublicResponseDto } from "./dto/response/merchant-public-response.dto";
import { ScannerTokenResponseDto } from "./dto/response/scanner-token-response.dto";
import { MerchantStatsResponseDto } from "./dto/response/merchant-stats-response.dto";
import { MerchantAnalyticsResponseDto } from "./dto/response/merchant-analytics-response.dto";

// Type for lean() results - just the data, not the full document
type LeanMerchant = FlattenMaps<MerchantDocument> & { _id: Types.ObjectId };

// Type-safe refactor: Define drop performance interface
interface DropPerformanceItem {
  id: string;
  name: string;
  redemptions: number;
}

@Injectable()
export class MerchantsService {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string): Promise<MerchantResponseDto> {
    const merchant = await this.database.merchants
      .findOne({ _id: id, deletedAt: null })
      .lean();
    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }
    return this.toResponseDto(merchant);
  }

  async findByEmail(email: string): Promise<MerchantResponseDto | null> {
    const merchant = await this.database.merchants
      .findOne({ email, deletedAt: null })
      .lean();
    return merchant ? this.toResponseDto(merchant) : null;
  }

  async updateProfile(
    id: string,
    dto: UpdateMerchantDto,
  ): Promise<MerchantResponseDto> {
    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: dto },
        { new: true, runValidators: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    return this.toResponseDto(merchant);
  }

  async updateLogo(id: string, logoUrl: string): Promise<MerchantResponseDto> {
    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { logoUrl } },
        { new: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    return this.toResponseDto(merchant);
  }

  async generateScannerToken(
    id: string,
    expiresInHours = 24,
  ): Promise<ScannerTokenResponseDto> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          $set: {
            "scannerToken.token": token,
            "scannerToken.createdAt": expiresAt,
          },
        },
        { new: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    return {
      token: merchant.scannerToken?.token || token,
      expiresAt,
      createdAt: new Date(),
    };
  }

  async getScannerToken(id: string): Promise<ScannerTokenResponseDto | null> {
    const merchant = await this.database.merchants
      .findOne({ _id: id, deletedAt: null })
      .lean();
    if (
      !merchant ||
      !merchant.scannerToken?.token ||
      !merchant.scannerToken?.createdAt
    ) {
      return null;
    }

    const expiresAt = new Date(merchant.scannerToken.createdAt);
    if (new Date() > expiresAt) {
      return null;
    }

    return {
      token: merchant.scannerToken.token,
      expiresAt,
      createdAt: merchant.updatedAt,
    };
  }

  async findByUsername(username: string): Promise<MerchantPublicResponseDto> {
    const merchant = await this.database.merchants
      .findOne({
        username,
        isActive: true,
        deletedAt: null,
      })
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    return this.toPublicResponseDto(merchant);
  }

  async findByScannerToken(token: string): Promise<MerchantResponseDto | null> {
    const merchant = await this.database.merchants
      .findOne({
        "scannerToken.token": token,
        deletedAt: null,
      })
      .lean();

    return merchant ? this.toResponseDto(merchant) : null;
  }

  private toResponseDto(
    merchant:
      | MerchantDocument
      | LeanMerchant
      | {
          _id: Types.ObjectId;
          email: string;
          businessName: string;
          logoUrl: string | null;
          username: string;
          emailVerified: boolean;
          lockUntil?: Date | null;
          createdAt: Date;
          updatedAt: Date;
        },
  ): MerchantResponseDto {
    // Type-safe refactor: safely convert ObjectId to string
    const id = merchant._id ? merchant._id.toString() : "";

    return {
      id,
      email: merchant.email,
      name: merchant.businessName,
      description: "",
      logoUrl: merchant.logoUrl ?? undefined,
      address: undefined,
      phone: undefined,
      website: undefined,
      socialLinks: undefined,
      username: merchant.username,
      isVerified: merchant.emailVerified,
      isActive: merchant.lockUntil ? new Date() < merchant.lockUntil : true,
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
    };
  }

  private toPublicResponseDto(
    merchant:
      | MerchantDocument
      | LeanMerchant
      | {
          _id: Types.ObjectId;
          email: string;
          businessName: string;
          logoUrl: string | null;
          username: string;
          emailVerified: boolean;
          lockUntil?: Date | null;
          createdAt: Date;
          updatedAt: Date;
        },
  ): MerchantPublicResponseDto {
    return {
      name: merchant.businessName,
      description: "",
      logoUrl: merchant.logoUrl ?? undefined,
      address: undefined,
      phone: undefined,
      website: undefined,
      socialLinks: undefined,
      username: merchant.username,
      isVerified: merchant.emailVerified,
      totalDrops: 0,
      activeDrops: 0,
    };
  }

  async getStats(merchantId: string): Promise<MerchantStatsResponseDto> {
    const merchantObjectId = new Types.ObjectId(merchantId);

    const [dropsResult, vouchersResult] = await Promise.all([
      this.database.drops.aggregate([
        { $match: { merchantId: merchantObjectId, deletedAt: null } },
        {
          $group: {
            _id: null,
            totalDrops: { $sum: 1 },
            activeDrops: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$active", true] },
                      {
                        $or: [
                          { $eq: ["$schedule.end", null] },
                          { $gte: ["$schedule.end", new Date()] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.database.vouchers.aggregate([
        { $match: { merchantId: merchantObjectId, deletedAt: null } },
        {
          $group: {
            _id: null,
            totalVouchers: { $sum: 1 },
            redeemedVouchers: {
              $sum: { $cond: ["$redeemed", 1, 0] },
            },
          },
        },
      ]),
    ]);

    const dropsStats = dropsResult[0] || { totalDrops: 0, activeDrops: 0 };
    const vouchersStats = vouchersResult[0] || {
      totalVouchers: 0,
      redeemedVouchers: 0,
    };

    const redemptionRate =
      vouchersStats.totalVouchers > 0
        ? Math.round(
            (vouchersStats.redeemedVouchers / vouchersStats.totalVouchers) *
              100,
          )
        : 0;

    return {
      totalDrops: dropsStats.totalDrops,
      activeDrops: dropsStats.activeDrops,
      totalVouchers: vouchersStats.totalVouchers,
      redeemedVouchers: vouchersStats.redeemedVouchers,
      redemptionRate,
    };
  }

  async getAnalytics(
    merchantId: string,
  ): Promise<MerchantAnalyticsResponseDto> {
    const merchantObjectId = new Types.ObjectId(merchantId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pipeline: PipelineStage[] = [
      { $match: { merchantId: merchantObjectId, deletedAt: null } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalDrops: { $sum: 1 },
                activeDrops: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$active", true] },
                          {
                            $or: [
                              { $eq: ["$schedule.end", null] },
                              { $gte: ["$schedule.end", new Date()] },
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                expiredDrops: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$schedule.end", null] },
                          { $lt: ["$schedule.end", new Date()] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          dailyStats: [
            { $match: { claimedAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: { format: "%Y-%m-%d", date: "$claimedAt" },
                  },
                },
                claims: { $sum: 1 },
                redemptions: { $sum: { $cond: ["$redeemed", 1, 0] } },
              },
            },
            { $sort: { "_id.date": 1 } },
          ],
          dropPerformance: [
            {
              $lookup: {
                from: "drops",
                localField: "dropId",
                foreignField: "_id",
                as: "drop",
              },
            },
            { $unwind: "$drop" },
            {
              $group: {
                _id: "$dropId",
                name: { $first: "$drop.name" },
                rewardValue: { $first: "$drop.rewardValue" },
                claims: { $sum: 1 },
                redemptions: { $sum: { $cond: ["$redeemed", 1, 0] } },
              },
            },
            {
              $project: {
                id: { $toString: "$_id" },
                name: 1,
                rewardValue: 1,
                claims: 1,
                redemptions: 1,
                conversionRate: {
                  $cond: [
                    { $gt: ["$claims", 0] },
                    {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ["$redemptions", "$claims"] },
                            100,
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            { $sort: { redemptions: -1 } },
          ],
          avgTimeToRedemption: [
            {
              $match: {
                redeemed: true,
                claimedAt: { $exists: true },
                redeemedAt: { $exists: true },
              },
            },
            {
              $group: {
                _id: null,
                avgHours: {
                  $avg: {
                    $divide: [
                      { $subtract: ["$redeemedAt", "$claimedAt"] },
                      3600000,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const [dropsAgg, vouchersAgg] = await Promise.all([
      this.database.drops.aggregate(pipeline),
      this.database.vouchers.aggregate([
        { $match: { merchantId: merchantObjectId, deletedAt: null } },
        {
          $group: {
            _id: null,
            totalClaims: { $sum: 1 },
            totalRedemptions: { $sum: { $cond: ["$redeemed", 1, 0] } },
          },
        },
      ]),
    ]);

    const dropsFacet = dropsAgg[0] || {
      overview: [{ totalDrops: 0, activeDrops: 0, expiredDrops: 0 }],
      dailyStats: [],
      dropPerformance: [],
      avgTimeToRedemption: [{ avgHours: null }],
    };

    const overview = dropsFacet.overview[0] || {
      totalDrops: 0,
      activeDrops: 0,
      expiredDrops: 0,
    };
    const vouchersOverview = vouchersAgg[0] || {
      totalClaims: 0,
      totalRedemptions: 0,
    };

    const conversionRate =
      vouchersOverview.totalClaims > 0
        ? Math.round(
            (vouchersOverview.totalRedemptions / vouchersOverview.totalClaims) *
              100,
          )
        : 0;

    const avgTimeToRedemption = dropsFacet.avgTimeToRedemption[0]?.avgHours
      ? Math.round(dropsFacet.avgTimeToRedemption[0].avgHours * 10) / 10
      : null;

    const dailyStatsMap = new Map<
      string,
      { claims: number; redemptions: number }
    >();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      // Type-safe refactor: safely get date string without non-null assertion
      const dateParts = date.toISOString().split("T");
      const dateStr: string =
        dateParts.length > 0 ? (dateParts[0] as string) : "";
      dailyStatsMap.set(dateStr, { claims: 0, redemptions: 0 });
    }

    for (const stat of dropsFacet.dailyStats) {
      dailyStatsMap.set(stat._id.date, {
        claims: stat.claims,
        redemptions: stat.redemptions,
      });
    }

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Type-safe refactor: properly typed drop performance mapping
    const topDrops: DropPerformanceItem[] = (dropsFacet.dropPerformance || [])
      .slice(0, 5)
      .map((d: { id: unknown; name: unknown; redemptions: unknown }) => ({
        id: d.id as string,
        name: d.name as string,
        redemptions: d.redemptions as number,
      }));

    return {
      overview: {
        totalDrops: overview.totalDrops,
        activeDrops: overview.activeDrops,
        expiredDrops: overview.expiredDrops,
        totalClaims: vouchersOverview.totalClaims,
        totalRedemptions: vouchersOverview.totalRedemptions,
        conversionRate,
        avgTimeToRedemption,
      },
      dailyStats,
      dropPerformance: dropsFacet.dropPerformance || [],
      topDrops,
    };
  }
}
