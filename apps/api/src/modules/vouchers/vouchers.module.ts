import { Module } from "@nestjs/common";
import { DropsModule } from "../drops/drops.module";
import { MailModule } from "../mail/mail.module";
import { HunterIdentityModule } from "../hunter-identity/hunter-identity.module";
import { VouchersService } from "./vouchers.service";
import { OptionalJwtAuthGuard } from "../../common/guards/optional-jwt-auth.guard";
import { HunterResourceGuard } from "../../common/guards/hunter-resource.guard";
import { VouchersController } from "./vouchers.controller";

@Module({
  imports: [MailModule, DropsModule, HunterIdentityModule],
  controllers: [VouchersController],
  providers: [VouchersService, OptionalJwtAuthGuard, HunterResourceGuard],
  exports: [VouchersService],
})
export class VouchersModule {}
