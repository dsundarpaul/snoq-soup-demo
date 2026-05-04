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
  ApiHeader,
} from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { VouchersService } from "./vouchers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../common/guards/optional-jwt-auth.guard";
import { HunterResourceGuard } from "../../common/guards/hunter-resource.guard";
import { CurrentHunterId } from "../../common/decorators/current-hunter-id.decorator";
import {
  CurrentUser,
  CurrentUserType,
} from "../../common/decorators/current-user.decorator";
import { ClaimVoucherDto } from "./dto/request/claim-voucher.dto";
import { RedeemVoucherDto } from "./dto/request/redeem-voucher.dto";
import { SendEmailDto } from "./dto/request/send-email.dto";
import { SendWhatsAppDto } from "./dto/request/send-whatsapp.dto";
import { MerchantVoucherResponseDto } from "./dto/response/voucher-response.dto";
import { ClaimVoucherResponseDto } from "./dto/response/claim-voucher-response.dto";
import { VoucherDetailResponseDto } from "./dto/response/voucher-detail-response.dto";
import { RedeemResultDto } from "./dto/response/redeem-result.dto";
import {
  HunterVouchersBucketsDto,
  HunterVouchersPageDto,
} from "./dto/response/hunter-vouchers-buckets.dto";

@ApiTags("Vouchers")
@Controller()
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post("vouchers/claim")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Claim a voucher from a drop" })
  @ApiResponse({ status: 201, type: ClaimVoucherResponseDto })
  @ApiResponse({
    status: 400,
    description: "Invalid request or constraints not met",
  })
  @ApiResponse({ status: 409, description: "Already claimed by this hunter" })
  @HttpCode(HttpStatus.CREATED)
  async claim(
    @Req() req: Request,
    @Body() dto: ClaimVoucherDto,
  ): Promise<ClaimVoucherResponseDto> {
    return this.vouchersService.claim(req, dto);
  }

  @Post("vouchers/redeem")
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
    @CurrentUser() user: CurrentUserType,
  ): Promise<RedeemResultDto> {
    return this.vouchersService.redeem(
      dto,
      user.type as "merchant" | "scanner" | "hunter",
      user.userId,
    );
  }

  @Get("vouchers/magic/:token")
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: "Get voucher details by magic token (magic link)" })
  @ApiResponse({ status: 200, type: VoucherDetailResponseDto })
  @ApiResponse({ status: 404, description: "Voucher not found" })
  async findByMagicToken(
    @Param("token") token: string,
  ): Promise<VoucherDetailResponseDto> {
    return this.vouchersService.findByMagicToken(token);
  }

  @Post("vouchers/send-email")
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
      dto.magicToken,
    );
    return { success: true };
  }

  @Post("vouchers/send-whatsapp")
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
    @Body() dto: SendWhatsAppDto,
  ): Promise<{ success: boolean }> {
    await this.vouchersService.sendByWhatsApp(
      dto.voucherId,
      dto.phone,
      dto.magicLink,
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
    @Query("magicToken") magicToken: string,
  ): Promise<{ promoCode: string | null }> {
    const promoCode = await this.vouchersService.getPromoCode(
      voucherId,
      magicToken,
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
  @ApiResponse({ status: 200, type: [MerchantVoucherResponseDto] })
  async findByMerchant(
    @CurrentUser() user: CurrentUserType,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ): Promise<{
    vouchers: MerchantVoucherResponseDto[];
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
      status,
    );
  }

  @Get("hunters/me/vouchers")
  @UseGuards(OptionalJwtAuthGuard, HunterResourceGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Device-Id",
    required: false,
    description:
      "Used when no valid hunter JWT is sent; must match an existing hunter",
  })
  @ApiOperation({
    summary:
      "Hunter vouchers from JWT session or, when absent, from X-Device-Id",
  })
  @ApiQuery({ name: "unredeemedLimit", required: false, type: Number })
  @ApiQuery({ name: "redeemedLimit", required: false, type: Number })
  @ApiResponse({ status: 200, type: HunterVouchersBucketsDto })
  async findByHunter(
    @CurrentHunterId() hunterId: string,
    @Query("unredeemedLimit") unredeemedLimit?: string,
    @Query("redeemedLimit") redeemedLimit?: string,
  ): Promise<HunterVouchersBucketsDto> {
    const unredeemed = unredeemedLimit ? Number(unredeemedLimit) : undefined;
    const redeemed = redeemedLimit ? Number(redeemedLimit) : undefined;
    return this.vouchersService.findByHunter(
      hunterId,
      Number.isFinite(unredeemed) ? unredeemed : undefined,
      Number.isFinite(redeemed) ? redeemed : undefined,
    );
  }

  @Get("hunters/me/vouchers/list")
  @UseGuards(OptionalJwtAuthGuard, HunterResourceGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Device-Id",
    required: false,
    description:
      "Used when no valid hunter JWT is sent; must match an existing hunter",
  })
  @ApiOperation({
    summary: "Paginated hunter vouchers from JWT session or X-Device-Id",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["all", "unredeemed", "redeemed"],
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, type: HunterVouchersPageDto })
  async listByHunter(
    @CurrentHunterId() hunterId: string,
    @Query("status") status: "all" | "unredeemed" | "redeemed" = "all",
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ): Promise<HunterVouchersPageDto> {
    const normalized: "all" | "unredeemed" | "redeemed" =
      status === "unredeemed" || status === "redeemed" ? status : "all";
    return this.vouchersService.findByHunterPaginated(
      hunterId,
      normalized,
      Number(page),
      Number(limit),
    );
  }
}
