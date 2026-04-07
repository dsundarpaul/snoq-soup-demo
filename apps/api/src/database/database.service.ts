import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { Merchant } from "./schemas/merchant.schema";
import { Drop } from "./schemas/drop.schema";
import { Voucher } from "./schemas/voucher.schema";
import { Hunter } from "./schemas/hunter.schema";
import { Admin } from "./schemas/admin.schema";
import { PromoCode } from "./schemas/promo-code.schema";
import { RefreshToken } from "./schemas/refresh-token.schema";

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(Merchant.name) readonly merchants: Model<Merchant>,
    @InjectModel(Drop.name) readonly drops: Model<Drop>,
    @InjectModel(Voucher.name) readonly vouchers: Model<Voucher>,
    @InjectModel(Hunter.name) readonly hunters: Model<Hunter>,
    @InjectModel(Admin.name) readonly admins: Model<Admin>,
    @InjectModel(PromoCode.name) readonly promoCodes: Model<PromoCode>,
    @InjectModel(RefreshToken.name) readonly refreshTokens: Model<RefreshToken>,
  ) {}
}
