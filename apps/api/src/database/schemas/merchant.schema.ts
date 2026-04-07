import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
} from "class-validator";
import { HydratedDocument } from "mongoose";

@Schema({ _id: false })
class EmailVerification {
  @ApiProperty({ nullable: true, description: "Verification token" })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  token?: string;

  @ApiProperty({ nullable: true, description: "Token expiration timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  expiresAt?: Date;
}

@Schema({ _id: false })
class PasswordReset {
  @ApiProperty({ nullable: true, description: "Reset token" })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  token?: string;

  @ApiProperty({ nullable: true, description: "Token expiration timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  expiresAt?: Date;
}

@Schema({ _id: false })
class ScannerToken {
  @ApiProperty({ nullable: true, description: "Scanner token" })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  token?: string;

  @ApiProperty({ nullable: true, description: "Token creation timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  createdAt?: Date;
}

@Schema({ timestamps: true })
export class Merchant {
  @ApiProperty({
    example: "merchant@example.com",
    description: "Merchant email address",
  })
  @IsEmail()
  @IsString()
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @ApiProperty({
    example: "merchant_user",
    description: "Unique merchant username",
  })
  @IsString()
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  username!: string;

  @ApiProperty({ minLength: 8, description: "Hashed password" })
  @IsString()
  @MinLength(8)
  @Prop({ type: String, required: true, select: false })
  password!: string;

  @ApiProperty({ example: "My Business Store", description: "Business name" })
  @IsString()
  @Prop({ type: String, required: true, trim: true })
  businessName!: string;

  @ApiProperty({
    example: "https://cdn.example.com/logo.png",
    nullable: true,
    description: "Business logo URL",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String, default: null })
  logoUrl!: string | null;

  @ApiProperty({ default: false, description: "Whether email is verified" })
  @IsBoolean()
  @Prop({ type: Boolean, default: false })
  emailVerified!: boolean;

  @ApiProperty({
    type: EmailVerification,
    description: "Email verification details",
  })
  @Prop({ type: EmailVerification, default: {} })
  emailVerification!: EmailVerification;

  @ApiProperty({ type: PasswordReset, description: "Password reset details" })
  @Prop({ type: PasswordReset, default: {} })
  passwordReset!: PasswordReset;

  @ApiProperty({
    type: ScannerToken,
    description: "Scanner token for staff access",
  })
  @Prop({ type: ScannerToken, default: {} })
  scannerToken!: ScannerToken;

  @ApiProperty({ default: 0, description: "Number of failed login attempts" })
  @IsNumber()
  @Prop({ type: Number, default: 0 })
  loginAttempts!: number;

  @ApiProperty({
    nullable: true,
    description: "Account lockout expiration timestamp",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  lockUntil!: Date | null;

  @ApiProperty({ nullable: true, description: "Soft delete timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @ApiProperty({ description: "Timestamp when document was created" })
  createdAt!: Date;

  @ApiProperty({ description: "Timestamp when document was last updated" })
  updatedAt!: Date;
}

export type MerchantDocument = HydratedDocument<Merchant>;

export const MerchantSchema = SchemaFactory.createForClass(Merchant);

// Indexes
MerchantSchema.index({ email: 1 }, { unique: true });
MerchantSchema.index({ username: 1 }, { unique: true });
MerchantSchema.index({ "emailVerification.token": 1 }, { sparse: true });
MerchantSchema.index({ "passwordReset.token": 1 }, { sparse: true });
MerchantSchema.index({ "scannerToken.token": 1 }, { sparse: true });
MerchantSchema.index({ deletedAt: 1 });
