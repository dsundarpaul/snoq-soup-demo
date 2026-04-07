import { IsString, IsOptional, IsBoolean, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateMerchantAdminDto {
  @ApiProperty({
    example: "Updated Business Name",
    description: "Business name",
    required: false,
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({
    example: "https://cdn.example.com/logo.png",
    description: "Business logo URL",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    example: true,
    description: "Whether merchant is verified",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiProperty({
    example: true,
    description: "Whether merchant account is active",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: "updated_username",
    description: "Unique username",
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;
}
