import { ApiProperty } from "@nestjs/swagger";

export class VoucherHistoryItemDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ID",
  })
  voucherId!: string;

  @ApiProperty({ example: "507f1f77bcf86cd799439044", description: "Drop ID" })
  dropId!: string;

  @ApiProperty({ example: "Summer Sale Drop", description: "Drop name" })
  dropName!: string;

  @ApiProperty({ example: "50% Discount", description: "Reward value" })
  rewardValue!: string;

  @ApiProperty({ example: "Store Name", description: "Merchant name" })
  merchantName!: string;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "When voucher was claimed",
  })
  claimedAt!: Date;

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

  @ApiProperty({
    example: "SUMMER2024",
    description: "Promo code (if assigned)",
    nullable: true,
  })
  promoCode!: string | null;
}

export class HunterHistoryResponseDto {
  @ApiProperty({
    type: [VoucherHistoryItemDto],
    description: "List of voucher history items",
  })
  vouchers!: VoucherHistoryItemDto[];

  @ApiProperty({ example: 15, description: "Total vouchers claimed" })
  totalClaims!: number;

  @ApiProperty({ example: 8, description: "Total vouchers redeemed" })
  totalRedemptions!: number;
}
