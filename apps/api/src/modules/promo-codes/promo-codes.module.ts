import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PromoCodesService } from "./promo-codes.service";
import { PromoCodesController } from "./promo-codes.controller";
import {
  PromoCode,
  PromoCodeSchema,
} from "../../database/schemas/promo-code.schema";
import { Drop, DropSchema } from "../../database/schemas/drop.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: Drop.name, schema: DropSchema },
    ]),
  ],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
