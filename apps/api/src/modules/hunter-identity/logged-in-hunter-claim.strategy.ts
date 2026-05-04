import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { Types } from "mongoose";
import { timingSafeEqual } from "crypto";

import { config } from "../../config/app.config";
import { DatabaseService } from "../../database/database.service";
import { UserRole } from "../../common/enums/user-role.enum";
import {
  extractJwtFromCookieOrHeader,
  type JwtPayload,
} from "../auth/jwt-auth-shared";
import { isRegisteredHunterProfile } from "./hunter-registration.util";
import type { HunterClaimIdentity } from "./hunter-identity.types";

function safeDeviceIdMatch(clientValue: string, storedValue: string): boolean {
  const a = Buffer.from(clientValue, "utf8");
  const b = Buffer.from(storedValue, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

@Injectable()
export class LoggedInHunterClaimStrategy {
  private readonly logger = new Logger(LoggedInHunterClaimStrategy.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async tryResolveForPublicClaim(
    req: Request,
    dto: { deviceId: string; hunterId?: string },
  ): Promise<HunterClaimIdentity | null> {
    const token = extractJwtFromCookieOrHeader(req);
    if (!token) {
      return null;
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: config.jwt.secret,
      });
      if (payload.type !== UserRole.HUNTER) {
        return null;
      }
      const hunter = await this.database.hunters
        .findOne({
          _id: new Types.ObjectId(payload.sub),
          deletedAt: null,
        })
        .lean();
      if (!hunter) {
        throw new BadRequestException("Hunter not found");
      }
      if ((hunter.mergeStatus ?? "none") === "pending") {
        throw new ConflictException(
          "Account migration in progress; try again shortly",
        );
      }
      if (dto.hunterId?.trim() && dto.hunterId.trim() !== payload.sub) {
        throw new BadRequestException("Hunter ID does not match session");
      }
      if (!isRegisteredHunterProfile(hunter)) {
        if (!safeDeviceIdMatch(dto.deviceId, hunter.deviceId)) {
          throw new BadRequestException("Device ID does not match session");
        }
      }
      const emailTrimmed = hunter.email?.trim() ?? null;
      const registered = isRegisteredHunterProfile(hunter);
      this.logger.log(
        `publicClaim jwt branch hunterId=${payload.sub} registered=${registered}`,
      );
      return {
        hunterObjectId: new Types.ObjectId(payload.sub),
        hunterEmailTrimmed:
          emailTrimmed && emailTrimmed.length > 0 ? emailTrimmed : null,
        claimedWithoutRegisteredAccount: !registered,
        resolutionSource: "jwt",
      };
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      return null;
    }
  }
}
