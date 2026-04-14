import { IsString, IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendEmailDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email address to send voucher to",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439033",
    description: "Voucher ObjectId",
  })
  @IsString()
  voucherId!: string;

  @ApiProperty({
    description:
      "Magic token proving access to this voucher (same as in the magic link)",
  })
  @IsString()
  magicToken!: string;

  @ApiProperty({
    example: "https://app.souqsnap.com/v/abc123magic",
    description: "Magic link for voucher access",
  })
  @IsString()
  magicLink!: string;
}
