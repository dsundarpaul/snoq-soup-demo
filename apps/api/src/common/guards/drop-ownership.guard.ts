import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Types } from "mongoose";
import { DatabaseService } from "../../database/database.service";
import { UserRole } from "../decorators/roles.decorator";

export const DROP_ID_PARAM_KEY = "dropIdParam";

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    type: UserRole;
  };
}

@Injectable()
export class DropOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user!;

    if (user.type === "admin") {
      return true;
    }

    const paramName =
      this.reflector.getAllAndOverride<string>(DROP_ID_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "dropId";

    const dropId = request.params[paramName];

    const drop = await this.database.drops.findOne({
      _id: new Types.ObjectId(dropId),
      merchantId: new Types.ObjectId(user.userId),
    });

    if (
      !drop ||
      drop.deletedAt ||
      drop.merchantId?.toString() !== user.userId
    ) {
      throw new NotFoundException("Drop not found or access denied");
    }

    return true;
  }
}
