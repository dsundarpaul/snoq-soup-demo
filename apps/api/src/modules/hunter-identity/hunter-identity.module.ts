import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "../../database/database.module";
import { config } from "../../config/app.config";
import { HunterIdentityResolverService } from "./hunter-identity-resolver.service";
import { LoggedInHunterClaimStrategy } from "./logged-in-hunter-claim.strategy";
import { AnonymousHunterClaimStrategy } from "./anonymous-hunter-claim.strategy";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: config.jwt.secret,
        signOptions: {
          expiresIn: config.jwt.expiresIn,
        },
      }),
    }),
  ],
  providers: [
    LoggedInHunterClaimStrategy,
    AnonymousHunterClaimStrategy,
    HunterIdentityResolverService,
  ],
  exports: [HunterIdentityResolverService],
})
export class HunterIdentityModule {}
