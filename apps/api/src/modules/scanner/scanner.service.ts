import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { DatabaseService } from "@/database/database.service";
import { MerchantDocument } from "@/database/schemas/merchant.schema";
import { VouchersService } from "../vouchers/vouchers.service";
import {
  ScannerValidationDto,
  MerchantInfoDto,
} from "./dto/response/scanner-validation.dto";
import { ScannerRedeemResultDto } from "./dto/response/scanner-redeem-result.dto";
import { RedeemVoucherDto } from "../vouchers/dto/request/redeem-voucher.dto";

@Injectable()
export class ScannerService {
  constructor(
    private readonly database: DatabaseService,
    private vouchersService: VouchersService,
  ) {}

  async validateToken(token: string): Promise<ScannerValidationDto> {
    if (!token || token.length < 32) {
      return {
        valid: false,
        merchant: null,
        expiresAt: null,
        message: "Invalid token format",
      };
    }

    const merchant = await this.database.merchants.findOne({
      "scannerToken.token": token,
      deletedAt: null,
    });

    if (!merchant) {
      return {
        valid: false,
        merchant: null,
        expiresAt: null,
        message: "Invalid scanner token",
      };
    }

    const expiresAt = merchant.scannerToken?.createdAt
      ? new Date(
          new Date(merchant.scannerToken.createdAt).getTime() +
            24 * 60 * 60 * 1000,
        )
      : null;

    if (expiresAt && new Date() > expiresAt) {
      return {
        valid: false,
        merchant: null,
        expiresAt,
        message: "Scanner token has expired",
      };
    }

    // Type-safe refactor: safely convert ObjectId to string with null check
    const merchantIdStr = merchant._id?.toString() ?? "";

    const merchantInfo: MerchantInfoDto = {
      id: merchantIdStr,
      businessName: merchant.businessName,
      username: merchant.username,
      logoUrl: merchant.logoUrl || null,
    };

    return {
      valid: true,
      merchant: merchantInfo,
      expiresAt,
      message: "Token is valid",
    };
  }

  async getMerchantByScannerToken(
    token: string,
  ): Promise<MerchantDocument | null> {
    if (!token || token.length < 32) {
      return null;
    }

    return this.database.merchants.findOne({
      "scannerToken.token": token,
      deletedAt: null,
    });
  }

  async redeemVoucher(
    token: string,
    voucherId: string,
    magicToken: string,
  ): Promise<ScannerRedeemResultDto> {
    const validation = await this.validateToken(token);

    if (!validation.valid) {
      throw new ForbiddenException(validation.message);
    }

    if (!Types.ObjectId.isValid(voucherId)) {
      throw new BadRequestException("Invalid voucher ID");
    }

    const merchant = await this.getMerchantByScannerToken(token);
    if (!merchant) {
      throw new ForbiddenException("Invalid scanner token");
    }

    const voucher = await this.database.vouchers.findOne({
      _id: new Types.ObjectId(voucherId),
      magicToken,
      deletedAt: null,
    });

    if (!voucher) {
      throw new NotFoundException("Voucher not found");
    }

    // Type-safe refactor: safely convert ObjectIds to strings
    const voucherMerchantId = voucher.merchantId?.toString() ?? "";
    const merchantIdStr = merchant._id?.toString() ?? "";

    if (voucherMerchantId !== merchantIdStr) {
      throw new ForbiddenException("Voucher does not belong to this merchant");
    }

    const redeemDto: RedeemVoucherDto = {
      voucherId,
      magicToken,
    };

    const result = await this.vouchersService.redeem(
      redeemDto,
      "scanner",
      merchantIdStr,
    );

    return {
      success: result.success,
      voucherId: result.voucherId,
      magicToken,
      redeemedAt: result.redeemedAt,
      message: result.message,
      voucher: result.dropName
        ? {
            dropName: result.dropName,
            rewardValue: "", // Will be populated if needed from drop data
          }
        : null,
    };
  }
}
