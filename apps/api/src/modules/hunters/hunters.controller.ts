import { Controller, Get, Patch, Body, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { HuntersService } from "./hunters.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateProfileDto } from "./dto/request/update-profile.dto";
import { UpdateNicknameDto } from "./dto/request/update-nickname.dto";
import { HunterResponseDto } from "./dto/response/hunter-response.dto";
import { HunterHistoryResponseDto } from "./dto/response/hunter-history-response.dto";
import { LeaderboardEntryDto } from "./dto/response/leaderboard-entry.dto";

@ApiTags("Hunters")
@Controller()
export class HuntersController {
  constructor(private readonly huntersService: HuntersService) {}

  @Get("hunters/me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("hunter")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current hunter profile" })
  @ApiResponse({ status: 200, type: HunterResponseDto })
  @ApiResponse({ status: 404, description: "Hunter not found" })
  async getMe(
    @CurrentUser("userId") hunterId: string,
  ): Promise<HunterResponseDto> {
    return this.huntersService.findById(hunterId);
  }

  @Get("hunters/me/history")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("hunter")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current hunter's voucher history" })
  @ApiResponse({ status: 200, type: HunterHistoryResponseDto })
  async getHistory(
    @CurrentUser("userId") hunterId: string,
  ): Promise<HunterHistoryResponseDto> {
    return this.huntersService.getHistory(hunterId);
  }

  @Patch("hunters/me/profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("hunter")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update hunter profile" })
  @ApiResponse({ status: 200, type: HunterResponseDto })
  @ApiResponse({ status: 404, description: "Hunter not found" })
  async updateProfile(
    @CurrentUser("userId") hunterId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<HunterResponseDto> {
    return this.huntersService.updateProfile(hunterId, dto);
  }

  @Patch("hunters/me/nickname")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("hunter")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update hunter nickname only" })
  @ApiResponse({ status: 200, type: HunterResponseDto })
  @ApiResponse({ status: 404, description: "Hunter not found" })
  async updateNickname(
    @CurrentUser("userId") hunterId: string,
    @Body() dto: UpdateNicknameDto,
  ): Promise<HunterResponseDto> {
    return this.huntersService.updateNickname(hunterId, dto.nickname);
  }

  @Get("leaderboard")
  @Public()
  @ApiOperation({ summary: "Get hunters leaderboard sorted by total claims" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of entries to return (default: 50)",
  })
  @ApiResponse({ status: 200, type: [LeaderboardEntryDto] })
  async getLeaderboard(
    @Query("limit") limit = 50,
  ): Promise<LeaderboardEntryDto[]> {
    return this.huntersService.getLeaderboard(Number(limit));
  }
}
