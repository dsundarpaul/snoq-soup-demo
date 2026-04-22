import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/request/login.dto";
import { RegisterMerchantDto } from "./dto/request/register-merchant.dto";
import { RegisterHunterDto } from "./dto/request/register-hunter.dto";
import { ForgotPasswordDto } from "./dto/request/forgot-password.dto";
import { ResetPasswordDto } from "./dto/request/reset-password.dto";
import { RefreshTokenDto } from "./dto/request/refresh-token.dto";
import { VerifyEmailDto } from "./dto/request/verify-email.dto";
import { DeviceLoginDto } from "./dto/request/device-login.dto";
import { AuthResponseDto } from "./dto/response/auth-response.dto";
import { RefreshSessionResponseDto } from "./dto/response/token-response.dto";
import { ResendVerificationResponseDto } from "./dto/response/resend-verification-response.dto";
import { UserRole } from "../../common/enums/user-role.enum";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { config } from "../../config/app.config";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

function toAuthResponseBody(result: {
  user: AuthResponseDto["user"];
  accessToken: string;
  refreshToken: string;
}): AuthResponseDto {
  return { user: result.user };
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private static readonly resendVerificationMessage =
    "If the email exists, a verification link has been sent.";

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction = config.NODE_ENV === "production";
    const sameSite = isProduction ? ("strict" as const) : ("lax" as const);

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  private clearAuthCookies(res: Response): void {
    const isProduction = config.NODE_ENV === "production";
    const sameSite = isProduction ? ("strict" as const) : ("lax" as const);
    const opts = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite,
    };
    res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
    res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email with token from email link" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("resend-verification")
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
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new merchant" })
  @ApiResponse({
    status: 201,
    description: "Merchant registered successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: "Email or username already exists" })
  @ApiCookieAuth()
  async registerMerchant(
    @Body() dto: RegisterMerchantDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.registerMerchant(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return toAuthResponseBody(result);
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
  @ApiResponse({
    status: 403,
    description: "Account locked or email not verified",
  })
  @ApiCookieAuth()
  async loginMerchant(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.loginMerchant(
      dto.email,
      dto.password,
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return toAuthResponseBody(result);
  }

  @Post("merchant/verify-email/:token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify merchant email (token in URL)" })
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
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } }) // 3 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request merchant password reset" })
  @ApiResponse({
    status: 200,
    description: "Reset email sent if account exists",
  })
  async forgotMerchantPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto.email, UserRole.MERCHANT);
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
      UserRole.MERCHANT,
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
  @ApiCookieAuth()
  async registerHunter(
    @Body() dto: RegisterHunterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.registerHunter(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return toAuthResponseBody(result);
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
  @ApiCookieAuth()
  async loginHunter(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.loginHunter(dto.email, dto.password);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return toAuthResponseBody(result);
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
  @ApiCookieAuth()
  async loginByDevice(
    @Body() dto: DeviceLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.loginByDevice(dto.deviceId);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return toAuthResponseBody(result);
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
    return this.authService.forgotPassword(dto.email, UserRole.HUNTER);
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
    return this.authService.resetPassword(token, dto.password, UserRole.HUNTER);
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
  @ApiCookieAuth()
  async loginAdmin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.loginAdmin(dto.email, dto.password);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return toAuthResponseBody(result);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access and refresh tokens" })
  @ApiResponse({
    status: 200,
    description: "Tokens refreshed successfully; new cookies set",
    type: RefreshSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  @ApiCookieAuth()
  async refreshTokens(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshSessionResponseDto> {
    const refresh =
      (req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined) ??
      dto?.refreshToken;
    if (!refresh) {
      throw new UnauthorizedException("Refresh token required");
    }
    const result = await this.authService.refreshTokens(refresh);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { ok: true };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refresh =
      (req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined) ??
      dto?.refreshToken;
    if (refresh) {
      await this.authService.logout(refresh);
    }
    this.clearAuthCookies(res);
  }
}
