import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { Request } from "express";

import { LoggedInHunterClaimStrategy } from "./logged-in-hunter-claim.strategy";
import { AnonymousHunterClaimStrategy } from "./anonymous-hunter-claim.strategy";
import type { HunterClaimIdentity } from "./hunter-identity.types";
import { extractJwtFromCookieOrHeader } from "../auth/jwt-auth-shared";

@Injectable()
export class HunterIdentityResolverService {
  private readonly logger = new Logger(HunterIdentityResolverService.name);

  constructor(
    private readonly loggedInClaimStrategy: LoggedInHunterClaimStrategy,
    private readonly anonymousClaimStrategy: AnonymousHunterClaimStrategy,
  ) {}

  async resolvePublicClaimIdentity(
    req: Request,
    dto: { deviceId: string; hunterId?: string },
  ): Promise<HunterClaimIdentity> {
    const rawDevicePrefix =
      dto.deviceId.length > 12 ? `${dto.deviceId.slice(0, 8)}…` : dto.deviceId;
    this.logger.log(
      `resolvePublicClaimIdentity enter devicePrefix=${rawDevicePrefix} hasCookie=${Boolean(extractJwtFromCookieOrHeader(req))}`,
    );

    const jwtIdentity =
      await this.loggedInClaimStrategy.tryResolveForPublicClaim(req, dto);
    if (jwtIdentity !== null) {
      return jwtIdentity;
    }

    const identity = await this.anonymousClaimStrategy.resolveByDeviceId(
      dto.deviceId,
    );
    if (
      dto.hunterId?.trim() &&
      dto.hunterId.trim() !== identity.hunterObjectId.toString()
    ) {
      throw new BadRequestException("Hunter ID does not match device");
    }
    this.logger.log(
      `resolvePublicClaimIdentity outcome source=device hunterId=${identity.hunterObjectId.toString()}`,
    );
    return identity;
  }
}
