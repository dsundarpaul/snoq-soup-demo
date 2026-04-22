import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { config } from "../../../config/app.config";
import { AuthService } from "../auth.service";
import { UserRole } from "../../../common/enums/user-role.enum";

export interface JwtPayload {
  sub: string;
  type: UserRole;
  iat: number;
  exp: number;
}

export interface RequestUser {
  userId: string;
  type: UserRole;
  email?: string;
}

const COOKIE_NAME = "access_token";

export function extractJwtFromCookieOrHeader(req: Request): string | null {
  // First, try cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }
  // Fall back to Authorization header
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
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

    // Check email verification for merchants
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
