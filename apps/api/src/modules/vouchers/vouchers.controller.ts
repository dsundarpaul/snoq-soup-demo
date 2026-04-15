import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { VouchersService } from "./vouchers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import {
  CurrentUser,
  CurrentUserType,
} from "../../common/decorators/current-user.decorator";
import { DeviceId } from "../../common/decorators/device-id.decorator";
import { ClaimVoucherDto } from "./dto/request/claim-voucher.dto";
import { RedeemVoucherDto } from "./dto/request/redeem-voucher.dto";
import { SendEmailDto } from "./dto/request/send-email.dto";
import { SendWhatsAppDto } from "./dto/request/send-whatsapp.dto";
import { VoucherResponseDto } from "./dto/response/voucher-response.dto";
import { VoucherDetailResponseDto } from "./dto/response/voucher-detail-response.dto";
import { RedeemResultDto } from "./dto/response/redeem-result.dto";
import { HunterVouchersBucketsDto } from "./dto/response/hunter-vouchers-buckets.dto";
import { Audit } from "../audit/audit.decorator";

@ApiTags("Vouchers")
@Controller()
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post("vouchers/claim")
  @Audit("vouchers.claim")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for claims
  @ApiOperation({ summary: "Claim a voucher from a drop" })
  @ApiResponse({ status: 201, type: VoucherResponseDto })
  @ApiResponse({
    status: 400,
    description: "Invalid request or constraints not met",
  })
  @ApiResponse({ status: 409, description: "Already claimed by this hunter" })
  @HttpCode(HttpStatus.CREATED)
  async claim(
    @Body() dto: ClaimVoucherDto,
    @DeviceId() deviceId: string,
    @Req() req: Request & { hunterId?: string }
  ): Promise<VoucherResponseDto> {
    return this.vouchersService.claim({
      ...dto,
      deviceId,
      deviceResolvedHunterId: req.hunterId,
    });
  }

  @Post("vouchers/redeem")
  @Audit("vouchers.redeem")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("merchant", "scanner", "hunter")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Redeem a voucher (merchant or scanner only)" })
  @ApiResponse({ status: 200, type: RedeemResultDto })
  @ApiResponse({
    status: 400,
    description: "Voucher already redeemed or constraints not met",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - redemption constraints violated",
  })
  @HttpCode(HttpStatus.OK)
  async redeem(
    @Body() dto: RedeemVoucherDto,
    @CurrentUser() user: CurrentUserType
  ): Promise<RedeemResultDto> {
    return this.vouchersService.redeem(
      dto,
      user.type as "merchant" | "scanner" | "hunter",
      user.userId
    );
  }

  @Get("vouchers/magic/:token")
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: "Get voucher details by magic token (magic link)" })
  @ApiResponse({ status: 200, type: VoucherDetailResponseDto })
  @ApiResponse({ status: 404, description: "Voucher not found" })
  async findByMagicToken(
    @Param("token") token: string
  ): Promise<VoucherDetailResponseDto> {
    return this.vouchersService.findByMagicToken(token);
  }

  @Post("vouchers/send-email")
  @Audit("vouchers.send_email")
  @Public()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send voucher via email" })
  @ApiResponse({ status: 200, description: "Email sent successfully" })
  @ApiResponse({ status: 404, description: "Voucher not found" })
  @HttpCode(HttpStatus.OK)
  async sendByEmail(@Body() dto: SendEmailDto): Promise<{ success: boolean }> {
    await this.vouchersService.sendByEmail(
      dto.voucherId,
      dto.email,
      dto.magicLink,
      dto.magicToken
    );
    return { success: true };
  }

  @Post("vouchers/send-whatsapp")
  @Audit("vouchers.send_whatsapp")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send voucher via WhatsApp" })
  @ApiResponse({
    status: 200,
    description: "WhatsApp message sent successfully",
  })
  @ApiResponse({ status: 404, description: "Voucher not found" })
  @HttpCode(HttpStatus.OK)
  async sendByWhatsApp(
    @Body() dto: SendWhatsAppDto
  ): Promise<{ success: boolean }> {
    await this.vouchersService.sendByWhatsApp(
      dto.voucherId,
      dto.phone,
      dto.magicLink
    );
    return { success: true };
  }

  @Get("vouchers/:id/promo-code")
  @ApiOperation({
    summary: "Get promo code for a voucher (requires magic token)",
  })
  @ApiQuery({
    name: "magicToken",
    required: true,
    description: "Magic token for voucher access",
  })
  @ApiResponse({ status: 200, description: "Returns promo code" })
  @ApiResponse({ status: 404, description: "Voucher or promo code not found" })
  async getPromoCode(
    @Param("id") voucherId: string,
    @Query("magicToken") magicToken: string
  ): Promise<{ promoCode: string | null }> {
    const promoCode = await this.vouchersService.getPromoCode(
      voucherId,
      magicToken
    );
    return { promoCode };
  }

  @Get("merchants/me/vouchers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("merchant")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current merchant's vouchers (paginated)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["all", "active", "redeemed"],
  })
  @ApiResponse({ status: 200, type: [VoucherResponseDto] })
  async findByMerchant(
    @CurrentUser() user: CurrentUserType,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("search") search?: string,
    @Query("status") status?: string
  ): Promise<{
    vouchers: VoucherResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.vouchersService.findByMerchant(
      user.userId,
      Number(page),
      Number(limit),
      search?.trim(),
      status
    );
  }

  @Get("hunters/me/vouchers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("hunter")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current hunter's vouchers (unredeemed and redeemed)",
  })
  @ApiResponse({ status: 200, type: HunterVouchersBucketsDto })
  async findByHunter(
    @CurrentUser() user: CurrentUserType
  ): Promise<HunterVouchersBucketsDto> {
    return this.vouchersService.findByHunter(user.userId);
  }
}
