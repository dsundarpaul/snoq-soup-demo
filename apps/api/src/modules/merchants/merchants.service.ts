import { Injectable, NotFoundException } from "@nestjs/common";
import { PipelineStage, Types, FlattenMaps } from "mongoose";
import { randomBytes, createHash } from "crypto";
import { DatabaseService } from "../../database/database.service";
import { MerchantDocument } from "../../database/schemas/merchant.schema";
import { UpdateMerchantDto } from "./dto/request/update-merchant.dto";
import { MerchantResponseDto } from "./dto/response/merchant-response.dto";
import { MerchantPublicResponseDto } from "./dto/response/merchant-public-response.dto";
import { DropsService } from "../drops/drops.service";
import { DropResponseDto } from "../drops/dto/response/drop-response.dto";
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
  constructor(
    private readonly database: DatabaseService,
    private readonly dropsService: DropsService,
  ) {}

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

  async updateStoreLocation(
    id: string,
    storeLocation: {
      lat: number;
      lng: number;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      landmark?: string;
      howToReach?: string;
    },
  ): Promise<MerchantResponseDto> {
    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { storeLocation } },
        { new: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    return this.toResponseDto(merchant);
  }

  async clearStoreLocation(id: string): Promise<MerchantResponseDto> {
    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { storeLocation: null } },
        { new: true },
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
    // Generate plaintext token (shown to merchant once)
    const plainToken = randomBytes(32).toString("hex");
    // Hash for secure storage
    const hashedToken = createHash("sha256").update(plainToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    console.log(hashedToken);

    console.log("p;-", plainToken);

    const merchant = await this.database.merchants
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          $set: {
            "scannerToken.token": hashedToken,
            "scannerToken.createdAt": expiresAt,
          },
        },
        { new: true },
      )
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    console.log("p2;-", plainToken);
    // Return plaintext token - merchant sees it once
    return {
      token: plainToken,
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
        deletedAt: null,
      })
      .lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    const drops = await this.dropsService.findForPublicMerchantStore(
      merchant._id.toString(),
    );
    const now = new Date();
    const activeDrops = drops.filter((d) =>
      this.isDropInPublicScheduleWindow(d, now),
    ).length;

    return {
      ...this.toPublicResponseDto(merchant),
      drops,
      totalDrops: drops.length,
      activeDrops,
    };
  }

  private isDropInPublicScheduleWindow(d: DropResponseDto, now: Date): boolean {
    const s = d.schedule;
    if (!s?.start && !s?.end) {
      return true;
    }
    if (s.start && now < new Date(s.start)) {
      return false;
    }
    if (s.end && now > new Date(s.end)) {
      return false;
    }
    return true;
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
          businessPhone?: string | null;
          businessHours?: string | null;
          username: string;
          emailVerified: boolean;
          suspendedAt?: Date | null;
          lockUntil?: Date | null;
          storeLocation?: {
            lat: number;
            lng: number;
            address?: string;
            city?: string;
            state?: string;
            pincode?: string;
            landmark?: string;
            howToReach?: string;
          } | null;
          createdAt: Date;
          updatedAt: Date;
        },
  ): MerchantResponseDto {
    const id = merchant._id ? merchant._id.toString() : "";

    const sl =
      "storeLocation" in merchant && merchant.storeLocation
        ? {
            lat: merchant.storeLocation.lat,
            lng: merchant.storeLocation.lng,
            address: merchant.storeLocation.address,
            city: merchant.storeLocation.city,
            state: merchant.storeLocation.state,
            pincode: merchant.storeLocation.pincode,
            landmark: merchant.storeLocation.landmark,
            howToReach: merchant.storeLocation.howToReach,
          }
        : null;

    const bPhone =
      "businessPhone" in merchant ? (merchant.businessPhone ?? null) : null;
    const bHours =
      "businessHours" in merchant ? (merchant.businessHours ?? null) : null;

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
      storeLocation: sl,
      businessPhone: bPhone,
      businessHours: bHours,
      username: merchant.username,
      isVerified: merchant.emailVerified,
      isActive:
        !merchant.suspendedAt &&
        !(merchant.lockUntil && new Date() < new Date(merchant.lockUntil)),
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
          suspendedAt?: Date | null;
          lockUntil?: Date | null;
          createdAt: Date;
          updatedAt: Date;
        },
  ): Omit<MerchantPublicResponseDto, "drops" | "totalDrops" | "activeDrops"> {
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

    const dropsOverviewPipeline: PipelineStage[] = [
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
    ];

    const vouchersFacetPipeline: PipelineStage[] = [
      { $match: { merchantId: merchantObjectId, deletedAt: null } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalClaims: { $sum: 1 },
                totalRedemptions: { $sum: { $cond: ["$redeemed", 1, 0] } },
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
                redeemedAt: { $exists: true, $ne: null },
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

    const [dropsOverviewAgg, vouchersFacetAgg] = await Promise.all([
      this.database.drops.aggregate(dropsOverviewPipeline),
      this.database.vouchers.aggregate(vouchersFacetPipeline),
    ]);

    const dropOverview = dropsOverviewAgg[0] || {
      totalDrops: 0,
      activeDrops: 0,
      expiredDrops: 0,
    };

    const vouchersFacet = vouchersFacetAgg[0] || {
      overview: [{ totalClaims: 0, totalRedemptions: 0 }],
      dailyStats: [],
      dropPerformance: [],
      avgTimeToRedemption: [],
    };

    const vouchersOverview = vouchersFacet.overview[0] || {
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

    const avgTimeToRedemption = vouchersFacet.avgTimeToRedemption[0]?.avgHours
      ? Math.round(vouchersFacet.avgTimeToRedemption[0].avgHours * 10) / 10
      : null;

    const dailyStatsMap = new Map<
      string,
      { claims: number; redemptions: number }
    >();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateParts = date.toISOString().split("T");
      const dateStr: string =
        dateParts.length > 0 ? (dateParts[0] as string) : "";
      dailyStatsMap.set(dateStr, { claims: 0, redemptions: 0 });
    }

    for (const stat of vouchersFacet.dailyStats) {
      dailyStatsMap.set(stat._id.date, {
        claims: stat.claims,
        redemptions: stat.redemptions,
      });
    }

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topDrops: DropPerformanceItem[] = (
      vouchersFacet.dropPerformance || []
    )
      .slice(0, 5)
      .map((d: { id: unknown; name: unknown; redemptions: unknown }) => ({
        id: d.id as string,
        name: d.name as string,
        redemptions: d.redemptions as number,
      }));

    return {
      overview: {
        totalDrops: dropOverview.totalDrops,
        activeDrops: dropOverview.activeDrops,
        expiredDrops: dropOverview.expiredDrops,
        totalClaims: vouchersOverview.totalClaims,
        totalRedemptions: vouchersOverview.totalRedemptions,
        conversionRate,
        avgTimeToRedemption,
      },
      dailyStats,
      dropPerformance: vouchersFacet.dropPerformance || [],
      topDrops,
    };
  }
}
