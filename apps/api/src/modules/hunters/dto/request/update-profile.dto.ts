import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Gender } from "@/database/schemas/hunter.schema";

export class UpdateProfileDto {
  @ApiProperty({
    example: "HunterJoe",
    description: "Hunter nickname",
    required: false,
  })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({
    example: "1990-01-01",
    description: "Date of birth",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({
    example: "male",
    description: "Gender",
    enum: Gender,
    required: false,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: "male" | "female" | "other";

  @ApiProperty({
    example: "+1",
    description: "Mobile country code",
    required: false,
  })
  @IsString()
  @IsOptional()
  mobileCountryCode?: string;

  @ApiProperty({
    example: "2345678901",
    description: "Mobile number",
    required: false,
  })
  @IsString()
  @IsOptional()
  mobileNumber?: string;
}
