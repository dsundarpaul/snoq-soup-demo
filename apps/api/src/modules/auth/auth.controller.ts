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
import { VerifyEmailDto } from "./dto/request/verify-email.dto";
import { AuthResponseDto } from "./dto/response/auth-response.dto";
import { TokenResponseDto } from "./dto/response/token-response.dto";
import { ResendVerificationResponseDto } from "./dto/response/resend-verification-response.dto";
import { UserType } from "../../database/schemas/refresh-token.schema";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Audit } from "../audit/audit.decorator";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private static readonly resendVerificationMessage =
    "If the email exists, a verification link has been sent.";

  @Post("verify-email")
  @Audit("auth.verify_email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email with token from email link" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("resend-verification")
  @Audit("auth.resend_verification")
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend email verification link" })
  @ApiResponse({
    status: 200,
    description: "Generic acknowledgment",
    type: ResendVerificationResponseDto,
  })
  async resendVerification(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ResendVerificationResponseDto> {
    await this.authService.resendVerification(dto.email);
    return {
      message: AuthController.resendVerificationMessage,
    };
  }

  @Post("merchant/register")
  @Audit("auth.merchant_register")
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
  @Audit("auth.merchant_login")
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 attempts per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login as merchant" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({
    status: 403,
    description: "Account locked or email not verified",
  })
  async loginMerchant(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginMerchant(dto.email, dto.password);
  }

  @Post("merchant/verify-email/:token")
  @Audit("auth.merchant_verify_email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify merchant email (token in URL)" })
  @ApiParam({ name: "token", description: "Verification token from email" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async verifyMerchantEmail(@Param("token") token: string): Promise<void> {
    return this.authService.verifyEmail(token);
  }

  @Post("merchant/resend-verification")
  @Audit("auth.merchant_resend_verification")
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } }) // 3 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend merchant verification email" })
  @ApiResponse({
    status: 200,
    description: "Generic acknowledgment",
    type: ResendVerificationResponseDto,
  })
  async resendMerchantVerification(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ResendVerificationResponseDto> {
    await this.authService.resendVerification(dto.email);
    return {
      message: AuthController.resendVerificationMessage,
    };
  }

  @Post("merchant/forgot-password")
  @Audit("auth.merchant_forgot_password")
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
  @Audit("auth.merchant_reset_password")
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
  @Audit("auth.hunter_register")
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
  @Audit("auth.hunter_login")
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
  @Audit("auth.hunter_device_login")
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
  @Audit("auth.hunter_forgot_password")
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
  @Audit("auth.hunter_reset_password")
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
  @Audit("auth.admin_login")
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
  @Audit("auth.refresh")
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
  @Audit("auth.logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }
}
