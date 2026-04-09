import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { Admin, AdminSchema } from "../../database/schemas/admin.schema";
import {
  Merchant,
  MerchantSchema,
} from "../../database/schemas/merchant.schema";
import { Hunter, HunterSchema } from "../../database/schemas/hunter.schema";
import { Drop, DropSchema } from "../../database/schemas/drop.schema";
import { Voucher, VoucherSchema } from "../../database/schemas/voucher.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: Hunter.name, schema: HunterSchema },
      { name: Drop.name, schema: DropSchema },
      { name: Voucher.name, schema: VoucherSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
