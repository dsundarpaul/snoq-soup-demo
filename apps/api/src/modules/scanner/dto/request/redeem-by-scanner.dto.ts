import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RedeemByScannerDto {
  @ApiProperty({
    example: "scanner_token_abc123...",
    description: "Scanner token for authentication",
  })
  @IsString()
  @MinLength(32)
  scannerToken!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Voucher ID to redeem",
  })
  @IsString()
  voucherId!: string;

  @ApiProperty({
    example: "magic_token_abc123",
    description: "Magic token for voucher verification",
  })
  @IsString()
  @MinLength(8)
  magicToken!: string;
}
