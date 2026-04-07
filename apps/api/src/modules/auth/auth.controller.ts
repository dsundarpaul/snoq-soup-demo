import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/request/login.dto";
import { RegisterMerchantDto } from "./dto/request/register-merchant.dto";
import { RegisterHunterDto } from "./dto/request/register-hunter.dto";
import { ForgotPasswordDto } from "./dto/request/forgot-password.dto";
import { ResetPasswordDto } from "./dto/request/reset-password.dto";
import { RefreshTokenDto } from "./dto/request/refresh-token.dto";
import { AuthResponseDto } from "./dto/response/auth-response.dto";
import { TokenResponseDto } from "./dto/response/token-response.dto";
import { UserType } from "@/database/schemas/refresh-token.schema";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("merchant/register")
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new merchant" })
  @ApiResponse({
    status: 201,
    description: "Merchant registered successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: "Email or username already exists" })
  async registerMerchant(
    @Body() dto: RegisterMerchantDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerMerchant(dto);
  }

  @Post("merchant/login")
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 attempts per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login as merchant" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 403, description: "Account locked" })
  async loginMerchant(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginMerchant(dto.email, dto.password);
  }

  @Post("merchant/verify-email/:token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify merchant email" })
  @ApiParam({ name: "token", description: "Verification token from email" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async verifyMerchantEmail(@Param("token") token: string): Promise<void> {
    return this.authService.verifyEmail(token);
  }

  @Post("merchant/resend-verification")
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } }) // 3 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend merchant verification email" })
  @ApiResponse({
    status: 200,
    description: "Verification email sent if account exists",
  })
  async resendMerchantVerification(
    @Body() dto: ForgotPasswordDto,
  ): Promise<void> {
    return this.authService.resendVerification(dto.email);
  }

  @Post("merchant/forgot-password")
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } }) // 3 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request merchant password reset" })
  @ApiResponse({
    status: 200,
    description: "Reset email sent if account exists",
  })
  async forgotMerchantPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto.email, UserType.MERCHANT);
  }

  @Post("merchant/reset-password/:token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset merchant password" })
  @ApiParam({ name: "token", description: "Password reset token from email" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async resetMerchantPassword(
    @Param("token") token: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.authService.resetPassword(
      token,
      dto.password,
      UserType.MERCHANT,
    );
  }

  @Post("hunter/register")
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new hunter" })
  @ApiResponse({
    status: 201,
    description: "Hunter registered successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Device or email already registered",
  })
  async registerHunter(
    @Body() dto: RegisterHunterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerHunter(dto);
  }

  @Post("hunter/login")
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 attempts per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login as hunter with email/password" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async loginHunter(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginHunter(dto.email, dto.password);
  }

  @Post("hunter/device-login")
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } }) // 10 requests per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login or create hunter by device ID" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  async loginByDevice(
    @Body("deviceId") deviceId: string,
  ): Promise<AuthResponseDto> {
    return this.authService.loginByDevice(deviceId);
  }

  @Post("hunter/forgot-password")
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } }) // 3 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request hunter password reset" })
  @ApiResponse({
    status: 200,
    description: "Reset email sent if account exists",
  })
  async forgotHunterPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto.email, UserType.HUNTER);
  }

  @Post("hunter/reset-password/:token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset hunter password" })
  @ApiParam({ name: "token", description: "Password reset token from email" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async resetHunterPassword(
    @Param("token") token: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.authService.resetPassword(token, dto.password, UserType.HUNTER);
  }

  @Post("admin/login")
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 attempts per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login as admin" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 403, description: "Account locked" })
  async loginAdmin(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginAdmin(dto.email, dto.password);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access and refresh tokens" })
  @ApiResponse({
    status: 200,
    description: "Tokens refreshed successfully",
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refreshTokens(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }
}
