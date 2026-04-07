import { ApiProperty } from "@nestjs/swagger";

export class AdminStatsDto {
  @ApiProperty({ example: 150, description: "Total number of merchants" })
  totalMerchants!: number;

  @ApiProperty({ example: 45, description: "Number of verified merchants" })
  verifiedMerchants!: number;

  @ApiProperty({ example: 1200, description: "Total number of drops created" })
  totalDrops!: number;

  @ApiProperty({ example: 350, description: "Number of active drops" })
  activeDrops!: number;

  @ApiProperty({
    example: 8500,
    description: "Total number of vouchers created",
  })
  totalVouchers!: number;

  @ApiProperty({ example: 6200, description: "Total number of voucher claims" })
  totalClaims!: number;

  @ApiProperty({
    example: 4800,
    description: "Total number of voucher redemptions",
  })
  totalRedemptions!: number;

  @ApiProperty({ example: 2800, description: "Total number of hunters" })
  totalHunters!: number;

  @ApiProperty({
    example: 0.77,
    description: "Redemption rate (claims to redemptions)",
  })
  redemptionRate!: number;

  @ApiProperty({
    example: "2024-01-15T10:30:00.000Z",
    description: "Stats generated at",
  })
  generatedAt!: Date;
}
