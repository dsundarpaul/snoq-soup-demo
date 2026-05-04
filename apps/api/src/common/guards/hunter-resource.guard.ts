import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { DatabaseService } from "../../database/database.service";
import { UserRole } from "../enums/user-role.enum";
import type { RequestUser } from "../../modules/auth/strategies/jwt.strategy";
import { extractDeviceIdFromRequest } from "../http/extract-device-id";

type HunterRequest = Request & {
  resolvedHunterId?: string;
  user?: RequestUser;
};

@Injectable()
export class HunterResourceGuard implements CanActivate {
  private readonly logger = new Logger(HunterResourceGuard.name);

  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HunterRequest>();
    const user = request.user;

    if (user?.type === UserRole.HUNTER) {
      request.resolvedHunterId = user.userId;
      this.logger.log(
        `resolve hunter via=jwt resolvedHunterId=${request.resolvedHunterId}`,
      );
      return true;
    }

    const deviceId = extractDeviceIdFromRequest(request);
    if (!deviceId) {
      throw new UnauthorizedException("Authentication required");
    }

    const hunters = await this.database.hunters
      .find({ deviceId, deletedAt: null })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("_id mergeStatus")
      .lean();

    const hunter =
      hunters.find((h) => (h.mergeStatus ?? "none") !== "pending") ??
      hunters[0];

    if (!hunter) {
      throw new UnauthorizedException("Authentication required");
    }

    if (hunters.length > 1) {
      this.logger.warn(
        `HunterResourceGuard deviceId duplicate docs count=${hunters.length} resolvedHunterId=${hunter._id.toString()}`,
      );
    }

    request.resolvedHunterId = hunter._id.toString();
    const devicePrefix =
      deviceId.length > 12 ? `${deviceId.slice(0, 8)}…` : deviceId;
    this.logger.log(
      `resolve hunter via=device devicePrefix=${devicePrefix} resolvedHunterId=${request.resolvedHunterId}`,
    );
    return true;
  }
}
