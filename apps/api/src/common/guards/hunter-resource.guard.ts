import {
  CanActivate,
  ExecutionContext,
  Injectable,
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
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HunterRequest>();
    const user = request.user;

    if (user?.type === UserRole.HUNTER) {
      request.resolvedHunterId = user.userId;
      return true;
    }

    const deviceId = extractDeviceIdFromRequest(request);
    if (!deviceId) {
      throw new UnauthorizedException("Authentication required");
    }

    const hunter = await this.database.hunters
      .findOne({ deviceId, deletedAt: null })
      .select("_id")
      .lean();

    if (!hunter) {
      throw new UnauthorizedException("Authentication required");
    }

    request.resolvedHunterId = hunter._id.toString();
    return true;
  }
}
