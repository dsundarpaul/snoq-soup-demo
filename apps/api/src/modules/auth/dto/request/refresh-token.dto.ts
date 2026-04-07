import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "Refresh token",
  })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
