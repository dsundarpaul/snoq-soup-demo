import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { UserType } from "@/database/schemas/refresh-token.schema";

export interface JwtPayload {
  sub: string;
  type: UserType;
  iat: number;
  exp: number;
}

export interface RequestUser {
  userId: string;
  type: UserType;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
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
      payload.type === UserType.MERCHANT &&
      "emailVerified" in user &&
      !user.emailVerified
    ) {
      throw new UnauthorizedException("Email verification required");
    }

    return {
      userId: payload.sub,
      type: payload.type,
      email: "email" in user ? (user.email ?? undefined) : undefined,
    };
  }
}
