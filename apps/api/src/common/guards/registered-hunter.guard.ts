import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";

import { DatabaseService } from "../../database/database.service";

@Injectable()
export class RegisteredHunterGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId: string } }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Registration required");
    }

    const hunter = await this.database.hunters
      .findOne({ _id: userId, deletedAt: null })
      .select("email")
      .lean();

    const email = hunter?.email?.trim();
    if (!email) {
      throw new ForbiddenException("Registration required");
    }

    return true;
  }
}
