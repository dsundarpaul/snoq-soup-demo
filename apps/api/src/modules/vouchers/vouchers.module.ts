import { Module } from "@nestjs/common";
import { DropsModule } from "../drops/drops.module";
import { MailModule } from "../mail/mail.module";
import { VouchersService } from "./vouchers.service";
import { VouchersController } from "./vouchers.controller";

@Module({
  imports: [MailModule, DropsModule],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
