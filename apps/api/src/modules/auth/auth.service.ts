import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { randomUUID, createHash } from "crypto";
import * as bcrypt from "bcryptjs";
import { Connection } from "mongoose";

import { config } from "../../config/app.config";
import { DatabaseService } from "../../database/database.service";
import { MailService } from "../mail/mail.service";
import { EmailVerificationTokenService } from "./email-verification-token.service";
import {
  Merchant,
  MerchantDocument,
} from "../../database/schemas/merchant.schema";
import { Hunter, HunterDocument } from "../../database/schemas/hunter.schema";
import { Admin, AdminDocument } from "../../database/schemas/admin.schema";
import { UserRole } from "../../common/enums/user-role.enum";
import { RegisterMerchantDto } from "./dto/request/register-merchant.dto";
import { RegisterHunterDto } from "./dto/request/register-hunter.dto";
import { AuthResponseDto } from "./dto/response/auth-response.dto";

type JwtPair = { accessToken: string; refreshToken: string };

type AuthWithJwtPair = AuthResponseDto & JwtPair;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_REFRESH_EXPIRY_DAYS = 7;
  private readonly MERCHANT_MAX_LOGIN_ATTEMPTS = 5;
  private readonly MERCHANT_LOCKOUT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
  private readonly HUNTER_MAX_LOGIN_ATTEMPTS = 5;
  private readonly HUNTER_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BCRYPT_ROUNDS = 12;
  private readonly RESET_EXPIRY_HOURS = 1;

  constructor(
    private readonly database: DatabaseService,
    @InjectConnection() private readonly connection: Connection,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly emailVerificationTokenService: EmailVerificationTokenService,
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

  async registerMerchant(dto: RegisterMerchantDto): Promise<AuthWithJwtPair> {
    const existingEmail = await this.database.merchants.findOne({
      email: dto.email.toLowerCase(),
      deletedAt: null,
    });
    if (existingEmail) {
      throw new ConflictException(
        "Seems like you already have a merchant account with this email address",
      );
    }

    const existingUsername = await this.database.merchants.findOne({
      username: dto.username.toLowerCase(),
      deletedAt: null,
    });
    if (existingUsername) {
      throw new ConflictException("Company slug already taken");
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const now = new Date();

    const session = await this.connection.startSession();
    let merchant!: MerchantDocument;
    let verificationPlain!: string;
    try {
      await session.withTransaction(async () => {
        const [created] = await this.database.merchants.create(
          [
            {
              email: dto.email.toLowerCase(),
              username: dto.username.toLowerCase(),
              password: hashedPassword,
              businessName: dto.businessName,
              emailVerified: false,
              emailVerification: {},
              lastVerificationSentAt: now,
              loginAttempts: 0,
              lockUntil: null,
              deletedAt: null,
            },
          ],
          { session },
        );
        merchant = created!;
        verificationPlain = await this.emailVerificationTokenService.issueToken(
          merchant._id.toString(),
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    try {
      await this.mailService.sendVerificationEmail(
        merchant.email,
        verificationPlain,
      );
    } catch (err) {
      this.logger.error(
        `Verification email failed after signup transaction commit: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    const tokens = await this.generateTokenPair(
      merchant._id.toString(),
      UserRole.MERCHANT,
    );

    return {
      ...tokens,
      user: this.mapMerchantToUserDto(merchant),
    };
  }

  async registerHunter(dto: RegisterHunterDto): Promise<AuthWithJwtPair> {
    if (dto.email) {
      const existingEmail = await this.database.hunters.findOne({
        email: dto.email.toLowerCase(),
        deletedAt: null,
      });
      if (existingEmail) {
        throw new ConflictException(
          `Email already registered with: ${dto.email.substring(0, 3)}***${dto.email.substring(dto.email.length - 3)}`,
        );
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
      UserRole.HUNTER,
    );

    return {
      ...tokens,
      user: this.mapHunterToUserDto(hunter),
    };
  }

  async loginMerchant(
    email: string,
    password: string,
  ): Promise<AuthWithJwtPair> {
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

    if (merchant.suspendedAt != null) {
      throw new ForbiddenException(
        "This account has been suspended. Please contact support.",
      );
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

      if (loginAttempts >= this.MERCHANT_MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = new Date(
          Date.now() + this.MERCHANT_LOCKOUT_DURATION_MS,
        );
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

    if (!merchant.emailVerified) {
      throw new ForbiddenException(
        "Please verify your email before logging in.",
      );
    }

    const tokens = await this.generateTokenPair(
      merchant._id.toString(),
      UserRole.MERCHANT,
    );

    return {
      ...tokens,
      user: this.mapMerchantToUserDto(merchant),
    };
  }

  async loginHunter(email: string, password: string): Promise<AuthWithJwtPair> {
    const hunter = await this.database.hunters
      .findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      })
      .select("+password +loginAttempts +lockUntil");

    if (!hunter || !hunter.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (this.isLockedOut(hunter.lockUntil)) {
      throw new ForbiddenException(
        "Account temporarily locked. Try again later.",
      );
    }

    const isValidPassword = await this.verifyPassword(
      password,
      hunter.password,
    );

    if (!isValidPassword) {
      const loginAttempts = (hunter.loginAttempts || 0) + 1;
      const updateData: { loginAttempts: number; lockUntil?: Date } = {
        loginAttempts,
      };

      if (loginAttempts >= this.HUNTER_MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = new Date(
          Date.now() + this.HUNTER_LOCKOUT_DURATION_MS,
        );
      }

      await this.database.hunters.updateOne(
        { _id: hunter._id },
        { $set: updateData },
      );

      throw new UnauthorizedException("Invalid credentials");
    }

    await this.database.hunters.updateOne(
      { _id: hunter._id },
      { $set: { loginAttempts: 0, lockUntil: null } },
    );

    const tokens = await this.generateTokenPair(
      hunter._id.toString(),
      UserRole.HUNTER,
    );

    return {
      ...tokens,
      user: this.mapHunterToUserDto(hunter),
    };
  }

  async loginByDevice(deviceId: string): Promise<AuthWithJwtPair> {
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
      UserRole.HUNTER,
    );

    return {
      ...tokens,
      user: this.mapHunterToUserDto(hunter),
    };
  }

  async loginAdmin(email: string, password: string): Promise<AuthWithJwtPair> {
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

      if (loginAttempts >= this.MERCHANT_MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = new Date(
          Date.now() + this.MERCHANT_LOCKOUT_DURATION_MS,
        );
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
      UserRole.ADMIN,
    );

    return {
      ...tokens,
      user: this.mapAdminToUserDto(admin),
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.emailVerificationTokenService.hashPlainToken(token);
    this.logger.log(
      `[verifyEmail] enter hashPrefix=${tokenHash.slice(0, 8)} at=${new Date().toISOString()}`,
    );

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const now = new Date();

        const claimed = await this.database.emailVerificationTokens
          .findOneAndUpdate(
            {
              tokenHash,
              used: false,
              expiresAt: { $gt: now },
            },
            { $set: { used: true } },
            { session, new: true },
          )
          .exec();

        if (claimed) {
          const merchantRes = await this.database.merchants.updateOne(
            {
              _id: claimed.merchantId,
              deletedAt: null,
            },
            {
              $set: { emailVerified: true },
              $unset: { emailVerification: 1 },
            },
            { session },
          );

          if (merchantRes.matchedCount === 0) {
            throw new BadRequestException(
              "Invalid or expired verification token",
            );
          }

          this.logger.log(
            `[verifyEmail] verified merchantId=${claimed.merchantId.toString()}`,
          );
          return;
        }

        const existing = await this.database.emailVerificationTokens
          .findOne({ tokenHash })
          .session(session)
          .lean();

        if (!existing) {
          this.logger.log(
            `[verifyEmail] no row hashPrefix=${tokenHash.slice(0, 8)}`,
          );
          throw new BadRequestException(
            "Invalid or expired verification token",
          );
        }

        if (!existing.used) {
          if (new Date(existing.expiresAt) <= now) {
            throw new BadRequestException("Verification token has expired");
          }
          this.logger.log(
            `[verifyEmail] odd state unused+unexpired hashPrefix=${tokenHash.slice(0, 8)}`,
          );
          throw new BadRequestException(
            "Invalid or expired verification token",
          );
        }

        const merchant = await this.database.merchants
          .findOne({
            _id: existing.merchantId,
            deletedAt: null,
          })
          .session(session)
          .lean();

        if (merchant?.emailVerified) {
          this.logger.log(
            `[verifyEmail] idempotent ok merchantId=${existing.merchantId.toString()}`,
          );
          return;
        }

        const merchantRes = await this.database.merchants.updateOne(
          {
            _id: existing.merchantId,
            deletedAt: null,
          },
          {
            $set: { emailVerified: true },
            $unset: { emailVerification: 1 },
          },
          { session },
        );

        if (merchantRes.matchedCount === 0) {
          throw new BadRequestException(
            "Invalid or expired verification token",
          );
        }

        this.logger.log(
          `[verifyEmail] repaired merchantId=${existing.merchantId.toString()}`,
        );
      });
    } finally {
      await session.endSession();
    }
  }

  async resendVerification(email: string): Promise<void> {
    const session = await this.connection.startSession();
    let verificationPlain: string | null = null;
    let targetEmail: string | null = null;

    try {
      await session.withTransaction(async () => {
        const merchant = await this.database.merchants
          .findOne({
            email: email.toLowerCase(),
            deletedAt: null,
          })
          .session(session);

        if (!merchant || merchant.emailVerified) {
          return;
        }

        const lastSent = merchant.lastVerificationSentAt;
        if (lastSent) {
          const diff = Date.now() - new Date(lastSent).getTime();
          if (diff < 60_000) {
            return;
          }
        }

        await this.emailVerificationTokenService.markAllUnusedUsedForMerchant(
          merchant._id.toString(),
          session,
        );

        verificationPlain = await this.emailVerificationTokenService.issueToken(
          merchant._id.toString(),
          session,
        );
        targetEmail = merchant.email;

        await this.database.merchants.updateOne(
          { _id: merchant._id },
          {
            $set: { lastVerificationSentAt: new Date() },
            $unset: { emailVerification: 1 },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    if (verificationPlain && targetEmail) {
      try {
        await this.mailService.sendVerificationEmail(
          targetEmail,
          verificationPlain,
        );
      } catch (err) {
        this.logger.error(
          `Verification email failed after resend transaction commit: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  async forgotPassword(email: string, userType: UserRole): Promise<void> {
    let user: MerchantDocument | HunterDocument | null = null;

    if (userType === UserRole.MERCHANT) {
      user = await this.database.merchants.findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      });
    } else if (userType === UserRole.HUNTER) {
      user = await this.database.hunters.findOne({
        email: email.toLowerCase(),
        deletedAt: null,
      });
    }

    if (!user) {
      return; // Don't reveal if email exists
    }

    const resetToken = randomUUID();
    const hashedResetToken = this.hashToken(resetToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.RESET_EXPIRY_HOURS);

    const updateData = {
      passwordReset: {
        token: hashedResetToken,
        expiresAt,
      },
    };

    if (userType === UserRole.MERCHANT) {
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
      return;
    }

    const kind =
      userType === UserRole.MERCHANT
        ? ("merchant" as const)
        : ("hunter" as const);

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        kind,
      );
    } catch (err) {
      this.logger.error(
        `Password reset email failed for ${user.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async resetPassword(
    token: string,
    password: string,
    userType: UserRole,
  ): Promise<void> {
    const hashedToken = this.hashToken(token);
    let user: MerchantDocument | HunterDocument | null = null;

    if (userType === UserRole.MERCHANT) {
      user = await this.database.merchants.findOne({
        "passwordReset.token": hashedToken,
        deletedAt: null,
      });
    } else if (userType === UserRole.HUNTER) {
      user = await this.database.hunters.findOne({
        "passwordReset.token": hashedToken,
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

    if (userType === UserRole.MERCHANT) {
      await this.database.merchants.updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { "passwordReset.token": 1, "passwordReset.expiresAt": 1 },
        },
      );
      await this.revokeAllUserTokens(user._id.toString(), UserRole.MERCHANT);
    } else {
      await this.database.hunters.updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { "passwordReset.token": 1, "passwordReset.expiresAt": 1 },
        },
      );
      await this.revokeAllUserTokens(user._id.toString(), UserRole.HUNTER);
    }
  }

  async refreshTokens(refreshToken: string): Promise<JwtPair> {
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

    if (tokenDoc.userType === UserRole.MERCHANT) {
      const m = await this.database.merchants
        .findById(tokenDoc.userId)
        .select({ suspendedAt: 1, deletedAt: 1 })
        .lean();
      if (!m || m.deletedAt != null) {
        throw new UnauthorizedException("Merchant not found");
      }
      if (m.suspendedAt != null) {
        throw new ForbiddenException(
          "This account has been suspended. Please contact support.",
        );
      }
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
    userType: UserRole,
    existingFamily?: string,
  ): Promise<JwtPair> {
    const family = existingFamily || randomUUID();
    const refreshToken = randomUUID();
    const hashedRefreshToken = this.hashToken(refreshToken);

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        type: userType,
      },
      {
        expiresIn: config.jwt.expiresIn,
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

  async revokeAllUserTokens(userId: string, userType: UserRole): Promise<void> {
    await this.database.refreshTokens.updateMany(
      { userId, userType, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async validateUser(
    userId: string,
    userType: UserRole,
  ): Promise<Merchant | Hunter | Admin | null> {
    if (userType === UserRole.MERCHANT) {
      return this.database.merchants.findById(userId);
    } else if (userType === UserRole.HUNTER) {
      return this.database.hunters.findById(userId);
    } else if (userType === UserRole.ADMIN) {
      return this.database.admins.findById(userId);
    }
    return null;
  }
}
