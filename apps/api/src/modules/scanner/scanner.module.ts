import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScannerService } from "./scanner.service";
import { ScannerController } from "./scanner.controller";
import {
  Merchant,
  MerchantSchema,
} from "../../database/schemas/merchant.schema";
import { Voucher, VoucherSchema } from "../../database/schemas/voucher.schema";
import { Drop, DropSchema } from "../../database/schemas/drop.schema";
import { VouchersModule } from "../vouchers/vouchers.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Drop.name, schema: DropSchema },
    ]),
    VouchersModule,
  ],
  controllers: [ScannerController],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
