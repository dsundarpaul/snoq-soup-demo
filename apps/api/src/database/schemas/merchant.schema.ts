import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
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
class StoreLocation {
  @ApiProperty({ example: 24.7136, description: "Store latitude" })
  @IsNumber()
  @Prop({ type: Number, required: true })
  lat!: number;

  @ApiProperty({ example: 46.6753, description: "Store longitude" })
  @IsNumber()
  @Prop({ type: Number, required: true })
  lng!: number;

  @ApiProperty({ example: "123 Main St, Riyadh", nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Prop({ type: String })
  address?: string;

  @ApiProperty({ example: "Riyadh", nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Prop({ type: String })
  city?: string;

  @ApiProperty({ example: "Riyadh Province", nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Prop({ type: String })
  state?: string;

  @ApiProperty({ example: "12345", nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Prop({ type: String })
  pincode?: string;

  @ApiProperty({ example: "Near Al Faisaliyah Tower", nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  @Prop({ type: String })
  landmark?: string;

  @ApiProperty({ example: "Take exit 9 from King Fahd Road", nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  @Prop({ type: String })
  howToReach?: string;
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

  @ApiProperty({
    example: "+966 50 123 4567",
    nullable: true,
    description: "Business contact phone number",
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Prop({ type: String, default: null })
  businessPhone!: string | null;

  @ApiProperty({
    example: "Sun-Thu 9AM-10PM, Fri 2PM-10PM",
    nullable: true,
    description: "Business operating hours",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Prop({ type: String, default: null })
  businessHours!: string | null;

  @ApiProperty({ default: false, description: "Whether email is verified" })
  @IsBoolean()
  @Prop({ type: Boolean, default: false })
  emailVerified!: boolean;

  @ApiProperty({
    nullable: true,
    description: "When a verification email was last sent",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  lastVerificationSentAt!: Date | null;

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

  @ApiProperty({
    type: StoreLocation,
    description: "Physical store location",
    nullable: true,
  })
  @IsOptional()
  @Prop({ type: StoreLocation, default: null })
  storeLocation!: StoreLocation | null;

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
MerchantSchema.index({ "passwordReset.token": 1 }, { sparse: true });
MerchantSchema.index({ "scannerToken.token": 1 }, { sparse: true });
MerchantSchema.index({ deletedAt: 1 });
