import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsDate, IsOptional } from "class-validator";
import { HydratedDocument, Types } from "mongoose";

export enum PromoCodeStatus {
  AVAILABLE = "available",
  ASSIGNED = "assigned",
}

@Schema({ timestamps: true, collection: "promo_codes" })
export class PromoCode {
  @ApiProperty({ type: String, description: "Drop ObjectId" })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: "Drop", required: true })
  dropId!: Types.ObjectId;

  @ApiProperty({ type: String, description: "Merchant ObjectId" })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: "Merchant", required: true })
  merchantId!: Types.ObjectId;

  @ApiProperty({ example: "SUMMER2024", description: "Promo code value" })
  @IsString()
  @Prop({ type: String, required: true, trim: true })
  code!: string;

  @ApiProperty({
    enum: PromoCodeStatus,
    default: PromoCodeStatus.AVAILABLE,
    description: "Promo code status",
  })
  @IsEnum(PromoCodeStatus)
  @Prop({
    type: String,
    enum: ["available", "assigned"],
    default: "available",
    required: true,
  })
  status!: "available" | "assigned";

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Assigned voucher ObjectId",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: Types.ObjectId, ref: "Voucher", default: null })
  voucherId!: Types.ObjectId | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Assigned hunter ObjectId",
  })
  @IsString()
  @IsOptional()
  @Prop({ type: Types.ObjectId, ref: "Hunter", default: null })
  hunterId!: Types.ObjectId | null;

  @ApiProperty({
    nullable: true,
    description: "Timestamp when code was assigned",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  assignedAt!: Date | null;

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

export type PromoCodeDocument = HydratedDocument<PromoCode>;

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

// Indexes
PromoCodeSchema.index({ dropId: 1, status: 1 });
PromoCodeSchema.index({ dropId: 1, code: 1 }, { unique: true });
PromoCodeSchema.index({ voucherId: 1 }, { sparse: true });
PromoCodeSchema.index({ merchantId: 1 });
PromoCodeSchema.index({ deletedAt: 1 });
