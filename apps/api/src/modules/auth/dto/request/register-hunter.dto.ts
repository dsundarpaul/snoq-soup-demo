import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterHunterDto {
  @ApiProperty({
    example: "hunter@example.com",
    description: "Hunter email address",
  })
  @IsEmail()
  email!: string;

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
    example: "device-abc-123",
    description: "Unique device identifier",
  })
  @IsString()
  @MinLength(1)
  deviceId!: string;

  @ApiProperty({
    example: "HunterNick",
    description: "Optional nickname (2-20 chars)",
    required: false,
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(20)
  nickname?: string;
}
