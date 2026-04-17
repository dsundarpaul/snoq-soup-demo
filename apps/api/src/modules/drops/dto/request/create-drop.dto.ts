import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsBoolean,
  Matches,
  MaxLength,
} from "class-validator";

enum RedemptionType {
  ANYTIME = "anytime",
  TIMER = "timer",
  WINDOW = "window",
}

enum AvailabilityType {
  UNLIMITED = "unlimited",
  LIMITED = "limited",
}

export class CreateDropDto {
  @ApiProperty({ example: "Summer Sale Drop", description: "Drop name" })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "Get 50% off on all items",
    description: "Drop description",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 24.7136,
    description: "Latitude (alternative field)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    example: 46.6753,
    description: "Longitude (alternative field)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    example: 50,
    description: "Radius in meters",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(2000)
  radius?: number;

  @ApiProperty({ example: "50% Discount", description: "Reward value" })
  @IsString()
  @MaxLength(20)
  rewardValue!: string;

  @ApiProperty({
    description: "Terms and conditions for redeemers",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  termsAndConditions?: string;

  @ApiProperty({
    example: "https://example.com/logo.png",
    description: "Logo URL",
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: "logoUrl must be a valid HTTP URL" })
  logoUrl?: string;

  @ApiProperty({
    example: "anytime",
    description: "Redemption type",
    enum: ["anytime", "timer", "window"],
  })
  @IsEnum(RedemptionType)
  redemptionType!: "anytime" | "timer" | "window";

  @ApiProperty({
    example: 60,
    description: "Redemption minutes (for timer type)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  redemptionMinutes?: number;

  @ApiProperty({
    example: "2024-12-31T23:59:59Z",
    description: "Redemption deadline (for window type)",
    required: false,
  })
  @IsString()
  @IsOptional()
  redemptionDeadline?: string;

  @ApiProperty({
    example: "unlimited",
    description: "Availability type",
    enum: ["unlimited", "limited"],
  })
  @IsEnum(AvailabilityType)
  availabilityType!: "unlimited" | "limited";

  @ApiProperty({
    example: 100,
    description: "Availability limit (for limited type)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(99999)
  availabilityLimit?: number;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Start time (ISO date)",
    required: false,
  })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({
    example: "2024-12-31T23:59:59Z",
    description: "End time (ISO date)",
    required: false,
  })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({
    example: true,
    description: "Whether drop is active",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    example: "2025-12-31T23:59:59Z",
    description:
      "Absolute expiry for vouchers from this drop (ISO date), optional",
    required: false,
  })
  @IsString()
  @IsOptional()
  voucherAbsoluteExpiresAt?: string;

  @ApiProperty({
    example: 72,
    description: "Hours after claim until voucher expires, optional",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  voucherTtlHoursAfterClaim?: number;
}
