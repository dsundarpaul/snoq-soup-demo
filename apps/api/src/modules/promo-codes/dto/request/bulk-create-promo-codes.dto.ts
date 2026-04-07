import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

class PromoCodeItemDto {
  @ApiProperty({
    example: "SUMMER2024",
    description: "Promo code value",
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: "Code can only contain letters, numbers, underscores, and hyphens",
  })
  code!: string;
}

export class BulkCreatePromoCodesDto {
  @ApiProperty({
    type: [PromoCodeItemDto],
    description: "Array of promo codes to create",
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PromoCodeItemDto)
  codes!: PromoCodeItemDto[];
}
