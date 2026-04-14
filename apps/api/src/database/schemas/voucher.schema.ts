import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsDate,
  IsOptional,
  IsEnum,
} from "class-validator";
import { HydratedDocument, Types } from "mongoose";

export enum RedeemedByType {
  MERCHANT = "merchant",
  SCANNER = "scanner",
  HUNTER = "hunter",
}

@Schema({ _id: false })
class ClaimedBy {
  @ApiProperty({
    example: "device_abc123",
    nullable: true,
    description: "Device ID of claimant",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  deviceId?: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Hunter ObjectId who claimed",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: Types.ObjectId, ref: "Hunter" })
  hunterId?: Types.ObjectId;

  @ApiProperty({
    example: "hunter@example.com",
    nullable: true,
    description: "Email of claimant",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  email?: string;

  @ApiProperty({
    example: "+1 5551234567",
    nullable: true,
    description: "Phone of claimant",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  phone?: string;
}

@Schema({ _id: false })
class RedeemedBy {
  @ApiProperty({
    enum: RedeemedByType,
    nullable: true,
    description: "Type of redeemer",
  })
  @IsEnum(RedeemedByType)
  @IsOptional()
  @Prop({ type: String, enum: ["merchant", "scanner", "hunter"] })
  type?: "merchant" | "scanner" | "hunter";

  @ApiProperty({
    example: "merchant123",
    nullable: true,
    description: "ID of redeemer",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: String })
  id?: string;
}

@Schema({ timestamps: true })
export class Voucher {
  @ApiProperty({ type: String, description: "Drop ObjectId" })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: "Drop", required: true })
  dropId!: Types.ObjectId;

  @ApiProperty({ type: String, description: "Merchant ObjectId" })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: "Merchant", required: true })
  merchantId!: Types.ObjectId;

  @ApiProperty({
    example: "abc123magic",
    description: "Unique magic token for voucher access",
  })
  @IsString()
  @Prop({ type: String, required: true })
  magicToken!: string;

  @ApiProperty({ type: ClaimedBy, description: "Claimant information" })
  @Prop({ type: ClaimedBy, default: {} })
  claimedBy!: ClaimedBy;

  @ApiProperty({ description: "Timestamp when voucher was claimed" })
  @IsDate()
  @Prop({ type: Date, default: Date.now })
  claimedAt!: Date;

  @ApiProperty({
    nullable: true,
    description: "When the voucher expires (set at claim from drop rules)",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @ApiProperty({
    nullable: true,
    description: "Timestamp when voucher was redeemed",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  redeemedAt!: Date | null;

  @ApiProperty({
    default: false,
    description: "Whether voucher has been redeemed",
  })
  @IsBoolean()
  @Prop({ type: Boolean, default: false })
  redeemed!: boolean;

  @ApiProperty({ type: RedeemedBy, description: "Who redeemed the voucher" })
  @Prop({ type: RedeemedBy, default: {} })
  redeemedBy!: RedeemedBy;

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

export type VoucherDocument = HydratedDocument<Voucher>;

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

// Indexes
VoucherSchema.index({ magicToken: 1 }, { unique: true });
VoucherSchema.index({ dropId: 1 });
VoucherSchema.index({ merchantId: 1, redeemed: 1 });
// VoucherSchema.index({ "claimedBy.deviceId": 1 });
VoucherSchema.index({ "claimedBy.hunterId": 1 });
VoucherSchema.index({ claimedAt: -1 });
VoucherSchema.index({ deletedAt: 1 });
VoucherSchema.index({ expiresAt: 1 }, { sparse: true });
// VoucherSchema.index(
//   { dropId: 1, "claimedBy.deviceId": 1 },
//   {
//     unique: true,
//     partialFilterExpression: { "claimedBy.deviceId": { $exists: true } },
//   },
// );
