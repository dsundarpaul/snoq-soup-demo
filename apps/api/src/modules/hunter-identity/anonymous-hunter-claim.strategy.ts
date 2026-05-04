import { Injectable, ConflictException, Logger } from "@nestjs/common";
import { Types } from "mongoose";

import { DatabaseService } from "../../database/database.service";
import { isRegisteredHunterProfile } from "./hunter-registration.util";
import type { HunterClaimIdentity } from "./hunter-identity.types";

@Injectable()
export class AnonymousHunterClaimStrategy {
  private readonly logger = new Logger(AnonymousHunterClaimStrategy.name);

  constructor(private readonly database: DatabaseService) {}

  async resolveByDeviceId(deviceId: string): Promise<HunterClaimIdentity> {
    const hunters = await this.database.hunters
      .find({ deviceId, deletedAt: null })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
    if (hunters.length > 1) {
      this.logger.warn(
        `resolveByDeviceId duplicate deviceId count=${hunters.length}; picked most recently updated non-pending`,
      );
    }
    const hunter =
      hunters.find((h) => (h.mergeStatus ?? "none") !== "pending") ??
      hunters[0];
    if (!hunter) {
      const created = await this.database.hunters.create({
        deviceId,
        email: null,
        password: null,
        nickname: null,
        profile: {},
        passwordReset: {},
        stats: { totalClaims: 0, totalRedemptions: 0 },
        deletedAt: null,
        registrationCompleted: false,
        mergeStatus: "none",
      });
      this.logger.log(
        `resolveByDeviceId created hunter id=${created._id.toString()}`,
      );
      return {
        hunterObjectId: created._id as Types.ObjectId,
        hunterEmailTrimmed: null,
        claimedWithoutRegisteredAccount: true,
        resolutionSource: "device",
      };
    }
    if ((hunter.mergeStatus ?? "none") === "pending") {
      throw new ConflictException(
        "Account migration in progress; try again shortly",
      );
    }
    const emailTrimmed = hunter.email?.trim() ?? null;
    const registered = isRegisteredHunterProfile(hunter);
    this.logger.log(
      `resolveByDeviceId hunterId=${(hunter._id as Types.ObjectId).toString()} registered=${registered}`,
    );
    return {
      hunterObjectId: hunter._id as Types.ObjectId,
      hunterEmailTrimmed:
        emailTrimmed && emailTrimmed.length > 0 ? emailTrimmed : null,
      claimedWithoutRegisteredAccount: !registered,
      resolutionSource: "device",
    };
  }
}
