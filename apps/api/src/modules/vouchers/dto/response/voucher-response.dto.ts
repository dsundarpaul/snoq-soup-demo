import { ApiProperty } from "@nestjs/swagger";

export class DropInfoDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439044", description: "Drop ID" })
  id!: string;

  @ApiProperty({ example: "Summer Sale Drop", description: "Drop name" })
  name!: string;

  @ApiProperty({
    example: "Get 50% off on all items",
    description: "Drop description",
  })
  description!: string;

  @ApiProperty({ example: "50% Discount", description: "Reward value" })
  rewardValue!: string;

  @ApiProperty({
    example: "https://example.com/logo.png",
    description: "Drop logo URL",
    nullable: true,
  })
  logoUrl!: string | null;

  @ApiProperty({
    nullable: true,
    description: "Drop terms and conditions",
    required: false,
  })
  termsAndConditions?: string | null;
}

export class ClaimedByDto {
  @ApiProperty({
    example: "device_abc123",
    description: "Device ID that claimed the voucher",
    nullable: true,
  })
  deviceId?: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439022",
    description: "Hunter ID that claimed the voucher",
    nullable: true,
  })
  hunterId?: string;

  @ApiProperty({
    example: "user@example.com",
    description: "Email associated with the claim",
    nullable: true,
  })
  email?: string;

  @ApiProperty({
    example: "+1234567890",
    description: "Phone associated with the claim",
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    example: "HunterJoe",
    description: "Hunter display name (nickname) when resolved from profile",
    nullable: true,
    required: false,
  })
  name?: string | null;
}

export class RedeemedByDto {
  @ApiProperty({
    example: "merchant",
    description: "Type of redeemer",
    enum: ["merchant", "scanner", "hunter"],
  })
  type?: "merchant" | "scanner" | "hunter";

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Redeemer ID",
  })
  id?: string;
}

export class VoucherResponseDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ID",
  })
  id!: string;

  @ApiProperty({ example: "507f1f77bcf86cd799439044", description: "Drop ID" })
  dropId!: string;

  @ApiProperty({
    type: DropInfoDto,
    description: "Associated drop information",
    nullable: true,
  })
  drop?: DropInfoDto;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Merchant ID",
  })
  merchantId!: string;

  @ApiProperty({
    example: "abc123magic",
    description: "Magic token for voucher access",
  })
  magicToken!: string;

  @ApiProperty({ type: ClaimedByDto, description: "Claimant information" })
  claimedBy!: ClaimedByDto;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "When voucher was claimed",
  })
  claimedAt!: Date;

  @ApiProperty({
    example: "2024-01-20T23:59:59Z",
    description: "Voucher expiry (null if no cap beyond drop rules)",
    nullable: true,
  })
  expiresAt!: Date | null;

  @ApiProperty({
    example: false,
    description: "Whether voucher has been redeemed",
  })
  redeemed!: boolean;

  @ApiProperty({
    example: "2024-01-16T14:20:00Z",
    description: "When voucher was redeemed",
    nullable: true,
  })
  redeemedAt!: Date | null;

  @ApiProperty({ type: RedeemedByDto, description: "Redeemer information" })
  redeemedBy!: RedeemedByDto;

  @ApiProperty({ description: "QR code data for redemption" })
  qrData!: string;

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
