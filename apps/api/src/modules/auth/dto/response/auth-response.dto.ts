import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ example: "merchant", enum: ["merchant", "hunter", "admin"] })
  type!: string;

  @ApiProperty({
    example: false,
    description: "Email verified status (merchants only)",
  })
  emailVerified?: boolean;

  @ApiProperty({ example: "My Business", nullable: true })
  businessName?: string | null;

  @ApiProperty({ example: "username123", nullable: true })
  username?: string | null;

  @ApiProperty({ example: "HunterNick", nullable: true })
  nickname?: string | null;

  @ApiProperty({ example: "device-abc-123", nullable: true })
  deviceId?: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto, description: "User information" })
  user!: UserDto;
}
