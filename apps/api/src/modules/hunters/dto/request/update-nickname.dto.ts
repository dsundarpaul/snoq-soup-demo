import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateNicknameDto {
  @ApiProperty({
    example: "HunterJoe",
    description: "Hunter nickname",
    minLength: 2,
    maxLength: 30,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname!: string;
}
