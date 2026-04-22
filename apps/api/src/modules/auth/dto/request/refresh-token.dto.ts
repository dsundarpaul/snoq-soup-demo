import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiPropertyOptional({
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "Refresh token (optional when sent via httpOnly cookie)",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
