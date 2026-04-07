import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ValidateScannerDto {
  @ApiProperty({
    example: "a1b2c3d4e5f6...",
    description: "Scanner token to validate",
  })
  @IsString()
  @MinLength(32)
  token!: string;
}
