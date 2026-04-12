import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { DropsService } from "./drops.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentUserType,
} from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { CreateDropDto } from "./dto/request/create-drop.dto";
import { UpdateDropDto } from "./dto/request/update-drop.dto";
import { DropResponseDto } from "./dto/response/drop-response.dto";
import { DropDetailResponseDto } from "./dto/response/drop-detail-response.dto";
import { ActiveDropsResponseDto } from "./dto/response/active-drops-response.dto";

@ApiTags("Drops")
@Controller()
export class DropsController {
  constructor(private readonly dropsService: DropsService) {}

  // Public endpoints
  @Get("drops/active")
  @SkipThrottle({ default: true, strict: true })
  @ApiOperation({ summary: "List all active drops" })
  @ApiResponse({ status: 200, type: ActiveDropsResponseDto })
  async findActive(): Promise<ActiveDropsResponseDto> {
    return this.dropsService.findAllActive();
  }

  @Get("drops/:id")
  @ApiOperation({ summary: "Get public drop detail" })
  @ApiResponse({ status: 200, type: DropDetailResponseDto })
  async getPublicDrop(
    @Param("id") id: string,
    @Query("lat") lat?: number,
    @Query("lng") lng?: number,
  ): Promise<DropDetailResponseDto> {
    return this.dropsService.getDetailWithAvailability(
      id,
      lat ? parseFloat(String(lat)) : undefined,
      lng ? parseFloat(String(lng)) : undefined,
    );
  }

  // Merchant-scoped endpoints
  @Get("merchants/me/drops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get merchant drops" })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiQuery({
    name: "search",
    type: String,
    required: false,
    description: "Filter by drop name or reward (case-insensitive)",
  })
  @ApiQuery({
    name: "status",
    type: String,
    required: false,
    description: "all | active | inactive | scheduled | expired",
  })
  @ApiResponse({ status: 200, type: [DropResponseDto] })
  async getMyDrops(
    @CurrentUser() user: CurrentUserType,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.dropsService.findByMerchant(
      user.userId,
      page,
      limit,
      search,
      status,
    );
  }

  @Post("merchants/me/drops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create new drop" })
  @ApiResponse({ status: 201, type: DropResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async createDrop(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateDropDto,
  ): Promise<DropResponseDto> {
    return this.dropsService.create(user.userId, dto);
  }

  @Patch("merchants/me/drops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update drop" })
  @ApiResponse({ status: 200, type: DropResponseDto })
  async updateDrop(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body() dto: UpdateDropDto,
  ): Promise<DropResponseDto> {
    return this.dropsService.update(id, user.userId, dto);
  }

  @Delete("merchants/me/drops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete drop (soft delete)" })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDrop(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
  ): Promise<void> {
    return this.dropsService.delete(id, user.userId);
  }
}
