import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendWhatsAppDto {
  @ApiProperty({
    example: "+1234567890",
    description: "Phone number to send voucher to",
  })
  @IsString()
  phone!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ObjectId",
  })
  @IsString()
  voucherId!: string;

  @ApiProperty({
    example: "https://app.souqsnap.com/v/abc123magic",
    description: "Magic link for voucher access",
  })
  @IsString()
  magicLink!: string;
}
