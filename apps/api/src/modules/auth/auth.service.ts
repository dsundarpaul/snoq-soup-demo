import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID, createHash } from "crypto";
import * as bcrypt from "bcryptjs";

import { DatabaseService } from "@/database/database.service";
import { Merchant, MerchantDocument } from "@/database/schemas/merchant.schema";
import { Hunter, HunterDocument } from "@/database/schemas/hunter.schema";
import { Admin, AdminDocument } from "@/database/schemas/admin.schema";
import { UserType } from "@/database/schemas/refresh-token.schema";
import { RegisterMerchantDto } from "./dto/request/register-merchant.dto";
import { RegisterHunterDto } from "./dto/request/register-hunter.dto";
import { AuthResponseDto } from "./dto/response/auth-response.dto";
import { TokenResponseDto } from "./dto/response/token-response.dto";

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_EXPIRY = "15m";
  private readonly JWT_REFRESH_EXPIRY_DAYS = 7;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
  private readonly BCRYPT_ROUNDS = 12;
  private readonly VERIFICATION_EXPIRY_HOURS = 24;
  private readonly RESET_EXPIRY_HOURS = 1;

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  private async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private isLockedOut(lockUntil: Date | null | undefined): boolean {
    if (!lockUntil) return false;
    return new Date() < new Date(lockUntil);
  }

  private async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<void> {
    // Email sending implementation will be added
    console.log(`Verification email to ${email}: token=${token}`);
  }

  private async sendPasswordResetEmail(
    email: string,
    token: string,
  ): Promise<void> {
    // Email sending implementation will be added
    console.log(`Password reset email to ${email}: token=${token}`);
  }

  private mapMerchantToUserDto(merchant: MerchantDocument) {
    return {
      id: merchant._id.toString(),
      email: merchant.email,
      type: "merchant" as const,
      emailVerified: merchant.emailVerified,
      businessName: merchant.businessName,
      username: merchant.username,
    };
  }

  private mapHunterToUserDto(hunter: HunterDocument) {
    return {
      id: hunter._id.toString(),
      email: hunter.email || "",
      type: "hunter" as const,
      nickname: hunter.nickname,
      deviceId: hunter.deviceId,
    };
  }

  private mapAdminToUserDto(admin: AdminDocument) {
    return {
      id: admin._id.toString(),
      email: admin.email,
      type: "admin" as const,
      name: admin.name,
    };
  }

  async registerMerchant(dto: RegisterMerchantDto): Promise<AuthResponseDto> {
    const existingEmail = await this.database.merchants.findOne({
      email: dto.email.toLowerCase(),
      deletedAt: null,
    });
    if (existingEmail) {
      throw new ConflictException("Email already registered");
    }

    const existingUsername = await this.database.merchants.findOne({
      username: dto.username.toLowerCase(),
      deletedAt: null,
    });
    if (existingUsername) {
      throw new ConflictException("Username already taken");
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const verificationToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.VERIFICATION_EXPIRY_HOURS);

    const merchant = await this.database.merchants.create({
      email: dto.email.toLowerCase(),
      username: dto.username.toLowerCase(),
      password: hashedPassword,
      businessName: dto.businessName,
      emailVerified: false,
      emailVerification: {
        token: verificationToken,
        expiresAt,
      },
      loginAttempts: 0,
      lockUntil: null,
      deletedAt: null,
    });

    await this.sendVerificationEmail(merchant.email, verificationToken);

    const tokens = await this.generateTokenPair(
      merchant._id.toString(),
      UserType.MERCHANT,
    );

    return {
      ...tokens,
      user: this.mapMerchantToUserDto(merchant),
    };
  }

  async registerHunter(dto: RegisterHunterDto): Promise<AuthResponseDto> {
    const existingDevice = await this.database.hunters.findOne({
      deviceId: dto.deviceId,
      deletedAt: null,
    });
    if (existingDevice) {
      throw new ConflictException("Device already registered");
    }

    if (dto.email) {
      const existingEmail = await this.database.hunters.findOne({
        email: dto.email.toLowerCase(),
        deletedAt: null,
      });
      if (existingEmail) {
        throw new ConflictException("Email already registered");
      }
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const hunter = await this.database.hunters.create({
      deviceId: dto.deviceId,
      email: dto.email?.toLowerCase() || null,
      password: hashedPassword,
      nickname: dto.nickname || null,
      profile: {},
      passwordReset: {},
      stats: { totalClaims: 0, totalRedemptions: 0 },
      deletedAt: null,
    });

    const tokens = await this.generateTokenPair(
      hunter._id.toString(),
      UserType.HUNTER,
    );

    return {
      ...tokens,
      user: this.mapHunterToUserDto(hunter),
    };
  }

  async loginMerchant(
    email: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const merchant = await this.database.merchants
      .findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      })
      .select("+password");

    if (!merchant) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (this.isLockedOut(merchant.lockUntil)) {
      throw new ForbiddenException("Account locked. Please try again later.");
    }

    const isValidPassword = await this.verifyPassword(
      password,
      merchant.password,
    );

    if (!isValidPassword) {
      const loginAttempts = (merchant.loginAttempts || 0) + 1;
      const updateData: { loginAttempts: number; lockUntil?: Date } = {
        loginAttempts,
      };

      if (loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      }

      await this.database.merchants.updateOne(
        { _id: merchant._id },
        { $set: updateData },
      );

      throw new UnauthorizedException("Invalid credentials");
    }

    await this.database.merchants.updateOne(
      { _id: merchant._id },
      { $set: { loginAttempts: 0, lockUntil: null } },
    );

    const tokens = await this.generateTokenPair(
      merchant._id.toString(),
      UserType.MERCHANT,
    );

    return {
      ...tokens,
      user: this.mapMerchantToUserDto(merchant),
    };
  }

  async loginHunter(email: string, password: string): Promise<AuthResponseDto> {
    const hunter = await this.database.hunters
      .findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      })
      .select("+password");

    if (!hunter || !hunter.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await this.verifyPassword(
      password,
      hunter.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokenPair(
      hunter._id.toString(),
      UserType.HUNTER,
    );

    return {
      ...tokens,
      user: this.mapHunterToUserDto(hunter),
    };
  }

  async loginByDevice(deviceId: string): Promise<AuthResponseDto> {
    let hunter = await this.database.hunters.findOne({
      deviceId,
      deletedAt: null,
    });

    if (!hunter) {
      hunter = await this.database.hunters.create({
        deviceId,
        email: null,
        password: null,
        nickname: null,
        profile: {},
        passwordReset: {},
        stats: { totalClaims: 0, totalRedemptions: 0 },
        deletedAt: null,
      });
    }

    const tokens = await this.generateTokenPair(
      hunter._id.toString(),
      UserType.HUNTER,
    );

    return {
      ...tokens,
      user: this.mapHunterToUserDto(hunter),
    };
  }

  async loginAdmin(email: string, password: string): Promise<AuthResponseDto> {
    const admin = await this.database.admins
      .findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      })
      .select("+password");

    if (!admin) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (this.isLockedOut(admin.lockUntil)) {
      throw new ForbiddenException("Account locked. Please try again later.");
    }

    const isValidPassword = await this.verifyPassword(password, admin.password);

    if (!isValidPassword) {
      const loginAttempts = (admin.loginAttempts || 0) + 1;
      const updateData: { loginAttempts: number; lockUntil?: Date } = {
        loginAttempts,
      };

      if (loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      }

      await this.database.admins.updateOne(
        { _id: admin._id },
        { $set: updateData },
      );

      throw new UnauthorizedException("Invalid credentials");
    }

    await this.database.admins.updateOne(
      { _id: admin._id },
      { $set: { loginAttempts: 0, lockUntil: null } },
    );

    const tokens = await this.generateTokenPair(
      admin._id.toString(),
      UserType.ADMIN,
    );

    return {
      ...tokens,
      user: this.mapAdminToUserDto(admin),
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const merchant = await this.database.merchants.findOne({
      "emailVerification.token": token,
      deletedAt: null,
    });

    if (!merchant) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    if (
      merchant.emailVerification.expiresAt &&
      new Date() > new Date(merchant.emailVerification.expiresAt)
    ) {
      throw new BadRequestException("Verification token has expired");
    }

    await this.database.merchants.updateOne(
      { _id: merchant._id },
      {
        $set: { emailVerified: true },
        $unset: { emailVerification: 1 },
      },
    );
  }

  async resendVerification(email: string): Promise<void> {
    const merchant = await this.database.merchants.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });

    if (!merchant) {
      return; // Don't reveal if email exists
    }

    if (merchant.emailVerified) {
      return;
    }

    const verificationToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.VERIFICATION_EXPIRY_HOURS);

    await this.database.merchants.updateOne(
      { _id: merchant._id },
      {
        $set: {
          emailVerification: {
            token: verificationToken,
            expiresAt,
          },
        },
      },
    );

    await this.sendVerificationEmail(merchant.email, verificationToken);
  }

  async forgotPassword(email: string, userType: UserType): Promise<void> {
    let user: MerchantDocument | HunterDocument | null = null;

    if (userType === UserType.MERCHANT) {
      user = await this.database.merchants.findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      });
    } else if (userType === UserType.HUNTER) {
      user = await this.database.hunters.findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      });
    }

    if (!user) {
      return; // Don't reveal if email exists
    }

    const resetToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.RESET_EXPIRY_HOURS);

    const updateData = {
      passwordReset: {
        token: resetToken,
        expiresAt,
      },
    };

    if (userType === UserType.MERCHANT) {
      await this.database.merchants.updateOne(
        { _id: user._id },
        { $set: updateData },
      );
    } else {
      await this.database.hunters.updateOne(
        { _id: user._id },
        { $set: updateData },
      );
    }

    if (!user.email) {
      return; // Can't send email without email address
    }

    await this.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(
    token: string,
    password: string,
    userType: UserType,
  ): Promise<void> {
    let user: MerchantDocument | HunterDocument | null = null;

    if (userType === UserType.MERCHANT) {
      user = await this.database.merchants.findOne({
        "passwordReset.token": token,
        deletedAt: null,
      });
    } else if (userType === UserType.HUNTER) {
      user = await this.database.hunters.findOne({
        "passwordReset.token": token,
        deletedAt: null,
      });
    }

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (
      user.passwordReset.expiresAt &&
      new Date() > new Date(user.passwordReset.expiresAt)
    ) {
      throw new BadRequestException("Reset token has expired");
    }

    const hashedPassword = await this.hashPassword(password);

    if (userType === UserType.MERCHANT) {
      await this.database.merchants.updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { "passwordReset.token": 1, "passwordReset.expiresAt": 1 },
        },
      );
      await this.revokeAllUserTokens(user._id.toString(), UserType.MERCHANT);
    } else {
      await this.database.hunters.updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { "passwordReset.token": 1, "passwordReset.expiresAt": 1 },
        },
      );
      await this.revokeAllUserTokens(user._id.toString(), UserType.HUNTER);
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    const hashedToken = this.hashToken(refreshToken);

    // First find the token regardless of revocation status to check for reuse
    const tokenDoc = await this.database.refreshTokens.findOne({
      token: hashedToken,
    });

    if (!tokenDoc) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Check if this token family has been revoked (token reuse detection)
    // This happens when someone tries to use an already-revoked token
    if (tokenDoc.revokedAt) {
      // Revoke entire token family (potential token theft)
      await this.database.refreshTokens.updateMany(
        { family: tokenDoc.family },
        { $set: { revokedAt: new Date() } },
      );
      throw new UnauthorizedException(
        "Token reuse detected. Please login again.",
      );
    }

    if (new Date() > new Date(tokenDoc.expiresAt)) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    // Revoke the current token
    await this.database.refreshTokens.updateOne(
      { _id: tokenDoc._id },
      { $set: { revokedAt: new Date() } },
    );

    // Generate new token pair with same family
    const tokens = await this.generateTokenPair(
      tokenDoc.userId.toString(),
      tokenDoc.userType,
      tokenDoc.family,
    );

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);

    await this.database.refreshTokens.updateOne(
      { token: hashedToken },
      { $set: { revokedAt: new Date() } },
    );
  }

  async generateTokenPair(
    userId: string,
    userType: UserType,
    existingFamily?: string,
  ): Promise<TokenResponseDto> {
    const family = existingFamily || randomUUID();
    const refreshToken = randomUUID();
    const hashedRefreshToken = this.hashToken(refreshToken);

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        type: userType,
      },
      {
        expiresIn: this.JWT_ACCESS_EXPIRY,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.JWT_REFRESH_EXPIRY_DAYS);

    await this.database.refreshTokens.create({
      userId,
      userType,
      token: hashedRefreshToken,
      family,
      expiresAt,
      revokedAt: null,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async revokeAllUserTokens(userId: string, userType: UserType): Promise<void> {
    await this.database.refreshTokens.updateMany(
      { userId, userType, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async validateUser(
    userId: string,
    userType: UserType,
  ): Promise<Merchant | Hunter | Admin | null> {
    if (userType === UserType.MERCHANT) {
      return this.database.merchants.findById(userId);
    } else if (userType === UserType.HUNTER) {
      return this.database.hunters.findById(userId);
    } else if (userType === UserType.ADMIN) {
      return this.database.admins.findById(userId);
    }
    return null;
  }
}
