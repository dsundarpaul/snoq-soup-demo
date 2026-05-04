import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { config } from "../../../config/app.config";
import { AuthService } from "../auth.service";
import { UserRole } from "../../../common/enums/user-role.enum";
import {
  extractJwtFromCookieOrHeader,
  type JwtPayload,
} from "../jwt-auth-shared";

export interface RequestUser {
  userId: string;
  type: UserRole;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: config.jwt.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.authService.validateUser(payload.sub, payload.type);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.deletedAt) {
      throw new UnauthorizedException("Account has been deleted");
    }

    if (
      payload.type === UserRole.MERCHANT &&
      "emailVerified" in user &&
      !user.emailVerified
    ) {
      throw new UnauthorizedException("Email verification required");
    }

    if (
      payload.type === UserRole.MERCHANT &&
      "suspendedAt" in user &&
      user.suspendedAt != null
    ) {
      throw new UnauthorizedException("Account suspended");
    }

    return {
      userId: payload.sub,
      type: payload.type,
      email: "email" in user ? (user.email ?? undefined) : undefined,
    };
  }
}
