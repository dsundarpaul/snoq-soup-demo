import { IsString, IsOptional, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ClaimVoucherDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Drop ObjectId",
  })
  @IsString()
  dropId!: string;

  @ApiProperty({
    example: "device_abc123",
    description: "Unique device identifier",
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: "Invalid deviceId format" })
  deviceId!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439022",
    description: "Hunter ObjectId (optional)",
    required: false,
  })
  @IsString()
  @IsOptional()
  hunterId?: string;
}
