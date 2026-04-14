import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
  MaxLength,
  Matches,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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

  @ApiProperty({ example: "+966 50 123 4567", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  businessPhone?: string;

  @ApiProperty({ example: "Sun-Thu 9AM-10PM, Fri 2PM-10PM", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  businessHours?: string;
}

export class StoreLocationDto {
  @ApiProperty({ example: 24.7136 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 46.6753 })
  @IsNumber()
  lng!: number;

  @ApiProperty({ example: "123 Main St, Riyadh", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ example: "Riyadh", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: "Riyadh Province", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: "12345", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  pincode?: string;

  @ApiProperty({ example: "Near Al Faisaliyah Tower", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  landmark?: string;

  @ApiProperty({ example: "Take exit 9 from King Fahd Road", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  howToReach?: string;
}

export class UpdateStoreLocationDto {
  @ApiProperty({ type: StoreLocationDto })
  @ValidateNested()
  @Type(() => StoreLocationDto)
  storeLocation!: StoreLocationDto;
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
