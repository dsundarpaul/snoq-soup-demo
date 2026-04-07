import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsDate, IsOptional, IsEnum } from "class-validator";
import { HydratedDocument, Types } from "mongoose";

export enum UserType {
  MERCHANT = "merchant",
  HUNTER = "hunter",
  ADMIN = "admin",
  SCANNER = "scanner",
}

@Schema({ timestamps: true })
export class RefreshToken {
  @ApiProperty({ description: "User ID associated with this token" })
  @IsString()
  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @ApiProperty({ enum: UserType, description: "Type of user" })
  @IsEnum(UserType)
  @Prop({ type: String, required: true, enum: Object.values(UserType) })
  userType!: UserType;

  @ApiProperty({ description: "Hashed refresh token" })
  @IsString()
  @Prop({ type: String, required: true })
  token!: string;

  @ApiProperty({ description: "Token family for reuse detection" })
  @IsString()
  @Prop({ type: String, required: true })
  family!: string;

  @ApiProperty({ description: "Token expiration timestamp" })
  @IsDate()
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @ApiProperty({ nullable: true, description: "Token revocation timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;

  @ApiProperty({ description: "Timestamp when document was created" })
  createdAt!: Date;

  @ApiProperty({ description: "Timestamp when document was last updated" })
  updatedAt!: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ token: 1 }, { unique: true });
RefreshTokenSchema.index({ userId: 1, userType: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
