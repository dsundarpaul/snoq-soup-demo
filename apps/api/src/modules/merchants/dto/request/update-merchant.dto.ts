import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsUrl, Matches } from "class-validator";

export class UpdateMerchantDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-()]{7,20}$/, { message: "Invalid phone number" })
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: "Invalid website URL" })
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  socialLinks?: Record<string, string>;
}

export class UpdateMerchantLogoDto {
  @ApiProperty({
    example: "https://cdn.example.com/logo.png",
    description: "Public URL of uploaded logo",
  })
  @IsString()
  @Matches(/^https?:\/\/.+/, { message: "logoUrl must be a valid HTTP URL" })
  logoUrl!: string;
}
