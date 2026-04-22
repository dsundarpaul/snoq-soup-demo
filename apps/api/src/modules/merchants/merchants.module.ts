import { Module } from "@nestjs/common";
import { MerchantsService } from "./merchants.service";
import { MerchantsController } from "./merchants.controller";
import { DatabaseModule } from "../../database/database.module";
import { DropsModule } from "../drops/drops.module";

@Module({
  imports: [DatabaseModule, DropsModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
