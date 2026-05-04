import { ExtractJwt } from "passport-jwt";
import { Request } from "express";

import { UserRole } from "../../common/enums/user-role.enum";

export interface JwtPayload {
  sub: string;
  type: UserRole;
  iat: number;
  exp: number;
}

const COOKIE_NAME = "access_token";

export function extractJwtFromCookieOrHeader(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}
