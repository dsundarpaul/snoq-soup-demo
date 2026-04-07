import { ApiProperty } from "@nestjs/swagger";

export class TokenResponseDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "JWT access token",
  })
  accessToken!: string;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "JWT refresh token",
  })
  refreshToken!: string;
}
