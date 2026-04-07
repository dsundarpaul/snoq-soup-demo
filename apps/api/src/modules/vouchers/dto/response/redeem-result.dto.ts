import { ApiProperty } from "@nestjs/swagger";
import { VoucherResponseDto } from "./voucher-response.dto";

export class RedeemResultDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ID",
  })
  voucherId!: string;

  @ApiProperty({
    type: VoucherResponseDto,
    description: "Redeemed voucher details",
    nullable: true,
  })
  voucher?: VoucherResponseDto;

  @ApiProperty({
    example: true,
    description: "Whether redemption was successful",
  })
  success!: boolean;

  @ApiProperty({
    example: "Voucher redeemed successfully",
    description: "Redemption message",
  })
  message!: string;

  @ApiProperty({
    example: "2024-01-16T14:20:00Z",
    description: "When voucher was redeemed",
  })
  redeemedAt!: Date;

  @ApiProperty({
    example: "merchant",
    description: "Type of redeemer",
    enum: ["merchant", "scanner"],
  })
  redeemedByType!: "merchant" | "scanner";

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Redeemer ID",
  })
  redeemedById!: string;

  @ApiProperty({
    example: "SUMMER2024",
    description: "Promo code (if assigned)",
    nullable: true,
  })
  promoCode?: string;

  @ApiProperty({ example: "Summer Sale Drop", description: "Drop name" })
  dropName!: string;

  @ApiProperty({ example: "Store Name", description: "Merchant name" })
  merchantName!: string;
}
