import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PipelineStage, Types } from "mongoose";
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

@Injectable()
export class DropsService {
  constructor(private readonly database: DatabaseService) {}

  async create(
    merchantId: string,
    dto: CreateDropDto,
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
        "Limited availability requires a valid limit",
      );
    }

    // Validate schedule
    if (schedule.start && schedule.end && schedule.end <= schedule.start) {
      throw new BadRequestException("End time must be after start time");
    }

    // Support both lat/lng and latitude/longitude naming conventions
    const lng = dto.lng ?? dto.longitude;
    const lat = dto.lat ?? dto.latitude;

    if (lng == null || lat == null) {
      throw new BadRequestException(
        "Longitude (lng/longitude) and Latitude (lat/latitude) are required",
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
      radius: dto.radius || 50,
      rewardValue: dto.rewardValue,
      logoUrl: dto.logoUrl || null,
      redemption,
      availability,
      schedule: Object.keys(schedule).length > 0 ? schedule : {},
      active: dto.active !== false,
      voucherAbsoluteExpiresAt,
      voucherTtlHoursAfterClaim,
    });
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
  ): Promise<{
    drops: DropResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [drops, total] = await Promise.all([
      this.database.drops
        .find({ merchantId: new Types.ObjectId(merchantId), deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.database.drops.countDocuments({
        merchantId: new Types.ObjectId(merchantId),
        deletedAt: null,
      }),
    ]);

    return {
      drops: drops.map((d) => this.toResponseDto(d as Drop)),
      total,
      page,
      limit,
    };
  }

  async findForPublicMerchantStore(
    merchantId: string,
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
    const pipeline: PipelineStage[] = [
      {
        $match: {
          active: true,
          // $and: [
          //   {
          //     $or: [
          //       { "schedule.start": { $exists: false } },
          //       { "schedule.start": null },
          //       { "schedule.start": { $lte: now } },
          //     ],
          //   },
          //   {
          //     $or: [
          //       { "schedule.end": { $exists: false } },
          //       { "schedule.end": null },
          //       { "schedule.end": { $gte: now } },
          //     ],
          //   },
          // ],
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

  async update(
    id: string,
    merchantId: string,
    dto: UpdateDropDto,
  ): Promise<DropResponseDto> {
    const drop = await this.database.drops.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
      deletedAt: null,
    });

    if (!drop) {
      throw new NotFoundException(
        "Drop not found or you do not have permission",
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
        "Limited availability requires a valid limit",
      );
    }

    // Validate availability
    if (schedule.start && schedule.end && schedule.end <= schedule.start) {
      throw new BadRequestException("End time must be after start time");
    }

    // Update location if lat/lng changed
    if (dto.lat !== undefined || dto.lng !== undefined) {
      updateData.location = {
        type: "Point" as const,
        coordinates: [
          dto.lng ?? drop.location.coordinates[0],
          dto.lat ?? drop.location.coordinates[1],
        ],
      };
    }

    Object.assign(drop, updateData);
    await drop.save();

    return this.toResponseDto(drop);
  }

  async delete(id: string, merchantId: string): Promise<void> {
    const result = await this.database.drops.updateOne(
      {
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
        deletedAt: null,
      },
      { $set: { deletedAt: new Date(), active: false } },
    );

    if (!result.modifiedCount) {
      throw new NotFoundException(
        "Drop not found or you do not have permission",
      );
    }
  }

  async checkAvailability(
    dropId: string,
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

  async getDetailWithAvailability(
    id: string,
    userLat?: number,
    userLng?: number,
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
        drop.location.coordinates[0],
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
    lng2: number,
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

  private toResponseDto(drop: Drop | DropDocument): DropResponseDto {
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
