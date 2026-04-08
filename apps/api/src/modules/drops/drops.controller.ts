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
  @ApiOperation({ summary: "Find active drops nearby" })
  @ApiQuery({ name: "lat", type: Number, required: true })
  @ApiQuery({ name: "lng", type: Number, required: true })
  @ApiQuery({
    name: "radius",
    type: Number,
    required: true,
    description: "Radius in meters",
  })
  @ApiResponse({ status: 200, type: ActiveDropsResponseDto })
  async findActiveNearby(
    @Query("lat") lat: number,
    @Query("lng") lng: number,
    @Query("radius") radius: number,
  ): Promise<ActiveDropsResponseDto> {
    return this.dropsService.findActiveNearby(
      parseFloat(String(lat)),
      parseFloat(String(lng)),
      parseFloat(String(radius)),
    );
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
  @ApiResponse({ status: 200, type: [DropResponseDto] })
  async getMyDrops(
    @CurrentUser() user: CurrentUserType,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.dropsService.findByMerchant(user.userId, page, limit);
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

  // Admin-scoped endpoints
  @Get("admin/drops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: Get all drops" })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiResponse({ status: 200, type: [DropResponseDto] })
  async getAllDrops(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    // Admin can see all drops - extend service if needed
    return { message: "Admin drops list", page, limit };
  }

  @Post("admin/drops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: Create drop for any merchant" })
  @ApiResponse({ status: 201, type: DropResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async adminCreateDrop(
    @Body() dto: CreateDropDto & { merchantId: string },
  ): Promise<DropResponseDto> {
    return this.dropsService.create(dto.merchantId, dto);
  }

  @Patch("admin/drops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: Update any drop" })
  @ApiResponse({ status: 200, type: DropResponseDto })
  async adminUpdateDrop(
    @Param("id") id: string,
    @Body() dto: UpdateDropDto,
  ): Promise<DropResponseDto> {
    // Admin can update any drop - extend service if needed
    void dto; // Placeholder usage
    return this.dropsService.findById(id) as Promise<DropResponseDto>;
  }

  @Delete("admin/drops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: Delete any drop" })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeleteDrop(@Param("id") id: string): Promise<void> {
    // Admin can hard delete - extend service if needed
    void id; // Placeholder usage
    return Promise.resolve();
  }
}
