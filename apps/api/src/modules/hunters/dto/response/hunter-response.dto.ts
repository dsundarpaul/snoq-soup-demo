import { ApiProperty } from "@nestjs/swagger";

export class HunterProfileDto {
  @ApiProperty({
    example: "1990-01-01",
    description: "Date of birth",
    nullable: true,
  })
  dateOfBirth?: Date;

  @ApiProperty({
    example: "male",
    description: "Gender",
    enum: ["male", "female", "other"],
    nullable: true,
  })
  gender?: "male" | "female" | "other";

  @ApiProperty({
    example: "+1",
    description: "Mobile country code",
    nullable: true,
  })
  countryCode?: string;

  @ApiProperty({
    example: "2345678901",
    description: "Mobile number",
    nullable: true,
  })
  number?: string;
}

export class HunterStatsDto {
  @ApiProperty({ example: 15, description: "Total vouchers claimed" })
  totalClaims!: number;

  @ApiProperty({ example: 8, description: "Total vouchers redeemed" })
  totalRedemptions!: number;
}

export class HunterResponseDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439022",
    description: "Hunter ID",
  })
  id!: string;

  @ApiProperty({ example: "device_abc123", description: "Device ID" })
  deviceId!: string;

  @ApiProperty({
    example: "HunterJoe",
    description: "Nickname",
    nullable: true,
  })
  nickname!: string | null;

  @ApiProperty({
    example: "hunter@example.com",
    description: "Email",
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({ type: HunterProfileDto, description: "Profile information" })
  profile!: HunterProfileDto;

  @ApiProperty({ type: HunterStatsDto, description: "Hunter statistics" })
  stats!: HunterStatsDto;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Merchant id this hunter may redeem vouchers for",
    nullable: true,
  })
  redeemerMerchantId!: string | null;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Creation timestamp",
  })
  createdAt!: Date;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Last update timestamp",
  })
  updatedAt!: Date;
}
