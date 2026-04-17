import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { FilterQuery, PipelineStage, Types } from "mongoose";
import { DatabaseService } from "../../database/database.service";
import { Drop, DropDocument } from "../../database/schemas/drop.schema";
import { CreateDropDto } from "./dto/request/create-drop.dto";
import { UpdateDropDto } from "./dto/request/update-drop.dto";
import { DropResponseDto } from "./dto/response/drop-response.dto";
import { DropDetailResponseDto } from "./dto/response/drop-detail-response.dto";
import {
  ActiveDropsResponseDto,
  ActiveDropDto,
} from "./dto/response/active-drops-response.dto";
import { encodeCsv } from "../../common/utils/csv";

const ACTIVE_DROPS_CACHE_KEY = "drops:active:v1";
const ACTIVE_DROPS_CACHE_TTL_MS = 20_000;

@Injectable()
export class DropsService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async create(
    merchantId: string,
    dto: CreateDropDto
  ): Promise<DropResponseDto> {
    // Build redemption object from flat fields
    const redemption: Drop["redemption"] = {
      type: dto.redemptionType || "anytime",
    };
    if (dto.redemptionType === "timer" && dto.redemptionMinutes) {
      redemption.minutes = dto.redemptionMinutes;
    }
    if (dto.redemptionType === "window" && dto.redemptionDeadline) {
      redemption.deadline = new Date(dto.redemptionDeadline);
    }

    // Build availability object from flat fields
    const availability: Drop["availability"] = {
      type: dto.availabilityType || "unlimited",
    };
    if (dto.availabilityType === "limited" && dto.availabilityLimit) {
      availability.limit = dto.availabilityLimit;
    }

    // Build schedule from flat fields
    const schedule: Partial<Drop["schedule"]> = {};
    if (dto.startTime) {
      schedule.start = new Date(dto.startTime);
    }
    if (dto.endTime) {
      schedule.end = new Date(dto.endTime);
    }

    // Validate redemption rules
    if (
      dto.availabilityType === "limited" &&
      (!dto.availabilityLimit || dto.availabilityLimit < 1)
    ) {
      throw new BadRequestException(
        "Limited availability requires a valid limit"
      );
    }

    // Validate schedule
    if (schedule.start && schedule.end && schedule.end <= schedule.start) {
      throw new BadRequestException("End time must be after start time");
    }

    const lng = dto.longitude;
    const lat = dto.latitude;

    if (lng == null || lat == null) {
      throw new BadRequestException(
        "Longitude (lng/longitude) and Latitude (lat/latitude) are required"
      );
    }

    const voucherAbsoluteExpiresAt =
      dto.voucherAbsoluteExpiresAt?.trim() &&
      dto.voucherAbsoluteExpiresAt.trim().length > 0
        ? new Date(dto.voucherAbsoluteExpiresAt)
        : null;
    const voucherTtlHoursAfterClaim =
      dto.voucherTtlHoursAfterClaim != null
        ? dto.voucherTtlHoursAfterClaim
        : null;

    const drop = await this.database.drops.create({
      name: dto.name,
      description: dto.description || "",
      merchantId: new Types.ObjectId(merchantId),
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      radius: dto.radius ?? 15,
      rewardValue: dto.rewardValue,
      logoUrl: dto.logoUrl || null,
      termsAndConditions:
        dto.termsAndConditions?.trim() && dto.termsAndConditions.trim().length
          ? dto.termsAndConditions.trim()
          : null,
      redemption,
      availability,
      schedule: Object.keys(schedule).length > 0 ? schedule : {},
      active: dto.active !== false,
      voucherAbsoluteExpiresAt,
      voucherTtlHoursAfterClaim,
    });
    await this.invalidateActiveDropsCache();
    return this.toResponseDto(drop);
  }

  async findById(id: string): Promise<DropResponseDto> {
    const drop = await this.database.drops
      .findOne({ _id: id, deletedAt: null })
      .lean();
    if (!drop) {
      throw new NotFoundException("Drop not found");
    }
    return this.toResponseDto(drop as Drop);
  }

  async findByMerchant(
    merchantId: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: string
  ): Promise<{
    drops: DropResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
    const safeLimit = Math.min(
      100,
      Math.max(1, Number.isFinite(limit) ? limit : 20)
    );
    const filter = this.buildMerchantDropsFilter(merchantId, search, status);
    const skip = (safePage - 1) * safeLimit;

    const [drops, total] = await Promise.all([
      this.database.drops
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      this.database.drops.countDocuments(filter),
    ]);

    return {
      drops: drops.map((d) => this.toResponseDto(d as Drop)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async merchantDropsCsv(
    merchantId: string,
    search?: string,
    status?: string
  ): Promise<string> {
    const filter = this.buildMerchantDropsFilter(merchantId, search, status);
    const drops = await this.database.drops
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const rows = drops.map((d) => {
      const dto = this.toResponseDto(d as Drop);
      const created =
        dto.createdAt instanceof Date
          ? dto.createdAt.toISOString()
          : dto.createdAt != null
            ? String(dto.createdAt)
            : "";
      return [
        dto.name,
        dto.rewardValue,
        this.formatCsvInstant(dto.schedule?.start),
        this.formatCsvInstant(dto.schedule?.end),
        dto.active ? "yes" : "no",
        dto.location?.lat ?? "",
        dto.location?.lng ?? "",
        dto.radius,
        created,
      ];
    });
    return encodeCsv(
      [
        "Name",
        "Reward",
        "Start",
        "End",
        "Active",
        "Latitude",
        "Longitude",
        "Radius",
        "Created",
      ],
      rows
    );
  }

  buildDropSearchAndStatusClauses(
    search?: string,
    status?: string
  ): FilterQuery<DropDocument>[] {
    const andParts: FilterQuery<DropDocument>[] = [];
    const trimmed = search?.trim();

    if (trimmed) {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      andParts.push({
        $or: [{ name: regex }, { rewardValue: regex }],
      });
    }

    const normalized = status?.trim().toLowerCase();
    if (normalized && normalized !== "all") {
      const now = new Date();
      switch (normalized) {
        case "inactive":
          andParts.push({ active: false });
          break;
        case "scheduled":
          andParts.push({ "schedule.start": { $gt: now } });
          break;
        case "expired":
          andParts.push({ "schedule.end": { $lt: now } });
          break;
        case "active":
          andParts.push({ active: true });
          andParts.push({
            $or: [
              { "schedule.end": { $exists: false } },
              { "schedule.end": null },
              { "schedule.end": { $gte: now } },
            ],
          });
          andParts.push({
            $or: [
              { "schedule.start": { $exists: false } },
              { "schedule.start": null },
              { "schedule.start": { $lte: now } },
            ],
          });
          break;
        default:
          throw new BadRequestException(
            "Invalid status. Use active, inactive, scheduled, expired, or all."
          );
      }
    }

    return andParts;
  }

  private buildMerchantDropsFilter(
    merchantId: string,
    search?: string,
    status?: string
  ): FilterQuery<DropDocument> {
    const base: FilterQuery<DropDocument> = {
      merchantId: new Types.ObjectId(merchantId),
      deletedAt: null,
    };

    const andParts = this.buildDropSearchAndStatusClauses(search, status);

    if (andParts.length === 0) {
      return base;
    }

    return { ...base, $and: andParts };
  }

  async findForPublicMerchantStore(
    merchantId: string
  ): Promise<DropResponseDto[]> {
    const drops = await this.database.drops
      .find({
        merchantId: new Types.ObjectId(merchantId),
        deletedAt: null,
        active: true,
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return drops.map((d) => this.toResponseDto(d as Drop));
  }

  async findAllActive(): Promise<ActiveDropsResponseDto> {
    const cached = await this.cacheManager.get<ActiveDropsResponseDto>(
      ACTIVE_DROPS_CACHE_KEY
    );
    if (cached) {
      return cached;
    }

    const currentTime = new Date();

    const pipeline: PipelineStage[] = [
      {
        $match: {
          active: true,
          deletedAt: null,
          $and: [
            {
              $or: [
                { "schedule.start": { $exists: false } },
                { "schedule.start": null },
                { "schedule.start": { $lte: currentTime } },
              ],
            },
            {
              $or: [
                { "schedule.end": { $exists: false } },
                { "schedule.end": null },
                { "schedule.end": { $gte: currentTime } },
              ],
            },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "merchants",
          localField: "merchantId",
          foreignField: "_id",
          as: "merchant",
        },
      },
      {
        $unwind: "$merchant",
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          description: 1,
          location: {
            lat: { $arrayElemAt: ["$location.coordinates", 1] },
            lng: { $arrayElemAt: ["$location.coordinates", 0] },
          },
          radius: 1,
          rewardValue: 1,
          logoUrl: 1,
          termsAndConditions: 1,
          merchantId: 1,
          merchantName: "$merchant.name",
          merchantLogoUrl: "$merchant.logoUrl",
        },
      },
    ];

    const drops = await this.database.drops.aggregate<ActiveDropDto>(pipeline);

    const result: ActiveDropsResponseDto = {
      drops,
      total: drops.length,
    };

    await this.cacheManager.set(
      ACTIVE_DROPS_CACHE_KEY,
      result,
      ACTIVE_DROPS_CACHE_TTL_MS
    );

    return result;
  }

  async findAllActiveExcludingHunterClaims(
    hunterId: string
  ): Promise<ActiveDropsResponseDto> {
    let excludeIds: Types.ObjectId[] = [];
    try {
      const hunterOid = new Types.ObjectId(hunterId);
      const rawIds = await this.database.vouchers.distinct("dropId", {
        deletedAt: null,
        "claimedBy.hunterId": hunterOid,
      });
      excludeIds = rawIds
        .filter((id) => id != null)
        .map((id) =>
          id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id))
        );
    } catch {
      excludeIds = [];
    }

    const currentTime = new Date();
    const baseMatch: Record<string, unknown> = {
      active: true,
      deletedAt: null,
      $and: [
        {
          $or: [
            { "schedule.start": { $exists: false } },
            { "schedule.start": null },
            { "schedule.start": { $lte: currentTime } },
          ],
        },
        {
          $or: [
            { "schedule.end": { $exists: false } },
            { "schedule.end": null },
            { "schedule.end": { $gte: currentTime } },
          ],
        },
      ],
    };
    if (excludeIds.length > 0) {
      baseMatch._id = { $nin: excludeIds };
    }

    const pipeline: PipelineStage[] = [
      { $match: baseMatch },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "merchants",
          localField: "merchantId",
          foreignField: "_id",
          as: "merchant",
        },
      },
      {
        $unwind: "$merchant",
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          description: 1,
          location: {
            lat: { $arrayElemAt: ["$location.coordinates", 1] },
            lng: { $arrayElemAt: ["$location.coordinates", 0] },
          },
          radius: 1,
          rewardValue: 1,
          logoUrl: 1,
          termsAndConditions: 1,
          merchantId: 1,
          merchantName: "$merchant.name",
          merchantLogoUrl: "$merchant.logoUrl",
        },
      },
    ];

    const drops = await this.database.drops.aggregate<ActiveDropDto>(pipeline);

    return {
      drops,
      total: drops.length,
    };
  }

  async findActiveNear(
    lat: number,
    lng: number,
    maxDistanceMeters: number
  ): Promise<ActiveDropsResponseDto> {
    const currentTime = new Date();
    const cappedMax = Math.min(300_000, Math.max(1_000, maxDistanceMeters));

    const pipeline: PipelineStage[] = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: cappedMax,
          spherical: true,
          query: {
            active: true,
            deletedAt: null,
            $and: [
              {
                $or: [
                  { "schedule.start": { $exists: false } },
                  { "schedule.start": null },
                  { "schedule.start": { $lte: currentTime } },
                ],
              },
              {
                $or: [
                  { "schedule.end": { $exists: false } },
                  { "schedule.end": null },
                  { "schedule.end": { $gte: currentTime } },
                ],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "merchants",
          localField: "merchantId",
          foreignField: "_id",
          as: "merchant",
        },
      },
      {
        $unwind: "$merchant",
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          description: 1,
          location: {
            lat: { $arrayElemAt: ["$location.coordinates", 1] },
            lng: { $arrayElemAt: ["$location.coordinates", 0] },
          },
          radius: 1,
          rewardValue: 1,
          logoUrl: 1,
          termsAndConditions: 1,
          merchantId: 1,
          merchantName: "$merchant.name",
          merchantLogoUrl: "$merchant.logoUrl",
          distance: 1,
        },
      },
      { $sort: { distance: 1 } },
    ];

    const drops = await this.database.drops.aggregate<
      ActiveDropDto & { distance: number }
    >(pipeline);

    return {
      drops,
      total: drops.length,
    };
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdateDropDto
  ): Promise<DropResponseDto> {
    const drop = await this.database.drops.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
      deletedAt: null,
    });

    if (!drop) {
      throw new NotFoundException(
        "Drop not found or you do not have permission"
      );
    }

    // Build update object from flat fields
    const updateData: Partial<Drop> = {};

    // Simple field updates
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.rewardValue !== undefined) updateData.rewardValue = dto.rewardValue;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.radius !== undefined) updateData.radius = dto.radius;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.termsAndConditions !== undefined) {
      const raw = dto.termsAndConditions?.trim() ?? "";
      updateData.termsAndConditions = raw.length > 0 ? raw : null;
    }

    if (dto.voucherAbsoluteExpiresAt !== undefined) {
      const raw = dto.voucherAbsoluteExpiresAt?.trim() ?? "";
      updateData.voucherAbsoluteExpiresAt =
        raw.length > 0 ? new Date(raw) : null;
    }
    if (dto.voucherTtlHoursAfterClaim !== undefined) {
      updateData.voucherTtlHoursAfterClaim = dto.voucherTtlHoursAfterClaim;
    }

    // Redemption updates
    if (dto.redemptionType !== undefined) {
      updateData.redemption = { type: dto.redemptionType };
      if (dto.redemptionType === "timer" && dto.redemptionMinutes) {
        updateData.redemption.minutes = dto.redemptionMinutes;
      }
      if (dto.redemptionType === "window" && dto.redemptionDeadline) {
        updateData.redemption.deadline = new Date(dto.redemptionDeadline);
      }
    }

    // Availability updates
    if (dto.availabilityType !== undefined) {
      updateData.availability = { type: dto.availabilityType };
      if (dto.availabilityType === "limited" && dto.availabilityLimit) {
        updateData.availability.limit = dto.availabilityLimit;
      }
    }

    // Schedule updates
    const schedule: Partial<Drop["schedule"]> = {};
    if (dto.startTime) schedule.start = new Date(dto.startTime);
    if (dto.endTime) schedule.end = new Date(dto.endTime);
    if (Object.keys(schedule).length > 0) {
      updateData.schedule = schedule as Drop["schedule"];
    }

    // Validate redemption rules
    if (
      dto.availabilityType === "limited" &&
      (!dto.availabilityLimit || dto.availabilityLimit < 1)
    ) {
      throw new BadRequestException(
        "Limited availability requires a valid limit"
      );
    }

    // Validate availability
    if (schedule.start && schedule.end && schedule.end <= schedule.start) {
      throw new BadRequestException("End time must be after start time");
    }

    // Update location if lat/lng changed
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      updateData.location = {
        type: "Point" as const,
        coordinates: [
          dto.longitude ?? drop.location.coordinates[0],
          dto.latitude ?? drop.location.coordinates[1],
        ],
      };
    }

    Object.assign(drop, updateData);
    await drop.save();

    await this.invalidateActiveDropsCache();
    return this.toResponseDto(drop);
  }

  async updateAsAdmin(
    id: string,
    dto: UpdateDropDto
  ): Promise<DropResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid drop ID");
    }

    const drop = await this.database.drops.findOne({
      _id: new Types.ObjectId(id),
      deletedAt: null,
    });

    if (!drop) {
      throw new NotFoundException("Drop not found");
    }

    const updateData: Partial<Drop> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.rewardValue !== undefined) updateData.rewardValue = dto.rewardValue;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.radius !== undefined) updateData.radius = dto.radius;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.termsAndConditions !== undefined) {
      const raw = dto.termsAndConditions?.trim() ?? "";
      updateData.termsAndConditions = raw.length > 0 ? raw : null;
    }

    if (dto.voucherAbsoluteExpiresAt !== undefined) {
      const raw = dto.voucherAbsoluteExpiresAt?.trim() ?? "";
      updateData.voucherAbsoluteExpiresAt =
        raw.length > 0 ? new Date(raw) : null;
    }
    if (dto.voucherTtlHoursAfterClaim !== undefined) {
      updateData.voucherTtlHoursAfterClaim = dto.voucherTtlHoursAfterClaim;
    }

    if (dto.redemptionType !== undefined) {
      updateData.redemption = { type: dto.redemptionType };
      if (dto.redemptionType === "timer" && dto.redemptionMinutes) {
        updateData.redemption.minutes = dto.redemptionMinutes;
      }
      if (dto.redemptionType === "window" && dto.redemptionDeadline) {
        updateData.redemption.deadline = new Date(dto.redemptionDeadline);
      }
    }

    if (dto.availabilityType !== undefined) {
      updateData.availability = { type: dto.availabilityType };
      if (dto.availabilityType === "limited" && dto.availabilityLimit) {
        updateData.availability.limit = dto.availabilityLimit;
      }
    }

    const schedule: Partial<Drop["schedule"]> = {};
    if (dto.startTime) schedule.start = new Date(dto.startTime);
    if (dto.endTime) schedule.end = new Date(dto.endTime);
    if (Object.keys(schedule).length > 0) {
      updateData.schedule = schedule as Drop["schedule"];
    }

    if (
      dto.availabilityType === "limited" &&
      (!dto.availabilityLimit || dto.availabilityLimit < 1)
    ) {
      throw new BadRequestException(
        "Limited availability requires a valid limit"
      );
    }

    if (schedule.start && schedule.end && schedule.end <= schedule.start) {
      throw new BadRequestException("End time must be after start time");
    }

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      updateData.location = {
        type: "Point" as const,
        coordinates: [
          dto.longitude ?? drop.location.coordinates[0],
          dto.latitude ?? drop.location.coordinates[1],
        ],
      };
    }

    Object.assign(drop, updateData);
    await drop.save();

    await this.invalidateActiveDropsCache();
    return this.toResponseDto(drop);
  }

  async delete(id: string, merchantId: string): Promise<void> {
    const dropObjectId = new Types.ObjectId(id);
    const merchantObjectId = new Types.ObjectId(merchantId);

    const existing = await this.database.drops
      .findOne({
        _id: dropObjectId,
        merchantId: merchantObjectId,
        deletedAt: null,
      })
      .lean();

    if (!existing) {
      throw new NotFoundException(
        "Drop not found or you do not have permission"
      );
    }

    await this.assertDropHasNoBlockingReferences(dropObjectId);

    const result = await this.database.drops.updateOne(
      {
        _id: dropObjectId,
        merchantId: merchantObjectId,
        deletedAt: null,
      },
      { $set: { deletedAt: new Date(), active: false } }
    );

    if (!result.modifiedCount) {
      throw new NotFoundException(
        "Drop not found or you do not have permission"
      );
    }

    await this.invalidateActiveDropsCache();
  }

  private async assertDropHasNoBlockingReferences(
    dropObjectId: Types.ObjectId
  ): Promise<void> {
    const [voucherCount, promoCodeCount] = await Promise.all([
      this.database.vouchers.countDocuments({ dropId: dropObjectId }),
      this.database.promoCodes.countDocuments({ dropId: dropObjectId }),
    ]);

    if (voucherCount === 0 && promoCodeCount === 0) {
      return;
    }

    const parts: string[] = [];
    if (voucherCount > 0) {
      parts.push(`${voucherCount} voucher${voucherCount === 1 ? "" : "s"}`);
    }
    if (promoCodeCount > 0) {
      parts.push(
        `${promoCodeCount} promo code${promoCodeCount === 1 ? "" : "s"}`
      );
    }

    throw new ConflictException(
      `Cannot delete this drop while linked data exists (${parts.join(", ")}).`
    );
  }

  private async invalidateActiveDropsCache(): Promise<void> {
    await this.cacheManager.del(ACTIVE_DROPS_CACHE_KEY);
  }

  async checkAvailability(
    dropId: string
  ): Promise<{ available: boolean; remainingClaims?: number }> {
    const drop = await this.database.drops
      .findOne({ _id: dropId, deletedAt: null })
      .lean();
    if (!drop || drop.deletedAt || !drop.active) {
      return { available: false };
    }

    const now = new Date();

    // Check schedule constraints (start/end times are in schedule, not availability)
    if (drop.schedule?.start && now < drop.schedule.start)
      return { available: false };
    if (drop.schedule?.end && now > drop.schedule.end)
      return { available: false };

    if (!this.isWithinSchedule(drop as Drop)) {
      return { available: false };
    }

    // Check availability limits (limit is in availability, not redemption)
    if (
      drop.availability?.type === "limited" &&
      drop.availability.limit !== undefined
    ) {
      const claimCount = await this.getClaimCount(dropId);
      const remaining = (drop.availability.limit || 0) - claimCount;
      return {
        available: remaining > 0,
        remainingClaims: Math.max(0, remaining),
      };
    }

    return { available: true };
  }

  isWithinSchedule(drop: Drop): boolean {
    if (!drop.schedule) {
      return true;
    }

    const now = new Date();
    const schedule = drop.schedule;

    if (schedule.start && now < schedule.start) {
      return false;
    }
    if (schedule.end && now > schedule.end) {
      return false;
    }

    return true;
  }

  private effectiveScheduleAfterUpdate(
    drop: { schedule?: Drop["schedule"] },
    dto: UpdateDropDto
  ): Drop["schedule"] {
    let start = drop.schedule?.start;
    let end = drop.schedule?.end;
    if (dto.startTime) {
      start = new Date(dto.startTime);
    }
    if (dto.endTime) {
      end = new Date(dto.endTime);
    }
    return { start, end };
  }

  async getDetailWithAvailability(
    id: string,
    userLat?: number,
    userLng?: number
  ): Promise<DropDetailResponseDto> {
    const drop = await this.database.drops
      .findOne({ _id: id, deletedAt: null })
      .lean();
    if (!drop || drop.deletedAt) {
      throw new NotFoundException("Drop not found");
    }

    const availability = await this.checkAvailability(id);

    let userDistance: number | undefined;
    if (userLat !== undefined && userLng !== undefined) {
      userDistance = this.calculateDistance(
        userLat,
        userLng,
        drop.location.coordinates[1],
        drop.location.coordinates[0]
      );
    }

    // Type-safe refactor: add null check for merchantId
    const merchantIdStr = drop.merchantId?.toString() ?? "";

    return {
      ...this.toResponseDto(drop as Drop),
      merchant: {
        id: merchantIdStr,
        name: "", // Will be populated by controller
        logoUrl: undefined,
        username: "",
        isVerified: false,
      },
      remainingClaims: availability.remainingClaims,
      isWithinSchedule: this.isWithinSchedule(drop as Drop),
      isAvailable: availability.available,
      userDistance,
    };
  }

  private async hasClaims(dropId: string): Promise<boolean> {
    // Placeholder - implement based on your claims collection
    void dropId;
    return false;
  }

  private async getClaimCount(dropId: string): Promise<number> {
    // Placeholder - implement based on your claims collection
    void dropId;
    return 0;
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private formatCsvInstant(value: unknown): string {
    if (value === undefined || value === null) {
      return "";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toISOString();
    }
    return "";
  }

  toResponseDto(drop: Drop | DropDocument): DropResponseDto {
    // Type-safe refactor: safely convert ObjectId to string
    const id = "_id" in drop && drop._id ? drop._id.toString() : "";
    const merchantIdStr =
      "merchantId" in drop && drop.merchantId ? drop.merchantId.toString() : "";

    return {
      id,
      name: drop.name,
      description: drop.description,
      location: {
        lat: drop.location?.coordinates?.[1],
        lng: drop.location?.coordinates?.[0],
      },
      radius: drop.radius,
      rewardValue: drop.rewardValue,
      logoUrl: drop.logoUrl,
      termsAndConditions: drop.termsAndConditions ?? null,
      redemption: drop.redemption,
      availability: drop.availability,
      schedule: drop.schedule,
      active: drop.active,
      voucherAbsoluteExpiresAt: drop.voucherAbsoluteExpiresAt ?? null,
      voucherTtlHoursAfterClaim: drop.voucherTtlHoursAfterClaim ?? null,
      merchantId: merchantIdStr,
      createdAt: drop.createdAt,
      updatedAt: drop.updatedAt,
    };
  }
}
