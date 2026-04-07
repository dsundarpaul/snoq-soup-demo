import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  Max,
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

export class UpdateDropDto {
  @ApiProperty({
    example: "Summer Sale Drop",
    description: "Drop name",
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

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
    description: "Latitude",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({
    example: 46.6753,
    description: "Longitude",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiProperty({
    example: 50,
    description: "Radius in meters",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(1000)
  radius?: number;

  @ApiProperty({
    example: "50% Discount",
    description: "Reward value",
    required: false,
  })
  @IsString()
  @IsOptional()
  rewardValue?: string;

  @ApiProperty({
    example: "https://example.com/logo.png",
    description: "Logo URL",
    required: false,
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    example: "anytime",
    description: "Redemption type",
    enum: ["anytime", "timer", "window"],
    required: false,
  })
  @IsEnum(RedemptionType)
  @IsOptional()
  redemptionType?: "anytime" | "timer" | "window";

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
    required: false,
  })
  @IsEnum(AvailabilityType)
  @IsOptional()
  availabilityType?: "unlimited" | "limited";

  @ApiProperty({
    example: 100,
    description: "Availability limit (for limited type)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
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
}
