import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { HydratedDocument, Types } from "mongoose";

export enum RedemptionType {
  ANYTIME = "anytime",
  TIMER = "timer",
  WINDOW = "window",
}

export enum AvailabilityType {
  UNLIMITED = "unlimited",
  LIMITED = "limited",
}

// Location subdocument schema
@Schema({ _id: false })
class Location {
  @Prop({ type: String, enum: ["Point"], default: "Point" })
  type!: string;

  @Prop({ type: [Number], required: true })
  coordinates!: [number, number];
}

// Redemption subdocument schema
@Schema({ _id: false })
class Redemption {
  @Prop({
    type: String,
    enum: ["anytime", "timer", "window"],
    default: "anytime",
  })
  type!: string;

  @Prop({ type: Number, min: 1 })
  minutes?: number;

  @Prop({ type: Date })
  deadline?: Date;
}

// Availability subdocument schema
@Schema({ _id: false })
class Availability {
  @Prop({ type: String, enum: ["unlimited", "limited"], default: "unlimited" })
  type!: string;

  @Prop({ type: Number, min: 1 })
  limit?: number;
}

// Schedule subdocument schema
@Schema({ _id: false })
class Schedule {
  @Prop({ type: Date })
  start?: Date;

  @Prop({ type: Date })
  end?: Date;
}

@Schema({ timestamps: true })
export class Drop {
  @ApiProperty({ type: String, description: "Merchant ObjectId" })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: "Merchant", required: true })
  merchantId!: Types.ObjectId;

  @ApiProperty({ example: "Summer Sale Drop", description: "Drop name" })
  @IsString()
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @ApiProperty({
    example: "Get 50% off on all items",
    description: "Drop description",
  })
  @IsString()
  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @ApiProperty({
    description: "GeoJSON Point location",
    example: { type: "Point", coordinates: [46.6753, 24.7136] },
  })
  @Prop({ type: Location, required: true })
  location!: {
    type: "Point";
    coordinates: [number, number];
  };

  @ApiProperty({
    minimum: 5,
    maximum: 1000,
    default: 15,
    description: "Capture radius in meters",
  })
  @IsNumber()
  @Min(5)
  @Max(1000)
  @Prop({ type: Number, required: true, min: 5, max: 2000, default: 15 })
  radius!: number;

  @ApiProperty({ example: "50% Discount", description: "Reward value" })
  @IsString()
  @Prop({ type: String, required: true, trim: true })
  rewardValue!: string;

  @ApiProperty({
    nullable: true,
    description: "Terms and conditions shown when redeeming",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  @Prop({ type: String, default: null })
  termsAndConditions!: string | null;

  @ApiProperty({ nullable: true, description: "Drop logo URL" })
  @IsString()
  @IsOptional()
  @Prop({ type: String, default: null })
  logoUrl!: string | null;

  @ApiProperty({ description: "Redemption configuration" })
  @Prop({ type: Redemption, required: true })
  redemption!: {
    type: "anytime" | "timer" | "window";
    minutes?: number;
    deadline?: Date;
  };

  @ApiProperty({ description: "Availability configuration" })
  @Prop({ type: Availability, required: true })
  availability!: {
    type: "unlimited" | "limited";
    limit?: number;
  };

  @ApiProperty({ description: "Schedule configuration" })
  @Prop({ type: Schedule, default: {} })
  schedule!: {
    start?: Date;
    end?: Date;
  };

  @ApiProperty({ default: true, description: "Whether drop is active" })
  @IsBoolean()
  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @ApiProperty({
    nullable: true,
    description:
      "Absolute expiry for vouchers from this drop (snapshot at claim)",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  voucherAbsoluteExpiresAt!: Date | null;

  @ApiProperty({
    nullable: true,
    description: "Hours after claim until the voucher expires",
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Prop({ type: Number, default: null })
  voucherTtlHoursAfterClaim!: number | null;

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

export type DropDocument = HydratedDocument<Drop>;

export const DropSchema = SchemaFactory.createForClass(Drop);

// Indexes
DropSchema.index({ location: "2dsphere" });
DropSchema.index({ merchantId: 1, active: 1 });
DropSchema.index({ active: 1, "schedule.start": 1, "schedule.end": 1 });
DropSchema.index({ deletedAt: 1 });
