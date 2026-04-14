import { ApiProperty } from "@nestjs/swagger";
import { ClaimedByDto, RedeemedByDto } from "./voucher-response.dto";

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

export class MerchantStoreLocationDto {
  @ApiProperty({ example: 24.7136 })
  lat!: number;

  @ApiProperty({ example: 46.6753 })
  lng!: number;

  @ApiProperty({ example: "123 Main St, Riyadh", nullable: true })
  address?: string;

  @ApiProperty({ example: "Riyadh", nullable: true })
  city?: string;

  @ApiProperty({ example: "Riyadh Province", nullable: true })
  state?: string;

  @ApiProperty({ example: "12345", nullable: true })
  pincode?: string;

  @ApiProperty({ example: "Near Al Faisaliyah Tower", nullable: true })
  landmark?: string;

  @ApiProperty({ example: "Take exit 9 from King Fahd Road", nullable: true })
  howToReach?: string;
}

export class MerchantInfoDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Merchant ID",
  })
  id!: string;

  @ApiProperty({ example: "Store Name", description: "Merchant name" })
  name!: string;

  @ApiProperty({ example: "storeusername", description: "Merchant username" })
  username!: string;

  @ApiProperty({
    example: "https://example.com/merchant-logo.png",
    description: "Merchant logo URL",
    nullable: true,
  })
  logoUrl!: string | null;

  @ApiProperty({
    type: MerchantStoreLocationDto,
    description: "Merchant store location",
    nullable: true,
  })
  storeLocation!: MerchantStoreLocationDto | null;

  @ApiProperty({
    example: "+966 50 123 4567",
    description: "Business phone number",
    nullable: true,
  })
  businessPhone!: string | null;

  @ApiProperty({
    example: "Sun-Thu 9AM-10PM",
    description: "Business hours",
    nullable: true,
  })
  businessHours!: string | null;
}

export class RedemptionConfigDto {
  @ApiProperty({
    example: "anytime",
    description: "Redemption type",
    enum: ["anytime", "timer", "window"],
  })
  type!: "anytime" | "timer" | "window";

  @ApiProperty({
    example: 60,
    description: "Timer minutes (for timer type)",
    nullable: true,
  })
  minutes?: number;

  @ApiProperty({
    example: "2024-01-20T23:59:59Z",
    description: "Redemption deadline (for window type)",
    nullable: true,
  })
  deadline?: Date;
}

export class PromoCodeInfoDto {
  @ApiProperty({ example: "SUMMER2024", description: "Promo code value" })
  code!: string;

  @ApiProperty({ example: "assigned", description: "Promo code status" })
  status!: string;
}

export class VoucherDetailResponseDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ID",
  })
  id!: string;

  @ApiProperty({
    example: "abc123magic",
    description: "Magic token for voucher access",
  })
  magicToken!: string;

  @ApiProperty({
    type: DropInfoDto,
    description: "Associated drop information",
  })
  drop!: DropInfoDto;

  @ApiProperty({
    type: MerchantInfoDto,
    description: "Associated merchant information",
  })
  merchant!: MerchantInfoDto;

  @ApiProperty({ type: ClaimedByDto, description: "Claimant information" })
  claimedBy!: ClaimedByDto;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "When voucher was claimed",
  })
  claimedAt!: Date;

  @ApiProperty({
    example: "2024-01-20T23:59:59Z",
    description: "Voucher expiry",
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

  @ApiProperty({
    type: RedemptionConfigDto,
    description: "Redemption configuration",
  })
  redemptionConfig!: RedemptionConfigDto;

  @ApiProperty({
    type: PromoCodeInfoDto,
    description: "Assigned promo code",
    nullable: true,
  })
  promoCode!: PromoCodeInfoDto | null;

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
