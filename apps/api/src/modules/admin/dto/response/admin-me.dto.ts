import { ApiProperty } from "@nestjs/swagger";

export class AdminMeProfileDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  id!: string;

  @ApiProperty({ example: "admin@example.com" })
  email!: string;

  @ApiProperty({ example: "Platform Administrator" })
  name!: string;
}

export class AdminMeDto {
  @ApiProperty({ type: AdminMeProfileDto })
  admin!: AdminMeProfileDto;
}
