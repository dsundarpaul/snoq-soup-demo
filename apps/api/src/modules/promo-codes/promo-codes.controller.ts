import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { PromoCodesService } from "./promo-codes.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentUserType,
} from "@/common/decorators/current-user.decorator";
import { UserRole } from "@/common/enums/user-role.enum";
import { CreatePromoCodeDto } from "./dto/request/create-promo-code.dto";
import { BulkCreatePromoCodesDto } from "./dto/request/bulk-create-promo-codes.dto";
import { PromoCodeResponseDto } from "./dto/response/promo-code-response.dto";
import {
  PromoCodeListDto,
  PromoCodeStatsDto,
} from "./dto/response/promo-code-list.dto";
import { PromoCodeStatus } from "@/database/schemas/promo-code.schema";

@ApiTags("Promo Codes")
@Controller("merchants/me/drops/:dropId/codes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT)
@ApiBearerAuth()
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post()
  @ApiOperation({ summary: "Create single promo code for a drop" })
  @ApiResponse({ status: 201, type: PromoCodeResponseDto })
  @ApiResponse({ status: 404, description: "Drop not found" })
  @ApiResponse({ status: 409, description: "Promo code already exists" })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserType,
    @Param("dropId") dropId: string,
    @Body() dto: CreatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    return this.promoCodesService.create(user.userId, dropId, dto);
  }

  @Post("bulk")
  @ApiOperation({ summary: "Bulk create promo codes for a drop" })
  @ApiResponse({ status: 201, type: [PromoCodeResponseDto] })
  @ApiResponse({ status: 400, description: "Duplicate codes in request" })
  @ApiResponse({ status: 404, description: "Drop not found" })
  @ApiResponse({ status: 409, description: "Some codes already exist" })
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(
    @CurrentUser() user: CurrentUserType,
    @Param("dropId") dropId: string,
    @Body() dto: BulkCreatePromoCodesDto,
  ): Promise<PromoCodeResponseDto[]> {
    return this.promoCodesService.bulkCreate(user.userId, dropId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List promo codes for a drop with optional status filter",
  })
  @ApiResponse({ status: 200, type: PromoCodeListDto })
  @ApiQuery({
    name: "status",
    enum: PromoCodeStatus,
    required: false,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "page",
    type: Number,
    required: false,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    type: Number,
    required: false,
    description: "Items per page",
  })
  async findByDrop(
    @CurrentUser() user: CurrentUserType,
    @Param("dropId") dropId: string,
    @Query("status") status?: PromoCodeStatus,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ): Promise<PromoCodeListDto> {
    return this.promoCodesService.findByDrop(
      dropId,
      user.userId,
      status,
      page,
      limit,
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "Get promo code statistics for a drop" })
  @ApiResponse({ status: 200, type: PromoCodeStatsDto })
  async getStats(
    @CurrentUser() user: CurrentUserType,
    @Param("dropId") dropId: string,
  ): Promise<PromoCodeStatsDto> {
    return this.promoCodesService.getStats(dropId, user.userId);
  }

  @Delete()
  @ApiOperation({
    summary: "Delete all unused (available) promo codes for a drop",
  })
  @ApiResponse({ status: 200, description: "Unused promo codes deleted" })
  @ApiResponse({ status: 404, description: "Drop not found" })
  async deleteByDrop(
    @CurrentUser() user: CurrentUserType,
    @Param("dropId") dropId: string,
  ): Promise<{ deletedCount: number }> {
    return this.promoCodesService.deleteByDrop(dropId, user.userId);
  }
}
