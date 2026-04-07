import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HuntersService } from "./hunters.service";
import { HuntersController } from "./hunters.controller";
import { Hunter, HunterSchema } from "@/database/schemas/hunter.schema";
import { Voucher, VoucherSchema } from "@/database/schemas/voucher.schema";
import { Drop, DropSchema } from "@/database/schemas/drop.schema";
import {
  PromoCode,
  PromoCodeSchema,
} from "@/database/schemas/promo-code.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hunter.name, schema: HunterSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Drop.name, schema: DropSchema },
      { name: PromoCode.name, schema: PromoCodeSchema },
    ]),
  ],
  controllers: [HuntersController],
  providers: [HuntersService],
  exports: [HuntersService],
})
export class HuntersModule {}
