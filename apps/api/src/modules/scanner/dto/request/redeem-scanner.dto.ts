import { IsString, IsMongoId, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RedeemScannerDto {
  @ApiProperty({
    example: "a1b2c3d4e5f6...",
    description: "Scanner token",
  })
  @IsString()
  @MinLength(1)
  scannerToken!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Voucher ID to redeem",
  })
  @IsMongoId()
  voucherId!: string;

  @ApiProperty({
    example: "magic_token_abc123",
    description: "Magic token for voucher verification",
  })
  @IsString()
  @MinLength(1)
  magicToken!: string;
}
