import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from "class-validator";
import { LoginDto } from "./login.dto";

export class HunterLoginDto extends LoginDto {
  @ApiPropertyOptional({
    description:
      "Client device identifier (optional). Ignored by login; not used to authenticate.",
    example: "device_abc",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: "Invalid deviceId format" })
  deviceId?: string;
}
