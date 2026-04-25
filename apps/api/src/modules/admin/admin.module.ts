import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { DropsModule } from "../drops/drops.module";
import { AuthModule } from "../auth/auth.module";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";

@Module({
  imports: [AuthModule, DropsModule, PromoCodesModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
