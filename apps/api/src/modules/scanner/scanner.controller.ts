import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { ScannerService } from "./scanner.service";
import { ScannerValidationDto } from "./dto/response/scanner-validation.dto";
import { RedeemByScannerDto } from "./dto/request/redeem-by-scanner.dto";
import { ScannerRedeemResultDto } from "./dto/response/scanner-redeem-result.dto";
import { Audit } from "../audit/audit.decorator";

@ApiTags("Scanner")
@Controller("scanner")
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get(":token/validate")
  @Public()
  @ApiOperation({
    summary: "Validate scanner token",
    description:
      "Checks if a scanner token is valid and returns merchant info if valid",
  })
  @ApiParam({
    name: "token",
    description: "Scanner token to validate",
    type: String,
  })
  @ApiResponse({
    status: 200,
    type: ScannerValidationDto,
    description: "Validation result",
  })
  @ApiResponse({ status: 400, description: "Invalid token format" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async validateToken(
    @Param("token") token: string,
  ): Promise<ScannerValidationDto> {
    return this.scannerService.validateToken(token);
  }

  @Post(":token/redeem")
  @Audit("scanner.redeem")
  @Public()
  @ApiOperation({
    summary: "Redeem voucher using scanner",
    description: "Redeems a voucher using a valid scanner token",
  })
  @ApiParam({ name: "token", description: "Scanner token", type: String })
  @ApiResponse({
    status: 200,
    type: ScannerRedeemResultDto,
    description: "Redemption result",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid voucher ID or magic token",
  })
  @ApiResponse({ status: 403, description: "Invalid or expired scanner token" })
  @ApiResponse({ status: 404, description: "Voucher not found" })
  @ApiResponse({
    status: 409,
    description: "Voucher already redeemed or not claimed",
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async redeemVoucher(
    @Param("token") token: string,
    @Body() dto: RedeemByScannerDto,
  ): Promise<ScannerRedeemResultDto> {
    return this.scannerService.redeemVoucher(
      token,
      dto.voucherId,
      dto.magicToken,
    );
  }
}
