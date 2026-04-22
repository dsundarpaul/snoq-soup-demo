import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { ScannerService } from "./scanner.service";
import { ScannerValidationDto } from "./dto/response/scanner-validation.dto";
import { ValidateScannerDto } from "./dto/request/validate-scanner.dto";
import { RedeemByScannerDto } from "./dto/request/redeem-by-scanner.dto";
import { ScannerRedeemResultDto } from "./dto/response/scanner-redeem-result.dto";

@ApiTags("Scanner")
@Controller("scanner")
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post("validate")
  @Public()
  @ApiOperation({
    summary: "Validate scanner token",
    description:
      "Checks if a scanner token is valid and returns merchant info if valid. Token moved from URL to body for security.",
  })
  @ApiResponse({
    status: 200,
    type: ScannerValidationDto,
    description: "Validation result",
  })
  @ApiResponse({ status: 400, description: "Invalid token format" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async validateToken(
    @Body() dto: ValidateScannerDto,
  ): Promise<ScannerValidationDto> {
    return this.scannerService.validateToken(dto.token);
  }

  @Post("redeem")
  @Public()
  @ApiOperation({
    summary: "Redeem voucher using scanner",
    description:
      "Redeems a voucher using a valid scanner token. Token moved from URL to body for security.",
  })
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
    @Body() dto: RedeemByScannerDto,
  ): Promise<ScannerRedeemResultDto> {
    return this.scannerService.redeemVoucher(
      dto.scannerToken,
      dto.voucherId,
      dto.magicToken,
    );
  }
}
