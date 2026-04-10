import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { config } from "../config/app.config";
import { DatabaseService } from "./database.service";

import { Merchant, MerchantSchema } from "./schemas/merchant.schema";
import { Drop, DropSchema } from "./schemas/drop.schema";
import { Voucher, VoucherSchema } from "./schemas/voucher.schema";
import { Hunter, HunterSchema } from "./schemas/hunter.schema";
import { Admin, AdminSchema } from "./schemas/admin.schema";
import { PromoCode, PromoCodeSchema } from "./schemas/promo-code.schema";
import {
  RefreshToken,
  RefreshTokenSchema,
} from "./schemas/refresh-token.schema";
import {
  EmailVerificationToken,
  EmailVerificationTokenSchema,
} from "./schemas/email-verification-token.schema";

@Global()
@Module({
  imports: [
    MongooseModule.forRoot(config.database.uri),
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Drop.name, schema: DropSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Hunter.name, schema: HunterSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      {
        name: EmailVerificationToken.name,
        schema: EmailVerificationTokenSchema,
      },
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
