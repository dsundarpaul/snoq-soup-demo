import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MerchantsService } from "./merchants.service";
import { MerchantsController } from "./merchants.controller";
import { DatabaseModule } from "../../database/database.module";
import { DropsModule } from "../drops/drops.module";
import {
  Merchant,
  MerchantSchema,
} from "../../database/schemas/merchant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    DatabaseModule,
    DropsModule,
  ],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
