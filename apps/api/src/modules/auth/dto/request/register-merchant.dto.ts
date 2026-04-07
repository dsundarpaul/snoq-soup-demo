import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterMerchantDto {
  @ApiProperty({
    example: "merchant@example.com",
    description: "Merchant email address",
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: "merchant_user",
    description: "Unique username (3-30 chars, alphanumeric + underscore)",
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores",
  })
  username!: string;

  @ApiProperty({
    example: "SecurePass123",
    description: "Password (min 8 chars, 1 uppercase, 1 number)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  @Matches(/[0-9]/, { message: "Password must contain at least one number" })
  password!: string;

  @ApiProperty({
    example: "My Business Store",
    description: "Business name (2-100 chars)",
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName!: string;
}
