import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { config } from "../../config/app.config";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { DatabaseModule } from "../../database/database.module";
import { MailModule } from "../mail/mail.module";
import { EmailVerificationTokenService } from "./email-verification-token.service";
import { EmailVerificationCleanupService } from "./email-verification-cleanup.service";

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: {
        expiresIn: "15m",
      },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EmailVerificationTokenService,
    EmailVerificationCleanupService,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
