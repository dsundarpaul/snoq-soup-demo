import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RedeemVoucherDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ObjectId",
  })
  @IsString()
  voucherId!: string;

  @ApiProperty({
    example: "abc123magic",
    description: "Magic token for voucher access",
  })
  @IsString()
  magicToken!: string;
}
