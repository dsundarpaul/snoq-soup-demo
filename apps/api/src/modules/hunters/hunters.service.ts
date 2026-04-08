import { Injectable, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { DatabaseService } from "../../database/database.service";
import { Hunter } from "../../database/schemas/hunter.schema";
import { UpdateProfileDto } from "./dto/request/update-profile.dto";
import { HunterResponseDto } from "./dto/response/hunter-response.dto";
import {
  HunterHistoryResponseDto,
  VoucherHistoryItemDto,
} from "./dto/response/hunter-history-response.dto";
import { LeaderboardEntryDto } from "./dto/response/leaderboard-entry.dto";

// Type-safe refactor: Define update data interface
interface HunterUpdateData {
  updatedAt: Date;
  nickname?: string;
  profile?: {
    dateOfBirth?: Date;
    gender?: "male" | "female" | "other";
    mobile?: {
      countryCode?: string;
      number?: string;
    };
  };
}

// Type-safe refactor: Define voucher query interface
interface VoucherQuery {
  deletedAt: null;
  $or: Array<Record<string, unknown>>;
}

@Injectable()
export class HuntersService {
  constructor(private readonly database: DatabaseService) {}

  async findOrCreateByDevice(deviceId: string): Promise<HunterResponseDto> {
    let hunter = await this.database.hunters.findOne({
      deviceId,
      deletedAt: null,
    });

    if (!hunter) {
      hunter = await this.database.hunters.create({
        deviceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return this.toResponseDto(hunter);
  }

  async findById(id: string): Promise<HunterResponseDto> {
    const hunter = await this.database.hunters.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!hunter) {
      throw new NotFoundException("Hunter not found");
    }

    return this.toResponseDto(hunter);
  }

  async findByEmail(email: string): Promise<HunterResponseDto | null> {
    const hunter = await this.database.hunters.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });

    return hunter ? this.toResponseDto(hunter) : null;
  }

  async updateProfile(
    id: string,
    dto: UpdateProfileDto,
  ): Promise<HunterResponseDto> {
    // Type-safe refactor: use proper update data type
    const updateData: HunterUpdateData = {
      updatedAt: new Date(),
    };

    if (dto.nickname !== undefined) {
      updateData.nickname = dto.nickname;
    }

    if (
      dto.dateOfBirth !== undefined ||
      dto.gender !== undefined ||
      dto.mobileCountryCode !== undefined ||
      dto.mobileNumber !== undefined
    ) {
      updateData.profile = {};

      if (dto.dateOfBirth) {
        updateData.profile.dateOfBirth = new Date(dto.dateOfBirth);
      }

      if (dto.gender) {
        updateData.profile.gender = dto.gender;
      }

      if (dto.mobileCountryCode || dto.mobileNumber) {
        updateData.profile.mobile = {};
        if (dto.mobileCountryCode) {
          updateData.profile.mobile.countryCode = dto.mobileCountryCode;
        }
        if (dto.mobileNumber) {
          updateData.profile.mobile.number = dto.mobileNumber;
        }
      }
    }

    const hunter = await this.database.hunters.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!hunter) {
      throw new NotFoundException("Hunter not found");
    }

    return this.toResponseDto(hunter);
  }

  async updateNickname(
    id: string,
    nickname: string,
  ): Promise<HunterResponseDto> {
    const hunter = await this.database.hunters.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        $set: {
          nickname,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!hunter) {
      throw new NotFoundException("Hunter not found");
    }

    return this.toResponseDto(hunter);
  }

  async getHistory(
    hunterId: string,
    deviceId?: string,
  ): Promise<HunterHistoryResponseDto> {
    // Build query to find vouchers by hunterId or deviceId
    // Type-safe refactor: use proper query type
    const query: VoucherQuery = {
      deletedAt: null,
      $or: [],
    };

    if (hunterId) {
      query.$or.push({ "claimedBy.hunterId": new Types.ObjectId(hunterId) });
    }

    if (deviceId) {
      query.$or.push({ "claimedBy.deviceId": deviceId });
    }

    if (query.$or.length === 0) {
      return {
        vouchers: [],
        totalClaims: 0,
        totalRedemptions: 0,
      };
    }

    // Get vouchers with their associated data
    const vouchers = await this.database.vouchers
      .find(query)
      .sort({ claimedAt: -1 })
      .lean();

    if (vouchers.length === 0) {
      return {
        vouchers: [],
        totalClaims: 0,
        totalRedemptions: 0,
      };
    }

    // Get drop IDs and fetch drops
    const dropIds = vouchers.map((v) => v.dropId);
    const drops = await this.database.drops
      .find({ _id: { $in: dropIds }, deletedAt: null })
      .lean();

    const dropMap = new Map(drops.map((d) => [d._id.toString(), d]));

    // Get promo codes for vouchers
    const voucherIds = vouchers.map((v) => v._id);
    const promoCodes = await this.database.promoCodes
      .find({ voucherId: { $in: voucherIds }, deletedAt: null })
      .lean();

    const promoCodeMap = new Map(
      promoCodes.map((p) => [p.voucherId?.toString(), p]),
    );

    // Build history items
    const historyItems: VoucherHistoryItemDto[] = vouchers.map((voucher) => {
      const drop = dropMap.get(voucher.dropId.toString());
      const promoCode = promoCodeMap.get(voucher._id.toString());

      return {
        voucherId: voucher._id.toString(),
        dropId: voucher.dropId.toString(),
        dropName: drop?.name || "Unknown Drop",
        rewardValue: drop?.rewardValue || "Unknown Reward",
        merchantName: "Unknown Merchant", // Could be populated if merchant data is available
        claimedAt: voucher.claimedAt,
        redeemed: voucher.redeemed,
        redeemedAt: voucher.redeemedAt,
        promoCode: promoCode?.code || null,
      };
    });

    const totalClaims = historyItems.length;
    const totalRedemptions = historyItems.filter((v) => v.redeemed).length;

    return {
      vouchers: historyItems,
      totalClaims,
      totalRedemptions,
    };
  }

  async getLeaderboard(limit = 50): Promise<LeaderboardEntryDto[]> {
    const hunters = await this.database.hunters
      .find({ deletedAt: null })
      .sort({ "stats.totalClaims": -1 })
      .limit(limit)
      .lean();

    return hunters.map((hunter, index) => ({
      id: hunter._id?.toString() ?? "",
      nickname: hunter.nickname || "Anonymous Hunter",
      totalClaims: hunter.stats?.totalClaims || 0,
      totalRedemptions: hunter.stats?.totalRedemptions || 0,
      rank: index + 1,
    }));
  }

  async incrementStats(
    hunterId: string,
    field: "totalClaims" | "totalRedemptions",
  ): Promise<void> {
    const updateField = `stats.${field}`;

    await this.database.hunters.findOneAndUpdate(
      { _id: hunterId, deletedAt: null },
      {
        $inc: { [updateField]: 1 },
        $set: { updatedAt: new Date() },
      },
    );
  }

  private toResponseDto(hunter: Hunter): HunterResponseDto {
    // Type-safe refactor: safely convert ObjectId to string
    const id = "_id" in hunter && hunter._id ? hunter._id.toString() : "";

    return {
      id,
      deviceId: hunter.deviceId,
      nickname: hunter.nickname || null,
      email: hunter.email || null,
      profile: {
        dateOfBirth: hunter.profile?.dateOfBirth,
        gender: hunter.profile?.gender,
        countryCode: hunter.profile?.mobile?.countryCode,
        number: hunter.profile?.mobile?.number,
      },
      stats: {
        totalClaims: hunter.stats?.totalClaims || 0,
        totalRedemptions: hunter.stats?.totalRedemptions || 0,
      },
      createdAt: hunter.createdAt,
      updatedAt: hunter.updatedAt,
    };
  }
}
