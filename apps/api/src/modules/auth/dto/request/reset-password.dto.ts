import { IsString, MinLength, Matches, ValidateIf } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
  @ApiProperty({
    example: "NewSecurePass123",
    description: "New password (min 8 chars, 1 uppercase, 1 number)",
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
    example: "NewSecurePass123",
    description: "Confirm new password (must match password)",
    required: false,
  })
  @IsString()
  @ValidateIf((o) => o.confirmPassword !== undefined)
  confirmPassword?: string;
}
