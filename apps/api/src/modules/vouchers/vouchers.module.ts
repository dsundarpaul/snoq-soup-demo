import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { VouchersService } from "./vouchers.service";
import { VouchersController } from "./vouchers.controller";
import { Voucher, VoucherSchema } from "../../database/schemas/voucher.schema";
import { Drop, DropSchema } from "../../database/schemas/drop.schema";
import {
  PromoCode,
  PromoCodeSchema,
} from "../../database/schemas/promo-code.schema";
import { Hunter, HunterSchema } from "../../database/schemas/hunter.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema },
      { name: Drop.name, schema: DropSchema },
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: Hunter.name, schema: HunterSchema },
    ]),
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
