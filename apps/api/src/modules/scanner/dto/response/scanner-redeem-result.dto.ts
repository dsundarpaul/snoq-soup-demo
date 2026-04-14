import { ApiProperty } from "@nestjs/swagger";

export class ScannerRedeemResultDto {
  @ApiProperty({
    example: true,
    description: "Whether redemption was successful",
  })
  success!: boolean;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Voucher ID",
  })
  voucherId!: string;

  @ApiProperty({ example: "magic_token_abc123", description: "Magic token" })
  magicToken!: string;

  @ApiProperty({
    example: "2024-01-15T10:30:00.000Z",
    description: "Redemption timestamp",
    nullable: true,
  })
  redeemedAt!: Date | null;

  @ApiProperty({
    example: "Voucher redeemed successfully",
    description: "Result message",
  })
  message!: string;

  @ApiProperty({ type: Object, description: "Voucher details", nullable: true })
  voucher!: {
    dropName: string;
    rewardValue: string;
    termsAndConditions?: string | null;
  } | null;
}
