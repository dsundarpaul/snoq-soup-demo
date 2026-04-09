import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MerchantsService } from "./merchants.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentUserType,
} from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { UpdateMerchantDto } from "./dto/request/update-merchant.dto";
import { GenerateScannerTokenDto } from "./dto/request/generate-scanner-token.dto";
import { MerchantResponseDto } from "./dto/response/merchant-response.dto";
import { MerchantPublicResponseDto } from "./dto/response/merchant-public-response.dto";
import { ScannerTokenResponseDto } from "./dto/response/scanner-token-response.dto";
import { MerchantStatsResponseDto } from "./dto/response/merchant-stats-response.dto";
import { MerchantAnalyticsResponseDto } from "./dto/response/merchant-analytics-response.dto";

@ApiTags("Merchants")
@Controller("merchants")
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current merchant profile" })
  @ApiResponse({ status: 200, type: MerchantResponseDto })
  async getMe(
    @CurrentUser() user: CurrentUserType,
  ): Promise<MerchantResponseDto> {
    return this.merchantsService.findById(user.userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update merchant profile" })
  @ApiResponse({ status: 200, type: MerchantResponseDto })
  async updateMe(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateMerchantDto,
  ): Promise<MerchantResponseDto> {
    return this.merchantsService.updateProfile(user.userId, dto);
  }

  @Patch("me/logo")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update merchant logo" })
  @ApiResponse({ status: 200, type: MerchantResponseDto })
  async updateLogo(
    @CurrentUser() user: CurrentUserType,
    @Body("logoUrl") logoUrl: string,
  ): Promise<MerchantResponseDto> {
    return this.merchantsService.updateLogo(user.userId, logoUrl);
  }

  @Post("me/scanner-token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate new scanner token" })
  @ApiResponse({ status: 201, type: ScannerTokenResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async generateScannerToken(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: GenerateScannerTokenDto,
  ): Promise<ScannerTokenResponseDto> {
    return this.merchantsService.generateScannerToken(
      user.userId,
      dto.expiresIn,
    );
  }

  @Get("me/scanner-token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current scanner token" })
  @ApiResponse({ status: 200, type: ScannerTokenResponseDto })
  async getScannerToken(
    @CurrentUser() user: CurrentUserType,
  ): Promise<ScannerTokenResponseDto | null> {
    return this.merchantsService.getScannerToken(user.userId);
  }

  @Put("me/redeemer-hunters/:hunterId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Link a hunter so they may redeem vouchers for your store",
  })
  @ApiResponse({ status: 200, description: "Hunter linked" })
  @HttpCode(HttpStatus.OK)
  async linkRedeemerHunter(
    @CurrentUser() user: CurrentUserType,
    @Param("hunterId") hunterId: string,
  ): Promise<{ success: boolean }> {
    await this.merchantsService.linkRedeemerHunter(user.userId, hunterId);
    return { success: true };
  }

  @Delete("me/redeemer-hunters/:hunterId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove redeemer link for a hunter" })
  @ApiResponse({ status: 200, description: "Link removed" })
  @HttpCode(HttpStatus.OK)
  async unlinkRedeemerHunter(
    @CurrentUser() user: CurrentUserType,
    @Param("hunterId") hunterId: string,
  ): Promise<{ success: boolean }> {
    await this.merchantsService.unlinkRedeemerHunter(user.userId, hunterId);
    return { success: true };
  }

  @Get(":username/public")
  @ApiOperation({ summary: "Get public merchant store page" })
  @ApiResponse({ status: 200, type: MerchantPublicResponseDto })
  async getPublicProfile(
    @Param("username") username: string,
  ): Promise<MerchantPublicResponseDto> {
    return this.merchantsService.findByUsername(username);
  }

  @Get("me/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get merchant drop statistics" })
  @ApiResponse({ status: 200, type: MerchantStatsResponseDto })
  async getStats(
    @CurrentUser() user: CurrentUserType,
  ): Promise<MerchantStatsResponseDto> {
    return this.merchantsService.getStats(user.userId);
  }

  @Get("me/analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get merchant time-series analytics" })
  @ApiResponse({ status: 200, type: MerchantAnalyticsResponseDto })
  async getAnalytics(
    @CurrentUser() user: CurrentUserType,
  ): Promise<MerchantAnalyticsResponseDto> {
    return this.merchantsService.getAnalytics(user.userId);
  }
}
