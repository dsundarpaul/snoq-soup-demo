import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

import { UserRole } from "./roles.decorator";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  type: UserRole;
  deviceId?: string;
}

export type CurrentUserType = AuthenticatedUser;

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data] ?? null;
    }

    return user;
  },
);
