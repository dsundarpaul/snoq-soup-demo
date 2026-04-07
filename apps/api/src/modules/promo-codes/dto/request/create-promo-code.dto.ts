import { IsString, IsNotEmpty, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePromoCodeDto {
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
