import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeviceLoginDto {
  @ApiProperty({
    example: "device-abc-123",
    description: "Unique device identifier",
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  deviceId!: string;
}
