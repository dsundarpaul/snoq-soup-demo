import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  IsDate,
  IsOptional,
  IsNumber,
  IsEnum,
} from "class-validator";
import { HydratedDocument } from "mongoose";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

@Schema({ _id: false })
class Mobile {
  @ApiProperty({ example: "+1", nullable: true, description: "Country code" })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  countryCode?: string;

  @ApiProperty({
    example: "5551234567",
    nullable: true,
    description: "Phone number",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  number?: string;
}

@Schema({ _id: false })
class Profile {
  @ApiProperty({ nullable: true, description: "Date of birth" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  dateOfBirth?: Date;

  @ApiProperty({ enum: Gender, nullable: true, description: "Gender" })
  @IsEnum(Gender)
  @IsOptional()
  @Prop({ type: String, enum: ["male", "female", "other"] })
  gender?: "male" | "female" | "other";

  @ApiProperty({ type: Mobile, description: "Mobile phone information" })
  @Prop({ type: Mobile, default: {} })
  mobile?: Mobile;
}

@Schema({ _id: false })
class PasswordReset {
  @ApiProperty({ nullable: true, description: "Reset token" })
  @IsString()
  @IsOptional()
  @Prop({ type: String, sparse: true })
  token?: string;

  @ApiProperty({ nullable: true, description: "Token expiration timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  expiresAt?: Date;
}

@Schema({ _id: false })
class Stats {
  @ApiProperty({ default: 0, description: "Total claims count" })
  @IsNumber()
  @Prop({ type: Number, default: 0 })
  totalClaims!: number;

  @ApiProperty({ default: 0, description: "Total redemptions count" })
  @IsNumber()
  @Prop({ type: Number, default: 0 })
  totalRedemptions!: number;
}

@Schema({ timestamps: true })
export class Hunter {
  @ApiProperty({
    example: "device_abc123",
    description: "Unique device identifier",
  })
  @IsString()
  @Prop({ type: String, required: true })
  deviceId!: string;

  @ApiProperty({
    example: "HunterJoe",
    description: "Hunter nickname",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String, trim: true, default: null })
  nickname!: string | null;

  @ApiProperty({
    example: "hunter@example.com",
    description: "Email for cross-device sync",
    nullable: true,
  })
  @IsEmail()
  @IsOptional()
  @Prop({ type: String, lowercase: true, default: null })
  email!: string | null;

  @ApiProperty({
    nullable: true,
    description: "Hashed password for account access",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String, select: false, default: null })
  password!: string | null;

  @ApiProperty({ type: Profile, description: "Profile information" })
  @Prop({ type: Profile, default: {} })
  profile!: Profile;

  @ApiProperty({ type: PasswordReset, description: "Password reset details" })
  @Prop({ type: PasswordReset, default: {} })
  passwordReset!: PasswordReset;

  @ApiProperty({ type: Stats, description: "Hunter statistics" })
  @Prop({ type: Stats, default: { totalClaims: 0, totalRedemptions: 0 } })
  stats!: Stats;

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

export type HunterDocument = HydratedDocument<Hunter>;

export const HunterSchema = SchemaFactory.createForClass(Hunter);

// Indexes
HunterSchema.index({ deviceId: 1 }, { unique: true });
HunterSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
HunterSchema.index({ "stats.totalClaims": -1 });
HunterSchema.index({ deletedAt: 1 });
