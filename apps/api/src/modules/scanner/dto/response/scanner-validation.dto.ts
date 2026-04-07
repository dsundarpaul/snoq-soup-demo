import { ApiProperty } from "@nestjs/swagger";

export class MerchantInfoDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Merchant ID",
  })
  id!: string;

  @ApiProperty({ example: "My Business Store", description: "Business name" })
  businessName!: string;

  @ApiProperty({ example: "my_store", description: "Merchant username" })
  username!: string;

  @ApiProperty({
    example: "https://cdn.example.com/logo.png",
    description: "Logo URL",
    nullable: true,
  })
  logoUrl!: string | null;
}

export class ScannerValidationDto {
  @ApiProperty({
    example: true,
    description: "Whether the scanner token is valid",
  })
  valid!: boolean;

  @ApiProperty({
    type: MerchantInfoDto,
    description: "Merchant information if token is valid",
    nullable: true,
  })
  merchant!: MerchantInfoDto | null;

  @ApiProperty({
    example: "2024-01-15T10:30:00.000Z",
    description: "Token expiration time",
    nullable: true,
  })
  expiresAt!: Date | null;

  @ApiProperty({ example: "Token is valid", description: "Validation message" })
  message!: string;
}
