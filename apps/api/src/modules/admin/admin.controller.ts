import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import {
  AdminService,
  MerchantQuery,
  UserQuery,
  DropQuery,
} from "./admin.service";
import { UpdateMerchantAdminDto } from "./dto/request/update-merchant-admin.dto";
import { AdminStatsDto } from "./dto/response/admin-stats.dto";
import { AdminAnalyticsDto } from "./dto/response/admin-analytics.dto";
import {
  MerchantListDto,
  MerchantListItemDto,
} from "./dto/response/merchant-list.dto";
import { UserListDto } from "./dto/response/user-list.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { csvAttachmentFilename } from "../../common/utils/csv";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get platform statistics",
    description: "Returns platform-wide statistics",
  })
  @ApiResponse({ status: 200, type: AdminStatsDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getPlatformStats();
  }

  @Get("analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get platform analytics",
    description: "Returns time-series data for charts",
  })
  @ApiResponse({ status: 200, type: AdminAnalyticsDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of days to analyze",
  })
  @ApiQuery({
    name: "granularity",
    required: false,
    enum: ["hourly", "daily", "weekly", "monthly"],
  })
  async getAnalytics(
    @Query("days") days?: string,
    @Query("granularity")
    granularity?: "hourly" | "daily" | "weekly" | "monthly",
  ): Promise<AdminAnalyticsDto> {
    return this.adminService.getPlatformAnalytics(
      days ? parseInt(days, 10) : 30,
      granularity || "daily",
    );
  }

  @Get("merchants")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List all merchants",
    description: "Returns paginated list of merchants with filters",
  })
  @ApiResponse({ status: 200, type: MerchantListDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "isVerified", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false, type: String })
  async findAllMerchants(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("isVerified") isVerified?: string,
    @Query("search") search?: string,
  ): Promise<MerchantListDto> {
    const query: MerchantQuery = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    };
    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }
    return this.adminService.findAllMerchants(query);
  }

  @Get("merchants/export")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Export merchants as CSV",
    description:
      "Returns all merchants matching the same filters as the list endpoint (no pagination).",
  })
  @ApiQuery({ name: "isVerified", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "CSV file" })
  async exportMerchantsCsv(
    @Res() res: Response,
    @Query("isVerified") isVerified?: string,
    @Query("search") search?: string,
  ): Promise<void> {
    const trimmed = search?.trim();
    const body = await this.adminService.merchantsCsv({
      search: trimmed || undefined,
      isVerified: isVerified === undefined ? undefined : isVerified === "true",
    });
    const filename = csvAttachmentFilename("merchants");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Patch("merchants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update merchant",
    description: "Admin override to update any merchant",
  })
  @ApiResponse({ status: 200, type: MerchantListItemDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Merchant not found" })
  @ApiResponse({ status: 409, description: "Username already taken" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  async updateMerchant(
    @Param("id") id: string,
    @Body() dto: UpdateMerchantAdminDto,
  ): Promise<MerchantListItemDto> {
    return this.adminService.updateMerchant(id, dto);
  }

  @Get("users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List all users",
    description: "Returns paginated list of hunters with stats",
  })
  @ApiResponse({ status: 200, type: UserListDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "minClaims", required: false, type: Number })
  async findAllUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("minClaims") minClaims?: string,
  ): Promise<UserListDto> {
    const query: UserQuery = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    };
    if (minClaims !== undefined) {
      query.minClaims = parseInt(minClaims, 10);
    }
    return this.adminService.findAllUsers(query);
  }

  @Get("users/export")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Export treasure hunters as CSV",
    description:
      "Returns all users matching the same filters as the list endpoint (no pagination).",
  })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "minClaims", required: false, type: Number })
  @ApiResponse({ status: 200, description: "CSV file" })
  async exportUsersCsv(
    @Res() res: Response,
    @Query("search") search?: string,
    @Query("minClaims") minClaims?: string,
  ): Promise<void> {
    const trimmed = search?.trim();
    const parsed =
      minClaims !== undefined ? parseInt(minClaims, 10) : undefined;
    const body = await this.adminService.usersCsv({
      search: trimmed || undefined,
      minClaims:
        parsed !== undefined && Number.isFinite(parsed) && parsed > 0
          ? parsed
          : undefined,
    });
    const filename = csvAttachmentFilename("treasure-hunters");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Get("drops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List all drops",
    description: "Admin view of all drops with filters",
  })
  @ApiResponse({ status: 200, description: "List of drops" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "merchantId", required: false, type: String })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "all | active | inactive | scheduled | expired",
  })
  async findAllDrops(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("merchantId") merchantId?: string,
    @Query("active") active?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ): Promise<any> {
    const query: DropQuery = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      merchantId,
      search,
      status,
    };
    if (active !== undefined) {
      query.active = active === "true";
    }
    return this.adminService.findAllDrops(query);
  }

  @Get("drops/export")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Export drops as CSV",
    description:
      "Returns all drops matching the same filters as the list endpoint (no pagination).",
  })
  @ApiQuery({ name: "merchantId", required: false, type: String })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "all | active | inactive | scheduled | expired",
  })
  @ApiResponse({ status: 200, description: "CSV file" })
  async exportDropsCsv(
    @Res() res: Response,
    @Query("merchantId") merchantId?: string,
    @Query("active") active?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ): Promise<void> {
    const trimmed = search?.trim();
    const body = await this.adminService.dropsCsv({
      merchantId: merchantId?.trim() || undefined,
      search: trimmed || undefined,
      status,
      active:
        active === undefined ? undefined : active === "true" ? true : false,
    });
    const filename = csvAttachmentFilename("drops");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Post("drops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create drop as admin",
    description: "Create a drop for any merchant",
  })
  @ApiResponse({ status: 201, description: "Drop created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Merchant not found" })
  @HttpCode(HttpStatus.CREATED)
  async createDropAsAdmin(@Body() dto: any) {
    return this.adminService.createDropAsAdmin(dto);
  }

  @Patch("drops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update drop as admin",
    description: "Edit any drop",
  })
  @ApiResponse({ status: 200, description: "Drop updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Drop not found" })
  async updateDropAsAdmin(@Param("id") id: string, @Body() dto: any) {
    return this.adminService.updateDropAsAdmin(id, dto);
  }

  @Delete("drops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete drop as admin",
    description: "Soft delete any drop",
  })
  @ApiResponse({ status: 200, description: "Drop deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Drop not found" })
  async deleteDropAsAdmin(
    @Param("id") id: string,
  ): Promise<{ id: string; deletedAt: Date | null }> {
    return this.adminService.deleteDropAsAdmin(id);
  }
}
